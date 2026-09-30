import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import { signToken } from "../../utils/jwt.js";
import { normalizePhone } from "../../utils/phone.js";

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 5;
const LOCKOUT_HOURS = 48;
const LOCKOUT_WINDOW_MINUTES = 60;
const MAX_LOCKOUTS_BEFORE_PERMANENT = 3;

export const login = async (req, res, next) => {
  try {
    const { phoneNumber: rawPhone, pin, deviceId } = req.body;
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;

    const phoneNumber = normalizePhone(rawPhone);

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
      // ── Record attempt for unknown number ──
      await prisma.loginAttempt.create({
        data: { phoneNumber, ipAddress, deviceId, success: false },
      });

      // ── Track unknown numbers for admin visibility ──
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
        console.log("UnknownLoginAttempt table not ready:", error.message);
      }

      // ── Check if this number is locked out ──
      const lockout2 = await prisma.loginLockout.findUnique({
        where: { phoneNumber },
      });

      if (
        lockout2 &&
        lockout2.lockedUntil &&
        new Date() < lockout2.lockedUntil
      ) {
        const remaining = Math.ceil(
          (lockout2.lockedUntil.getTime() - Date.now()) / 60000,
        );
        return res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${remaining} minute${remaining > 1 ? "s" : ""}.`,
          lockedUntil: lockout2.lockedUntil,
          isPermanent: lockout2.isPermanent || false,
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

    // ── Step 2b: Enforce platform separation ──
    const isWebLogin = !deviceId;
    const isMobileLogin = !!deviceId;
    const portalRoles = ["SUPER_ADMIN", "ADMIN", "NURSE", "DISTRICT_OFFICER"];
    const mobileRoles = ["CCW"];

    if (isWebLogin && !portalRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "This account is mobile-only. Please use the MobileHealth app.",
      });
    }

    if (isMobileLogin && !mobileRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "This account is portal-only. Please log in via the web portal.",
      });
    }

    // ── Step 3: Check PIN ──
    const pinMatch = await bcrypt.compare(String(pin), user.pinHash);

    if (!pinMatch) {
      await prisma.loginAttempt.create({
        data: { phoneNumber, ipAddress, deviceId, success: false },
      });

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
        const existingLockout = await prisma.loginLockout.findUnique({
          where: { phoneNumber },
        });

        const lockoutCount = (existingLockout?.lockoutCount || 0) + 1;
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

    // ── Step 4: Success — record success ──
    await prisma.loginAttempt.create({
      data: { phoneNumber, ipAddress, deviceId, success: true },
    });

    // ── Step 4a: PIN was reset by admin — force new PIN, no session ──
    if (user.mustChangePin) {
      return res.json({
        success: true,
        mustChangePin: true,
        message: "Your PIN was reset. Please create a new PIN to continue.",
        data: {
          userId: user.id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
        },
      });
    }

    // ── Step 4b: Block CCW with no zone allocation ──
    if (user.role === "CCW" && user.zoneAllocations.length === 0) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has not been allocated to a zone yet. Contact your supervisor.",
        code: "NO_ZONE_ALLOCATION",
      });
    }

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

// PATCH /api/auth/complete-pin-reset
export const completePinReset = async (req, res, next) => {
  try {
    const { userId, tempPin, newPin } = req.body;

    if (!userId || !tempPin || !newPin) {
      return res.status(400).json({
        success: false,
        message: "userId, tempPin and newPin are required.",
      });
    }

    if (String(newPin).length !== 4 || isNaN(newPin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits.",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid request.",
      });
    }

    if (!user.mustChangePin) {
      return res.status(400).json({
        success: false,
        message: "No PIN reset is pending for this account.",
      });
    }

    const tempPinMatch = await bcrypt.compare(String(tempPin), user.pinHash);
    if (!tempPinMatch) {
      return res.status(401).json({
        success: false,
        message: "Temporary PIN is incorrect.",
      });
    }

    const pinHash = await bcrypt.hash(String(newPin), 12);
    await prisma.user.update({
      where: { id: userId },
      data: { pinHash, mustChangePin: false },
    });

    res.json({
      success: true,
      message: "PIN updated successfully. You can now log in.",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/flag-lockout
export const flagLockout = async (req, res, next) => {
  try {
    const { phoneNumber: rawPhone, reason, lockedUntil } = req.body;
    const phoneNumber = normalizePhone(rawPhone);

    console.log("📤 Flagging lockout for:", phoneNumber);

    let user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true, fullName: true, phoneNumber: true, isActive: true },
    });

    if (!user) {
      console.log("📝 Unknown phone number - creating shadow record...");

      try {
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

    await prisma.loginLockout.upsert({
      where: { phoneNumber },
      update: {
        lockedUntil: new Date(lockedUntil),
        lockoutCount: { increment: 1 },
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

    await prisma.user.update({
      where: { phoneNumber },
      data: { isActive: false },
    });

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

    console.log("Lockout flag saved for:", phoneNumber);

    res.json({ success: true });
  } catch (err) {
    console.error("Error in flagLockout:", err);
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
