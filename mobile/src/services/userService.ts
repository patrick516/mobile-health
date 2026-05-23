import apiClient from "../lib/apiClient";

export interface MyProfile {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
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
  email: string;
  dateOfBirth: string | null;
  photos?: { id: string; url: string; isMain: boolean }[];
  lifestyle: {
    smoking?: string | null;
    alcohol?: string | null;
    children?: string | null;
    relationshipGoal?: string | null;
    exercise?: string | null;
    diet?: string | null;
    religion?: string | null;
    education?: string | null;
    height?: string | null;
    zodiac?: string | null;
  } | null;
}

export async function fetchMe(): Promise<MyProfile> {
  const response = await apiClient.get("/mobile/users/me");
  return response.data.user;
}

export async function updateMe(
  data: Partial<{
    name: string;
    bio: string;
    profession: string;
    date_of_birth: string;
    country: string;
    district: string;
    town: string;
  }>,
): Promise<MyProfile> {
  const response = await apiClient.patch("/mobile/users/me", data);
  return response.data.user;
}

export async function updateLifestyle(
  data: Record<string, string>,
): Promise<void> {
  await apiClient.patch("/mobile/users/me/lifestyle", data);
}

export async function updateInterests(interests: string[]): Promise<void> {
  await apiClient.patch("/mobile/users/me/interests", { interests });
}

export async function fetchUserById(id: string): Promise<any> {
  const response = await apiClient.get(`/mobile/users/${id}`);
  return response.data.user;
}

export async function deleteMe(): Promise<void> {
  await apiClient.delete("/mobile/users/me");
}
