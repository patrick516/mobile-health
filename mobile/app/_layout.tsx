import { useEffect } from "react";
import { Stack } from "expo-router";
import { router } from "expo-router";
import { useAuthStore } from "../src/store/authStore";
import { registerPushToken } from "../src/lib/notifications";

export default function RootLayout() {
  const { hydrate, hydrated, isAuthenticated } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
    } else {
      // Register push token after auth is confirmed
      registerPushToken().catch(console.error);
    }
  }, [hydrated, isAuthenticated]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="upload-photos" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile-detail" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="search" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="verification" />
    </Stack>
  );
}
