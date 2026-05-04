import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import PhotoUploader from "../src/components/PhotoUploader";
import PrimaryButton from "../src/components/PrimaryButton";
import { deletePhoto } from "../src/services/photosService";

interface Photo {
  id: string;
  url: string;
  isMain: boolean;
}

export default function UploadPhotosScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  const handlePhotoAdded = (photo: Photo) => {
    setPhotos((prev) => [...prev, photo]);
  };

  const handlePhotoDeleted = async (photoId: string) => {
    try {
      await deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Could not delete photo.");
    }
  };

  const handleContinue = () => {
    if (photos.length === 0) {
      Alert.alert(
        "No Photos",
        "Are you sure you want to continue without a photo? You can add photos later from your profile.",
        [
          { text: "Add Photo", style: "cancel" },
          {
            text: "Skip for Now",
            onPress: () => router.replace("/discover"),
          },
        ],
      );
      return;
    }
    router.replace("/discover");
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Your Photos 📸</Text>
          <Text style={styles.headerSub}>
            Profiles with photos get 10x more matches. Add at least one photo to
            get started.
          </Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <PhotoUploader
            photos={photos}
            onPhotoAdded={handlePhotoAdded}
            onPhotoDeleted={handlePhotoDeleted}
            maxPhotos={6}
          />
        </View>

        {/* ── Buttons ── */}
        <View style={styles.actions}>
          <PrimaryButton
            title={photos.length > 0 ? "Continue to Discover →" : "Continue"}
            onPress={handleContinue}
          />
          <TouchableOpacity
            onPress={() => router.replace("/discover")}
            activeOpacity={0.7}
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7FF" },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },
  header: { marginBottom: 28 },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1F0A3C",
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  headerSub: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
