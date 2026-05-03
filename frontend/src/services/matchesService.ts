import { delay } from "../lib/utils";
import { MOCK_MATCHES } from "../lib/mockData";
import type { Match, PaginatedResponse, PaginationParams } from "../types";

export async function fetchMatches(
  pagination: PaginationParams = { page: 1, pageSize: 20 },
): Promise<PaginatedResponse<Match>> {
  await delay(400);
  const total = MOCK_MATCHES.length;
  const start = (pagination.page - 1) * pagination.pageSize;
  return {
    data: MOCK_MATCHES.slice(start, start + pagination.pageSize),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
  // REAL: return api.get<PaginatedResponse<Match>>('/admin/matches', pagination);
}

export async function createManualMatch(
  user1Id: string,
  user2Id: string,
  notes?: string,
): Promise<void> {
  await delay(400);
  console.log("Manual match created:", { user1Id, user2Id, notes });
  // REAL: return api.post('/admin/matches', { user1Id, user2Id, notes });
}

export async function dissolveMatch(id: string): Promise<void> {
  await delay(300);
  const m = MOCK_MATCHES.find((x) => x.id === id);
  if (m) {
    m.status = "dissolved";
    m.dissolvedAt = new Date().toISOString();
  }
  // REAL: return api.patch(`/admin/matches/${id}/dissolve`);
}
