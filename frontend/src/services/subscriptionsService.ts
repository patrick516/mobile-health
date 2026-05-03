import { api } from "../lib/apiClient";
import type {
  Subscription,
  PaginatedResponse,
  PaginationParams,
} from "../types";

export async function fetchSubscriptions(
  pagination: PaginationParams = { page: 1, pageSize: 20 },
): Promise<PaginatedResponse<Subscription>> {
  const res = await api.get<{
    subscriptions: any[];
    total: number;
    page: number;
  }>("/admin/subscriptions", {
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  const mapped: Subscription[] = res.subscriptions.map((s: any) => ({
    id: s.id,
    userId: s.user.id,
    userName: s.user.name,
    userInitials: s.user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    userAvatarColor: "linear-gradient(135deg,#c026d3,#7c3aed)",
    plan: s.plan === "monthly" ? "premium_monthly" : "premium_yearly",
    startedAt: s.startedAt ?? s.createdAt,
    expiresAt: s.expiresAt ?? s.createdAt,
    isActive: s.isActive,
    paymentStatus: s.isActive ? "paid" : "expired",
  }));

  return {
    data: mapped,
    total: res.total,
    page: res.page,
    pageSize: pagination.pageSize,
  };
}

export async function grantSubscription(
  userId: string,
  plan: string,
): Promise<void> {
  await api.post(`/admin/users/${userId}/premium`, { plan, days: 30 });
}

export async function revokeSubscription(id: string): Promise<void> {
  await api.patch(`/admin/users/${id}/revoke-premium`);
}
