import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { useAppStore } from "../../../src/store";
import { getPendingCount, getPending } from "../../../src/db/sync-queue";
import { runSync } from "../../../src/services/sync.service";

export default function SyncScreen() {
  const language = useAppStore((s) => s.language);
  const isSyncing = useAppStore((s) => s.isSyncing);
  const lastSyncAt = useAppStore((s) => s.lastSyncAt);
  const pendingCount = useAppStore((s) => s.pendingCount);
  const setIsSyncing = useAppStore((s) => s.setIsSyncing);
  const setLastSyncAt = useAppStore((s) => s.setLastSyncAt);
  const setPendingCount = useAppStore((s) => s.setPendingCount);

  const [pendingItems, setPendingItems] = useState<
    { type: string; count: number }[]
  >([]);
  const [lastResult, setLastResult] = useState<{
    synced: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    const records = await getPending();
    const count = await getPendingCount();
    setPendingCount(count);

    // Group by type
    const grouped: Record<string, number> = {};
    records.forEach((r) => {
      grouped[r.type] = (grouped[r.type] || 0) + 1;
    });
    setPendingItems(
      Object.entries(grouped).map(([type, count]) => ({ type, count })),
    );
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const result = await runSync();
    setIsSyncing(false);
    setLastSyncAt(new Date());
    setLastResult(result);
    await loadPending();
  };

  const formatTime = (d: Date | null) => {
    if (!d) return "Never";
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Status</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Main sync button */}
          <TouchableOpacity
            style={[
              styles.syncBtn,
              isSyncing && styles.syncBtnActive,
              pendingCount === 0 && styles.syncBtnDone,
            ]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <ActivityIndicator color={COLORS.white} size="large" />
                <Text style={styles.syncBtnText}>Syncing...</Text>
                <Text style={styles.syncBtnSub}>Sending records to server</Text>
              </>
            ) : pendingCount === 0 ? (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={COLORS.white}
                />
                <Text style={styles.syncBtnText}>All Synced</Text>
                <Text style={styles.syncBtnSub}>
                  Last sync: {formatTime(lastSyncAt)}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={48}
                  color={COLORS.white}
                />
                <Text style={styles.syncBtnText}>Sync Now</Text>
                <Text style={styles.syncBtnSub}>
                  {pendingCount} record{pendingCount !== 1 ? "s" : ""} waiting
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Last result */}
          {lastResult && (
            <View
              style={[
                styles.resultCard,
                lastResult.failed > 0 && { borderColor: COLORS.warning },
              ]}
            >
              <Text style={styles.resultTitle}>Last Sync Result</Text>
              <View style={styles.resultRow}>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultNum, { color: COLORS.success }]}>
                    {lastResult.synced}
                  </Text>
                  <Text style={styles.resultLabel}>Synced</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text
                    style={[
                      styles.resultNum,
                      {
                        color:
                          lastResult.failed > 0
                            ? COLORS.danger
                            : COLORS.textMuted,
                      },
                    ]}
                  >
                    {lastResult.failed}
                  </Text>
                  <Text style={styles.resultLabel}>Failed</Text>
                </View>
              </View>
            </View>
          )}

          {/* Pending breakdown */}
          {pendingItems.length > 0 && (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>Pending Records</Text>
              {pendingItems.map((item) => (
                <View key={item.type} style={styles.pendingRow}>
                  <View style={styles.pendingLeft}>
                    <Ionicons
                      name={
                        item.type === "HOUSEHOLD"
                          ? "home-outline"
                          : item.type === "MEMBER"
                            ? "person-outline"
                            : item.type === "VISIT"
                              ? "calendar-outline"
                              : item.type === "REFERRAL"
                                ? "medical-outline"
                                : item.type === "IMMUNISATION"
                                  ? "shield-checkmark-outline"
                                  : "flask-outline"
                      }
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text style={styles.pendingType}>
                      {item.type.replace("_", " ")}
                    </Text>
                  </View>
                  <Text style={styles.pendingCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.infoText}>
              Records are saved locally and automatically sync when you have an
              internet connection. You can also tap Sync Now to manually trigger
              a sync.
            </Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: SIZES.lg,
    paddingHorizontal: SIZES.xl,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
  },
  scroll: { flex: 1 },
  content: { padding: SIZES.lg, gap: SIZES.md },
  syncBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xxxl,
    alignItems: "center",
    gap: SIZES.sm,
    ...SHADOWS.lg,
  },
  syncBtnActive: { backgroundColor: COLORS.secondary },
  syncBtnDone: { backgroundColor: COLORS.success },
  syncBtnText: {
    color: COLORS.white,
    fontSize: SIZES.fontXl,
    fontWeight: "bold",
  },
  syncBtnSub: { color: "rgba(255,255,255,0.8)", fontSize: SIZES.fontSm },
  resultCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  resultTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  resultRow: { flexDirection: "row" },
  resultItem: { flex: 1, alignItems: "center" },
  resultNum: { fontSize: SIZES.fontXxl, fontWeight: "bold" },
  resultLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  pendingCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  pendingTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  pendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pendingLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  pendingType: {
    fontSize: SIZES.fontSm,
    color: COLORS.text,
    textTransform: "capitalize",
  },
  pendingCount: {
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  infoCard: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    lineHeight: 20,
  },
});
