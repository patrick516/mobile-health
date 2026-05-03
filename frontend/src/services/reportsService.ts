import { delay } from "../lib/utils";
import { MOCK_REPORTS } from "../lib/mockData";
import type {
  Report,
  ReportFilters,
  PaginatedResponse,
  PaginationParams,
} from "../types";

export async function fetchReports(
  filters: ReportFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 },
): Promise<PaginatedResponse<Report>> {
  await delay(400);

  let data = [...MOCK_REPORTS];

  if (filters.status && filters.status !== "all")
    data = data.filter((r) => r.status === filters.status);
  if (filters.type && filters.type !== "all")
    data = data.filter((r) => r.type === filters.type);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(
      (r) =>
        r.reporterName.toLowerCase().includes(q) ||
        r.reportedUserName.toLowerCase().includes(q),
    );
  }

  const total = data.length;
  const start = (pagination.page - 1) * pagination.pageSize;
  return {
    data: data.slice(start, start + pagination.pageSize),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
  // REAL: return api.get<PaginatedResponse<Report>>('/admin/reports', { ...filters, ...pagination });
}

export async function resolveReport(
  id: string,
  payload: { adminNotes: string; replyEmail: string; action: string },
): Promise<void> {
  await delay(300);
  const r = MOCK_REPORTS.find((x) => x.id === id);
  if (r) {
    r.status = "resolved";
    r.adminNotes = payload.adminNotes;
    r.resolvedAt = new Date().toISOString();
  }
  // REAL: return api.patch(`/admin/reports/${id}/resolve`, payload);
}

export async function dismissReport(id: string): Promise<void> {
  await delay(300);
  const r = MOCK_REPORTS.find((x) => x.id === id);
  if (r) r.status = "dismissed";
  // REAL: return api.patch(`/admin/reports/${id}/dismiss`);
}
