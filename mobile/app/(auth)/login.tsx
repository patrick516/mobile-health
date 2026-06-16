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
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import * as Crypto from "expo-crypto";
import NetInfo from "@react-native-community/netinfo";
import { getDb, initDb } from "../../src/db/schema";
import { COLORS, SIZES, SHADOWS } from "../../constants/theme";
import { useAppStore } from "../../src/store";
import api from "../../src/services/api";

export default function LoginScreen() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const LOCKOUT_MINUTES_SHORT = 5;
  const LOCKOUT_HOURS_LONG = 48;
  const MAX_ATTEMPTS_BEFORE_SHORT = 3;
  const MAX_LOCKOUTS_BEFORE_LONG = 3;
  const LOCKOUT_WINDOW_MINUTES = 60;

  const checkLockout = async (
    phoneNum: string,
  ): Promise<{ locked: boolean; message: string }> => {
    try {
      await initDb();
      const db = await getDb();
      const lockout = await db.getFirstAsync<any>(
        `SELECT * FROM login_lockouts WHERE phone_number = ?`,
        [phoneNum],
      );
      if (!lockout) return { locked: false, message: "" };

      if (lockout.is_permanent) {
        return {
          locked: true,
          message:
            "Your account has been suspended for 48 hours due to too many failed attempts. Contact your supervisor.",
        };
      }

      if (lockout.locked_until) {
        const lockedUntil = new Date(lockout.locked_until);
        if (new Date() < lockedUntil) {
          const remaining = Math.ceil(
            (lockedUntil.getTime() - Date.now()) / 60000,
          );
          return {
            locked: true,
            message: `Too many failed attempts. Try again in ${remaining} minute${remaining > 1 ? "s" : ""}.`,
          };
        }
      }
      return { locked: false, message: "" };
    } catch {
      return { locked: false, message: "" };
    }
  };

  const recordFailedAttempt = async (phoneNum: string) => {
    try {
      await initDb();
      const db = await getDb();

      // Record this attempt
      await db.runAsync(
        `INSERT INTO login_attempts (phone_number, success) VALUES (?, 0)`,
        [phoneNum],
      );

      // Count failed attempts in last 10 minutes
      const recentAttempts = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM login_attempts 
         WHERE phone_number = ? AND success = 0 
         AND attempted_at >= datetime('now', '-10 minutes')`,
        [phoneNum],
      );

      const failCount = recentAttempts?.count || 0;

      if (failCount >= MAX_ATTEMPTS_BEFORE_SHORT) {
        // Check existing lockout record
        const existing = await db.getFirstAsync<any>(
          `SELECT * FROM login_lockouts WHERE phone_number = ?`,
          [phoneNum],
        );

        const lockoutCount = (existing?.lockout_count || 0) + 1;

        // Check if 3+ lockouts happened within 1 hour → 48 hour ban
        const recentLockouts = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM login_attempts
           WHERE phone_number = ? AND success = 0
           AND attempted_at >= datetime('now', '-${LOCKOUT_WINDOW_MINUTES} minutes')`,
          [phoneNum],
        );

        const isPermanent = lockoutCount >= MAX_LOCKOUTS_BEFORE_LONG;
        const lockedUntil = isPermanent
          ? new Date(
              Date.now() + LOCKOUT_HOURS_LONG * 60 * 60 * 1000,
            ).toISOString()
          : new Date(
              Date.now() + LOCKOUT_MINUTES_SHORT * 60 * 1000,
            ).toISOString();

        await db.runAsync(
          `INSERT OR REPLACE INTO login_lockouts 
           (phone_number, locked_until, lockout_count, last_lockout_at, is_permanent)
           VALUES (?, ?, ?, datetime('now'), ?)`,
          [phoneNum, lockedUntil, lockoutCount, isPermanent ? 1 : 0],
        );

        // If 48hr ban — notify backend to flag on portal
        if (isPermanent) {
          try {
            await api.post("/auth/flag-lockout", {
              phoneNumber: phoneNum,
              reason: "Too many failed PIN attempts — 48 hour lockout",
              lockedUntil,
            });
          } catch {
            // Offline — will sync later, local lockout still applies
          }
        }

        return { justLocked: true, isPermanent, lockedUntil };
      }

      return { justLocked: false, isPermanent: false, lockedUntil: null };
    } catch (e) {
      console.warn("[LOCKOUT] Error recording attempt:", e);
      return { justLocked: false, isPermanent: false, lockedUntil: null };
    }
  };

  const clearFailedAttempts = async (phoneNum: string) => {
    try {
      const db = await getDb();
      await db.runAsync(`DELETE FROM login_attempts WHERE phone_number = ?`, [
        phoneNum,
      ]);
      await db.runAsync(`DELETE FROM login_lockouts WHERE phone_number = ?`, [
        phoneNum,
      ]);
    } catch {}
  };
  const cacheUserLocally = async (user: any, token: string, pin: string) => {
    try {
      await initDb();
      const db = await getDb();
      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin.trim(),
      );
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_users 
         (id, phone_number, pin_hash, full_name, role, zone_allocations, ta_allocations, token)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          user.id,
          user.phoneNumber,
          pinHash,
          user.fullName,
          user.role,
          JSON.stringify(user.zoneAllocations || []),
          JSON.stringify(user.taAllocations || []),
          token,
        ],
      );

      // Cache zones from user allocations
      if (user.zoneAllocations?.length > 0) {
        for (const za of user.zoneAllocations) {
          const z = za.zone;
          await db.runAsync(
            `INSERT OR REPLACE INTO zones (id, name, ta_id, ta_name) VALUES (?,?,?,?)`,
            [z.id, z.name, z.taId || null, ""],
          );
        }
      }
    } catch (e) {
      console.warn("[CACHE] Failed to cache user:", e);
    }
  };

  const tryOfflineLogin = async (phoneNum: string, pin: string) => {
    try {
      await initDb();
      const db = await getDb();
      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin.trim(),
      );
      const cached = await db.getFirstAsync<any>(
        `SELECT * FROM cached_users WHERE phone_number = ? AND pin_hash = ?`,
        [phoneNum.trim(), pinHash],
      );
      if (!cached) return false;

      const user = {
        id: cached.id,
        fullName: cached.full_name,
        phoneNumber: cached.phone_number,
        role: cached.role,
        zoneAllocations: JSON.parse(cached.zone_allocations || "[]"),
        taAllocations: JSON.parse(cached.ta_allocations || "[]"),
      };
      const token = cached.token || "offline_token";
      await AsyncStorage.setItem("auth_token", token);
      await AsyncStorage.setItem("auth_user", JSON.stringify(user));
      setAuth(user, token);
      return true;
    } catch (e) {
      console.warn("[OFFLINE LOGIN] Error:", e);
      return false;
    }
  };

  const handleLogin = async () => {
    if (!phone.trim() || !pin.trim()) {
      Alert.alert("Error", "Please enter your phone number and PIN.");
      return;
    }
    if (pin.length !== 4) {
      Alert.alert("Error", "PIN must be 4 digits.");
      return;
    }
    setLoading(true);
    try {
      // ── Check lockout before anything ──
      const lockoutCheck = await checkLockout(phone.trim());
      if (lockoutCheck.locked) {
        setIsLocked(true);
        setLockoutMessage(lockoutCheck.message);
        setLoading(false);
        return;
      }

      const net = await NetInfo.fetch();

      console.log("[LOGIN] Network state:", JSON.stringify(net));
      console.log("[LOGIN] isConnected:", net.isConnected);

      if (net.isConnected) {
        // Online — try server first
        try {
          console.log("[LOGIN] Attempting server login for:", phone.trim());
          const res = await api.post("/auth/login", {
            phoneNumber: phone.trim(),
            pin: pin.trim(),
          });
          const { token, user } = res.data.data;
          await AsyncStorage.setItem("auth_token", token);
          await AsyncStorage.setItem("auth_user", JSON.stringify(user));
          // Cache credentials for offline use
          await cacheUserLocally(user, token, pin);
          await clearFailedAttempts(phone.trim());
          setAuth(user, token);
          router.replace("/(app)/home");
        } catch (err: any) {
          const status = err?.response?.status;
          console.log("[LOGIN] Error status:", status);
          console.log("[LOGIN] Error message:", err?.message);
          console.log(
            "[LOGIN] Error response:",
            JSON.stringify(err?.response?.data),
          );
          if (status === 423) {
            // Server-side lockout — affects ALL devices
            const serverMsg = err?.response?.data?.message || "Account locked.";
            const isPermanent = err?.response?.data?.isPermanent;
            const lockedUntil = err?.response?.data?.lockedUntil;

            // Cache lockout locally too so it works offline
            const db = await getDb();
            await db.runAsync(
              `INSERT OR REPLACE INTO login_lockouts 
               (phone_number, locked_until, lockout_count, last_lockout_at, is_permanent)
               VALUES (?, ?, ?, datetime('now'), ?)`,
              [
                phone.trim(),
                lockedUntil ||
                  new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                err?.response?.data?.lockoutCount || 1,
                isPermanent ? 1 : 0,
              ],
            );

            setIsLocked(true);
            setLockoutMessage(serverMsg);
          } else if (status === 401) {
            // Wrong credentials — server tracks attempts now
            const attemptsRemaining = err?.response?.data?.attemptsRemaining;
            const serverMsg =
              err?.response?.data?.message || "Incorrect phone number or PIN.";
            Alert.alert("Login Failed", serverMsg);
          } else if (status === 403) {
            // Account deactivated by admin
            Alert.alert(
              "Account Suspended",
              "Your account has been deactivated. Contact your supervisor.",
            );
          } else {
            // Network error — server truly unreachable → try offline
            const ok = await tryOfflineLogin(phone.trim(), pin);
            if (ok) {
              await clearFailedAttempts(phone.trim());
              Alert.alert(
                "Offline Mode",
                "Logged in with cached credentials. Data will sync when connected.",
                [{ text: "OK", onPress: () => router.replace("/(app)/home") }],
              );
            } else {
              Alert.alert(
                "No Connection",
                "Cannot reach server and no cached credentials found. Please check your internet connection.",
              );
            }
          }
        }
      } else {
        // Offline — try cached credentials
        const ok = await tryOfflineLogin(phone.trim(), pin);
        if (ok) {
          await clearFailedAttempts(phone.trim());
          Alert.alert(
            "Offline Mode",
            "You are offline. Logged in with cached credentials.",
            [{ text: "OK", onPress: () => router.replace("/(app)/home") }],
          );
        } else {
          const result = await recordFailedAttempt(phone.trim());
          if (result.justLocked) {
            Alert.alert(
              result.isPermanent ? "Account Suspended" : "Account Locked",
              result.isPermanent
                ? "Your account has been suspended for 48 hours. Contact your supervisor."
                : `Too many failed attempts. Locked for ${LOCKOUT_MINUTES_SHORT} minutes.`,
            );
          } else {
            Alert.alert(
              "No Connection",
              "You are offline and have no cached credentials. Please connect to the internet for your first login.",
            );
          }
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "An unexpected error occurred.");
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
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Enter your phone number and PIN</Text>

          {/* Lockout Banner */}
          {isLocked && (
            <View style={styles.lockoutBanner}>
              <Text style={styles.lockoutIcon}>🔒</Text>
              <Text style={styles.lockoutText}>{lockoutMessage}</Text>
              <TouchableOpacity
                onPress={async () => {
                  // Check server first, then local
                  try {
                    const net = await NetInfo.fetch();
                    if (net.isConnected) {
                      const res = await api.post("/auth/login", {
                        phoneNumber: phone.trim(),
                        pin: "0000", // dummy — just to trigger server lockout check
                      });
                      // If we get here (success unlikely) — not locked
                      setIsLocked(false);
                      setLockoutMessage("");
                    } else {
                      const check = await checkLockout(phone.trim());
                      if (!check.locked) {
                        setIsLocked(false);
                        setLockoutMessage("");
                      } else {
                        setLockoutMessage(check.message);
                      }
                    }
                  } catch (err: any) {
                    const status = err?.response?.status;
                    if (status === 423) {
                      // Still locked on server
                      setLockoutMessage(
                        err?.response?.data?.message || lockoutMessage,
                      );
                    } else if (status === 401) {
                      // Server returned 401 = not locked anymore, admin unlocked
                      const db = await getDb();
                      await db.runAsync(
                        `DELETE FROM login_lockouts WHERE phone_number = ?`,
                        [phone.trim()],
                      );
                      setIsLocked(false);
                      setLockoutMessage("");
                    } else {
                      // Offline — check local
                      const check = await checkLockout(phone.trim());
                      if (!check.locked) {
                        setIsLocked(false);
                        setLockoutMessage("");
                      } else {
                        setLockoutMessage(check.message);
                      }
                    }
                  }
                }}
                style={styles.lockoutRetry}
              >
                <Text style={styles.lockoutRetryText}>Check again</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, isLocked && styles.inputDisabled]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="e.g. 0999999991"
            placeholderTextColor={COLORS.placeholder}
            autoCapitalize="none"
            editable={!isLocked}
          />

          <Text style={styles.label}>PIN</Text>
          <TextInput
            style={[styles.input, isLocked && styles.inputDisabled]}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="PIN"
            placeholderTextColor={COLORS.placeholder}
            editable={!isLocked}
          />

          <TouchableOpacity
            style={[
              styles.button,
              (loading || isLocked) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || isLocked}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>
                {isLocked ? "Account Locked" : "Sign In"}
              </Text>
            )}
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
  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    marginTop: SIZES.xl,
    fontSize: SIZES.fontXs,
  },
  lockoutBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
    alignItems: "center",
    gap: 6,
  },
  lockoutIcon: {
    fontSize: 28,
  },
  lockoutText: {
    fontSize: SIZES.fontSm,
    color: "#DC2626",
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 20,
  },
  lockoutRetry: {
    marginTop: 6,
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  lockoutRetryText: {
    fontSize: SIZES.fontXs,
    color: "#DC2626",
    fontWeight: "600",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: "#9CA3AF",
  },
});
