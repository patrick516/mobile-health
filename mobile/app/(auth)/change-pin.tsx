import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS, SIZES, SHADOWS } from "../../constants/theme";
import api from "../../src/services/api";

export default function ChangePinScreen() {
  const { userId, tempPin, fullName } = useLocalSearchParams<{
    userId: string;
    tempPin: string;
    fullName: string;
  }>();

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      Alert.alert("Error", "PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert("Error", "PINs do not match. Please try again.");
      return;
    }
    if (newPin === tempPin) {
      Alert.alert(
        "Choose a Different PIN",
        "Your new PIN must be different from the temporary PIN you were given.",
      );
      return;
    }

    setLoading(true);
    try {
      await api.patch("/auth/complete-pin-reset", {
        userId,
        tempPin,
        newPin,
      });

      Alert.alert(
        "PIN Updated",
        "Your new PIN has been saved. Please sign in again with your new PIN.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login"),
          },
        ],
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Could not update your PIN. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>MobileHealth Malawi</Text>
          <Text style={styles.appSub}>Community Health Worker Platform</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create a New PIN</Text>
          <Text style={styles.cardSub}>
            {fullName ? `Hi ${fullName}, ` : ""}your PIN was reset by your
            administrator. Please choose a new 4-digit PIN to continue.
          </Text>

          <Text style={styles.label}>New PIN</Text>
          <TextInput
            style={styles.input}
            value={newPin}
            onChangeText={setNewPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="Enter new PIN"
            placeholderTextColor={COLORS.placeholder}
          />

          <Text style={styles.label}>Confirm New PIN</Text>
          <TextInput
            style={styles.input}
            value={confirmPin}
            onChangeText={setConfirmPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="Re-enter new PIN"
            placeholderTextColor={COLORS.placeholder}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Save New PIN</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.backLinkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>MobileHealth Malawi v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: SIZES.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: SIZES.xxxl,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SIZES.md,
    ...SHADOWS.md,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  appName: {
    fontSize: SIZES.fontXxl,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: SIZES.sm,
  },
  appSub: {
    fontSize: SIZES.fontSm,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    ...SHADOWS.lg,
  },
  cardTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xl,
    lineHeight: 20,
  },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    marginBottom: SIZES.lg,
    backgroundColor: COLORS.background,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.lg,
    alignItems: "center",
    marginTop: SIZES.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
  },
  backLink: {
    alignItems: "center",
    marginTop: SIZES.lg,
  },
  backLinkText: {
    color: COLORS.primary,
    fontSize: SIZES.fontSm,
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    marginTop: SIZES.xl,
    fontSize: SIZES.fontXs,
  },
});
