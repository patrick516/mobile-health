import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { useAppStore } from "../../../src/store";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: number;
  created_at: string;
  action_id?: string;
}

export default function NotificationsScreen() {
  const language = useAppStore((s) => s.language);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generate smart notifications from local data
  useEffect(() => {
    generateNotifications();
  }, []);

  const generateNotifications = async () => {
    try {
      const db = await getDb();
      const generated: Notification[] = [];

      // Overdue referrals
      const overdueReferrals = await db.getAllAsync<{
        id: string;
        member_name: string;
        created_at: string;
      }>(
        `SELECT r.id, m.full_name as member_name, r.created_at
         FROM referrals r
         LEFT JOIN members m ON m.id = r.member_id
         WHERE r.status = 'PENDING'
         AND r.due_by < datetime('now')
         LIMIT 5`,
      );
      overdueReferrals.forEach((r) => {
        generated.push({
          id: `ref-${r.id}`,
          type: "OVERDUE_REFERRAL",
          title: "⚠ Overdue Referral",
          body: `${r.member_name || "A patient"} has not arrived at the clinic yet.`,
          read: 0,
          created_at: r.created_at,
          action_id: r.id,
        });
      });

      // Vaccines due
      const vaccinesDue = await db.getAllAsync<{
        member_id: string;
        full_name: string;
        vaccine_code: string;
      }>(
        `SELECT s.member_id, m.full_name, s.vaccine_code
         FROM immunisation_schedules s
         LEFT JOIN members m ON m.id = s.member_id
         WHERE s.status IN ('DUE', 'OVERDUE')
         AND s.due_date <= date('now', '+7 days')
         LIMIT 5`,
      );
      if (vaccinesDue.length > 0) {
        generated.push({
          id: "vaccines-due",
          type: "VACCINE_DUE",
          title: "💉 Vaccines Due",
          body: `${vaccinesDue.length} child${vaccinesDue.length > 1 ? "ren" : ""} have vaccines due in the next 7 days.`,
          read: 0,
          created_at: new Date().toISOString(),
        });
      }

      // Households never visited
      const neverVisited = await db.getAllAsync<{
        id: string;
        head_of_household_name: string;
      }>(
        `SELECT h.id, h.head_of_household_name
         FROM households h
         WHERE h.status = 'ACTIVE'
         AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.household_id = h.id)
         LIMIT 3`,
      );
      if (neverVisited.length > 0) {
        generated.push({
          id: "never-visited",
          type: "UNVISITED",
          title: "🏠 Households Not Yet Visited",
          body: `${neverVisited.length} household${neverVisited.length > 1 ? "s" : ""} have never been visited.`,
          read: 0,
          created_at: new Date().toISOString(),
        });
      }

      // Low stock
      const lowStock = await db.getAllAsync<{ name_english: string }>(
        "SELECT name_english FROM drug_stock WHERE quantity_current <= quantity_minimum LIMIT 3",
      );
      if (lowStock.length > 0) {
        generated.push({
          id: "low-stock",
          type: "LOW_STOCK",
          title: "⚕ Drug Stock Low",
          body: `${lowStock.map((d) => d.name_english).join(", ")} running low. Request restock.`,
          read: 0,
          created_at: new Date().toISOString(),
        });
      }

      setNotifications(generated);
    } catch (err) {
      console.error("Generate notifications error:", err);
    }
  };

  const iconFor = (type: string) => {
    if (type === "OVERDUE_REFERRAL")
      return { name: "alert-circle", color: COLORS.danger };
    if (type === "VACCINE_DUE")
      return { name: "shield-checkmark-outline", color: "#7C3AED" };
    if (type === "UNVISITED")
      return { name: "home-outline", color: COLORS.warning };
    if (type === "LOW_STOCK")
      return { name: "flask-outline", color: COLORS.warning };
    return { name: "notifications-outline", color: COLORS.primary };
  };

  const handleTap = (n: Notification) => {
    if (n.type === "OVERDUE_REFERRAL")
      router.push("/(app)/referrals/index" as any);
    else if (n.type === "VACCINE_DUE")
      router.push("/(app)/immunisations/index" as any);
    else if (n.type === "UNVISITED")
      router.push("/(app)/households/index" as any);
    else if (n.type === "LOW_STOCK") router.push("/(app)/drugs/index" as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="notifications-off-outline"
              size={60}
              color={COLORS.border}
            />
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptyText}>No alerts at this time</Text>
          </View>
        }
        renderItem={({ item }) => {
          const icon = iconFor(item.type);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleTap(item)}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: icon.color + "18" },
                ]}
              >
                <Ionicons
                  name={icon.name as any}
                  size={22}
                  color={icon.color}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody2}>{item.body}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.textMuted}
              />
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: SIZES.fontMd, fontWeight: "bold", color: COLORS.text },
  cardBody2: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: SIZES.sm },
  emptyTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "bold",
    color: COLORS.textSecondary,
  },
  emptyText: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
});
