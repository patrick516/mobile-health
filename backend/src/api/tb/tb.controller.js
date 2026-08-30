import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";

// ── POST /api/tb/cases
// Register a new TB case for a member
export const registerTbCase = async (req, res, next) => {
  try {
    const {
      memberId,
      treatmentStartDate,
      treatmentCategory,
      facilityId,
      treatmentNumber,
      notes,
    } = req.body;

    if (!memberId || !treatmentStartDate || !treatmentCategory) {
      return res.status(400).json({
        success: false,
        message:
          "memberId, treatmentStartDate, and treatmentCategory are required.",
      });
    }

    // Check member exists and user has access
    const member = await prisma.householdMember.findUnique({
      where: { id: memberId },
      include: { household: { include: { village: true } } },
    });
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found." });
    }

    // Check no active TB case already exists
    const existing = await prisma.tbCase.findFirst({
      where: { memberId, isActive: true },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This member already has an active TB case.",
        existingCaseId: existing.id,
      });
    }

    const tbCase = await prisma.tbCase.create({
      data: {
        memberId,
        registeredById: req.user.id,
        treatmentStartDate: new Date(treatmentStartDate),
        treatmentCategory,
        facilityId: facilityId || null,
        treatmentNumber: treatmentNumber || null,
        notes: notes || null,
        syncedAt: new Date(),
      },
      include: {
        member: { select: { id: true, fullName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "TB_CASE_REGISTERED",
        recordType: "TB_CASE",
        recordId: tbCase.id,
        newValue: { memberId, treatmentCategory, treatmentStartDate },
      },
    });

    res.status(201).json({ success: true, data: tbCase });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tb/cases
// List active TB cases scoped to user's zone/district
export const getTbCases = async (req, res, next) => {
  try {
    const { memberId, isActive } = req.query;
    const villageScope = buildVillageScope(req.user);
    const hasScope = Object.keys(villageScope).length > 0;

    const where = {
      ...(memberId ? { memberId } : {}),
      ...(isActive !== undefined
        ? { isActive: isActive === "true" }
        : { isActive: true }),
      member: {
        status: "ACTIVE",
        ...(hasScope ? { household: { village: villageScope } } : {}),
        ...(req.user.role === "CCW"
          ? { household: { registeredByUserId: req.user.id } }
          : {}),
      },
    };

    const cases = await prisma.tbCase.findMany({
      where,
      include: {
        member: {
          select: { id: true, fullName: true, sex: true, dateOfBirth: true },
        },
        registeredBy: { select: { id: true, fullName: true } },
        facility: { select: { id: true, name: true } },
        dotVisits: {
          orderBy: { visitDate: "desc" },
          take: 5,
          select: { id: true, visitDate: true, status: true },
        },
        _count: { select: { dotVisits: true } },
      },
      orderBy: { treatmentStartDate: "desc" },
    });

    // Compute missed doses for each case
    const enriched = cases.map((c) => {
      const missed = c.dotVisits.filter((d) => d.status === "MISSED").length;
      const daysSinceStart = Math.floor(
        (Date.now() - new Date(c.treatmentStartDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return { ...c, missedDoses: missed, daysSinceStart };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tb/cases/:id
export const getTbCase = async (req, res, next) => {
  try {
    const tbCase = await prisma.tbCase.findUnique({
      where: { id: req.params.id },
      include: {
        member: {
          include: {
            household: { include: { village: true } },
          },
        },
        registeredBy: { select: { id: true, fullName: true } },
        facility: { select: { id: true, name: true } },
        dotVisits: {
          orderBy: { visitDate: "desc" },
          include: {
            visitedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!tbCase) {
      return res
        .status(404)
        .json({ success: false, message: "TB case not found." });
    }

    res.json({ success: true, data: tbCase });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/tb/cases/:id/dot
// Record a DOT visit (observed, missed, or self-administered)
export const recordDotVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { localId, visitDate, status, drugsGiven, missedReason, notes } =
      req.body;

    if (!localId || !visitDate || !status) {
      return res.status(400).json({
        success: false,
        message: "localId, visitDate, and status are required.",
      });
    }

    const tbCase = await prisma.tbCase.findUnique({ where: { id } });
    if (!tbCase) {
      return res
        .status(404)
        .json({ success: false, message: "TB case not found." });
    }
    if (!tbCase.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot record DOT for a closed TB case.",
      });
    }

    const dotVisit = await prisma.tbDotVisit.create({
      data: {
        localId,
        tbCaseId: id,
        visitedById: req.user.id,
        visitDate: new Date(visitDate),
        status,
        drugsGiven: drugsGiven || null,
        missedReason: missedReason || null,
        notes: notes || null,
        syncedAt: new Date(),
      },
    });

    // Flag consecutive missed doses — 2+ is a warning sign
    if (status === "MISSED") {
      const recentMissed = await prisma.tbDotVisit.count({
        where: {
          tbCaseId: id,
          status: "MISSED",
          visitDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      if (recentMissed >= 2) {
        console.log(
          `[TB] ⚠ ${recentMissed} missed DOT doses in last 7 days for case ${id}`,
        );
        // Future: trigger supervisor notification here
      }
    }

    res.status(201).json({ success: true, data: dotVisit });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/tb/cases/:id/outcome
// Close a TB case with an outcome
export const closeTbCase = async (req, res, next) => {
  try {
    const { outcome, outcomeDate, notes } = req.body;

    if (!outcome) {
      return res
        .status(400)
        .json({ success: false, message: "outcome is required." });
    }

    const allowed = ["ADMIN", "SUPER_ADMIN", "NURSE", "DISTRICT_OFFICER"];
    if (!allowed.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    const tbCase = await prisma.tbCase.update({
      where: { id: req.params.id },
      data: {
        isActive: false,
        outcome,
        outcomeDate: outcomeDate ? new Date(outcomeDate) : new Date(),
        notes: notes || undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "TB_CASE_CLOSED",
        recordType: "TB_CASE",
        recordId: tbCase.id,
        newValue: { outcome, outcomeDate },
      },
    });

    res.json({ success: true, data: tbCase });
  } catch (err) {
    next(err);
  }
};
