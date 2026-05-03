// src/api/admin/dashboard/dashboard.service.js

import prisma from "../../../config/db.js";

export const getStats = async () => {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    activeUsersNow,
    totalMatches,
    matchesToday,
    totalMessages,
    messagesToday,
    totalPremium,
    premiumConversionBase,
    totalReports,
    pendingReports,
    resolvedReports,
    pendingVerifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { online: true } }),
    prisma.match.count(),
    prisma.match.count({ where: { matchedAt: { gte: todayStart } } }),
    prisma.message.count(),
    prisma.message.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count(),
    prisma.report.count(),
    prisma.report.count({ where: { status: "pending" } }),
    prisma.report.count({ where: { status: "resolved" } }),
    prisma.verificationRequest.count({ where: { status: "pending" } }),
  ]);

  const premiumConversionRate =
    premiumConversionBase > 0
      ? ((totalPremium / premiumConversionBase) * 100).toFixed(1)
      : 0;

  return {
    users: {
      total: totalUsers,
      newToday: newUsersToday,
      newThisWeek: newUsersThisWeek,
      newThisMonth: newUsersThisMonth,
      activeNow: activeUsersNow,
    },
    matches: {
      total: totalMatches,
      today: matchesToday,
    },
    messages: {
      total: totalMessages,
      today: messagesToday,
    },
    premium: {
      total: totalPremium,
      conversionRate: `${premiumConversionRate}%`,
    },
    reports: {
      total: totalReports,
      pending: pendingReports,
      resolved: resolvedReports,
    },
    verifications: {
      pending: pendingVerifications,
    },
  };
};
