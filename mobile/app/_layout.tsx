import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SIZES } from "../constants/theme";
import { useAppStore } from "../src/store";
import { initDb } from "../src/db/schema";

const { width } = Dimensions.get("window");

export default function RootLayout() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [ready, setReady] = useState(false);
  const logoScale = new Animated.Value(0.4);
  const logoOpacity = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // ← MUST run first — opens SQLite and creates all tables
        await initDb();

        const token = await AsyncStorage.getItem("auth_token");
        const userRaw = await AsyncStorage.getItem("auth_user");
        if (token && userRaw) {
          const user = JSON.parse(userRaw);
          setAuth(user, token);
        }
      } catch (err) {
        console.error("Bootstrap error:", err);
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

    // Bootstrap auth then show app after 2 seconds
    bootstrap().then(() => {
      setTimeout(() => setReady(true), 2000);
    });
  }, []);

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
