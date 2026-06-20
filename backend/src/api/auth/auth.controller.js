import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import { signToken } from "../../utils/jwt.js";

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 5;
const LOCKOUT_HOURS = 48;
const LOCKOUT_WINDOW_MINUTES = 60;
const MAX_LOCKOUTS_BEFORE_PERMANENT = 3;

export const login = async (req, res, next) => {
  try {
    const { phoneNumber, pin, deviceId } = req.body;
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;

    if (!phoneNumber || !pin) {
      return res.status(400).json({
        success: false,
        message: "Phone number and PIN are required.",
      });
    }

    // ── Step 1: Check server-side lockout ──
    const lockout = await prisma.loginLockout.findUnique({
      where: { phoneNumber },
    });

    if (lockout) {
      if (lockout.isPermanent) {
        return res.status(423).json({
          success: false,
          message:
            "Account suspended for 48 hours due to repeated failed attempts. Contact your supervisor.",
          lockedUntil: lockout.lockedUntil,
          isPermanent: true,
        });
      }
      if (lockout.lockedUntil && new Date() < lockout.lockedUntil) {
        const remaining = Math.ceil(
          (lockout.lockedUntil.getTime() - Date.now()) / 60000,
        );
        return res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${remaining} minute${remaining > 1 ? "s" : ""}.`,
          lockedUntil: lockout.lockedUntil,
          isPermanent: false,
        });
      }
    }

    // ── Step 2: Find user ──
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        zoneAllocations: {
          select: {
            zone: {
              include: {
                ta: { include: { district: { include: { region: true } } } },
              },
            },
          },
        },
        taAllocations: {
          select: {
            ta: { include: { district: { include: { region: true } } } },
          },
        },
      },
    });

    if (!user) {
      // ── Step 1: Record attempt for unknown number ──
      await prisma.loginAttempt.create({
        data: { phoneNumber, ipAddress, deviceId, success: false },
      });

      // ── Step 2: Track unknown numbers for admin visibility ──
      try {
        await prisma.unknownLoginAttempt.upsert({
          where: { phoneNumber },
          update: {
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
            ipAddress: ipAddress || undefined,
          },
          create: {
            phoneNumber,
            attemptCount: 1,
            firstAttemptAt: new Date(),
            lastAttemptAt: new Date(),
            ipAddress: ipAddress || undefined,
          },
        });
      } catch (error) {
        // If table doesn't exist, just log it
        console.log("UnknownLoginAttempt table not ready:", error.message);
      }

      // ── Step 3: Check if this number is locked out ──
      const lockout = await prisma.loginLockout.findUnique({
        where: { phoneNumber },
      });

      if (lockout && lockout.lockedUntil && new Date() < lockout.lockedUntil) {
        const remaining = Math.ceil(
          (lockout.lockedUntil.getTime() - Date.now()) / 60000,
        );
        return res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${remaining} minute${remaining > 1 ? "s" : ""}.`,
          lockedUntil: lockout.lockedUntil,
          isPermanent: lockout.isPermanent || false,
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid phone number or PIN.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Contact your administrator.",
      });
    }

    // ── Step 3: Check PIN ──
    const pinMatch = await bcrypt.compare(String(pin), user.pinHash);

    if (!pinMatch) {
      // Record failed attempt
      await prisma.loginAttempt.create({
        data: { phoneNumber, ipAddress, deviceId, success: false },
      });

      // Count recent failed attempts (last 10 minutes)
      const recentFails = await prisma.loginAttempt.count({
        where: {
          phoneNumber,
          success: false,
          attemptedAt: {
            gte: new Date(Date.now() - 10 * 60 * 1000),
          },
        },
      });

      if (recentFails >= MAX_ATTEMPTS) {
        // Check existing lockout
        const existingLockout = await prisma.loginLockout.findUnique({
          where: { phoneNumber },
        });

        const lockoutCount = (existingLockout?.lockoutCount || 0) + 1;

        // Count lockouts in last hour
        const recentLockouts = lockoutCount;
        const isPermanent = recentLockouts >= MAX_LOCKOUTS_BEFORE_PERMANENT;
        const lockedUntil = isPermanent
          ? new Date(Date.now() + LOCKOUT_HOURS * 60 * 60 * 1000)
          : new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);

        await prisma.loginLockout.upsert({
          where: { phoneNumber },
          update: {
            lockedUntil,
            lockoutCount,
            lastLockoutAt: new Date(),
            isPermanent,
            unlockedAt: null,
          },
          create: {
            phoneNumber,
            lockedUntil,
            lockoutCount,
            lastLockoutAt: new Date(),
            isPermanent,
          },
        });

        // Write audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: isPermanent ? "ACCOUNT_LOCKED_48H" : "ACCOUNT_LOCKED_5M",
            recordType: "USER",
            recordId: user.id,
            newValue: {
              reason: `${lockoutCount} lockout(s) — ${recentFails} failed attempts`,
              lockedUntil,
              isPermanent,
              deviceId,
              ipAddress,
            },
          },
        });

        // If permanent — deactivate account
        if (isPermanent) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isActive: false },
          });
        }

        return res.status(423).json({
          success: false,
          message: isPermanent
            ? "Account suspended for 48 hours. Your supervisor has been notified."
            : `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
          lockedUntil,
          isPermanent,
          lockoutCount,
        });
      }

      const remaining = MAX_ATTEMPTS - recentFails;
      return res.status(401).json({
        success: false,
        message: `Invalid PIN. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining before lockout.`,
        attemptsRemaining: remaining,
      });
    }

    // ── Step 4: Success — clear lockout, record success ──
    await prisma.loginAttempt.create({
      data: { phoneNumber, ipAddress, deviceId, success: true },
    });

    // Clear any existing lockout on successful login
    await prisma.loginLockout.deleteMany({ where: { phoneNumber } });

    // Reactivate if was deactivated by lockout
    if (!user.isActive) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });
    }

    const token = signToken(user.id, user.role);
    const { pinHash, ...userSafe } = user;

    // Compute scope so the frontend knows what dashboard view to render
    const userFacility = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        facility: {
          select: {
            id: true,
            name: true,
            facilityType: true,
            districtId: true,
            taId: true,
          },
        },
      },
    });

    let scopeLevel = "ALL";
    if (user.role === "ADMIN") {
      scopeLevel = "ALL";
    } else if (user.role === "CCW") {
      scopeLevel = "ZONE";
    } else if (userFacility.facility) {
      if (userFacility.facility.facilityType === "DISTRICT_HOSPITAL") {
        scopeLevel = "DISTRICT";
      } else if (
        ["TA_HOSPITAL", "CLINIC"].includes(userFacility.facility.facilityType)
      ) {
        scopeLevel = "TA";
      }
    } else if (user.taAllocations.length > 0) {
      scopeLevel = "TA";
    }

    res.json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: { ...userSafe, facility: userFacility.facility, scopeLevel },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        facility: {
          select: {
            id: true,
            name: true,
            facilityType: true,
            districtId: true,
            taId: true,
          },
        },
        zoneAllocations: {
          select: {
            zone: {
              include: {
                ta: {
                  include: {
                    district: { include: { region: true } },
                  },
                },
              },
            },
          },
        },
        taAllocations: {
          select: {
            ta: {
              include: {
                district: { include: { region: true } },
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: { ...user, scopeLevel: req.user.scopeLevel },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/auth/change-pin
export const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;

    if (!currentPin || !newPin) {
      return res.status(400).json({
        success: false,
        message: "Current PIN and new PIN are required.",
      });
    }

    if (String(newPin).length !== 4 || isNaN(newPin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits.",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const match = await bcrypt.compare(String(currentPin), user.pinHash);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Current PIN is incorrect.",
      });
    }

    const pinHash = await bcrypt.hash(String(newPin), 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { pinHash } });

    res.json({ success: true, message: "PIN changed successfully." });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/flag-lockout
export const flagLockout = async (req, res, next) => {
  try {
    const { phoneNumber, reason, lockedUntil } = req.body;

    console.log("📤 Flagging lockout for:", phoneNumber);

    // ── Step 1: Find OR CREATE the user ──
    let user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true, fullName: true, phoneNumber: true, isActive: true },
    });

    if (!user) {
      console.log("📝 Unknown phone number - creating shadow record...");

      try {
        // Create a shadow user for tracking
        user = await prisma.user.create({
          data: {
            id: `shadow_${phoneNumber}`,
            fullName: `Unknown (${phoneNumber})`,
            phoneNumber: phoneNumber,
            pinHash: "shadow_account_no_login",
            role: "CCW",
            isActive: false,
          },
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            isActive: true,
          },
        });
        console.log("✅ Shadow user created:", user.id);
      } catch (createError) {
        // If user creation fails, try to find again (race condition)
        user = await prisma.user.findUnique({
          where: { phoneNumber },
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            isActive: true,
          },
        });

        if (!user) {
          // If still no user, create with a different approach
          user = await prisma.user.create({
            data: {
              id: `shadow_${phoneNumber}_${Date.now()}`,
              fullName: `Unknown (${phoneNumber})`,
              phoneNumber: phoneNumber,
              pinHash: "shadow_account_no_login",
              role: "CCW",
              isActive: false,
            },
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              isActive: true,
            },
          });
        }
      }
    }

    // ── Step 2: Create/Update lockout record ──
    await prisma.loginLockout.upsert({
      where: { phoneNumber },
      update: {
        lockedUntil: new Date(lockedUntil),
        lockoutCount: {
          increment: 1,
        },
        lastLockoutAt: new Date(),
        isPermanent: true,
        unlockedAt: null,
        unlockedById: null,
      },
      create: {
        phoneNumber,
        lockedUntil: new Date(lockedUntil),
        lockoutCount: 1,
        lastLockoutAt: new Date(),
        isPermanent: true,
      },
    });

    // ── Step 3: Deactivate user ──
    await prisma.user.update({
      where: { phoneNumber },
      data: { isActive: false },
    });

    // ── Step 4: Log to audit ──
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ACCOUNT_LOCKED_48H",
        recordType: "USER",
        recordId: user.id,
        newValue: {
          reason,
          lockedUntil,
          isPermanent: true,
          phoneNumber,
          isShadowUser: user.id.startsWith("shadow_"),
        },
      },
    });

    console.log(" Lockout flag saved for:", phoneNumber);

    res.json({ success: true });
  } catch (err) {
    console.error(" Error in flagLockout:", err);
    next(err);
  }
};

// PATCH /api/auth/unlock/:id — Admin unlocks a suspended account
export const unlockAccount = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: true },
      select: { id: true, fullName: true, phoneNumber: true, isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "ACCOUNT_UNLOCKED",
        recordType: "USER",
        recordId: user.id,
        newValue: { unlockedBy: req.user.id },
      },
    });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
