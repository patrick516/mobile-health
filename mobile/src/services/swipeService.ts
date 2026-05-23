import apiClient from "../lib/apiClient";

export interface LikedByUser {
  id: string;
  name: string;
  age: number;
  photoUrl: string | null;
  photos: { id: string; url: string; isMain: boolean }[];
  town: string | null;
  district: string | null;
  verified: boolean;
  online: boolean;
}

export async function fetchLikes(): Promise<{
  users: LikedByUser[];
  total: number;
}> {
  const response = await apiClient.get("/mobile/swipe/likes");
  return response.data;
}

export async function likeUser(userId: string): Promise<{
  matched: boolean;
  match?: any;
}> {
  const response = await apiClient.post(`/mobile/swipe/like/${userId}`);
  return response.data;
}

export async function passUser(userId: string): Promise<void> {
  await apiClient.post(`/mobile/swipe/pass/${userId}`);
}

export async function rewindSwipe(): Promise<any> {
  const response = await apiClient.post("/mobile/swipe/rewind");
  return response.data;
}
