import { useEffect } from "react";
import { Tabs } from "expo-router";
import { TouchableOpacity, View, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SIZES } from "../../constants/theme";
import { useAppStore } from "../../src/store";
import { router } from "expo-router";

function TabIcon({ name, focused }: { name: any; focused: boolean }) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? COLORS.primary : COLORS.textMuted}
    />
  );
}

export default function AppLayout() {
  const pendingCount = useAppStore((s) => s.pendingCount);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function checkForUpdate() {
      // expo-updates does nothing in dev mode — safe to call always
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            "Update Ready",
            "A new version has been downloaded. Restart now to apply it.",
            [
              { text: "Later", style: "cancel" },
              {
                text: "Restart Now",
                onPress: () => Updates.reloadAsync(),
              },
            ],
          );
        }
      } catch {
        // Silent fail — dev mode or no network. Never block the user.
      }
    }

    checkForUpdate();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
          height: 60 + Math.max(0, insets.bottom - 8),
          paddingBottom: 8 + Math.max(0, insets.bottom - 8),
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="households/index"
        options={{
          title: "Households",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "people" : "people-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="referrals/index"
        options={{
          title: "Referrals",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "medical" : "medical-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sync/index"
        options={{
          title: "Sync",
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon
                name={focused ? "sync-circle" : "sync-circle-outline"}
                focused={focused}
              />
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      {/* Hidden screens — accessible by navigation but not shown in tab bar */}
      <Tabs.Screen name="households/add" options={{ href: null }} />
      <Tabs.Screen name="households/[id]" options={{ href: null }} />
      <Tabs.Screen name="households/members/add" options={{ href: null }} />
      <Tabs.Screen name="households/members/[id]" options={{ href: null }} />
      <Tabs.Screen name="visits/add" options={{ href: null }} />
      <Tabs.Screen name="visits/[id]" options={{ href: null }} />
      <Tabs.Screen name="referrals/add" options={{ href: null }} />
      <Tabs.Screen name="immunisations/index" options={{ href: null }} />
      <Tabs.Screen name="immunisations/record" options={{ href: null }} />
      <Tabs.Screen name="drugs/index" options={{ href: null }} />
      <Tabs.Screen name="anc/index" options={{ href: null }} />
      <Tabs.Screen name="pnc/index" options={{ href: null }} />
      <Tabs.Screen name="pnc/record" options={{ href: null }} />
      <Tabs.Screen name="tb/index" options={{ href: null }} />
      <Tabs.Screen name="tb/record" options={{ href: null }} />
      <Tabs.Screen name="fp/index" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: "bold" },
});
