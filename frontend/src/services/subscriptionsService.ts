import { delay } from "../lib/utils";
import { MOCK_SUBSCRIPTIONS } from "../lib/mockData";
import type {
  Subscription,
  PaginatedResponse,
  PaginationParams,
} from "../types";

export async function fetchSubscriptions(
  pagination: PaginationParams = { page: 1, pageSize: 20 },
): Promise<PaginatedResponse<Subscription>> {
  await delay(400);
  const total = MOCK_SUBSCRIPTIONS.length;
  const start = (pagination.page - 1) * pagination.pageSize;
  return {
    data: MOCK_SUBSCRIPTIONS.slice(start, start + pagination.pageSize),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
  // REAL: return api.get<PaginatedResponse<Subscription>>('/admin/subscriptions', pagination);
}

export async function grantSubscription(
  userId: string,
  plan: string,
): Promise<void> {
  await delay(300);
  console.log("Grant subscription:", { userId, plan });
  // REAL: return api.post('/admin/subscriptions', { userId, plan });
}

export async function revokeSubscription(id: string): Promise<void> {
  await delay(300);
  const s = MOCK_SUBSCRIPTIONS.find((x) => x.id === id);
  if (s) s.isActive = false;
  // REAL: return api.patch(`/admin/subscriptions/${id}/revoke`);
}
