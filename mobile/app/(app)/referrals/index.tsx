import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { useAppStore } from "../../../src/store";
import { enqueue } from "../../../src/db/sync-queue";

interface Referral {
  id: string;
  local_id: string;
  visit_id: string;
  member_id: string;
  reason: string;
  urgency: string;
  status: string;
  due_by: string;
  feedback_note: string;
  diagnosis: string;
  created_at: string;
  synced: number;
  member_name?: string;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: COLORS.warning,
  OVERDUE: COLORS.danger,
  ARRIVED: COLORS.info,
  TREATED: COLORS.success,
  COMPLETED: COLORS.success,
  MISSED: COLORS.danger,
  FEEDBACK_SENT: COLORS.primary,
};

const URGENCY_COLOR: Record<string, string> = {
  ROUTINE: COLORS.success,
  URGENT: COLORS.warning,
  EMERGENCY: COLORS.danger,
};

export default function ReferralsScreen() {
  const language = useAppStore((s) => s.language);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<Referral>(
        `SELECT r.*, m.full_name as member_name
         FROM referrals r
         LEFT JOIN members m ON m.id = r.member_id
         ORDER BY r.created_at DESC`,
      );
      setReferrals(rows);
    } catch (err) {
      console.error("Load referrals error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAsCompleted = async (referral: Referral) => {
    if (referral.status === "COMPLETED") {
      Alert.alert(
        "Already Completed",
        "This referral is already marked as completed.",
      );
      return;
    }

    Alert.alert(
      "Mark as Completed",
      `Have you followed up with ${referral.member_name || "the patient"} and confirmed treatment worked?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Complete",
          onPress: async () => {
            try {
              const db = await getDb();

              // Update local status
              await db.runAsync(
                `UPDATE referrals SET status = 'COMPLETED', synced = 0 WHERE id = ?`,
                [referral.id],
              );

              // Enqueue for sync - send ALL required fields
              await enqueue("REFERRAL", {
                id: referral.id,
                localId: referral.local_id,
                visitId: referral.visit_id,
                memberId: referral.member_id,
                reason: referral.reason,
                urgency: referral.urgency,
                status: "COMPLETED",
                dueBy: referral.due_by,
                destinationFacilityId: null,
              });

              // Refresh the list
              await load();

              Alert.alert(
                "Success",
                "Referral marked as completed. It will sync to the server.",
              );
            } catch (err) {
              console.error("Mark as completed error:", err);
              Alert.alert(
                "Error",
                "Failed to mark as completed. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const filtered =
    filter === "ALL"
      ? referrals
      : filter === "PENDING"
        ? referrals.filter((r) => ["PENDING", "OVERDUE"].includes(r.status))
        : referrals.filter((r) =>
            ["COMPLETED", "TREATED", "MISSED"].includes(r.status),
          );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

  // WhatsApp-style status display
  const getStatusTicks = (status: string) => {
    if (status === "PENDING" || status === "OVERDUE") return "✓";
    if (status === "ARRIVED") return "✓✓";
    if (status === "TREATED" || status === "FEEDBACK_SENT") return "✓✓";
    if (status === "COMPLETED") return "✓✓";
    if (status === "MISSED") return "✗";
    return "✓";
  };

  const getStatusTickColor = (status: string) => {
    if (status === "COMPLETED" || status === "TREATED") return COLORS.primary;
    if (status === "MISSED") return COLORS.danger;
    if (status === "ARRIVED") return COLORS.success;
    return COLORS.textMuted;
  };

  const renderItem = ({ item }: { item: Referral }) => (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View
            style={[
              styles.urgencyDot,
              {
                backgroundColor:
                  URGENCY_COLOR[item.urgency] || COLORS.textMuted,
              },
            ]}
          />
          <Text style={styles.memberName}>{item.member_name || "Unknown"}</Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
      </View>

      {/* Reason */}
      <Text style={styles.reason}>{item.reason}</Text>

      {/* WhatsApp-style status thread */}
      <View style={styles.statusThread}>
        {[
          { label: "Referred", reached: true },
          {
            label: "Arrived",
            reached: [
              "ARRIVED",
              "TREATED",
              "FEEDBACK_SENT",
              "COMPLETED",
            ].includes(item.status),
          },
          {
            label: "Treated",
            reached: ["TREATED", "FEEDBACK_SENT", "COMPLETED"].includes(
              item.status,
            ),
          },
        ].map((step, i) => (
          <View key={step.label} style={styles.threadStep}>
            <View
              style={[
                styles.threadDot,
                step.reached ? { backgroundColor: COLORS.primary } : {},
              ]}
            />
            {i < 2 && (
              <View
                style={[
                  styles.threadLine,
                  step.reached ? { backgroundColor: COLORS.primary } : {},
                ]}
              />
            )}
            <Text
              style={[
                styles.threadLabel,
                step.reached && { color: COLORS.primary, fontWeight: "600" },
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
        <Text
          style={[styles.ticks, { color: getStatusTickColor(item.status) }]}
        >
          {getStatusTicks(item.status)}
        </Text>
      </View>

      {/* Feedback if any */}
      {item.feedback_note ? (
        <View style={styles.feedbackBox}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color={COLORS.primary}
          />
          <Text style={styles.feedbackText}>{item.feedback_note}</Text>
        </View>
      ) : null}

      {/* Bottom row with Complete button */}
      <View style={styles.cardFooter}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                (STATUS_COLOR[item.status] || COLORS.textMuted) + "18",
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: STATUS_COLOR[item.status] || COLORS.textMuted },
            ]}
          >
            {item.status.replace("_", " ")}
          </Text>
        </View>
        <View
          style={[
            styles.urgencyBadge,
            {
              backgroundColor:
                (URGENCY_COLOR[item.urgency] || COLORS.textMuted) + "18",
            },
          ]}
        >
          <Text
            style={[
              styles.urgencyText,
              { color: URGENCY_COLOR[item.urgency] || COLORS.textMuted },
            ]}
          >
            {item.urgency}
          </Text>
        </View>
        {(item.status === "TREATED" || item.status === "FEEDBACK_SENT") && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => markAsCompleted(item)}
          >
            <Ionicons
              name="checkmark-done-circle-outline"
              size={16}
              color={COLORS.white}
            />
            <Text style={styles.completeBtnText}>Complete</Text>
          </TouchableOpacity>
        )}
        {!item.synced ? (
          <View style={styles.unsyncedBadge}>
            <Ionicons
              name="cloud-upload-outline"
              size={12}
              color={COLORS.warning}
            />
            <Text style={styles.unsyncedText}>Pending sync</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === "en" ? "Referrals" : "Kutumiza"}
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/(app)/referrals/add" as any)}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["ALL", "PENDING", "COMPLETED"] as const).map((f) => (
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
              {f}{" "}
              {f === "PENDING" &&
                `(${referrals.filter((r) => ["PENDING", "OVERDUE"].includes(r.status)).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="medical-outline" size={60} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No referrals</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(app)/referrals/add" as any)}
          >
            <Text style={styles.emptyBtnText}>Create Referral</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.local_id || item.id}
          renderItem={renderItem}
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
        />
      )}
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
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: SIZES.radiusFull,
    padding: 4,
  },
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
  list: { padding: SIZES.lg, gap: SIZES.md },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },
  memberName: {
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
    color: COLORS.text,
  },
  cardDate: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  reason: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  statusThread: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.md,
    gap: 0,
  },
  threadStep: { flexDirection: "row", alignItems: "center" },
  threadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  threadLine: { width: 30, height: 2, backgroundColor: COLORS.border },
  threadLabel: {
    position: "absolute",
    top: 12,
    left: -10,
    fontSize: 9,
    color: COLORS.textMuted,
    width: 44,
    textAlign: "center",
  },
  ticks: { fontSize: SIZES.fontMd, fontWeight: "bold", marginLeft: "auto" },
  feedbackBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  feedbackText: { flex: 1, fontSize: SIZES.fontXs, color: COLORS.primary },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "600" },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
  },
  urgencyText: { fontSize: 10, fontWeight: "600" },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: "auto",
  },
  completeBtnText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  unsyncedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  unsyncedText: { fontSize: 10, color: COLORS.warning },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SIZES.md,
  },
  emptyTitle: { fontSize: SIZES.fontLg, color: COLORS.textSecondary },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: "bold" },
});
