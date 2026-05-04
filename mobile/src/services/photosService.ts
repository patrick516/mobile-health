import * as ImagePicker from "expo-image-picker";
import apiClient from "../lib/apiClient";

export async function pickImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permission to access photos was denied.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) return null;
  return result.assets[0];
}

export async function uploadPhoto(
  uri: string,
  isMain: boolean = false,
): Promise<any> {
  const formData = new FormData();

  const filename = uri.split("/").pop() ?? "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("photo", {
    uri,
    name: filename,
    type,
  } as any);

  formData.append("isMain", isMain ? "true" : "false");

  const response = await apiClient.post("/mobile/photos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export async function getMyPhotos(): Promise<any[]> {
  const response = await apiClient.get("/mobile/photos");
  return response.data.photos;
}

export async function deletePhoto(photoId: string): Promise<void> {
  await apiClient.delete(`/mobile/photos/${photoId}`);
}

export async function setMainPhoto(photoId: string): Promise<void> {
  await apiClient.patch(`/mobile/photos/${photoId}/main`);
}
