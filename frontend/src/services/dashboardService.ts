/**
 * dashboardService.ts
 * Replace the mock import with: import { api } from '../lib/apiClient';
 * Then swap each function body to a real API call.
 */
import { delay } from "../lib/utils";
import { MOCK_DASHBOARD_STATS } from "../lib/mockData";
import type { DashboardStats } from "../types";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  await delay(400);
  return MOCK_DASHBOARD_STATS;
  // REAL: return api.get<DashboardStats>('/admin/stats');
}
