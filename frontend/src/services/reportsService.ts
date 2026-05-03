import { api } from "../lib/apiClient";
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
  const res = await api.get<{ reports: any[]; total: number; page: number }>(
    "/admin/reports",
    {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...(filters.status &&
        filters.status !== "all" && { status: filters.status }),
      ...(filters.type && filters.type !== "all" && { reason: filters.type }),
      ...(filters.search && { search: filters.search }),
    },
  );

  const mapped: Report[] = res.reports.map((r: any) => ({
    id: r.id,
    reporterId: r.submitter?.id ?? "",
    reporterName: r.submitter?.name ?? "Unknown",
    reporterInitials: (r.submitter?.name ?? "?")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    reporterAvatarColor: "linear-gradient(135deg,#c026d3,#7c3aed)",
    reportedUserId: r.subject?.id ?? "",
    reportedUserName: r.subject?.name ?? "Unknown",
    type: r.reason,
    description: r.description ?? "",
    status: r.status,
    adminNotes: r.adminReply ?? null,
    resolvedAt: r.resolvedAt ?? null,
    createdAt: r.createdAt,
  }));

  return {
    data: mapped,
    total: res.total,
    page: res.page,
    pageSize: pagination.pageSize,
  };
}

export async function resolveReport(
  id: string,
  payload: { adminNotes: string; replyEmail: string; action: string },
): Promise<void> {
  await api.patch(`/admin/reports/${id}/resolve`, {
    adminReply: payload.replyEmail || payload.adminNotes,
  });
}

export async function dismissReport(id: string): Promise<void> {
  await api.patch(`/admin/reports/${id}/resolve`, {
    adminReply: "Report dismissed by admin.",
  });
}
