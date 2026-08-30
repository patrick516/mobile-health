import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";

// PNC schedule: day offsets from delivery date
const PNC_SCHEDULE = [
  { pncNumber: 1, dayOffset: 1 },
  { pncNumber: 2, dayOffset: 3 },
  { pncNumber: 3, dayOffset: 7 },
  { pncNumber: 4, dayOffset: 42 }, // 6 weeks
];

// ── POST /api/pnc/generate/:memberId
// Called when a pregnancy is marked as delivered.
// Creates 4 PNC visit records scheduled from the delivery date.
export const generatePncSchedule = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { deliveryDate } = req.body;

    if (!deliveryDate) {
      return res.status(400).json({
        success: false,
        message: "deliveryDate is required.",
      });
    }

    const member = await prisma.householdMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found." });
    }

    const base = new Date(deliveryDate);

    // Upsert each PNC visit — safe to call multiple times
    const created = await Promise.all(
      PNC_SCHEDULE.map(({ pncNumber, dayOffset }) => {
        const expectedDate = new Date(base);
        expectedDate.setDate(expectedDate.getDate() + dayOffset);

        return prisma.pncVisit.upsert({
          where: { memberId_pncNumber: { memberId, pncNumber } },
          update: { expectedDate },
          create: {
            localId: `pnc-${memberId}-${pncNumber}-${Date.now()}`,
            memberId,
            pncNumber,
            expectedDate,
            status: "SCHEDULED",
          },
        });
      }),
    );

    res.status(201).json({
      success: true,
      message: `${created.length} PNC visits scheduled.`,
      data: created,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/pnc/schedules
// Returns PNC schedules scoped to the logged-in user's zone/district.
export const getPncSchedules = async (req, res, next) => {
  try {
    const { taId, memberId } = req.query;
    const villageScope = buildVillageScope(req.user, taId);
    const hasScope = Object.keys(villageScope).length > 0;

    const where = {
      ...(memberId ? { memberId } : {}),
      member: {
        status: "ACTIVE",
        ...(hasScope ? { household: { village: villageScope } } : {}),
        ...(req.user.role === "CCW"
          ? { household: { registeredByUserId: req.user.id } }
          : {}),
      },
    };

    const visits = await prisma.pncVisit.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            localId: true,
            fullName: true,
            expectedDeliveryDate: true,
          },
        },
        visitedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: [{ expectedDate: "asc" }],
    });

    // Auto-mark overdue
    const now = new Date();
    const updated = visits.map((v) => ({
      ...v,
      status:
        v.status === "SCHEDULED" && new Date(v.expectedDate) < now
          ? "OVERDUE"
          : v.status,
    }));

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/pnc/:id/record
// Records the actual PNC visit — mother + newborn assessment.
export const recordPncVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      visitedDate,
      motherTemperature,
      motherBloodPressure,
      motherBreastStatus,
      motherUterusStatus,
      motherDangerSigns,
      newbornWeight,
      newbornTemperature,
      newbornCordStatus,
      isBreastfeeding,
      newbornDangerSigns,
      referralNeeded,
      notes,
      localId,
    } = req.body;

    // RBAC — only CCW, NURSE, ADMIN, SUPER_ADMIN can record
    const allowed = ["CCW", "NURSE", "ADMIN", "SUPER_ADMIN"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot record PNC visits.",
      });
    }

    const existing = await prisma.pncVisit.findUnique({ where: { id } });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "PNC visit not found." });
    }

    const updated = await prisma.pncVisit.update({
      where: { id },
      data: {
        status: "ATTENDED",
        visitedDate: visitedDate ? new Date(visitedDate) : new Date(),
        visitedById: req.user.id,
        motherTemperature: motherTemperature ?? null,
        motherBloodPressure: motherBloodPressure ?? null,
        motherBreastStatus: motherBreastStatus ?? null,
        motherUterusStatus: motherUterusStatus ?? null,
        motherDangerSigns: motherDangerSigns ?? null,
        newbornWeight: newbornWeight ?? null,
        newbornTemperature: newbornTemperature ?? null,
        newbornCordStatus: newbornCordStatus ?? null,
        isBreastfeeding: isBreastfeeding ?? false,
        newbornDangerSigns: newbornDangerSigns ?? null,
        referralNeeded: referralNeeded ?? false,
        notes: notes ?? null,
        syncedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "PNC_VISIT_RECORDED",
        recordType: "PNC_VISIT",
        recordId: id,
        newValue: {
          pncNumber: existing.pncNumber,
          visitedDate,
          memberId: existing.memberId,
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/pnc/member/:memberId
// All PNC visits for a specific member — used on member detail screen.
export const getMemberPncVisits = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    const visits = await prisma.pncVisit.findMany({
      where: { memberId },
      include: {
        visitedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { pncNumber: "asc" },
    });

    res.json({ success: true, data: visits });
  } catch (err) {
    next(err);
  }
};
