import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";

// ── POST /api/fp/visits
export const recordFpVisit = async (req, res, next) => {
  try {
    const {
      localId,
      memberId,
      visitDate,
      method,
      quantityGiven,
      nextFollowUpDate,
      sideEffects,
      referralNeeded,
      counsellingGiven,
      notes,
    } = req.body;

    if (!localId || !memberId || !visitDate || !method) {
      return res.status(400).json({
        success: false,
        message: "localId, memberId, visitDate, and method are required.",
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

    const visit = await prisma.fpVisit.create({
      data: {
        localId,
        memberId,
        visitedById: req.user.id,
        visitDate: new Date(visitDate),
        method,
        quantityGiven: quantityGiven || null,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        sideEffects: sideEffects || null,
        referralNeeded: referralNeeded || false,
        counsellingGiven: counsellingGiven ?? true,
        notes: notes || null,
        syncedAt: new Date(),
      },
    });

    res.status(201).json({ success: true, data: visit });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/fp/visits
export const getFpVisits = async (req, res, next) => {
  try {
    const { memberId, taId } = req.query;
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

    const visits = await prisma.fpVisit.findMany({
      where,
      include: {
        member: {
          select: { id: true, fullName: true, sex: true, dateOfBirth: true },
        },
        visitedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { visitDate: "desc" },
      take: 200,
    });

    res.json({ success: true, data: visits });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/fp/follow-ups
// Members whose next follow-up date is due or overdue
export const getFpFollowUps = async (req, res, next) => {
  try {
    const { taId } = req.query;
    const villageScope = buildVillageScope(req.user, taId);
    const hasScope = Object.keys(villageScope).length > 0;

    const now = new Date();

    // Get latest FP visit per member where next follow-up is due
    const due = await prisma.fpVisit.findMany({
      where: {
        nextFollowUpDate: { lte: now },
        member: {
          status: "ACTIVE",
          ...(hasScope ? { household: { village: villageScope } } : {}),
          ...(req.user.role === "CCW"
            ? { household: { registeredByUserId: req.user.id } }
            : {}),
        },
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            sex: true,
            household: {
              select: {
                householdNumber: true,
                village: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { nextFollowUpDate: "asc" },
    });

    res.json({ success: true, data: due });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/fp/member/:memberId
export const getMemberFpHistory = async (req, res, next) => {
  try {
    const visits = await prisma.fpVisit.findMany({
      where: { memberId: req.params.memberId },
      include: {
        visitedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { visitDate: "desc" },
    });
    res.json({ success: true, data: visits });
  } catch (err) {
    next(err);
  }
};
