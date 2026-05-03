import { api } from "../lib/apiClient";

export interface AnalyticsData {
  totalUsers: number;
  totalMessages: number;
  premiumRate: number;
  reportsResolvedRate: number;
  newSignupsMonth: number;
  activeUsers30d: number;
  monthlySignups: number[];
  messagesPerMatch: number;
  churnRate: number;
  keyMetrics: {
    premiumConversion: number;
    identityVerified: number;
    profileCompletion: number;
    reportsResolved: number;
  };
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await api.get<{ analytics: AnalyticsData }>("/admin/analytics");
  //   console.log("analytics response:", res);
  return res.analytics;
}
