import { delay } from "../lib/utils";
import { MOCK_USERS } from "../lib/mockData";
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
  await delay(400);

  let data = [...MOCK_USERS];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }
  if (filters.status && filters.status !== "all")
    data = data.filter((u) => u.status === filters.status);
  if (filters.verificationStatus && filters.verificationStatus !== "all")
    data = data.filter(
      (u) => u.verificationStatus === filters.verificationStatus,
    );
  if (filters.plan && filters.plan !== "all")
    data = data.filter((u) => u.plan === filters.plan);
  if (filters.gender && filters.gender !== "all")
    data = data.filter((u) => u.gender === filters.gender);
  if (filters.locationId && filters.locationId !== "all")
    data = data.filter((u) => u.locationId === filters.locationId);

  const total = data.length;
  const start = (pagination.page - 1) * pagination.pageSize;
  const paged = data.slice(start, start + pagination.pageSize);

  return {
    data: paged,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
  // REAL: return api.get<PaginatedResponse<User>>('/admin/users', { ...filters, ...pagination });
}

export async function fetchUserById(id: string): Promise<User | undefined> {
  await delay(200);
  return MOCK_USERS.find((u) => u.id === id);
  // REAL: return api.get<User>(`/admin/users/${id}`);
}

export async function banUser(id: string): Promise<void> {
  await delay(300);
  const user = MOCK_USERS.find((u) => u.id === id);
  if (user) user.status = "banned";
  // REAL: return api.patch(`/admin/users/${id}/ban`);
}

export async function unbanUser(id: string): Promise<void> {
  await delay(300);
  const user = MOCK_USERS.find((u) => u.id === id);
  if (user) user.status = "active";
  // REAL: return api.patch(`/admin/users/${id}/unban`);
}

export async function deleteUser(id: string): Promise<void> {
  await delay(300);
  const idx = MOCK_USERS.findIndex((u) => u.id === id);
  if (idx > -1) MOCK_USERS.splice(idx, 1);
  // REAL: return api.delete(`/admin/users/${id}`);
}

export async function approveVerification(id: string): Promise<void> {
  await delay(300);
  const user = MOCK_USERS.find((u) => u.id === id);
  if (user) user.verificationStatus = "verified";
  // REAL: return api.patch(`/admin/users/${id}/verify`);
}

export async function rejectVerification(
  id: string,
  reason: string,
): Promise<void> {
  await delay(300);
  const user = MOCK_USERS.find((u) => u.id === id);
  if (user) user.verificationStatus = "rejected";
  console.log("Rejected reason:", reason);
  // REAL: return api.patch(`/admin/users/${id}/reject`, { reason });
}

export async function grantPremium(id: string): Promise<void> {
  await delay(300);
  const user = MOCK_USERS.find((u) => u.id === id);
  if (user) user.plan = "premium_monthly";
  // REAL: return api.patch(`/admin/users/${id}/grant-premium`);
}

export async function revokePremium(id: string): Promise<void> {
  await delay(300);
  const user = MOCK_USERS.find((u) => u.id === id);
  if (user) user.plan = "free";
  // REAL: return api.patch(`/admin/users/${id}/revoke-premium`);
}
