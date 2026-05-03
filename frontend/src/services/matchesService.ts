import { api } from "../lib/apiClient";
import type { Match, PaginatedResponse, PaginationParams } from "../types";

export async function fetchMatches(
  pagination: PaginationParams = { page: 1, pageSize: 20 },
): Promise<PaginatedResponse<Match>> {
  const res = await api.get<{ matches: any[]; total: number; page: number }>(
    "/admin/matches",
    { page: pagination.page, pageSize: pagination.pageSize },
  );

  const mapped: Match[] = res.matches.map((m: any) => ({
    id: m.id,
    user1Id: m.user1.id,
    user1Name: m.user1.name,
    user1Initials: m.user1.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    user1AvatarColor: "linear-gradient(135deg,#c026d3,#7c3aed)",
    user2Id: m.user2.id,
    user2Name: m.user2.name,
    user2Initials: m.user2.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    user2AvatarColor: "linear-gradient(135deg,#0d9488,#0284c7)",
    type: m.createdByAdminId ? "manual" : "automatic",
    status: "active",
    locationName:
      [m.user1.town, m.user1.district, m.user1.country]
        .filter(Boolean)
        .join(", ") || "—",
    createdAt: m.matchedAt,
    dissolvedAt: null,
  }));

  return {
    data: mapped,
    total: res.total,
    page: res.page,
    pageSize: pagination.pageSize,
  };
}

export async function createManualMatch(
  user1Id: string,
  user2Id: string,
  notes?: string,
): Promise<void> {
  await api.post("/admin/matches", { user1Id, user2Id, notes });
}

export async function dissolveMatch(id: string): Promise<void> {
  await api.delete(`/admin/matches/${id}`);
}
