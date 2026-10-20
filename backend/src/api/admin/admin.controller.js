import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import {
  sendSms,
  APP_DOWNLOAD_LINK,
  PORTAL_LINK,
} from "../../utils/smsService.js";
import { sendEmail } from "../../utils/emailService.js";

// ─── USERS
export const getUsers = async (req, res, next) => {
  try {
    const { role, isActive } = req.query;

    // ADMIN (facility-scoped) only sees users belonging to their facility
    let facilityScope = {};
    if (req.user.role === "ADMIN" && req.user.facilityId) {
      facilityScope = { facilityId: req.user.facilityId };
    }

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
        ...facilityScope,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        facility: {
          select: {
            id: true,
            name: true,
            facilityType: true,
            district: { select: { name: true } },
            ta: { select: { name: true } },
          },
        },
        zoneAllocations: { select: { zone: { include: { ta: true } } } },
        taAllocations: { select: { ta: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      phone,
      role,
      facilityId,
      pin,
    } = req.body;

    if (!firstName || !lastName || !phoneNumber || !role) {
      return res.status(400).json({
        success: false,
        message: "Names, phone, and role are required.",
      });
    }

    const isWebUser = [
      "NURSE",
      "DISTRICT_OFFICER",
      "PHARMACIST",
      "ADMIN",
      "SUPER_ADMIN",
    ].includes(role);
    let tempPassword = null;
    let passwordHash = null;

    if (isWebUser) {
      if (!email)
        return res.status(400).json({
          success: false,
          message: "Email is required for web portal users.",
        });
      tempPassword = Math.random().toString(36).slice(-8); // Generate 8-char temp password
      passwordHash = await bcrypt.hash(tempPassword, 12);
    }

    const pinHash = await bcrypt.hash(String(pin || "1234"), 12);

    let assignedFacilityId = null;
    if (["NURSE", "DISTRICT_OFFICER", "PHARMACIST", "CCW"].includes(role)) {
      if (req.user.role === "ADMIN" && req.user.facilityId) {
        assignedFacilityId = req.user.facilityId;
      } else if (req.user.role === "SUPER_ADMIN") {
        assignedFacilityId = facilityId || null;
      }
    } else if (role === "ADMIN") {
      assignedFacilityId = facilityId || null;
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phoneNumber,
        phone: phone || null,
        email: email ? email.toLowerCase().trim() : null,
        passwordHash,
        pinHash,
        role,
        facilityId: assignedFacilityId,
        mustChangePin: true, // Forces change for both PIN (CCW) and Password (Web)
      },
    });

    // Notify User
    try {
      if (isWebUser) {
        await sendEmail(
          user.email,
          "Welcome to MobileHealth Malawi - Your Account Details",
          `<h3>Hello ${firstName},</h3>
           <p>Your account has been created. Use the credentials below to log in:</p>
           <p><strong>Email:</strong> ${email}</p>
           <p><strong>Temporary Password:</strong> ${tempPassword}</p>
           <p>You will be asked to change this password on your first login.</p>
           <p><a href="${process.env.PORTAL_LINK || "http://localhost:5173"}">Go to Portal</a></p>`,
        );
      } else {
        await sendSms(
          user.phoneNumber,
          `MobileHealth Malawi\n\nHello ${firstName}, your account has been created.\nRole: ${role}\nContact your admin for your PIN.`,
        );
      }
    } catch (notifyErr) {
      console.error("Notification failed:", notifyErr.message);
    }

    res.status(201).json({
      success: true,
      data: { id: user.id, firstName, lastName, role },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Phone number or Email is already registered.",
      });
    }
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, phoneNumber, phone, email, role, facilityId } =
      req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(phoneNumber ? { phoneNumber } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined
          ? { email: email ? email.toLowerCase().trim() : null }
          : {}),
        ...(role ? { role } : {}),
        ...(facilityId !== undefined ? { facilityId: facilityId || null } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        facility: { select: { id: true, name: true, facilityType: true } },
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: { id: true, firstName: true, lastName: true, isActive: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const reactivateUser = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: true },
      select: { id: true, firstName: true, lastName: true, isActive: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/reset-pin
export const resetUserPin = async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        facilityId: true,
      },
    });

    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // ── Role scoping ──
    if (req.user.role === "ADMIN") {
      const allowedRoles = ["CCW", "NURSE", "DISTRICT_OFFICER", "PHARMACIST"];
      if (!allowedRoles.includes(targetUser.role)) {
        return res.status(403).json({
          success: false,
          message: "You are not permitted to reset this account's PIN.",
        });
      }
      if (
        !req.user.facilityId ||
        targetUser.facilityId !== req.user.facilityId
      ) {
        return res.status(403).json({
          success: false,
          message: "This user does not belong to your facility.",
        });
      }
    } else if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You are not permitted to reset PINs.",
      });
    }

    // Generate a random 4-digit temp PIN
    const tempPin = String(Math.floor(1000 + Math.random() * 9000));
    const pinHash = await bcrypt.hash(tempPin, 12);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        pinHash,
        mustChangePin: true,
        pinResetAt: new Date(),
        pinResetById: req.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "PIN_RESET",
        recordType: "USER",
        recordId: targetUser.id,
        newValue: { resetBy: req.user.id, resetAt: new Date().toISOString() },
      },
    });

    res.json({
      success: true,
      message: `Temporary PIN generated for ${targetUser.firstName} ${targetUser.lastName}. Relay it to them now — it will not be shown again.`,
      data: { tempPin },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GEOGRAPHY
export const createRegion = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Name is required." });
    const region = await prisma.region.create({ data: { name } });
    res.status(201).json({ success: true, data: region });
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({
        success: false,
        message: `Region "${req.body.name}" already exists.`,
      });
    next(err);
  }
};

export const createDistrict = async (req, res, next) => {
  try {
    const { name, regionId } = req.body;
    if (!name || !regionId)
      return res
        .status(400)
        .json({ success: false, message: "name and regionId are required." });
    const district = await prisma.district.create({ data: { name, regionId } });
    res.status(201).json({ success: true, data: district });
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({
        success: false,
        message: `District "${req.body.name}" already exists in this region.`,
      });
    next(err);
  }
};

export const createTA = async (req, res, next) => {
  try {
    const { name, districtId } = req.body;
    if (!name || !districtId)
      return res
        .status(400)
        .json({ success: false, message: "name and districtId are required." });
    const ta = await prisma.traditionalAuthority.create({
      data: { name, districtId },
    });
    res.status(201).json({ success: true, data: ta });
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({
        success: false,
        message: `TA "${req.body.name}" already exists in this district.`,
      });
    next(err);
  }
};

export const createZone = async (req, res, next) => {
  try {
    const { name, taId } = req.body;
    if (!name || !taId)
      return res
        .status(400)
        .json({ success: false, message: "name and taId are required." });
    const zone = await prisma.zone.create({ data: { name, taId } });
    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({
        success: false,
        message: `Zone "${req.body.name}" already exists in this TA.`,
      });
    next(err);
  }
};

// ─── ALLOCATIONS
export const allocateUserToZone = async (req, res, next) => {
  try {
    const { userId, zoneId } = req.body;
    if (!userId || !zoneId)
      return res
        .status(400)
        .json({ success: false, message: "userId and zoneId are required." });

    const existing = await prisma.userZoneAllocation.findUnique({
      where: { userId_zoneId: { userId, zoneId } },
      include: { zone: true, user: true },
    });
    if (existing)
      return res.status(409).json({
        success: false,
        message: `${existing.user.firstName} ${existing.user.lastName} is already allocated to ${existing.zone.name}.`,
      });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        facilityId: true,
      },
    });
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    if (targetUser.role !== "CCW") {
      return res.status(400).json({
        success: false,
        message: "Only CCW users can be allocated to a zone.",
      });
    }

    const allocation = await prisma.userZoneAllocation.create({
      data: { userId, zoneId, allocatedById: req.user.id },
    });

    let facilityAssigned = false;
    if (req.user.role === "ADMIN" && req.user.facilityId) {
      if (targetUser.facilityId !== req.user.facilityId) {
        await prisma.user.update({
          where: { id: userId },
          data: { facilityId: req.user.facilityId },
        });
        facilityAssigned = true;

        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: "FACILITY_AUTO_ASSIGNED",
            recordType: "USER",
            recordId: userId,
            oldValue: { facilityId: targetUser.facilityId ?? null },
            newValue: {
              facilityId: req.user.facilityId,
              reason: "Auto-assigned during zone allocation",
              zoneId,
            },
          },
        });
      }
    }

    res.status(201).json({
      success: true,
      data: allocation,
      facilityAssigned,
    });
  } catch (err) {
    next(err);
  }
};

export const allocateUserToTA = async (req, res, next) => {
  try {
    const { userId, taId } = req.body;
    if (!userId || !taId)
      return res
        .status(400)
        .json({ success: false, message: "userId and taId are required." });

    const existing = await prisma.userTaAllocation.findUnique({
      where: { userId_taId: { userId, taId } },
      include: { ta: true, user: true },
    });
    if (existing)
      return res.status(409).json({
        success: false,
        message: `${existing.user.firstName} ${existing.user.lastName} is already allocated to ${existing.ta.name}.`,
      });

    const allocation = await prisma.userTaAllocation.create({
      data: { userId, taId, allocatedById: req.user.id },
    });
    res.status(201).json({ success: true, data: allocation });
  } catch (err) {
    next(err);
  }
};

export const getFacilities = async (req, res, next) => {
  try {
    const { facilityType, districtId, taId } = req.query;

    let scopeFilter = {};
    if (req.user.role === "ADMIN" && req.user.facilityId) {
      const adminFacility = await prisma.facility.findUnique({
        where: { id: req.user.facilityId },
        select: { districtId: true, taId: true },
      });
      if (adminFacility?.districtId) {
        scopeFilter = { districtId: adminFacility.districtId };
      } else if (adminFacility?.taId) {
        const ta = await prisma.traditionalAuthority.findUnique({
          where: { id: adminFacility.taId },
          select: { districtId: true },
        });
        if (ta?.districtId) {
          scopeFilter = { districtId: ta.districtId };
        }
      }
    }

    const facilities = await prisma.facility.findMany({
      where: {
        ...(facilityType ? { facilityType } : {}),
        ...(districtId ? { districtId } : {}),
        ...(taId ? { taId } : {}),
        ...scopeFilter,
      },
      include: {
        district: { select: { id: true, name: true } },
        ta: { select: { id: true, name: true, districtId: true } },
        parentDistrictHospital: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: facilities });
  } catch (err) {
    next(err);
  }
};

export const createFacility = async (req, res, next) => {
  try {
    const {
      name,
      facilityType,
      districtId,
      taId,
      gpsLat,
      gpsLng,
      parentDistrictHospitalId,
    } = req.body;

    if (!name || !facilityType) {
      return res.status(400).json({
        success: false,
        message: "Facility name and type are required.",
      });
    }

    if (facilityType === "DISTRICT_HOSPITAL") {
      if (!districtId) {
        return res.status(400).json({
          success: false,
          message: "District is required for a District Hospital.",
        });
      }
      const facility = await prisma.facility.create({
        data: {
          name,
          facilityType,
          districtId,
          taId: null,
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
        },
      });
      return res.status(201).json({ success: true, data: facility });
    }

    if (facilityType === "TA_HOSPITAL") {
      if (!parentDistrictHospitalId) {
        return res.status(400).json({
          success: false,
          message: "TA Hospital must be tied to a District Hospital.",
        });
      }

      const parent = await prisma.facility.findUnique({
        where: { id: parentDistrictHospitalId },
        select: { facilityType: true, districtId: true },
      });
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "District Hospital not found.",
        });
      }
      if (parent.facilityType !== "DISTRICT_HOSPITAL") {
        return res.status(400).json({
          success: false,
          message: "Parent facility must be a District Hospital.",
        });
      }

      if (!taId) {
        return res.status(400).json({
          success: false,
          message: "Traditional Authority is required for a TA Hospital.",
        });
      }

      const ta = await prisma.traditionalAuthority.findUnique({
        where: { id: taId },
        select: { districtId: true },
      });
      if (!ta) {
        return res.status(404).json({
          success: false,
          message: "Traditional Authority not found.",
        });
      }
      if (ta.districtId !== parent.districtId) {
        return res.status(400).json({
          success: false,
          message:
            "The selected TA must be in the same district as the parent District Hospital.",
        });
      }

      const facility = await prisma.facility.create({
        data: {
          name,
          facilityType,
          districtId: parent.districtId,
          taId,
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
          parentDistrictHospitalId,
        },
      });
      return res.status(201).json({ success: true, data: facility });
    }

    if (facilityType === "CLINIC") {
      if (!taId) {
        return res.status(400).json({
          success: false,
          message: "Traditional Authority is required for a Clinic.",
        });
      }

      const ta = await prisma.traditionalAuthority.findUnique({
        where: { id: taId },
        select: { districtId: true },
      });
      if (!ta) {
        return res.status(404).json({
          success: false,
          message: "Traditional Authority not found.",
        });
      }

      const facility = await prisma.facility.create({
        data: {
          name,
          facilityType,
          districtId: ta.districtId,
          taId,
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
        },
      });
      return res.status(201).json({ success: true, data: facility });
    }
    return res.status(400).json({
      success: false,
      message: "Invalid facility type.",
    });
  } catch (err) {
    next(err);
  }
};

// ─── DRUGS
export const createDrug = async (req, res, next) => {
  try {
    const { drugCode, nameEnglish, nameChichewa, unit, minimumThreshold } =
      req.body;
    if (
      !drugCode ||
      !nameEnglish ||
      !nameChichewa ||
      !unit ||
      !minimumThreshold
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All drug fields are required." });
    }
    const drug = await prisma.drug.create({
      data: {
        drugCode,
        nameEnglish,
        nameChichewa,
        unit,
        minimumThreshold: parseInt(minimumThreshold),
      },
    });
    res.status(201).json({ success: true, data: drug });
  } catch (err) {
    next(err);
  }
};

// ─── SECURITY ────────────────────────────────────────────────────────────────

export const getSecurityAlerts = async (req, res, next) => {
  try {
    console.log("📊 Fetching security alerts...");

    const lockedUsers = await prisma.loginLockout.findMany({
      where: {
        isPermanent: true,
        lockedUntil: {
          gt: new Date(),
        },
      },
      orderBy: {
        lockedUntil: "desc",
      },
    });

    const phoneNumbers = lockedUsers.map((l) => l.phoneNumber);

    let userData = [];
    if (phoneNumbers.length > 0) {
      userData = await prisma.user.findMany({
        where: {
          phoneNumber: {
            in: phoneNumbers,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          zoneAllocations: {
            select: {
              zone: { select: { name: true } },
            },
          },
        },
      });
    }

    const formattedLockedUsers = lockedUsers.map((lockout) => {
      const user = userData.find((u) => u.phoneNumber === lockout.phoneNumber);
      const isShadowUser = user?.id?.startsWith("shadow_") || false;

      return {
        id: user?.id || lockout.phoneNumber,
        firstName: user?.firstName || "Unknown",
        lastName: user?.lastName || `(${lockout.phoneNumber})`,
        phoneNumber: lockout.phoneNumber,
        role: user?.role || "UNKNOWN",
        isActive: user?.isActive || false,
        isShadowUser: isShadowUser,
        lockoutReason: "48 hour lockout",
        lockoutUntil: lockout.lockedUntil,
        zoneAllocations: user?.zoneAllocations || [],
      };
    });

    const unknownAttempts = await prisma.unknownLoginAttempt.findMany({
      where: {
        attemptCount: {
          gte: 3,
        },
      },
      orderBy: {
        lastAttemptAt: "desc",
      },
      take: 20,
    });

    const alerts = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ["ACCOUNT_LOCKED", "ACCOUNT_LOCKED_48H", "ACCOUNT_UNLOCKED"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            role: true,
            isActive: true,
          },
        },
      },
      orderBy: { loggedAt: "desc" },
      take: 50,
    });

    const formattedAlerts = alerts.map((alert) => ({
      ...alert,
      isShadowUser: alert.user?.id?.startsWith("shadow_") || false,
    }));

    console.log(
      `📊 Found ${lockedUsers.length} locked users, ${unknownAttempts.length} unknown attempts`,
    );

    res.json({
      success: true,
      data: {
        alerts: formattedAlerts,
        lockedUsers: formattedLockedUsers,
        unknownAttempts: unknownAttempts,
      },
    });
  } catch (err) {
    console.error(" Error in getSecurityAlerts:", err);
    next(err);
  }
};

export const unlockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, phoneNumber: true, firstName: true, lastName: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await prisma.loginLockout.update({
      where: { phoneNumber: user.phoneNumber },
      data: {
        lockedUntil: null,
        unlockedAt: new Date(),
        unlockedById: req.user.id,
        isPermanent: false,
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "ACCOUNT_UNLOCKED",
        recordType: "USER",
        recordId: user.id,
        newValue: {
          unlockedBy: req.user.id,
          unlockedAt: new Date().toISOString(),
          phoneNumber: user.phoneNumber,
        },
      },
    });

    console.log(" User unlocked:", user.phoneNumber);

    res.json({ success: true, data: updatedUser });
  } catch (err) {
    next(err);
  }
};

export const updateDrug = async (req, res, next) => {
  try {
    const drug = await prisma.drug.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: drug });
  } catch (err) {
    next(err);
  }
};
