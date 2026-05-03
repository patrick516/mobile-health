import { api } from "../lib/apiClient";
import type { DashboardStats } from "../types";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<{ stats: any }>("/admin/dashboard/stats");
  const s = res.stats;

  return {
    totalUsers: s.users.total,
    totalMatches: s.matches.total,
    onlineNow: s.users.activeNow,
    pendingReports: s.reports.pending,
    pendingVerifications: s.verifications.pending,
    newSignupsToday: s.users.newToday,
    newSignupsWeek: s.users.newThisWeek,
    newSignupsMonth: s.users.newThisMonth,
    premiumUsers: s.premium.total,
    premiumConversionRate: parseFloat(s.premium.conversionRate),
    reportsResolved: s.reports.resolved,
    reportsResolvedRate:
      s.reports.total > 0
        ? Math.round((s.reports.resolved / s.reports.total) * 100)
        : 0,
    weeklySignups: s.weeklySignups ?? [0, 0, 0, 0, 0, 0, s.users.newToday],
  };
}
