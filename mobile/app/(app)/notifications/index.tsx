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
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { useAppStore } from "../../../src/store";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  related_id: string;
  is_read: number;
  created_at: string;
}

export default function NotificationsScreen() {
  const language = useAppStore((s) => s.language);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const userId = useAppStore((s) => s.user?.id);

  const loadNotifications = async () => {
    try {
      const db = await getDb();
      const uid: string = userId || "";
      const rows = await db.getAllAsync<Notification>(
        `SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC`,
        [uid],
      );

      console.log("=== LOADED NOTIFICATIONS ===", rows.length);
      setNotifications(rows);
    } catch (err) {
      console.error("Load notifications error:", err);
    }
  };

  // Load when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, []),
  );

  const markAsRead = async (id: string) => {
    try {
      const db = await getDb();
      await db.runAsync(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [
        id,
      ]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
      );
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const db = await getDb();
      await db.runAsync(
        `UPDATE notifications SET is_read = 1 WHERE is_read = 0`,
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      Alert.alert("Success", "All notifications marked as read");
    } catch (err) {
      console.error("Mark all as read error:", err);
      Alert.alert("Error", "Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const db = await getDb();
              await db.runAsync(`DELETE FROM notifications WHERE id = ?`, [id]);
              setNotifications((prev) => prev.filter((n) => n.id !== id));
            } catch (err) {
              console.error("Delete notification error:", err);
              Alert.alert("Error", "Failed to delete notification");
            }
          },
        },
      ],
    );
  };

  const handleTap = async (n: Notification) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }

    if (n.type === "REFERRAL" || n.related_id) {
      // Use correct route path
      router.push("/referrals");
    } else {
      router.back();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${Math.floor(hours)} hours ago`;
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={22}
                color={COLORS.white}
              />
            </TouchableOpacity>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadNotifications();
              setRefreshing(false);
            }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="notifications-off-outline"
              size={60}
              color={COLORS.border}
            />
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.is_read && styles.cardUnread]}
            onPress={() => handleTap(item)}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody2}>{item.message}</Text>
              <Text style={styles.cardTime}>{formatDate(item.created_at)}</Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => deleteNotification(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.textMuted}
              />
            </View>
          </TouchableOpacity>
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
  badge: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
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
  cardUnread: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
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
  cardTime: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllBtn: {
    padding: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 4,
  },
  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: SIZES.sm },
  emptyTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "bold",
    color: COLORS.textSecondary,
  },
  emptyText: { fontSize: SIZES.fontSm, color: COLORS.textMuted },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteBtn: {
    padding: 4,
  },
});
