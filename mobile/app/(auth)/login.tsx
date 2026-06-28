import { useState, useEffect } from "react";
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
  Modal,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import NetInfo from "@react-native-community/netinfo";
import { getDb, initDb } from "../../src/db/schema";
import { COLORS, SIZES, SHADOWS } from "../../constants/theme";
import { useAppStore } from "../../src/store";
import api from "../../src/services/api";

// ─── Types ───
interface LockoutRecord {
  id: number;
  phone_number: string;
  locked_until: string | null;
  lockout_count: number;
  last_lockout_at: string | null;
  is_permanent: number;
  created_at: string;
}

interface TableInfo {
  name: string;
}

interface AttemptCount {
  count: number;
}

interface LockoutResult {
  justLocked: boolean;
  isPermanent: boolean;
  lockedUntil: string | null;
}

interface LockoutCheckResult {
  locked: boolean;
  message: string;
  remainingMinutes?: number;
}

// ─── Component ───
export default function LoginScreen() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  // ── Debug State ──
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);

  // ── Constants ──
  const LOCKOUT_MINUTES_SHORT = 5;
  const LOCKOUT_HOURS_LONG = 48;
  const MAX_ATTEMPTS_BEFORE_SHORT = 3;
  const MAX_LOCKOUTS_BEFORE_LONG = 3;

  // ── Debug Logger ──
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${message}`;
    console.log(log);
    setDebugLogs((prev) => [log, ...prev].slice(0, 50));
  };

  // ── Check Database Tables on Mount ──
  useEffect(() => {
    const checkDb = async () => {
      try {
        addDebugLog("🔍 Checking database tables...");
        await initDb();
        const db = await getDb();

        const tables = await db.getAllAsync<TableInfo>(
          "SELECT name FROM sqlite_master WHERE type='table'",
        );
        const tableNames = tables.map((t: TableInfo) => t.name).join(", ");
        addDebugLog(`📊 Tables found: ${tableNames}`);

        const lockoutTables = await db.getAllAsync<TableInfo>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('login_attempts', 'login_lockouts')",
        );

        if (lockoutTables.length === 2) {
          addDebugLog("✅ Lockout tables exist!");
        } else {
          addDebugLog("⚠️ Lockout tables MISSING!");
          addDebugLog("🔧 Creating missing tables...");
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS login_attempts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              phone_number TEXT NOT NULL,
              attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
              success INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS login_lockouts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              phone_number TEXT NOT NULL UNIQUE,
              locked_until TEXT,
              lockout_count INTEGER DEFAULT 0,
              last_lockout_at TEXT,
              is_permanent INTEGER DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
          `);
          addDebugLog("✅ Lockout tables created!");
        }

        if (phone.trim()) {
          const attempts = await db.getAllAsync<AttemptCount>(
            `SELECT COUNT(*) as count FROM login_attempts WHERE phone_number = ? AND success = 0`,
            [phone.trim()],
          );
          addDebugLog(`📝 Current failed attempts: ${attempts[0]?.count || 0}`);
          setAttemptCount(attempts[0]?.count || 0);
        }
      } catch (error: any) {
        addDebugLog(`❌ DB Check Error: ${error.message}`);
      }
    };

    checkDb();
  }, [phone]);

  const checkLockout = async (
    phoneNum: string,
  ): Promise<LockoutCheckResult> => {
    try {
      addDebugLog(`🔒 Checking lockout for: ${phoneNum}`);
      await initDb();
      const db = await getDb();

      const lockout = await db.getFirstAsync<LockoutRecord>(
        `SELECT * FROM login_lockouts WHERE phone_number = ?`,
        [phoneNum],
      );

      if (!lockout) {
        addDebugLog("🔓 No lockout record found");
        return { locked: false, message: "", remainingMinutes: 0 };
      }

      addDebugLog(`📋 Lockout record found`);

      // Check permanent lockout
      if (lockout.is_permanent === 1) {
        addDebugLog("🚫 PERMANENT LOCKOUT (48 hours)");
        return {
          locked: true,
          message:
            "Your account has been suspended for 48 hours due to too many failed attempts. Contact your supervisor.",
          remainingMinutes: 2880,
        };
      }

      // Check temporary lockout
      if (lockout.locked_until) {
        const lockedUntil = new Date(lockout.locked_until);
        const now = new Date();
        const timeDiff = lockedUntil.getTime() - now.getTime();

        addDebugLog(
          `⏰ Time remaining: ${Math.ceil(timeDiff / 60000)} minutes`,
        );

        if (timeDiff > 0) {
          const remaining = Math.ceil(timeDiff / 60000);
          addDebugLog(`⏳ Locked for ${remaining} more minutes`);
          return {
            locked: true,
            message: `Too many failed attempts. Try again in ${remaining} minute${remaining > 1 ? "s" : ""}.`,
            remainingMinutes: remaining,
          };
        } else {
          // ✅ FIX: Don't delete! Just return unlocked
          addDebugLog("🔓 Lockout expired but keeping record for history");
          // Return unlocked but KEEP the record for lockout_count tracking!
          return { locked: false, message: "", remainingMinutes: 0 };
        }
      }

      return { locked: false, message: "", remainingMinutes: 0 };
    } catch (error: any) {
      addDebugLog(` checkLockout error: ${error.message}`);
      return { locked: false, message: "", remainingMinutes: 0 };
    }
  };

  const recordFailedAttempt = async (
    phoneNum: string,
  ): Promise<LockoutResult> => {
    try {
      addDebugLog(`📝 Recording failed attempt for: ${phoneNum}`);
      await initDb();
      const db = await getDb();

      // 🔴 FIX: Get the existing lockout record (even if expired!)
      const existingLockout = await db.getFirstAsync<LockoutRecord>(
        `SELECT * FROM login_lockouts WHERE phone_number = ?`,
        [phoneNum],
      );

      // Check if currently locked (active lockout)
      let isCurrentlyLocked = false;
      let lockedUntilTime = null;

      if (existingLockout && existingLockout.locked_until) {
        const lockedUntil = new Date(existingLockout.locked_until);
        const now = new Date();
        if (now < lockedUntil) {
          isCurrentlyLocked = true;
          lockedUntilTime = existingLockout.locked_until;
          addDebugLog("⏳ Already locked - NOT resetting timer");
        }
      }

      // If currently locked, don't reset the timer!
      if (isCurrentlyLocked) {
        return {
          justLocked: false,
          isPermanent: existingLockout?.is_permanent === 1,
          lockedUntil: lockedUntilTime,
        };
      }

      // Record this attempt
      await db.runAsync(
        `INSERT INTO login_attempts (phone_number, success) VALUES (?, 0)`,
        [phoneNum],
      );

      // Count failed attempts since last lockout
      const lastLockout = await db.getFirstAsync<{ last_lockout_at: string }>(
        `SELECT last_lockout_at FROM login_lockouts WHERE phone_number = ?`,
        [phoneNum],
      );

      let attemptsQuery = `SELECT COUNT(*) as count FROM login_attempts 
                       WHERE phone_number = ? AND success = 0`;
      const params: any[] = [phoneNum];

      if (lastLockout?.last_lockout_at) {
        attemptsQuery += ` AND attempted_at > ?`;
        params.push(lastLockout.last_lockout_at);
      }

      const recentAttempts = await db.getFirstAsync<AttemptCount>(
        attemptsQuery,
        params,
      );

      const failCount = recentAttempts?.count || 0;
      addDebugLog(`📊 Failed attempts since last lockout: ${failCount}`);
      setAttemptCount(failCount);

      if (failCount >= MAX_ATTEMPTS_BEFORE_SHORT) {
        addDebugLog(`🚨 ${failCount} attempts - triggering lockout!`);

        // 🔴 FIX: Get the actual lockout_count from the record!
        let lockoutCount = existingLockout?.lockout_count || 0;

        // If the lockout is expired but we have a record, use its count
        // Otherwise start fresh
        if (existingLockout) {
          // Check if this is a new lockout (not just checking status)
          addDebugLog(`📋 Existing lockout count: ${lockoutCount}`);
          lockoutCount = lockoutCount + 1;
        } else {
          lockoutCount = 1;
        }

        addDebugLog(`📋 New lockout count: ${lockoutCount}`);

        const isPermanent = lockoutCount >= MAX_LOCKOUTS_BEFORE_LONG;
        addDebugLog(`🔒 Is permanent: ${isPermanent}`);

        // Track if this lockout is within 60 minutes of the last one
        // For simplicity, we'll use the lockout count logic

        const lockedUntil = isPermanent
          ? new Date(
              Date.now() + LOCKOUT_HOURS_LONG * 60 * 60 * 1000,
            ).toISOString()
          : new Date(
              Date.now() + LOCKOUT_MINUTES_SHORT * 60 * 1000,
            ).toISOString();

        addDebugLog(`⏰ Locked until: ${lockedUntil}`);

        // 🔴 FIX: Use INSERT OR REPLACE to update the record
        await db.runAsync(
          `INSERT OR REPLACE INTO login_lockouts 
         (phone_number, locked_until, lockout_count, last_lockout_at, is_permanent)
         VALUES (?, ?, ?, datetime('now'), ?)`,
          [phoneNum, lockedUntil, lockoutCount, isPermanent ? 1 : 0],
        );

        // If permanent, notify backend
        if (isPermanent) {
          try {
            await api.post("/auth/flag-lockout", {
              phoneNumber: phoneNum,
              reason: "Too many failed PIN attempts — 48 hour lockout",
              lockedUntil,
            });
            addDebugLog("📤 Sent lockout notification to server");
          } catch (error: any) {
            addDebugLog(`❌ Failed to notify server: ${error.message}`);
          }
        }

        // Clear attempts after lockout triggered
        await db.runAsync(
          `DELETE FROM login_attempts WHERE phone_number = ? AND success = 0`,
          [phoneNum],
        );

        return { justLocked: true, isPermanent, lockedUntil };
      }

      addDebugLog(" Attempt recorded, not locked yet");
      return { justLocked: false, isPermanent: false, lockedUntil: null };
    } catch (error: any) {
      addDebugLog(` recordFailedAttempt error: ${error.message}`);
      return { justLocked: false, isPermanent: false, lockedUntil: null };
    }
  };

  // ── Clear Failed Attempts ──
  const clearFailedAttempts = async (phoneNum: string) => {
    try {
      addDebugLog(`🧹 Clearing attempts for: ${phoneNum}`);
      const db = await getDb();
      await db.runAsync(`DELETE FROM login_attempts WHERE phone_number = ?`, [
        phoneNum,
      ]);
      await db.runAsync(`DELETE FROM login_lockouts WHERE phone_number = ?`, [
        phoneNum,
      ]);
      setAttemptCount(0);
      addDebugLog("✅ Cleared all attempts and lockouts");
    } catch (error: any) {
      addDebugLog(`❌ clearFailedAttempts error: ${error.message}`);
    }
  };

  const cacheUserLocally = async (user: any, token: string, pin: string) => {
    try {
      addDebugLog(`💾 Caching user: ${user.fullName}`);
      await initDb();
      const db = await getDb();
      const pinHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin.trim(),
      );
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_users 
         (id, phone_number, pin_hash, full_name, role, zone_allocations, ta_allocations, token, facility)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          user.id,
          user.phoneNumber,
          pinHash,
          user.fullName,
          user.role,
          JSON.stringify(user.zoneAllocations || []),
          JSON.stringify(user.taAllocations || []),
          token,
          JSON.stringify(user.facility || null),
        ],
      );

      if (user.zoneAllocations?.length > 0) {
        for (const za of user.zoneAllocations) {
          const z = za.zone;
          await db.runAsync(
            `INSERT OR REPLACE INTO zones (id, name, ta_id, ta_name) VALUES (?,?,?,?)`,
            [z.id, z.name, z.taId || null, ""],
          );
        }
      }
      addDebugLog("✅ User cached successfully");
    } catch (error: any) {
      addDebugLog(`❌ cacheUserLocally error: ${error.message}`);
    }
  };

  // ── Try Offline Login ──
  const tryOfflineLogin = async (phoneNum: string, pin: string) => {
    try {
      addDebugLog(`📱 Attempting offline login for: ${phoneNum}`);
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
      if (!cached) {
        addDebugLog("❌ No cached user found");
        return false;
      }

      addDebugLog(` Found cached user: ${cached.full_name}`);
      const user = {
        id: cached.id,
        fullName: cached.full_name,
        phoneNumber: cached.phone_number,
        role: cached.role,
        facility: cached.facility ? JSON.parse(cached.facility) : null,
        zoneAllocations: JSON.parse(cached.zone_allocations || "[]"),
        taAllocations: JSON.parse(cached.ta_allocations || "[]"),
      };
      const token = cached.token || "offline_token";
      await AsyncStorage.setItem("auth_token", token);
      await AsyncStorage.setItem("auth_user", JSON.stringify(user));
      setAuth(user, token);
      return true;
    } catch (error: any) {
      addDebugLog(`❌ tryOfflineLogin error: ${error.message}`);
      return false;
    }
  };

  // ── Handle Login ──
  const handleLogin = async () => {
    addDebugLog(`🚀 Login attempt for: ${phone.trim()}`);

    if (!phone.trim() || !pin.trim()) {
      addDebugLog("❌ Empty phone or PIN");
      Alert.alert("Error", "Please enter your phone number and PIN.");
      return;
    }
    if (pin.length !== 4) {
      addDebugLog("❌ PIN not 4 digits");
      Alert.alert("Error", "PIN must be 4 digits.");
      return;
    }

    setLoading(true);
    try {
      // Check lockout before anything
      const lockoutCheck = await checkLockout(phone.trim());
      if (lockoutCheck.locked) {
        addDebugLog("🚫 User is LOCKED!");
        setIsLocked(true);
        setLockoutMessage(lockoutCheck.message);
        setLoading(false);
        return;
      }

      const net = await NetInfo.fetch();
      addDebugLog(`📶 Network connected: ${net.isConnected}`);

      if (net.isConnected) {
        try {
          addDebugLog(`🌐 Attempting server login for: ${phone.trim()}`);
          const res = await api.post("/auth/login", {
            phoneNumber: phone.trim(),
            pin: pin.trim(),
            deviceId: "mobile-app",
          });
          const { token, user } = res.data.data;
          addDebugLog(`✅ Server login SUCCESS for: ${user.fullName}`);
          await AsyncStorage.setItem("auth_token", token);
          await AsyncStorage.setItem("auth_user", JSON.stringify(user));
          await cacheUserLocally(user, token, pin);
          await clearFailedAttempts(phone.trim());
          setAuth(user, token);
          router.replace("/(app)/home");
        } catch (err: any) {
          const status = err?.response?.status;
          addDebugLog(`❌ Server login error: Status ${status}`);

          if (status === 423) {
            addDebugLog("🚫 Server returned 423 - Account locked");
            const serverMsg = err?.response?.data?.message || "Account locked.";
            const isPermanent = err?.response?.data?.isPermanent;
            const lockedUntil = err?.response?.data?.lockedUntil;

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
            addDebugLog(
              "❌ 401 - Wrong credentials. Recording local attempt...",
            );
            const result = await recordFailedAttempt(phone.trim());

            if (result.justLocked) {
              addDebugLog(
                `🚫 LOCKED! ${result.isPermanent ? "PERMANENT" : "Temporary"}`,
              );
              setIsLocked(true);
              setLockoutMessage(
                result.isPermanent
                  ? "Your account has been suspended for 48 hours. Contact your supervisor."
                  : `Too many failed attempts. Locked for ${LOCKOUT_MINUTES_SHORT} minutes.`,
              );
              setLoading(false);
              return;
            }

            const serverMsg =
              err?.response?.data?.message || "Incorrect phone number or PIN.";
            Alert.alert("Login Failed", serverMsg);
          } else if (status === 403) {
            const serverMsg = err?.response?.data?.message || "";
            const code = err?.response?.data?.code || "";
            addDebugLog(`🔍 403 details — code: ${code} | msg: ${serverMsg}`);
            if (serverMsg.includes("portal-only")) {
              addDebugLog("🚫 Portal-only account tried mobile login");
              Alert.alert(
                "Wrong Platform",
                "This account is for the web portal only. Please log in at the MobileHealth web portal.",
              );
            } else if (
              code === "NO_ZONE_ALLOCATION" ||
              serverMsg.includes("not been allocated")
            ) {
              addDebugLog("🚫 CCW has no zone allocation");
              Alert.alert(
                "Setup Incomplete",
                "Your account has not been assigned to a zone yet. Please contact your supervisor.",
              );
            } else {
              addDebugLog("🚫 Account deactivated by admin");
              Alert.alert(
                "Account Suspended",
                "Your account has been deactivated. Contact your supervisor.",
              );
            }
          } else {
            addDebugLog("⚠️ Network error, trying offline login...");
            const ok = await tryOfflineLogin(phone.trim(), pin);
            if (ok) {
              addDebugLog("✅ Offline login successful");
              await clearFailedAttempts(phone.trim());
              Alert.alert(
                "Offline Mode",
                "Logged in with cached credentials. Data will sync when connected.",
                [{ text: "OK", onPress: () => router.replace("/(app)/home") }],
              );
            } else {
              addDebugLog("❌ Offline login failed");
              Alert.alert(
                "No Connection",
                "Cannot reach server and no cached credentials found. Please check your internet connection.",
              );
            }
          }
        }
      } else {
        addDebugLog("📱 Offline mode - trying cached credentials");
        const ok = await tryOfflineLogin(phone.trim(), pin);
        if (ok) {
          addDebugLog("✅ Offline login successful");
          await clearFailedAttempts(phone.trim());
          Alert.alert(
            "Offline Mode",
            "You are offline. Logged in with cached credentials.",
            [{ text: "OK", onPress: () => router.replace("/(app)/home") }],
          );
        } else {
          addDebugLog("❌ No cached credentials - recording failed attempt");
          const result = await recordFailedAttempt(phone.trim());
          if (result.justLocked) {
            addDebugLog(
              `🚫 LOCKED! ${result.isPermanent ? "PERMANENT" : "Temporary"}`,
            );
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
      addDebugLog(`❌ Unexpected error: ${err.message}`);
      Alert.alert("Error", err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // ── Check Lockout Status (for "Check again" button) ──
  const handleCheckLockoutStatus = async () => {
    addDebugLog("🔄 Checking lockout status...");
    try {
      const check = await checkLockout(phone.trim());

      if (!check.locked) {
        addDebugLog("🔓 Lockout has expired!");
        setIsLocked(false);
        setLockoutMessage("");
        setAttemptCount(0);
        Alert.alert(
          "Unlocked",
          "Your account is now unlocked. Please try logging in again.",
        );
      } else {
        addDebugLog(`⏳ Still locked: ${check.message}`);
        setLockoutMessage(check.message);
        setIsLocked(true);

        // Show remaining time in alert
        if (check.remainingMinutes && check.remainingMinutes > 0) {
          Alert.alert(
            "Still Locked",
            `Please wait ${check.remainingMinutes} more minute${check.remainingMinutes > 1 ? "s" : ""}.`,
          );
        }
      }
    } catch (err: any) {
      addDebugLog(`❌ Check error: ${err.message}`);
      Alert.alert("Error", "Failed to check lockout status.");
    }
  };

  // ─── Render ───
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

          {/* ── Debug Button ── */}
          {/* <TouchableOpacity
            onPress={() => setDebugVisible(true)}
            style={styles.debugButton}
          >
            <Text style={styles.debugButtonText}>🐛 Debug Logs</Text>
          </TouchableOpacity> */}

          {/* ── Lockout Banner ── */}
          {isLocked && (
            <View style={styles.lockoutBanner}>
              <Text style={styles.lockoutIcon}>🔒</Text>
              <Text style={styles.lockoutText}>{lockoutMessage}</Text>
              <TouchableOpacity
                onPress={handleCheckLockoutStatus}
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

          {/* ── Attempt Counter ── */}
          {attemptCount > 0 && !isLocked && (
            <Text style={styles.attemptCounter}>
              Failed attempts: {attemptCount} / {MAX_ATTEMPTS_BEFORE_SHORT}
            </Text>
          )}

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

      {/* ── Debug Modal ── */}
      <Modal visible={debugVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🐛 Debug Logs</Text>
              <TouchableOpacity
                onPress={() => setDebugVisible(false)}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.logContainer}>
              {debugLogs.length === 0 ? (
                <Text style={styles.logEmpty}>
                  No logs yet. Try logging in!
                </Text>
              ) : (
                debugLogs.map((log, index) => (
                  <Text key={index} style={styles.logLine}>
                    {log}
                  </Text>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setDebugLogs([]);
                  addDebugLog("🧹 Logs cleared");
                }}
                style={styles.clearLogsButton}
              >
                <Text style={styles.clearLogsText}>Clear Logs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  // Check server first, then local
                  try {
                    const net = await NetInfo.fetch();
                    if (net.isConnected) {
                      const res = await api.post("/auth/login", {
                        phoneNumber: phone.trim(),
                        pin: "0000",
                        deviceId: "mobile-app",
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
                style={styles.refreshButton}
              >
                <Text style={styles.refreshButtonText}>🔄 Check DB</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───
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
  debugButton: {
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "flex-end",
  },
  debugButtonText: {
    fontSize: 12,
    color: "#6B7280",
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
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: "#9CA3AF",
  },
  attemptCounter: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
    marginBottom: 8,
    marginTop: -8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    maxHeight: "80%",
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalClose: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 20,
    color: "#6B7280",
  },
  logContainer: {
    padding: 16,
    maxHeight: 400,
  },
  logEmpty: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20,
  },
  logLine: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#1F2937",
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  clearLogsButton: {
    padding: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  clearLogsText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
  },
  refreshButton: {
    padding: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
});
