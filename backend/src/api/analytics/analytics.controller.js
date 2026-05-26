import prisma from "../../config/db.js";

export const getOverview = async (req, res, next) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const zoneFilter =
      req.user.zoneIds.length > 0
        ? { village: { zoneId: { in: req.user.zoneIds } } }
        : {};

    const [
      totalVisitsWeek,
      activeReferrals,
      missedReferrals,
      drugsLowStock,
      vaccinesDue,
      ancOverdue,
    ] = await Promise.all([
      prisma.visit.count({
        where: {
          visitedAt: { gte: weekAgo },
          ...(req.user.zoneIds.length > 0
            ? {
                member: { household: zoneFilter },
              }
            : {}),
        },
      }),
      prisma.referral.count({
        where: { status: { in: ["PENDING", "OVERDUE"] } },
      }),
      prisma.referral.count({ where: { status: "MISSED" } }),
      prisma.drugStock.count({
        where: {
          quantityCurrent: { lte: prisma.drugStock.fields?.quantityMinimum },
          userId: req.user.zoneIds.length > 0 ? undefined : undefined,
        },
      }),
      prisma.immunisationSchedule.count({
        where: { status: { in: ["DUE", "OVERDUE"] } },
      }),
      prisma.ancVisit.count({
        where: { status: { in: ["OVERDUE", "MISSED"] } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalVisitsWeek,
        activeReferrals,
        missedReferrals,
        drugsLowStock,
        vaccinesDue,
        ancOverdue,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const from = new Date();
    from.setDate(from.getDate() - parseInt(days));

    const visits = await prisma.visit.groupBy({
      by: ["visitedAt"],
      where: { visitedAt: { gte: from } },
      _count: true,
    });

    res.json({ success: true, data: visits });
  } catch (err) {
    next(err);
  }
};

export const getChwActivity = async (req, res, next) => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const chws = await prisma.user.findMany({
      where: {
        role: "CCW",
        isActive: true,
        ...(req.user.zoneIds.length > 0
          ? {
              zoneAllocations: { some: { zoneId: { in: req.user.zoneIds } } },
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        visits: {
          where: { visitedAt: { gte: weekAgo } },
          select: { id: true, visitedAt: true, syncedAt: true },
        },
        referralsMade: {
          where: { status: { in: ["PENDING", "OVERDUE"] } },
          select: { id: true },
        },
        zoneAllocations: {
          select: { zone: { select: { name: true } } },
        },
      },
    });

    const activity = chws.map((chw) => {
      const lastSync =
        chw.visits.length > 0
          ? Math.max(
              ...chw.visits.map((v) => new Date(v.syncedAt || 0).getTime()),
            )
          : null;

      return {
        id: chw.id,
        fullName: chw.fullName,
        phoneNumber: chw.phoneNumber,
        zones: chw.zoneAllocations.map((z) => z.zone.name),
        visitsThisWeek: chw.visits.length,
        pendingReferrals: chw.referralsMade.length,
        lastSyncAt: lastSync ? new Date(lastSync) : null,
        status: !lastSync
          ? "NO_ACTIVITY"
          : new Date(lastSync) < twoDaysAgo
            ? "UNSYNCED"
            : "ACTIVE",
      };
    });

    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};
