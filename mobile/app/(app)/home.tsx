import { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SIZES, SHADOWS } from "../../constants/theme";
import { useAppStore } from "../../src/store";
import { getPendingCount } from "../../src/db/sync-queue";
import { runSync } from "../../src/services/sync.service";

const NAV_BUTTONS = [
  {
    label: "Households",
    labelNy: "Nyumba",
    icon: "home",
    route: "/(app)/households/",
    color: COLORS.primary,
  },
  {
    label: "Referrals",
    labelNy: "Kutumiza",
    icon: "medical",
    route: "/(app)/referrals/",
    color: COLORS.secondary,
  },
  {
    label: "Immunisations",
    labelNy: "Mvaccination",
    icon: "shield-checkmark",
    route: "/(app)/immunisations/",
    color: "#7C3AED",
  },
  {
    label: "Drug Stock",
    labelNy: "Mankhwala",
    icon: "flask",
    route: "/(app)/drugs/",
    color: "#D97706",
  },
  {
    label: "ANC",
    labelNy: "ANC",
    icon: "heart",
    route: "/(app)/anc/",
    color: "#DB2777",
  },
  {
    label: "Notifications",
    labelNy: "Zindikirani",
    icon: "notifications",
    route: "/(app)/notifications/",
    color: "#0284C7",
  },
];

export default function HomeScreen() {
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const toggleLanguage = useAppStore((s) => s.toggleLanguage);
  const pendingCount = useAppStore((s) => s.pendingCount);
  const isSyncing = useAppStore((s) => s.isSyncing);
  const lastSyncAt = useAppStore((s) => s.lastSyncAt);
  const setPendingCount = useAppStore((s) => s.setPendingCount);
  const setIsSyncing = useAppStore((s) => s.setIsSyncing);
  const setLastSyncAt = useAppStore((s) => s.setLastSyncAt);
  const clearAuth = useAppStore((s) => s.clearAuth);

  useEffect(() => {
    refreshPendingCount();
    // Auto-sync on mount
    handleSync();
  }, []);

  const refreshPendingCount = async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const result = await runSync();
    setIsSyncing(false);
    setLastSyncAt(new Date());
    await refreshPendingCount();
    if (result.synced > 0) {
      console.log(`[HOME] Synced ${result.synced} records`);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("auth_token");
          await AsyncStorage.removeItem("auth_user");
          clearAuth();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return language === "en" ? "Good morning" : "Mwadzuka bwanji";
    if (h < 17) return language === "en" ? "Good afternoon" : "Muli bwanji";
    return language === "en" ? "Good evening" : "Madzulo abwino";
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>
            {user?.fullName || "Health Worker"}
          </Text>
          <Text style={styles.role}>{user?.role?.replace("_", " ")}</Text>
          {user?.facility && (
            <Text style={styles.facilityTag}>🏥 {user.facility.name}</Text>
          )}
          {user?.zoneAllocations && user.zoneAllocations.length > 0 && (
            <Text style={styles.zoneTag}>
              📍 {user.zoneAllocations.map((za) => za.zone.name).join(", ")}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
            <Text style={styles.langText}>
              {language === "en" ? "NY" : "EN"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Sync status bar */}
        <TouchableOpacity
          style={[styles.syncBar, isSyncing && styles.syncBarActive]}
          onPress={handleSync}
        >
          <Ionicons
            name={
              isSyncing
                ? "sync"
                : pendingCount > 0
                  ? "cloud-upload-outline"
                  : "checkmark-circle-outline"
            }
            size={18}
            color={pendingCount > 0 ? COLORS.warning : COLORS.success}
          />
          <Text style={styles.syncText}>
            {isSyncing
              ? "Syncing..."
              : pendingCount > 0
                ? `${pendingCount} record${pendingCount !== 1 ? "s" : ""} pending sync — tap to sync`
                : `All synced${lastSyncAt ? " · " + lastSyncAt.toLocaleTimeString() : ""}`}
          </Text>
        </TouchableOpacity>

        {/* Nav grid */}
        <View style={styles.grid}>
          {NAV_BUTTONS.map((btn) => (
            <TouchableOpacity
              key={btn.route}
              style={styles.navCard}
              onPress={() => router.push(btn.route as any)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: btn.color + "18" },
                ]}
              >
                <Ionicons name={btn.icon as any} size={30} color={btn.color} />
              </View>
              <Text style={styles.navLabel}>
                {language === "en" ? btn.label : btn.labelNy}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending Sync</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>
              {lastSyncAt
                ? lastSyncAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--"}
            </Text>
            <Text style={styles.statLabel}>Last Sync</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: SIZES.xl,
    paddingHorizontal: SIZES.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: { color: "rgba(255,255,255,0.8)", fontSize: SIZES.fontSm },
  userName: {
    color: COLORS.white,
    fontSize: SIZES.fontXl,
    fontWeight: "bold",
    marginTop: 2,
  },
  role: {
    color: "rgba(255,255,255,0.7)",
    fontSize: SIZES.fontXs,
    marginTop: 2,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  langBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SIZES.radiusMd,
  },
  langText: { color: COLORS.white, fontWeight: "bold", fontSize: SIZES.fontSm },
  logoutBtn: { padding: 4 },
  scroll: { flex: 1 },
  syncBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.lg,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.sm,
  },
  syncBarActive: { backgroundColor: COLORS.primaryLight },
  syncText: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    gap: SIZES.md,
  },
  navCard: {
    width: "47%",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    alignItems: "center",
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SIZES.sm,
  },
  navLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.xxxl,
    gap: SIZES.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    alignItems: "center",
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: {
    fontSize: SIZES.fontXxl,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  facilityTag: {
    color: "rgba(255,255,255,0.9)",
    fontSize: SIZES.fontXs,
    marginTop: 4,
    fontWeight: "600",
  },
  zoneTag: {
    color: "rgba(255,255,255,0.75)",
    fontSize: SIZES.fontXs,
    marginTop: 2,
  },
});
