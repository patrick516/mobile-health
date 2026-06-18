import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";

const MUAC_STATUS = (mm) => {
  if (!mm) return null;
  if (mm >= 125) return "NORMAL";
  if (mm >= 115) return "MODERATE_MALNUTRITION";
  return "SEVERE_MALNUTRITION";
};

// GET /api/visits?memberId=&chwId=&from=&to=&page=&limit=&taId=
export const getVisits = async (req, res, next) => {
  try {
    const { memberId, chwId, from, to, taId, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const villageScope = buildVillageScope(req.user, taId);
    const hasScope = Object.keys(villageScope).length > 0;

    const where = {
      ...(memberId ? { memberId } : {}),
      ...(chwId ? { chwId } : {}),
      ...(from || to
        ? {
            visitedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(hasScope ? { member: { household: { village: villageScope } } } : {}),
    };

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        include: {
          member: {
            select: { id: true, fullName: true, sex: true, dateOfBirth: true },
          },
          chw: { select: { id: true, fullName: true } },
          referrals: { select: { id: true, status: true, urgency: true } },
        },
        orderBy: { visitedAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.visit.count({ where }),
    ]);

    res.json({
      success: true,
      data: visits,
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

// GET /api/visits/:id
export const getVisit = async (req, res, next) => {
  try {
    const visit = await prisma.visit.findUnique({
      where: { id: req.params.id },
      include: {
        member: true,
        chw: { select: { id: true, fullName: true, phoneNumber: true } },
        referrals: true,
        dispenses: { include: { drug: true } },
      },
    });
    if (!visit)
      return res
        .status(404)
        .json({ success: false, message: "Visit not found." });
    res.json({ success: true, data: visit });
  } catch (err) {
    next(err);
  }
};

// POST /api/visits
export const createVisit = async (req, res, next) => {
  try {
    const {
      localId,
      memberId,
      householdId,
      visitedAt,
      visitType,
      symptoms,
      temperature,
      muacMm,
      dangerSigns,
      referralNeeded,
      gpsLat,
      gpsLng,
      notes,
      dispenses,
    } = req.body;

    if (!localId || !memberId || !householdId || !visitedAt || !visitType) {
      return res.status(400).json({
        success: false,
        message:
          "localId, memberId, householdId, visitedAt, and visitType are required.",
      });
    }

    const muacStatus = MUAC_STATUS(muacMm);

    const visit = await prisma.visit.create({
      data: {
        localId,
        memberId,
        householdId,
        chwId: req.user.id,
        visitedAt: new Date(visitedAt),
        visitType,
        symptoms: symptoms || null,
        temperature: temperature || null,
        muacMm: muacMm || null,
        muacStatus,
        dangerSigns: dangerSigns || null,
        referralNeeded: referralNeeded || false,
        gpsLat: gpsLat || null,
        gpsLng: gpsLng || null,
        notes: notes || null,
        syncedAt: new Date(),
      },
    });

    // Create drug dispense records if any
    if (dispenses && dispenses.length > 0) {
      await Promise.all(
        dispenses.map(async (d) => {
          await prisma.drugDispense.create({
            data: {
              localId: d.localId,
              visitId: visit.id,
              memberId,
              drugId: d.drugId,
              quantityDispensed: d.quantity,
              dispensedById: req.user.id,
              dispensedAt: new Date(visitedAt),
              syncedAt: new Date(),
            },
          });

          // Decrement stock
          await prisma.drugStock.updateMany({
            where: { userId: req.user.id, drugId: d.drugId },
            data: { quantityCurrent: { decrement: d.quantity } },
          });
        }),
      );
    }

    // Auto-alert on severe malnutrition
    if (muacStatus === "SEVERE_MALNUTRITION") {
      console.log(
        `[ALERT] Severe malnutrition detected for member ${memberId}. Referral required.`,
      );
      // SMS alert will be wired here in Phase 2
    }

    res.status(201).json({ success: true, data: visit });
  } catch (err) {
    next(err);
  }
};
