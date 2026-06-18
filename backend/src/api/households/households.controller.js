import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";
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

    res.json({
      success: true,
      data: households,
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
