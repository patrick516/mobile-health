import prisma from "../../config/db.js";
import { findPotentialDuplicates } from "../../utils/villageDedup.js";

// GET /api/geography/regions
export const getRegions = async (req, res, next) => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: regions });
  } catch (err) {
    next(err);
  }
};
// GET /api/geography/districts?regionId=  ← this line stays, just add above it

// GET /api/geography/districts?regionId=
export const getDistricts = async (req, res, next) => {
  try {
    const { regionId } = req.query;
    const districts = await prisma.district.findMany({
      where: regionId ? { regionId } : undefined,
      include: { region: true },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: districts });
  } catch (err) {
    next(err);
  }
};

// GET /api/geography/tas?districtId=&regionId=
export const getTAs = async (req, res, next) => {
  try {
    const { districtId, regionId } = req.query;

    // Facility scoping for non-admin users
    let facilityFilter = {};
    if (req.user.role !== "ADMIN" && req.user.facilityId) {
      const facility = await prisma.facility.findUnique({
        where: { id: req.user.facilityId },
        select: { districtId: true, taId: true },
      });
      if (facility?.taId) {
        facilityFilter = { id: facility.taId };
      } else if (facility?.districtId) {
        facilityFilter = { districtId: facility.districtId };
      }
    }

    const tas = await prisma.traditionalAuthority.findMany({
      where: {
        ...(districtId ? { districtId } : {}),
        ...(regionId && !districtId ? { district: { regionId } } : {}),
        ...facilityFilter,
      },
      include: { district: { include: { region: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: tas });
  } catch (err) {
    next(err);
  }
};

// GET /api/geography/my-tas — TAs the logged-in user is allowed to filter by
export const getMyTAs = async (req, res, next) => {
  try {
    let where = {};

    if (req.user.role === "ADMIN") {
      where = {}; // sees all
    } else if (req.user.scopeLevel === "DISTRICT" && req.user.districtId) {
      where = { districtId: req.user.districtId };
    } else if (req.user.scopeLevel === "TA" && req.user.taIds.length > 0) {
      where = { id: { in: req.user.taIds } };
    } else {
      // CCW or unscoped user — no TA-level filtering applies to them
      return res.json({ success: true, data: [] });
    }

    const tas = await prisma.traditionalAuthority.findMany({
      where,
      include: { district: { include: { region: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: tas });
  } catch (err) {
    next(err);
  }
};

// GET /api/geography/zones?taId=&districtId=&regionId=
export const getZones = async (req, res, next) => {
  try {
    const { taId, districtId, regionId } = req.query;

    const isRestricted = ["CCW", "NURSE"].includes(req.user.role);

    // Build cascading where clause
    let taFilter = {};
    if (taId) {
      taFilter = { taId };
    } else if (districtId) {
      taFilter = { ta: { districtId } };
    } else if (regionId) {
      taFilter = { ta: { district: { regionId } } };
    }

    // Facility scoping — non-admin users only see zones within their facility's geography
    let facilityFilter = {};
    if (req.user.role !== "ADMIN" && req.user.facilityId) {
      const facility = await prisma.facility.findUnique({
        where: { id: req.user.facilityId },
        select: { districtId: true, taId: true },
      });
      if (facility?.taId) {
        facilityFilter = { taId: facility.taId };
      } else if (facility?.districtId) {
        facilityFilter = { ta: { districtId: facility.districtId } };
      }
    }

    const zones = await prisma.zone.findMany({
      where: {
        ...taFilter,
        ...facilityFilter,
        ...(isRestricted && req.user.zoneIds?.length > 0
          ? { id: { in: req.user.zoneIds } }
          : {}),
      },
      include: { ta: { include: { district: { include: { region: true } } } } },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: zones });
  } catch (err) {
    next(err);
  }
};

// GET /api/geography/villages?zoneId=
export const getVillages = async (req, res, next) => {
  try {
    const { zoneId, search } = req.query;

    if (!zoneId) {
      return res.status(400).json({
        success: false,
        message: "zoneId is required.",
      });
    }

    const villages = await prisma.village.findMany({
      where: {
        zoneId,
        canonicalVillageId: null, // only show canonical entries
        ...(search
          ? {
              name: { contains: search, mode: "insensitive" },
            }
          : {}),
      },
      orderBy: [
        // Villages created by this user come first (their own history)
        { createdByUserId: "asc" },
        { name: "asc" },
      ],
    });

    // Sort: current user's villages first
    const sorted = [
      ...villages.filter((v) => v.createdByUserId === req.user.id),
      ...villages.filter((v) => v.createdByUserId !== req.user.id),
    ];

    res.json({ success: true, data: sorted });
  } catch (err) {
    next(err);
  }
};

// POST /api/geography/villages
export const createVillage = async (req, res, next) => {
  try {
    const { name, zoneId, gpsLat, gpsLng } = req.body;

    if (!name || !zoneId) {
      return res.status(400).json({
        success: false,
        message: "Village name and zoneId are required.",
      });
    }

    // Check for potential duplicates in this zone
    const existingVillages = await prisma.village.findMany({
      where: { zoneId, canonicalVillageId: null },
      select: { id: true, name: true },
    });

    const duplicates = findPotentialDuplicates(name, existingVillages);

    if (duplicates.length > 0) {
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message:
          "Similar villages found. Please confirm this is a new village.",
        potentialDuplicates: duplicates,
      });
    }

    // Create the village
    const village = await prisma.village.create({
      data: {
        name: name.trim(),
        zoneId,
        gpsLat: gpsLat || null,
        gpsLng: gpsLng || null,
        createdByUserId: req.user.id,
        isVerified: false,
      },
    });

    res.status(201).json({ success: true, data: village });
  } catch (err) {
    next(err);
  }
};

// GET /api/geography/tree — full tree for admin
export const getGeographyTree = async (req, res, next) => {
  try {
    const regions = await prisma.region.findMany({
      include: {
        districts: {
          include: {
            traditionalAuthorities: {
              include: {
                zones: {
                  include: { villages: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: regions });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/geography/villages/:id
export const deleteVillage = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if village exists
    const village = await prisma.village.findUnique({
      where: { id },
      include: {
        households: {
          select: { id: true },
        },
      },
    });

    if (!village) {
      return res.status(404).json({
        success: false,
        message: "Village not found",
      });
    }

    // Check if village has households
    const householdCount = village.households?.length || 0;

    if (householdCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete village with ${householdCount} household(s) attached. Please reassign or delete households first.`,
      });
    }

    // Delete the village
    await prisma.village.delete({
      where: { id },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "VILLAGE_DELETED",
        recordType: "VILLAGE",
        recordId: id,
        newValue: {
          villageName: village.name,
          deletedBy: req.user.id,
          deletedAt: new Date().toISOString(),
        },
      },
    });

    console.log(
      `🗑️ Village "${village.name}" (${id}) deleted by user ${req.user.id}`,
    );

    res.json({
      success: true,
      message: "Village deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting village:", error);
    next(error);
  }
};
