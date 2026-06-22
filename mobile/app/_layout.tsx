import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SIZES } from "../constants/theme";
import { useAppStore } from "../src/store";
import { initDb, resetDatabase } from "../src/db/schema";
import {
  cleanOrphanedRecords,
  debugPendingRecords,
  forceClearSyncQueue,
} from "../src/db/sync-queue";

const { width } = Dimensions.get("window");

export default function RootLayout() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const logoScale = new Animated.Value(0.4);
  const logoOpacity = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);

  // ─── INITIALIZE DATABASE WITH RETRY ───
  const initializeDatabase = async (retryCount = 0): Promise<boolean> => {
    try {
      await initDb();
      console.log("[DB] ✅ Database initialized successfully");

      // Clean sync queue
      try {
        const pending = await debugPendingRecords();
        console.log(`📊 Pending before cleanup: ${pending?.length || 0}`);

        const cleaned = await cleanOrphanedRecords();
        if (cleaned > 0) {
          console.log(`🧹 Cleaned ${cleaned} orphaned sync records`);
        }

        const afterPending = await debugPendingRecords();
        console.log(`📊 Pending after cleanup: ${afterPending?.length || 0}`);

        if (afterPending && afterPending.length > 0) {
          console.log(
            `🔧 Force clearing ${afterPending.length} remaining records...`,
          );
          const forced = await forceClearSyncQueue();
          console.log(`🧹 Force cleared ${forced} records`);
        }
      } catch (syncError) {
        console.error("Sync cleanup error:", syncError);
      }

      return true;
    } catch (error) {
      console.error(`[DB] Init error (attempt ${retryCount + 1}):`, error);

      // Try to reset database
      if (retryCount < 2) {
        console.log("[DB] Attempting to reset database...");
        try {
          setIsResetting(true);
          await resetDatabase();
          console.log("[DB] ✅ Database reset successful");
          setIsResetting(false);
          // Retry initialization
          return await initializeDatabase(retryCount + 1);
        } catch (resetError) {
          console.error("[DB] Reset failed:", resetError);
          setIsResetting(false);
        }
      }

      setDbError(true);
      return false;
    }
  };

  // ─── BOOTSTRAP APP ───
  useEffect(() => {
    const bootstrap = async () => {
      // Initialize database
      const dbReady = await initializeDatabase();

      if (!dbReady) {
        console.error("[APP] Database initialization failed");
        // Still show app but with error state
      }

      // Check auth
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const userRaw = await AsyncStorage.getItem("auth_user");
        if (token && userRaw) {
          const user = JSON.parse(userRaw);
          setAuth(user, token);
        }
      } catch (err) {
        console.error("Bootstrap auth error:", err);
      }
    };

    // Animate logo
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    bootstrap().then(() => {
      setTimeout(() => setReady(true), 2000);
    });
  }, []);

  // ─── SPLASH SCREEN ───
  if (!ready) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <Animated.Image
          source={require("../assets/images/logo.png")}
          style={[
            styles.logo,
            { transform: [{ scale: logoScale }], opacity: logoOpacity },
          ]}
          resizeMode="contain"
        />
        <Animated.View style={{ opacity: textOpacity, alignItems: "center" }}>
          <Text style={styles.appName}>MobileHealth Malawi</Text>
          <Text style={styles.appTagline}>
            Community Health Worker Platform
          </Text>
          {isResetting && (
            <View style={{ marginTop: 20 }}>
              <ActivityIndicator color="white" size="small" />
              <Text style={{ color: "white", marginTop: 8, fontSize: 14 }}>
                Repairing database...
              </Text>
            </View>
          )}
          {dbError && (
            <Text style={{ color: "#FCA5A5", marginTop: 20, fontSize: 14 }}>
              Database error. Please restart the app.
            </Text>
          )}
        </Animated.View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(app)" />
      </Stack>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
  },
  appName: {
    color: COLORS.white,
    fontSize: SIZES.fontXxl,
    fontWeight: "bold",
    marginTop: SIZES.sm,
  },
  appTagline: {
    color: "rgba(255,255,255,0.75)",
    fontSize: SIZES.fontSm,
    textAlign: "center",
    paddingHorizontal: 40,
    marginTop: 4,
  },
});
