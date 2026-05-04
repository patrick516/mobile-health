import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { pickImage, uploadPhoto } from "../services/photosService";

interface Photo {
  id: string;
  url: string;
  isMain: boolean;
}

interface Props {
  photos: Photo[];
  onPhotoAdded: (photo: Photo) => void;
  onPhotoDeleted: (photoId: string) => void;
  maxPhotos?: number;
}

export default function PhotoUploader({
  photos,
  onPhotoAdded,
  onPhotoDeleted,
  maxPhotos = 6,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const handleAddPhoto = async (isMain: boolean = false) => {
    try {
      const asset = await pickImage();
      if (!asset) return;

      setUploading(true);
      const response = await uploadPhoto(asset.uri, isMain);
      onPhotoAdded(response.photo);
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message ?? "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (photoId: string) => {
    Alert.alert("Delete Photo", "Are you sure you want to delete this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onPhotoDeleted(photoId),
      },
    ]);
  };

  const slots = Array.from({ length: maxPhotos });

  return (
    <View>
      <Text style={styles.label}>Profile Photos</Text>
      <Text style={styles.sublabel}>
        Add up to {maxPhotos} photos. First photo will be your main photo.
      </Text>
      <View style={styles.grid}>
        {slots.map((_, i) => {
          const photo = photos[i];
          return (
            <View key={i} style={styles.slot}>
              {photo ? (
                <TouchableOpacity
                  onPress={() => handleDelete(photo.id)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: photo.url }} style={styles.photo} />
                  {photo.isMain && (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>Main</Text>
                    </View>
                  )}
                  <View style={styles.deleteOverlay}>
                    <Text style={styles.deleteIcon}>✕</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleAddPhoto(photos.length === 0)}
                  disabled={uploading}
                  activeOpacity={0.7}
                >
                  {uploading && i === photos.length ? (
                    <ActivityIndicator color="#7C3AED" size="small" />
                  ) : (
                    <Text style={styles.addIcon}>+</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slot: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  mainBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mainBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  deleteOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  addBtn: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3EEFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E9D8FD",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: {
    fontSize: 28,
    color: "#7C3AED",
    lineHeight: 32,
  },
});
