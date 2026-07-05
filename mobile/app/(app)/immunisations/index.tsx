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
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { useAppStore } from "../../../src/store";

interface DueVaccine {
  schedule_id: string;
  member_id: string;
  full_name: string;
  household_number: string;
  village_name: string;
  vaccine_code: string;
  dose_number: number;
  due_date: string;
  status: string;
}

export default function ImmunisationsScreen() {
  const language = useAppStore((s) => s.language);
  const setSelectedMember = useAppStore((s) => s.setSelectedMember);
  const [dueVaccines, setDueVaccines] = useState<DueVaccine[]>([]);
  const [filter, setFilter] = useState<"ALL" | "OVERDUE" | "DUE">("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = useAppStore((s) => s.user?.id);

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const members = await db.getAllAsync(
        "SELECT id, local_id, full_name FROM members",
      );
      console.log("=== MEMBERS IN DB ===");
      console.log(members);

      const schedules = await db.getAllAsync(
        "SELECT id, member_id, vaccine_code FROM immunisation_schedules",
      );
      console.log("=== SCHEDULES IN DB ===");
      console.log(schedules);

      const uid: string = userId || "";
      const rows = await db.getAllAsync<DueVaccine>(
        `SELECT
         s.id as schedule_id, s.member_id, s.vaccine_code,
         s.dose_number, s.due_date, s.status,
         m.full_name, h.household_number, h.village_name
       FROM immunisation_schedules s
       LEFT JOIN members m ON m.id = s.member_id
       LEFT JOIN households h ON h.id = m.household_id
       WHERE s.status IN ('DUE', 'OVERDUE')
         AND h.registered_by_user_id = ?
       ORDER BY s.due_date ASC`,
        [uid],
      );
      console.log("=== JOIN RESULT (should have member names) ===");
      console.log(
        rows.map((r) => ({ full_name: r.full_name, member_id: r.member_id })),
      );

      setDueVaccines(rows);
    } catch (err) {
      console.error("Load immunisations error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered =
    filter === "ALL"
      ? dueVaccines
      : dueVaccines.filter((v) => v.status === filter);

  const overdueCount = dueVaccines.filter((v) => v.status === "OVERDUE").length;
  const dueCount = dueVaccines.filter((v) => v.status === "DUE").length;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const isOverdue = (d: string) => new Date(d) < new Date();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Immunisations</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: COLORS.danger }]}>
            {overdueCount}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: COLORS.warning }]}>
            {dueCount}
          </Text>
          <Text style={styles.summaryLabel}>Due Soon</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: COLORS.text }]}>
            {dueVaccines.length}
          </Text>
          <Text style={styles.summaryLabel}>Total Pending</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(["ALL", "OVERDUE", "DUE"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.schedule_id}
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
            <Ionicons
              name="shield-checkmark-outline"
              size={60}
              color={COLORS.border}
            />
            <Text style={styles.emptyTitle}>No vaccines pending</Text>
            <Text style={styles.emptyText}>All children are up to date</Text>
          </View>
        }
        renderItem={({ item }) => {
          const overdue = item.status === "OVERDUE";
          return (
            <TouchableOpacity
              style={[styles.card, overdue && styles.cardOverdue]}
              onPress={() => {
                setSelectedMember(item.member_id);
                router.push("/(app)/immunisations/record" as any);
              }}
            >
              <View
                style={[
                  styles.vaccineBadge,
                  {
                    backgroundColor: overdue
                      ? COLORS.dangerLight
                      : COLORS.warningLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.vaccineCode,
                    { color: overdue ? COLORS.danger : COLORS.warning },
                  ]}
                >
                  {item.vaccine_code}
                </Text>
                <Text
                  style={[
                    styles.vaccineDose,
                    { color: overdue ? COLORS.danger : COLORS.warning },
                  ]}
                >
                  D{item.dose_number}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.childName}>{item.full_name}</Text>
                <Text style={styles.hhInfo}>
                  {item.household_number} · {item.village_name}
                </Text>
                <Text
                  style={[
                    styles.dueDate,
                    { color: overdue ? COLORS.danger : COLORS.warning },
                  ]}
                >
                  {overdue ? "⚠ Overdue: " : "Due: "}
                  {formatDate(item.due_date)}
                </Text>
              </View>
              <View style={styles.cardRight}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: overdue ? COLORS.danger : COLORS.warning,
                    },
                  ]}
                />
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.textMuted}
                />
              </View>
            </TouchableOpacity>
          );
        }}
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
  summary: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: SIZES.fontXxl, fontWeight: "bold" },
  summaryLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  summaryDivider: { width: 1, backgroundColor: COLORS.border },
  filterRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterBtn: { flex: 1, paddingVertical: SIZES.md, alignItems: "center" },
  filterBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  filterText: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  filterTextActive: { color: COLORS.primary, fontWeight: "600" },
  list: { padding: SIZES.lg, gap: SIZES.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardOverdue: { borderColor: COLORS.danger, borderLeftWidth: 4 },
  vaccineBadge: {
    width: 52,
    height: 52,
    borderRadius: SIZES.radiusMd,
    alignItems: "center",
    justifyContent: "center",
  },
  vaccineCode: { fontSize: 11, fontWeight: "bold" },
  vaccineDose: { fontSize: 10 },
  cardInfo: { flex: 1 },
  childName: { fontSize: SIZES.fontMd, fontWeight: "600", color: COLORS.text },
  hhInfo: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  dueDate: { fontSize: SIZES.fontXs, fontWeight: "600", marginTop: 4 },
  cardRight: { alignItems: "center", gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: SIZES.sm },
  emptyTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "bold",
    color: COLORS.textSecondary,
  },
  emptyText: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
});
