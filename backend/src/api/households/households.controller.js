import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";
import {
  calculateHouseholdRisk,
  calculateHealthScore,
} from "../../utils/riskScore.js";
// GET /api/households?zoneId=&villageId=&search=&page=&limit=
export const getHouseholds = async (req, res, next) => {
  try {
    const { zoneId, villageId, taId, search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Explicit filters take priority; otherwise fall back to the user's scope
    let villageFilter = {};
    if (villageId) {
      villageFilter = { villageId };
    } else if (zoneId) {
      villageFilter = { village: { zoneId } };
    } else {
      villageFilter = { village: buildVillageScope(req.user, taId) };
    }

    const where = {
      ...villageFilter,
      status: "ACTIVE",
      ...(search
        ? {
            OR: [
              {
                headOfHouseholdName: { contains: search, mode: "insensitive" },
              },
              { householdNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [households, total] = await Promise.all([
      prisma.household.findMany({
        where,
        include: {
          village: { include: { zone: { include: { ta: true } } } },
          members: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              fullName: true,
              sex: true,
              dateOfBirth: true,
              estimatedAge: true,
              isPregnant: true,
              visits: {
                orderBy: { visitedAt: "desc" },
                take: 1,
                select: { visitedAt: true },
              },
              referrals: {
                where: { status: { in: ["PENDING", "OVERDUE"] } },
                select: { id: true },
              },
              immunisationSchedules: {
                where: { status: "OVERDUE" },
                select: { id: true },
              },
              ancVisits: { where: { status: "OVERDUE" }, select: { id: true } },
            },
          },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.household.count({ where }),
    ]);

    // Calculate risk level per household using the shared scoring logic
    const householdsWithRisk = households.map((h) => {
      const healthScore = calculateHealthScore(h);

      const allVisitDates = h.members
        .flatMap((m) => m.visits.map((v) => v.visitedAt))
        .filter(Boolean);
      const lastVisitDate = allVisitDates.length
        ? new Date(Math.max(...allVisitDates.map((d) => new Date(d).getTime())))
        : null;
      const daysSinceLastVisit = lastVisitDate
        ? Math.floor(
            (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null;

      const pendingReferrals = h.members.reduce(
        (sum, m) => sum + m.referrals.length,
        0,
      );
      const overdueVaccines = h.members.reduce(
        (sum, m) => sum + m.immunisationSchedules.length,
        0,
      );
      const overdueAnc = h.members.reduce(
        (sum, m) => sum + m.ancVisits.length,
        0,
      );

      const risk = calculateHouseholdRisk({
        healthScore,
        daysSinceLastVisit,
        pendingReferrals,
        overdueVaccines,
        overdueAnc,
      });

      // Strip the nested detail arrays before sending to client (keep payload light)
      const { members, ...rest } = h;
      const cleanMembers = members.map(
        ({ visits, referrals, immunisationSchedules, ancVisits, ...m }) => m,
      );

      return {
        ...rest,
        members: cleanMembers,
        riskLevel: risk.level,
        riskScore: risk.score,
        riskReasons: risk.reasons,
      };
    });

    res.json({
      success: true,
      data: householdsWithRisk,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/households/:id
export const getHousehold = async (req, res, next) => {
  try {
    const household = await prisma.household.findUnique({
      where: { id: req.params.id },
      include: {
        village: {
          include: {
            zone: {
              include: {
                ta: { include: { district: { include: { region: true } } } },
              },
            },
          },
        },
        members: {
          include: {
            visits: { orderBy: { visitedAt: "desc" }, take: 1 },
            referrals: { where: { status: { in: ["PENDING", "OVERDUE"] } } },
            immunisationSchedules: {
              where: { status: { in: ["DUE", "OVERDUE"] } },
            },
            ancVisits: { where: { status: { in: ["SCHEDULED", "OVERDUE"] } } },
          },
        },
      },
    });

    if (!household) {
      return res
        .status(404)
        .json({ success: false, message: "Household not found." });
    }

    res.json({ success: true, data: household });
  } catch (err) {
    next(err);
  }
};

// POST /api/households
export const createHousehold = async (req, res, next) => {
  try {
    const {
      localId,
      villageId,
      headOfHouseholdName,
      headPhone,
      headNationalId,
      consentGiven,
      consentSignatureUrl,
      structureType,
      waterSource,
      latrinePresent,
      latrineType,
      handwashingFacility,
      handwashingWithSoap,
      distanceToFacility,
      mosquitoNets,
      numberOfRooms,
      landmark,
      gpsLat,
      gpsLng,
    } = req.body;

    if (!localId || !villageId || !headOfHouseholdName) {
      return res.status(400).json({
        success: false,
        message: "localId, villageId and headOfHouseholdName are required.",
      });
    }

    // Generate household number: first 3 letters of village + timestamp suffix
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { zone: { include: { ta: true } } },
    });

    if (!village) {
      return res
        .status(404)
        .json({ success: false, message: "Village not found." });
    }

    const prefix = village.zone.ta.name.substring(0, 3).toUpperCase();
    const count = await prisma.household.count({
      where: { village: { zoneId: village.zoneId } },
    });
    const householdNumber = `${prefix}-${String(count + 1).padStart(5, "0")}`;

    const household = await prisma.household.create({
      data: {
        localId,
        householdNumber,
        villageId,
        headOfHouseholdName,
        headPhone: headPhone || null,
        headNationalId: headNationalId || null,
        consentGiven: consentGiven || false,
        consentSignatureUrl: consentSignatureUrl || null,
        structureType,
        waterSource,
        latrinePresent,
        latrineType: latrinePresent ? latrineType : null,
        handwashingFacility,
        handwashingWithSoap: handwashingFacility ? handwashingWithSoap : null,
        distanceToFacility,
        mosquitoNets: mosquitoNets || null,
        numberOfRooms: numberOfRooms || null,
        landmark: landmark || null,
        gpsLat: gpsLat || null,
        gpsLng: gpsLng || null,
        registeredByUserId: req.user.id,
        syncedAt: new Date(),
      },
      include: { village: true },
    });

    res.status(201).json({ success: true, data: household });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/households/:id
export const updateHousehold = async (req, res, next) => {
  try {
    const allowed = [
      "headOfHouseholdName",
      "headPhone",
      "headNationalId",
      "consentGiven",
      "consentSignatureUrl",
      "structureType",
      "waterSource",
      "latrinePresent",
      "latrineType",
      "handwashingFacility",
      "handwashingWithSoap",
      "distanceToFacility",
      "mosquitoNets",
      "numberOfRooms",
      "landmark",
      "gpsLat",
      "gpsLng",
      "status",
    ];

    const data = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    });

    const household = await prisma.household.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: household });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/households/:id/relocate-same-zone
// Household moved within the same area — update GPS, keep everything else
export const relocateSameZone = async (req, res, next) => {
  try {
    const { gpsLat, gpsLng, landmark, reason } = req.body;

    const household = await prisma.household.update({
      where: { id: req.params.id },
      data: {
        gpsLat: gpsLat ?? undefined,
        gpsLng: gpsLng ?? undefined,
        landmark: landmark || undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "HOUSEHOLD_RELOCATED_SAME_ZONE",
        recordType: "HOUSEHOLD",
        recordId: household.id,
        newValue: { gpsLat, gpsLng, landmark, reason: reason || null },
      },
    });

    res.json({ success: true, data: household });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/households/:id/relocate-new-zone
// Household moved to a different zone/district — archive old, prep for new registration
export const relocateNewZone = async (req, res, next) => {
  try {
    const { reason, destinationZoneName } = req.body;

    const oldHousehold = await prisma.household.findUnique({
      where: { id: req.params.id },
    });

    if (!oldHousehold) {
      return res
        .status(404)
        .json({ success: false, message: "Household not found." });
    }

    const updated = await prisma.household.update({
      where: { id: req.params.id },
      data: {
        status: "RELOCATED",
        relocatedAt: new Date(),
        relocationReason:
          reason || destinationZoneName || "Moved to a new area",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "HOUSEHOLD_RELOCATED_NEW_ZONE",
        recordType: "HOUSEHOLD",
        recordId: updated.id,
        newValue: { reason, destinationZoneName },
      },
    });

    res.json({
      success: true,
      data: updated,
      message:
        "Household marked as relocated. History preserved. Re-register in the destination zone when the household is found there.",
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/households/:id/link-relocation
// Admin links an old relocated household to its new record in another zone
export const linkRelocation = async (req, res, next) => {
  try {
    const { newHouseholdId } = req.body;

    if (!newHouseholdId) {
      return res.status(400).json({
        success: false,
        message: "newHouseholdId is required.",
      });
    }

    const oldHousehold = await prisma.household.update({
      where: { id: req.params.id },
      data: { relocatedToHouseholdId: newHouseholdId },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "HOUSEHOLD_RELOCATION_LINKED",
        recordType: "HOUSEHOLD",
        recordId: oldHousehold.id,
        newValue: { linkedTo: newHouseholdId },
      },
    });

    res.json({ success: true, data: oldHousehold });
  } catch (err) {
    next(err);
  }
};

// GET /api/households/relocated
// List all relocated households for admin review
export const getRelocatedHouseholds = async (req, res, next) => {
  try {
    const households = await prisma.household.findMany({
      where: { status: "RELOCATED" },
      include: {
        village: { include: { zone: { include: { ta: true } } } },
        relocatedTo: {
          include: { village: { include: { zone: true } } },
        },
      },
      orderBy: { relocatedAt: "desc" },
    });

    res.json({ success: true, data: households });
  } catch (err) {
    next(err);
  }
};
