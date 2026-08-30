import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";

// ─── OUTBREAK ALERT SYMPTOMS TO WATCH ───
const OUTBREAK_SYMPTOMS = [
  "DIARRHOEA",
  "VOMITING",
  "FEVER",
  "RASH",
  "BREATHLESS",
];
const OUTBREAK_THRESHOLD = 3;
const OUTBREAK_WINDOW_DAYS = 7;

const checkOutbreakAlert = async (memberId, symptoms) => {
  if (!symptoms || !Array.isArray(symptoms)) return;

  try {
    // Get the village for this member
    const member = await prisma.householdMember.findUnique({
      where: { id: memberId },
      include: { household: { include: { village: true } } },
    });
    if (!member?.household?.village) return;

    const villageId = member.household.village.id;
    const windowStart = new Date(
      Date.now() - OUTBREAK_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    for (const symptom of symptoms) {
      if (!OUTBREAK_SYMPTOMS.includes(symptom)) continue;

      // Count visits with this symptom in this village in the last 7 days
      const recentVisits = await prisma.visit.findMany({
        where: {
          visitedAt: { gte: windowStart },
          symptoms: { array_contains: symptom },
          member: { household: { villageId } },
        },
        select: { id: true },
      });

      const count = recentVisits.length;

      if (count >= OUTBREAK_THRESHOLD) {
        // Check if an active alert already exists for this village + symptom
        const existing = await prisma.outbreakAlert.findFirst({
          where: {
            villageId,
            symptom,
            status: "ACTIVE",
            windowStart: { gte: windowStart },
          },
        });

        if (existing) {
          // Update case count
          await prisma.outbreakAlert.update({
            where: { id: existing.id },
            data: { caseCount: count, windowEnd: new Date() },
          });
        } else {
          // Create new alert
          await prisma.outbreakAlert.create({
            data: {
              villageId,
              symptom,
              caseCount: count,
              windowStart,
              windowEnd: new Date(),
              status: "ACTIVE",
            },
          });
          console.log(
            `[OUTBREAK] 🚨 Alert raised: ${symptom} x${count} in village ${member.household.village.name}`,
          );
        }
      }
    }
  } catch (err) {
    // Non-blocking — outbreak check failure never stops a visit from saving
    console.error("[OUTBREAK] Check failed:", err.message);
  }
};
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
      ...(visitType ? { visitType } : {}),
      ...(memberId || chwId
        ? {}
        : hasScope
          ? { member: { household: { village: villageScope } } }
          : {}),
      // CCW sees only visits they personally recorded
      ...(req.user.role === "CCW" ? { chwId: req.user.id } : {}),
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

    // ── Enforce zone/TA/district scoping ──
    if (req.user.scopeLevel !== "ALL") {
      const scope = buildVillageScope(req.user);
      const allowed = await prisma.visit.findFirst({
        where: { id: visit.id, member: { household: { village: scope } } },
        select: { id: true },
      });
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this visit.",
        });
      }
    }

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
      weightKg,
      heightCm,
      zScoreWfa,
      zScoreHfa,
      zScoreWfh,
      growthStatus,
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
        weightKg: weightKg || null,
        heightCm: heightCm || null,
        zScoreWfa: zScoreWfa || null,
        zScoreHfa: zScoreHfa || null,
        zScoreWfh: zScoreWfh || null,
        growthStatus: growthStatus || null,
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
    }

    // Non-blocking outbreak surveillance check
    checkOutbreakAlert(memberId, symptoms).catch(() => {});

    res.status(201).json({ success: true, data: visit });
  } catch (err) {
    next(err);
  }
};
// GET /api/visits/outbreak-alerts
// Returns active outbreak alerts scoped to the user's district/TA
export const getOutbreakAlerts = async (req, res, next) => {
  try {
    const villageScope = buildVillageScope(req.user);
    const hasScope = Object.keys(villageScope).length > 0;

    const alerts = await prisma.outbreakAlert.findMany({
      where: {
        status: "ACTIVE",
        ...(hasScope ? { village: villageScope } : {}),
      },
      include: {
        village: {
          include: {
            zone: {
              include: { ta: { include: { district: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/visits/outbreak-alerts/:id/resolve
export const resolveOutbreakAlert = async (req, res, next) => {
  try {
    const allowed = ["ADMIN", "SUPER_ADMIN", "DISTRICT_OFFICER"];
    if (!allowed.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    const alert = await prisma.outbreakAlert.update({
      where: { id: req.params.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedById: req.user.id,
      },
    });

    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
};
