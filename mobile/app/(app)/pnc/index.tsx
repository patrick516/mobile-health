import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { getDb } from "../../../src/db/schema";

type PncVisit = {
  id: string;
  local_id: string;
  member_id: string;
  pnc_number: number;
  expected_date: string;
  status: string;
  visited_date: string | null;
  notes: string | null;
  member_name?: string;
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "#2B8A3E",
  ATTENDED: "#1971C2",
  OVERDUE: "#C92A2A",
  MISSED: "#868E96",
};

const PNC_LABEL: Record<number, string> = {
  1: "PNC 1 — Day 1",
  2: "PNC 2 — Day 3",
  3: "PNC 3 — Day 7",
  4: "PNC 4 — Week 6",
};

export default function PncScreen() {
  const router = useRouter();
  const [visits, setVisits] = useState<PncVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const now = new Date().toISOString();

      // Auto-mark overdue
      await db.runAsync(
        `UPDATE pnc_visits SET status = 'OVERDUE'
         WHERE status = 'SCHEDULED' AND expected_date < ?`,
        [now],
      );

      const rows = await db.getAllAsync<PncVisit>(
        `SELECT p.*, m.full_name AS member_name
         FROM pnc_visits p
         LEFT JOIN members m ON m.id = p.member_id
         WHERE p.status IN ('SCHEDULED','OVERDUE')
         ORDER BY p.expected_date ASC
         LIMIT 100`,
      );
      setVisits(rows);
    } catch (e) {
      console.error("[PNC] Load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: PncVisit }) => {
    const color = STATUS_COLOR[item.status] ?? "#868E96";
    const due = new Date(item.expected_date);
    const isOverdue = item.status === "OVERDUE";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/(app)/pnc/record",
            params: { visitId: item.id, memberName: item.member_name ?? "" },
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.pncLabel}>
            {PNC_LABEL[item.pnc_number] ?? `PNC ${item.pnc_number}`}
          </Text>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.memberName}>{item.member_name ?? "Unknown"}</Text>
        <Text style={[styles.dateText, isOverdue && styles.overdueText]}>
          Due: {due.toLocaleDateString("en-GB")}
          {isOverdue ? " — Overdue" : ""}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2B8A3E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Postnatal Care</Text>
      <Text style={styles.subtitle}>
        {visits.length} visit{visits.length !== 1 ? "s" : ""} pending
      </Text>
      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No pending PNC visits</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6C757D", marginBottom: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  pncLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "600" },
  memberName: { fontSize: 14, color: "#495057", marginBottom: 4 },
  dateText: { fontSize: 13, color: "#6C757D" },
  overdueText: { color: "#C92A2A", fontWeight: "600" },
  emptyText: { color: "#6C757D", fontSize: 15 },
});
