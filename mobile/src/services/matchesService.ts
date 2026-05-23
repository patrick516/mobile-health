import apiClient from "../lib/apiClient";

export interface Match {
  id: string;
  matchedAt: string;
  conversationId: string | null;
  user: {
    id: string;
    name: string;
    age: number | null;
    photoUrl: string | null;
    online: boolean;
    verified: boolean;
    profession: string | null;
    town: string | null;
    district: string | null;
    country: string | null;
  };
}

export async function fetchMatches(): Promise<Match[]> {
  const response = await apiClient.get("/mobile/matches");
  return response.data.matches;
}

export async function fetchLikesReceived(): Promise<any[]> {
  const response = await apiClient.get("/mobile/matches/likes/received");
  return response.data.likes;
}

export async function fetchLikesSent(): Promise<any[]> {
  const response = await apiClient.get("/mobile/matches/likes/sent");
  return response.data.likes;
}
