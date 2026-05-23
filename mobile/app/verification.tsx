import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import apiClient from "../src/lib/apiClient";

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M19 12H5M12 5l-7 7 7 7"
        stroke="#1F0A3C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const DOCUMENT_TYPES = [
  { value: "national_id", label: "National ID", icon: "🪪" },
  { value: "passport", label: "Passport", icon: "📘" },
  { value: "drivers_license", label: "Driver's License", icon: "🚗" },
];

const STATUS_CONFIG = {
  pending: {
    color: "#F59E0B",
    bg: "#FFFBEB",
    label: "Under Review",
    icon: "⏳",
  },
  approved: { color: "#059669", bg: "#ECFDF5", label: "Verified", icon: "✅" },
  rejected: { color: "#DC2626", bg: "#FEF2F2", label: "Rejected", icon: "❌" },
  unsubmitted: {
    color: "#6B7280",
    bg: "#F9FAFB",
    label: "Not Submitted",
    icon: "📋",
  },
};

export default function VerificationScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("unsubmitted");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("national_id");
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get("/mobile/verification")
      .then((res) => {
        const v = res.data.verification;
        if (v) {
          setStatus(v.status);
          setRejectionReason(v.rejectionReason ?? null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pickImage = async (type: "document" | "selfie") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === "selfie" ? [1, 1] : [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      if (type === "document") setDocumentUri(result.assets[0].uri);
      else setSelfieUri(result.assets[0].uri);
    }
  };

  const takePhoto = async (type: "document" | "selfie") => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: type === "selfie" ? [1, 1] : [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      if (type === "document") setDocumentUri(result.assets[0].uri);
      else setSelfieUri(result.assets[0].uri);
    }
  };

  const showImageOptions = (type: "document" | "selfie") => {
    Alert.alert(
      type === "selfie" ? "Take Selfie" : "Upload Document",
      "Choose an option",
      [
        { text: "Camera", onPress: () => takePhoto(type) },
        { text: "Gallery", onPress: () => pickImage(type) },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const handleSubmit = async () => {
    if (!documentUri || !selfieUri) {
      Alert.alert(
        "Missing files",
        "Please upload both your document and selfie.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      const docFilename = documentUri.split("/").pop() ?? "document.jpg";
      const selfieFilename = selfieUri.split("/").pop() ?? "selfie.jpg";

      formData.append("document", {
        uri: documentUri,
        name: docFilename,
        type: "image/jpeg",
      } as any);
      formData.append("selfie", {
        uri: selfieUri,
        name: selfieFilename,
        type: "image/jpeg",
      } as any);
      formData.append("documentType", documentType);

      await apiClient.post("/mobile/verification", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStatus("pending");
      Alert.alert(
        "✅ Submitted!",
        "Your verification request has been submitted. We'll review it within 24 hours.",
      );
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Could not submit verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const statusConfig =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.unsubmitted;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View
          style={[styles.statusBanner, { backgroundColor: statusConfig.bg }]}
        >
          <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            {status === "pending" && (
              <Text style={styles.statusSub}>
                Usually reviewed within 24 hours
              </Text>
            )}
            {status === "approved" && (
              <Text style={styles.statusSub}>
                Your profile has a verified badge
              </Text>
            )}
            {status === "rejected" && rejectionReason && (
              <Text style={styles.statusSub}>{rejectionReason}</Text>
            )}
          </View>
        </View>

        {/* Why verify */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Why verify your identity?</Text>
          {[
            "✅ Get a verified badge on your profile",
            "💜 Build trust with other users",
            "🔒 Keep the community safe",
            "⚡ Get more matches",
          ].map((item) => (
            <Text key={item} style={styles.infoItem}>
              {item}
            </Text>
          ))}
        </View>

        {/* Only show form if not approved or pending */}
        {status !== "approved" && (
          <>
            {/* Document type */}
            <Text style={styles.sectionTitle}>Document Type</Text>
            <View style={styles.docTypeRow}>
              {DOCUMENT_TYPES.map((dt) => (
                <TouchableOpacity
                  key={dt.value}
                  style={[
                    styles.docTypeBtn,
                    documentType === dt.value && styles.docTypeBtnActive,
                  ]}
                  onPress={() => setDocumentType(dt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.docTypeIcon}>{dt.icon}</Text>
                  <Text
                    style={[
                      styles.docTypeLabel,
                      documentType === dt.value && styles.docTypeLabelActive,
                    ]}
                  >
                    {dt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Document upload */}
            <Text style={styles.sectionTitle}>Upload Document</Text>
            <Text style={styles.sectionSub}>
              Take a clear photo of the front of your document
            </Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => showImageOptions("document")}
              activeOpacity={0.8}
            >
              {documentUri ? (
                <Image
                  source={{ uri: documentUri }}
                  style={styles.uploadPreview}
                />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>🪪</Text>
                  <Text style={styles.uploadText}>Tap to upload document</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Selfie upload */}
            <Text style={styles.sectionTitle}>Selfie with Document</Text>
            <Text style={styles.sectionSub}>
              Take a selfie holding your document next to your face
            </Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => showImageOptions("selfie")}
              activeOpacity={0.8}
            >
              {selfieUri ? (
                <Image
                  source={{ uri: selfieUri }}
                  style={styles.uploadPreview}
                />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>🤳</Text>
                  <Text style={styles.uploadText}>Tap to take selfie</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={{ height: 100 }} />
          </>
        )}

        {status === "approved" && <View style={{ height: 40 }} />}
      </ScrollView>

      {/* Submit button */}
      {status !== "approved" && (
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.85}
            style={styles.submitTouch}
            disabled={submitting || status === "pending"}
          >
            <LinearGradient
              colors={
                status === "pending"
                  ? ["#9CA3AF", "#9CA3AF"]
                  : ["#EE2090", "#7C3AED"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitTxt}>
                  {status === "pending"
                    ? "Awaiting Review…"
                    : "Submit for Verification"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7FF" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF7FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1F0A3C" },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusIcon: { fontSize: 28 },
  statusLabel: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  statusSub: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  infoCard: {
    backgroundColor: "#F3EEFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 10,
  },
  infoItem: { fontSize: 13, color: "#374151", marginBottom: 6, lineHeight: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F0A3C",
    marginBottom: 6,
    marginTop: 8,
  },
  sectionSub: { fontSize: 12, color: "#9CA3AF", marginBottom: 12 },
  docTypeRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  docTypeBtn: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E9D8FD",
    backgroundColor: "#FFFFFF",
  },
  docTypeBtnActive: { borderColor: "#7C3AED", backgroundColor: "#F3EEFF" },
  docTypeIcon: { fontSize: 24, marginBottom: 6 },
  docTypeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  docTypeLabelActive: { color: "#7C3AED" },
  uploadBox: {
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E9D8FD",
    borderStyle: "dashed",
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  uploadPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  uploadPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadIcon: { fontSize: 40 },
  uploadText: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0EBF8",
  },
  submitTouch: { borderRadius: 50, overflow: "hidden" },
  submitBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 50 },
  submitTxt: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
