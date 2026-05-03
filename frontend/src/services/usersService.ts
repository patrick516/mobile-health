import { api } from "../lib/apiClient";
import type {
  User,
  UserFilters,
  PaginatedResponse,
  PaginationParams,
} from "../types";

export async function fetchUsers(
  filters: UserFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 20 },
): Promise<PaginatedResponse<User>> {
  const res = await api.get<{ users: any[]; total: number; page: number }>(
    "/admin/users",
    {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...(filters.search && { search: filters.search }),
      ...(filters.status &&
        filters.status !== "all" && { status: filters.status }),
      ...(filters.gender &&
        filters.gender !== "all" && { gender: filters.gender }),
      ...(filters.plan &&
        filters.plan !== "all" && {
          isPremium: filters.plan !== "free" ? "true" : "false",
        }),
      ...(filters.verificationStatus &&
        filters.verificationStatus !== "all" && {
          verified:
            filters.verificationStatus === "verified" ? "true" : "false",
        }),
    },
  );

  const mapped: User[] = res.users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    gender: u.gender ?? "male",
    age: u.age ?? 0,
    locationId: u.district ?? "",
    locationName:
      [u.town, u.district, u.country].filter(Boolean).join(", ") || "—",
    status: u.status,
    verificationStatus: u.verified ? "verified" : "unverified",
    plan: u.isPremium ? "premium_monthly" : "free",
    photos: u.photos ?? [],
    documents: [],
    joinedAt: u.createdAt,
    lastActiveAt: u.lastSeenAt ?? u.createdAt,
    isOnline: u.online ?? false,
    totalMatches:
      (u._count?.matchesAsUser1 ?? 0) + (u._count?.matchesAsUser2 ?? 0),
    messagesSent: 0,
    reportsFiled: 0,
    reportsAgainst: u._count?.reportsReceived ?? 0,
    initials: u.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    avatarColor: "linear-gradient(135deg,#c026d3,#7c3aed)",
  }));

  return {
    data: mapped,
    total: res.total,
    page: res.page,
    pageSize: pagination.pageSize,
  };
}

export async function fetchUserById(id: string): Promise<User | undefined> {
  const res = await api.get<{ user: any }>(`/admin/users/${id}`);
  return res.user;
}

export async function banUser(id: string): Promise<void> {
  await api.patch(`/admin/users/${id}/ban`);
}

export async function unbanUser(id: string): Promise<void> {
  await api.patch(`/admin/users/${id}/unban`);
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

export async function approveVerification(id: string): Promise<void> {
  await api.patch(`/admin/users/${id}/verify`);
}

export async function rejectVerification(
  id: string,
  reason: string,
): Promise<void> {
  await api.patch(`/admin/users/${id}/reject`, { reason });
}

export async function grantPremium(id: string): Promise<void> {
  await api.post(`/admin/users/${id}/premium`, { plan: "monthly", days: 30 });
}

export async function revokePremium(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}/premium`);
}
