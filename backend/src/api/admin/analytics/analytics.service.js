import prisma from "../../../config/db.js";

export const getAnalytics = async () => {
  const now = new Date();
  const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalMessages,
    totalPremium,
    totalReports,
    resolvedReports,
    activeUsers30d,
    pendingVerifications,
    totalVerified,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.message.count(),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.report.count(),
    prisma.report.count({ where: { status: "resolved" } }),
    prisma.user.count({ where: { lastSeenAt: { gte: monthStart } } }),
    prisma.verificationRequest.count({ where: { status: "pending" } }),
    prisma.verificationRequest.count({ where: { status: "approved" } }),
  ]);

  // Monthly signups for last 6 months
  const monthlySignups = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return prisma.user.count({
        where: { createdAt: { gte: start, lte: end } },
      });
    }),
  );

  const premiumRate =
    totalUsers > 0
      ? parseFloat(((totalPremium / totalUsers) * 100).toFixed(1))
      : 0;

  const reportsResolvedRate =
    totalReports > 0
      ? parseFloat(((resolvedReports / totalReports) * 100).toFixed(1))
      : 0;

  const identityVerifiedRate =
    totalUsers > 0
      ? parseFloat(((totalVerified / totalUsers) * 100).toFixed(1))
      : 0;

  // Profile completion = users who have at least a bio and a photo
  const profilesCompleted = await prisma.user.count({
    where: {
      bio: { not: null },
      photoUrl: { not: null },
    },
  });

  const profileCompletionRate =
    totalUsers > 0
      ? parseFloat(((profilesCompleted / totalUsers) * 100).toFixed(1))
      : 0;

  const newSignupsMonth = monthlySignups[monthlySignups.length - 1];

  // Messages per match
  const totalMatches = await prisma.match.count();
  const messagesPerMatch =
    totalMatches > 0 ? Math.round(totalMessages / totalMatches) : 0;

  // Churn rate = users who haven't been seen in 30 days / total users
  const churnedUsers = await prisma.user.count({
    where: { lastSeenAt: { lt: monthStart } },
  });
  const churnRate =
    totalUsers > 0
      ? parseFloat(((churnedUsers / totalUsers) * 100).toFixed(1))
      : 0;

  return {
    totalUsers,
    totalMessages,
    premiumRate,
    reportsResolvedRate,
    newSignupsMonth,
    activeUsers30d,
    monthlySignups,
    messagesPerMatch,
    churnRate,
    keyMetrics: {
      premiumConversion: premiumRate,
      identityVerified: identityVerifiedRate,
      profileCompletion: profileCompletionRate,
      reportsResolved: reportsResolvedRate,
    },
  };
};
