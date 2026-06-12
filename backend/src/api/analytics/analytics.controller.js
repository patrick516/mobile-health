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

    // Use raw SQL to group by date only (truncate timestamp to day)
    const visits = await prisma.$queryRaw`
      SELECT 
        DATE(visited_at) AS "visitedAt",
        COUNT(*) AS "_count"
      FROM visits
      WHERE visited_at >= ${from}
      GROUP BY DATE(visited_at)
      ORDER BY DATE(visited_at) ASC
    `;

    const data = visits.map((row) => ({
      visitedAt: new Date(row.visitedAt).toISOString().split("T")[0],
      count: Number(row._count),
    }));
    console.log("Trends data:", JSON.stringify(data));

    res.json({ success: true, data });
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

export const getSymptomTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const from = new Date();
    from.setDate(from.getDate() - parseInt(days));

    const visits = await prisma.visit.findMany({
      where: {
        visitedAt: { gte: from },
        symptoms: { not: null },
      },
      select: { symptoms: true, visitedAt: true },
    });

    // Count each symptom code across all visits
    const counts = {};
    for (const v of visits) {
      if (!v.symptoms) continue;
      let arr;
      try {
        arr =
          typeof v.symptoms === "string" ? JSON.parse(v.symptoms) : v.symptoms;
      } catch {
        continue;
      }
      for (const s of arr) {
        counts[s] = (counts[s] || 0) + 1;
      }
    }

    const data = Object.entries(counts)
      .map(([symptom, count]) => ({ symptom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getReferralStats = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const from = new Date();
    from.setDate(from.getDate() - parseInt(days));

    const [total, completed, missed, pending] = await Promise.all([
      prisma.referral.count({ where: { createdAt: { gte: from } } }),
      prisma.referral.count({
        where: {
          createdAt: { gte: from },
          status: { in: ["TREATED", "COMPLETED"] },
        },
      }),
      prisma.referral.count({
        where: { createdAt: { gte: from }, status: "MISSED" },
      }),
      prisma.referral.count({
        where: {
          createdAt: { gte: from },
          status: { in: ["PENDING", "OVERDUE"] },
        },
      }),
    ]);

    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    const missedRate = total > 0 ? Math.round((missed / total) * 100) : 0;

    res.json({
      success: true,
      data: { total, completed, missed, pending, completionRate, missedRate },
    });
  } catch (err) {
    next(err);
  }
};

export const getMuacTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const from = new Date();
    from.setDate(from.getDate() - parseInt(days));

    const [normal, moderate, severe] = await Promise.all([
      prisma.visit.count({
        where: { visitedAt: { gte: from }, muacStatus: "NORMAL" },
      }),
      prisma.visit.count({
        where: {
          visitedAt: { gte: from },
          muacStatus: "MODERATE_MALNUTRITION",
        },
      }),
      prisma.visit.count({
        where: { visitedAt: { gte: from }, muacStatus: "SEVERE_MALNUTRITION" },
      }),
    ]);

    const total = normal + moderate + severe;
    res.json({
      success: true,
      data: [
        {
          status: "Normal (Green)",
          count: normal,
          pct: total > 0 ? Math.round((normal / total) * 100) : 0,
        },
        {
          status: "Moderate (Yellow)",
          count: moderate,
          pct: total > 0 ? Math.round((moderate / total) * 100) : 0,
        },
        {
          status: "Severe (Red)",
          count: severe,
          pct: total > 0 ? Math.round((severe / total) * 100) : 0,
        },
      ],
    });
  } catch (err) {
    next(err);
  }
};

export const getImmunisationCoverage = async (req, res, next) => {
  try {
    const [given, due, overdue, missed] = await Promise.all([
      prisma.immunisationSchedule.count({ where: { status: "GIVEN" } }),
      prisma.immunisationSchedule.count({ where: { status: "DUE" } }),
      prisma.immunisationSchedule.count({ where: { status: "OVERDUE" } }),
      prisma.immunisationSchedule.count({ where: { status: "MISSED" } }),
    ]);

    const total = given + due + overdue + missed;
    const coverageRate = total > 0 ? Math.round((given / total) * 100) : 0;

    res.json({
      success: true,
      data: [
        { status: "Given", count: given, color: "#16a34a" },
        { status: "Due", count: due, color: "#f59e0b" },
        { status: "Overdue", count: overdue, color: "#dc2626" },
        { status: "Missed", count: missed, color: "#6b7280" },
      ],
      coverageRate,
      total,
    });
  } catch (err) {
    next(err);
  }
};
