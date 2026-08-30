import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDb } from "../../../src/db/schema";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";

type TbCase = {
  id: string;
  local_id: string;
  member_id: string;
  treatment_start_date: string;
  treatment_category: string;
  treatment_number: string | null;
  is_active: number;
  member_name?: string;
  dot_total?: number;
  dot_missed?: number;
};

const CATEGORY_COLOR: Record<string, string> = {
  CAT_I: "#2B8A3E",
  CAT_II: "#1971C2",
  MDR_TB: "#C92A2A",
  PEDIATRIC: "#7C3AED",
};

export default function TbScreen() {
  const router = useRouter();
  const [cases, setCases] = useState<TbCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<TbCase>(
        `SELECT t.*,
                m.full_name AS member_name,
                COUNT(d.id) AS dot_total,
                SUM(CASE WHEN d.status = 'MISSED' THEN 1 ELSE 0 END) AS dot_missed
         FROM tb_cases t
         LEFT JOIN members m ON m.id = t.member_id
         LEFT JOIN tb_dot_visits d ON d.tb_case_id = t.id
         WHERE t.is_active = 1
         GROUP BY t.id
         ORDER BY t.treatment_start_date DESC`,
      );
      setCases(rows);
    } catch (e) {
      console.error("[TB] Load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const daysSinceStart = (date: string) =>
    Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

  const adherenceColor = (total: number, missed: number) => {
    if (total === 0) return COLORS.textMuted;
    const rate = (total - missed) / total;
    return rate >= 0.9
      ? COLORS.success
      : rate >= 0.7
        ? COLORS.warning
        : COLORS.danger;
  };

  const renderItem = ({ item }: { item: TbCase }) => {
    const days = daysSinceStart(item.treatment_start_date);
    const total = item.dot_total ?? 0;
    const missed = item.dot_missed ?? 0;
    const catColor = CATEGORY_COLOR[item.treatment_category] ?? "#868E96";
    const adherence =
      total > 0 ? Math.round(((total - missed) / total) * 100) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/(app)/tb/record" as any,
            params: {
              caseId: item.id,
              memberName: item.member_name ?? "",
              category: item.treatment_category,
            },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.memberName}>
              {item.member_name ?? "Unknown"}
            </Text>
            <View style={[styles.badge, { backgroundColor: catColor }]}>
              <Text style={styles.badgeText}>
                {item.treatment_category.replace("_", " ")}
              </Text>
            </View>
          </View>
          {item.treatment_number && (
            <Text style={styles.treatmentNum}>
              Treatment #{item.treatment_number}
            </Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{days}</Text>
            <Text style={styles.statLabel}>Days on treatment</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{total}</Text>
            <Text style={styles.statLabel}>DOT visits</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statNum,
                { color: missed > 0 ? COLORS.danger : COLORS.success },
              ]}
            >
              {missed}
            </Text>
            <Text style={styles.statLabel}>Missed doses</Text>
          </View>
          {adherence !== null && (
            <View style={styles.stat}>
              <Text
                style={[
                  styles.statNum,
                  { color: adherenceColor(total, missed) },
                ]}
              >
                {adherence}%
              </Text>
              <Text style={styles.statLabel}>Adherence</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Started{" "}
            {new Date(item.treatment_start_date).toLocaleDateString("en-GB")}
          </Text>
          <View style={styles.recordBtn}>
            <Ionicons
              name="add-circle-outline"
              size={14}
              color={COLORS.primary}
            />
            <Text style={styles.recordBtnText}>Record DOT</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>TB Follow-up</Text>
        <Text style={styles.subtitle}>
          {cases.length} active case{cases.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={cases}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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
          <View style={styles.center}>
            <Ionicons name="medkit-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No active TB cases</Text>
          </View>
        }
        contentContainerStyle={{ padding: SIZES.lg, paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.xxxl,
  },
  headerBar: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: SIZES.fontXl, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 2 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardHeader: { marginBottom: SIZES.md },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  memberName: {
    fontSize: SIZES.fontMd,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "600" },
  treatmentNum: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    marginBottom: SIZES.md,
  },
  stat: { alignItems: "center", flex: 1 },
  statNum: { fontSize: SIZES.fontLg, fontWeight: "700", color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: "center" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  recordBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  recordBtnText: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    fontWeight: "600",
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: SIZES.md,
    fontSize: SIZES.fontSm,
  },
});
