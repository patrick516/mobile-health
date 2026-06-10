import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../constants/theme";

export default function Index() {
  useEffect(() => {
    const check = async () => {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        router.replace("/(app)/home");
      } else {
        router.replace("/(auth)/login");
      }
    };
    const timer = setTimeout(check, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.primary,
      }}
    >
      <ActivityIndicator size="large" color={COLORS.white} />
    </View>
  );
}
