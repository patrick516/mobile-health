import apiClient from "../lib/apiClient";

export interface DiscoverUser {
  id: string;
  name: string;
  age: number;
  gender: string;
  verified: boolean;
  profession: string | null;
  country: string | null;
  district: string | null;
  town: string | null;
  bio: string | null;
  interests: string[];
  photoUrl: string | null;
  online: boolean;
  isPremium: boolean;
  photos: { id: string; url: string; isMain: boolean }[];
  lifestyle: any | null;
}

export async function fetchDiscover(page = 1): Promise<{
  users: DiscoverUser[];
  total: number;
  page: number;
}> {
  const response = await apiClient.get("/mobile/discover", {
    params: { page, limit: 20 },
  });
  return response.data;
}

export async function fetchForYou(page = 1): Promise<{
  users: DiscoverUser[];
  total: number;
  page: number;
}> {
  const response = await apiClient.get("/mobile/discover/for-you", {
    params: { page, limit: 20 },
  });
  return response.data;
}
