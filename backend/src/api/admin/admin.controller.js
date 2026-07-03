import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";

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
            district: { select: { name: true } },
            ta: { select: { name: true } },
          },
        },
        zoneAllocations: { select: { zone: { include: { ta: true } } } },
        taAllocations: { select: { ta: true } },
      },
      orderBy: { fullName: "asc" },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};
export const createUser = async (req, res, next) => {
  try {
    const { fullName, phoneNumber, pin, role, facilityId } = req.body;
    if (!fullName || !phoneNumber || !pin || !role) {
      return res.status(400).json({
        success: false,
        message: "fullName, phoneNumber, pin and role are required.",
      });
    }
    if (String(pin).length !== 4) {
      return res
        .status(400)
        .json({ success: false, message: "PIN must be 4 digits." });
    }
    const pinHash = await bcrypt.hash(String(pin), 12);

    // ADMIN creating users — auto-assign their facility to the new user
    // unless SUPER_ADMIN explicitly provides a facilityId
    let assignedFacilityId = null;
    if (["NURSE", "DISTRICT_OFFICER", "CCW"].includes(role)) {
      if (req.user.role === "ADMIN" && req.user.facilityId) {
        assignedFacilityId = req.user.facilityId;
      } else if (req.user.role === "SUPER_ADMIN") {
        assignedFacilityId = facilityId || null;
      }
    } else if (role === "ADMIN") {
      // SUPER_ADMIN creating an ADMIN — facility assigned later via allocation
      assignedFacilityId = facilityId || null;
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        phoneNumber,
        pinHash,
        role,
        facilityId: assignedFacilityId,
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        facility: { select: { id: true, name: true, facilityType: true } },
      },
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({
        success: false,
        message: `Phone number ${req.body.phoneNumber} is already registered.`,
      });
    next(err);
  }
};
export const updateUser = async (req, res, next) => {
  try {
    const { fullName, phoneNumber, role, facilityId } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(fullName ? { fullName } : {}),
        ...(phoneNumber ? { phoneNumber } : {}),
        ...(role ? { role } : {}),
        ...(facilityId !== undefined ? { facilityId: facilityId || null } : {}),
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
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
      select: { id: true, fullName: true, isActive: true },
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
      select: { id: true, fullName: true, isActive: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/reset-pin
// Generates a random temp PIN, hashes and saves it, flags the account so
// the next login forces a new PIN. Returns the plaintext temp PIN ONCE —
// it is never stored or logged anywhere, only shown to the admin so they
// can relay it by phone/SMS manually.
export const resetUserPin = async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, fullName: true, role: true, facilityId: true },
    });

    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // ── Role scoping ──
    // ADMIN may only reset CCW / NURSE / DISTRICT_OFFICER within their
    // own facility. SUPER_ADMIN may reset anyone, including ADMINs.
    if (req.user.role === "ADMIN") {
      const allowedRoles = ["CCW", "NURSE", "DISTRICT_OFFICER"];
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

    // Generate a random 4-digit temp PIN, e.g. "0294"
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
      message: `Temporary PIN generated for ${targetUser.fullName}. Relay it to them now — it will not be shown again.`,
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

    // Check if already allocated to this zone
    const existing = await prisma.userZoneAllocation.findUnique({
      where: { userId_zoneId: { userId, zoneId } },
      include: { zone: true, user: true },
    });
    if (existing)
      return res.status(409).json({
        success: false,
        message: `${existing.user.fullName} is already allocated to ${existing.zone.name}.`,
      });

    const allocation = await prisma.userZoneAllocation.create({
      data: { userId, zoneId, allocatedById: req.user.id },
    });
    res.status(201).json({ success: true, data: allocation });
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

    // Check if already allocated to this TA
    const existing = await prisma.userTaAllocation.findUnique({
      where: { userId_taId: { userId, taId } },
      include: { ta: true, user: true },
    });
    if (existing)
      return res.status(409).json({
        success: false,
        message: `${existing.user.fullName} is already allocated to ${existing.ta.name}.`,
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

    // ─── SCOPE FOR ADMIN ───
    let scopeFilter = {};
    if (req.user.role === "ADMIN" && req.user.facilityId) {
      const adminFacility = await prisma.facility.findUnique({
        where: { id: req.user.facilityId },
        select: { districtId: true, taId: true },
      });
      if (adminFacility?.districtId) {
        scopeFilter = { districtId: adminFacility.districtId };
      } else if (adminFacility?.taId) {
        // If facility is at TA level, get the district from the TA
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
      parentDistrictHospitalId, // new field
    } = req.body;

    if (!name || !facilityType) {
      return res.status(400).json({
        success: false,
        message: "Facility name and type are required.",
      });
    }

    // ─── DISTRICT HOSPITAL ──────────────────────────────
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

    // ─── TA HOSPITAL ──────────────────────────────────────
    if (facilityType === "TA_HOSPITAL") {
      // 1. Parent district hospital must be provided
      if (!parentDistrictHospitalId) {
        return res.status(400).json({
          success: false,
          message: "TA Hospital must be tied to a District Hospital.",
        });
      }

      // 2. Validate parent exists and is a DISTRICT_HOSPITAL
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

      // 3. TA must be provided
      if (!taId) {
        return res.status(400).json({
          success: false,
          message: "Traditional Authority is required for a TA Hospital.",
        });
      }

      // 4. TA must belong to the same district as the parent
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

      // 5. Create the TA Hospital
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

    // ─── CLINIC ──────────────────────────────────────────
    if (facilityType === "CLINIC") {
      if (!taId) {
        return res.status(400).json({
          success: false,
          message: "Traditional Authority is required for a Clinic.",
        });
      }
      const facility = await prisma.facility.create({
        data: {
          name,
          facilityType,
          districtId: null,
          taId,
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
        },
      });
      return res.status(201).json({ success: true, data: facility });
    }

    // Fallback (should never reach here)
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

    // ── Step 1: Get locked users (including shadow users) ──
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

    // ── Step 2: Get user details for locked users ──
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
          fullName: true,
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

    // ── Step 3: Format for dashboard ──
    const formattedLockedUsers = lockedUsers.map((lockout) => {
      const user = userData.find((u) => u.phoneNumber === lockout.phoneNumber);
      const isShadowUser = user?.id?.startsWith("shadow_") || false;

      return {
        id: user?.id || lockout.phoneNumber,
        fullName: user?.fullName || `Unknown (${lockout.phoneNumber})`,
        phoneNumber: lockout.phoneNumber,
        role: user?.role || "UNKNOWN",
        isActive: user?.isActive || false,
        isShadowUser: isShadowUser, // 🔴 Flag for admin
        lockoutReason: "48 hour lockout",
        lockoutUntil: lockout.lockedUntil,
        zoneAllocations: user?.zoneAllocations || [],
      };
    });

    // ── Step 4: Get unknown login attempts ──
    const unknownAttempts = await prisma.unknownLoginAttempt.findMany({
      where: {
        attemptCount: {
          gte: 3, // Show attempts with 3+ tries
        },
      },
      orderBy: {
        lastAttemptAt: "desc",
      },
      take: 20,
    });

    // ── Step 5: Get security alerts from audit_log ──
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
            fullName: true,
            phoneNumber: true,
            role: true,
            isActive: true,
          },
        },
      },
      orderBy: { loggedAt: "desc" },
      take: 50,
    });

    // ── Step 6: Combine everything ──
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

    // 🔴 UPDATE: First, find the user
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, phoneNumber: true, fullName: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔴 UPDATE: Clear the lockout record
    await prisma.loginLockout.update({
      where: { phoneNumber: user.phoneNumber },
      data: {
        lockedUntil: null,
        unlockedAt: new Date(),
        unlockedById: req.user.id,
        isPermanent: false,
      },
    });

    // Update user - reactivate
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
      },
    });

    // Write to audit log
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
