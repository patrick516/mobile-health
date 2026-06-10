import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { useAppStore } from "../../../src/store";

interface AncRecord {
  id: string;
  member_id: string;
  full_name: string;
  household_number: string;
  village_name: string;
  anc_number: number;
  expected_date: string;
  status: string;
  attended_date: string;
  expected_delivery_date: string;
}

export default function ANCScreen() {
  const language = useAppStore((s) => s.language);
  const [records, setRecords] = useState<AncRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<AncRecord>(
        `SELECT
           a.id, a.member_id, a.anc_number, a.expected_date,
           a.status, a.attended_date,
           m.full_name, m.expected_delivery_date,
           h.household_number, h.village_name
         FROM anc_visits a
         LEFT JOIN members m ON m.id = a.member_id
         LEFT JOIN households h ON h.id = m.household_id
         WHERE m.is_pregnant = 1
         ORDER BY a.expected_date ASC`,
      );
      setRecords(rows);
    } catch (err) {
      console.error("Load ANC error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "N/A";

  const daysUntil = (d: string) => {
    const diff = Math.floor(
      (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return "Today";
    return `In ${diff} days`;
  };

  const statusColor = (s: string) =>
    s === "ATTENDED"
      ? COLORS.success
      : s === "OVERDUE"
        ? COLORS.danger
        : s === "MISSED"
          ? COLORS.danger
          : COLORS.warning;

  const overdueCount = records.filter(
    (r) => r.status === "OVERDUE" || r.status === "MISSED",
  ).length;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ANC Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      {overdueCount > 0 && (
        <View style={styles.alert}>
          <Ionicons name="heart" size={18} color={COLORS.danger} />
          <Text style={styles.alertText}>
            {overdueCount} pregnant woman{overdueCount > 1 ? "en" : ""} missed
            ANC visits
          </Text>
        </View>
      )}

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={60} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No pregnant women registered</Text>
            <Text style={styles.emptyText}>
              ANC records appear when a pregnant woman is added as a household
              member
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              item.status === "OVERDUE" && styles.cardOverdue,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.ancBadge}>
                <Text style={styles.ancNum}>ANC {item.anc_number}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.full_name}</Text>
                <Text style={styles.hhInfo}>
                  {item.household_number} · {item.village_name}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor(item.status) + "18" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: statusColor(item.status) },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.cardDates}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>ANC Date</Text>
                <Text
                  style={[styles.dateVal, { color: statusColor(item.status) }]}
                >
                  {formatDate(item.expected_date)}
                </Text>
                {item.status !== "ATTENDED" && (
                  <Text style={styles.countdown}>
                    {daysUntil(item.expected_date)}
                  </Text>
                )}
              </View>
              {item.expected_delivery_date && (
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Expected Delivery</Text>
                  <Text style={styles.dateVal}>
                    {formatDate(item.expected_delivery_date)}
                  </Text>
                </View>
              )}
            </View>

            {item.status !== "ATTENDED" && (
              <TouchableOpacity
                style={styles.followUpBtn}
                onPress={() => {
                  useAppStore.getState().setSelectedMember(item.member_id);
                  router.push("/(app)/visits/add" as any);
                }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.followUpText}>Record follow-up visit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
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
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.danger,
  },
  alertText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    color: COLORS.danger,
    fontWeight: "600",
  },
  list: { padding: SIZES.lg, gap: SIZES.md },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardOverdue: { borderLeftWidth: 4, borderLeftColor: COLORS.danger },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  ancBadge: {
    backgroundColor: "#FDF2F8",
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#DB2777",
  },
  ancNum: { fontSize: SIZES.fontXs, fontWeight: "bold", color: "#DB2777" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: SIZES.fontMd, fontWeight: "600", color: COLORS.text },
  hhInfo: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
  },
  statusText: { fontSize: 10, fontWeight: "bold" },
  cardDates: { flexDirection: "row", gap: SIZES.xl, marginBottom: SIZES.sm },
  dateItem: {},
  dateLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  dateVal: { fontSize: SIZES.fontSm, fontWeight: "600", color: COLORS.text },
  countdown: { fontSize: SIZES.fontXs, color: COLORS.warning, marginTop: 2 },
  followUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
    marginTop: SIZES.sm,
  },
  followUpText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
    gap: SIZES.sm,
    paddingHorizontal: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
