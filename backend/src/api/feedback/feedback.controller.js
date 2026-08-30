import prisma from "../../config/db.js";

// ── POST /api/feedback
// Supervisor sends feedback to a CCW
export const sendFeedback = async (req, res, next) => {
  try {
    const { ccwId, rating, comment, periodMonth, periodYear, visitsCount } =
      req.body;

    const allowed = ["NURSE", "DISTRICT_OFFICER", "ADMIN", "SUPER_ADMIN"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only supervisors can send feedback.",
      });
    }

    if (!ccwId || !rating || !comment || !periodMonth || !periodYear) {
      return res.status(400).json({
        success: false,
        message:
          "ccwId, rating, comment, periodMonth, and periodYear are required.",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    const ccw = await prisma.user.findUnique({ where: { id: ccwId } });
    if (!ccw || ccw.role !== "CCW") {
      return res
        .status(404)
        .json({ success: false, message: "CCW not found." });
    }

    // Upsert — one feedback per CCW per month per supervisor
    const existing = await prisma.supervisorFeedback.findFirst({
      where: { ccwId, supervisorId: req.user.id, periodMonth, periodYear },
    });

    let feedback;
    if (existing) {
      feedback = await prisma.supervisorFeedback.update({
        where: { id: existing.id },
        data: {
          rating,
          comment,
          visitsCount: visitsCount || null,
          isRead: false,
          readAt: null,
        },
      });
    } else {
      feedback = await prisma.supervisorFeedback.create({
        data: {
          ccwId,
          supervisorId: req.user.id,
          rating,
          comment,
          periodMonth,
          periodYear,
          visitsCount: visitsCount || null,
        },
      });
    }

    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/feedback/my
// CCW fetches their own feedback
export const getMyFeedback = async (req, res, next) => {
  try {
    const feedback = await prisma.supervisorFeedback.findMany({
      where: { ccwId: req.user.id },
      include: {
        supervisor: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    // Mark all unread as read
    await prisma.supervisorFeedback.updateMany({
      where: { ccwId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/feedback/unread-count
// CCW gets count of unread feedback — for home screen badge
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.supervisorFeedback.count({
      where: { ccwId: req.user.id, isRead: false },
    });
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/feedback/ccws
// Supervisor gets list of CCWs in their scope with recent visit counts
// to help them decide who to send feedback to
export const getCcwsForFeedback = async (req, res, next) => {
  try {
    const allowed = ["NURSE", "DISTRICT_OFFICER", "ADMIN", "SUPER_ADMIN"];
    if (!allowed.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const ccws = await prisma.user.findMany({
      where: { role: "CCW", isActive: true },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        zoneAllocations: {
          select: {
            zone: { select: { name: true, ta: { select: { name: true } } } },
          },
        },
        visits: {
          where: { visitedAt: { gte: monthStart } },
          select: { id: true },
        },
        feedbackReceived: {
          where: {
            periodMonth: now.getMonth() + 1,
            periodYear: now.getFullYear(),
            supervisorId: req.user.id,
          },
          select: { id: true, rating: true },
        },
      },
      orderBy: { fullName: "asc" },
    });

    const enriched = ccws.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      zones: c.zoneAllocations.map((z) => z.zone.name),
      ta: c.zoneAllocations[0]?.zone.ta?.name ?? null,
      visitsThisMonth: c.visits.length,
      feedbackThisMonth: c.feedbackReceived[0] ?? null,
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/feedback/sent
// Supervisor sees feedback they've sent
export const getSentFeedback = async (req, res, next) => {
  try {
    const feedback = await prisma.supervisorFeedback.findMany({
      where: { supervisorId: req.user.id },
      include: {
        ccw: { select: { id: true, fullName: true, phoneNumber: true } },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 100,
    });
    res.json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
};
