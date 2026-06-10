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
import { enqueue } from "../../../src/db/sync-queue";
import { useAppStore } from "../../../src/store";

interface DrugStock {
  id: string;
  drug_id: string;
  drug_code: string;
  name_english: string;
  name_chichewa: string;
  unit: string;
  quantity_current: number;
  quantity_minimum: number;
}

export default function DrugsScreen() {
  const language = useAppStore((s) => s.language);
  const [drugs, setDrugs] = useState<DrugStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<DrugStock>(
        "SELECT * FROM drug_stock ORDER BY name_english ASC",
      );
      setDrugs(rows);
    } catch (err) {
      console.error("Load drugs error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateQty = async (drug: DrugStock, change: number) => {
    const newQty = Math.max(0, drug.quantity_current + change);
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE drug_stock SET quantity_current = ?, updated_at = ? WHERE id = ?",
        [newQty, new Date().toISOString(), drug.id],
      );
      setDrugs((prev) =>
        prev.map((d) =>
          d.id === drug.id ? { ...d, quantity_current: newQty } : d,
        ),
      );
    } catch (err) {
      console.error("Update drug qty error:", err);
    }
  };

  const requestRestock = async (drug: DrugStock) => {
    Alert.alert(
      "Request Restock",
      `Request resupply of ${language === "en" ? drug.name_english : drug.name_chichewa}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            await enqueue("STOCK_REQUEST", {
              drugId: drug.drug_id || drug.id,
              quantityRequested: drug.quantity_minimum * 3,
              notes: `Low stock request: current ${drug.quantity_current} ${drug.unit}`,
            });
            Alert.alert(
              "Requested ✓",
              "Restock request will be sent on next sync.",
            );
          },
        },
      ],
    );
  };

  const isLow = (d: DrugStock) => d.quantity_current <= d.quantity_minimum;
  const lowCount = drugs.filter(isLow).length;

  const renderItem = ({ item }: { item: DrugStock }) => {
    const low = isLow(item);
    const pct = Math.min(
      100,
      (item.quantity_current / Math.max(item.quantity_minimum * 3, 1)) * 100,
    );

    return (
      <View style={[styles.card, low && styles.cardLow]}>
        <View style={styles.cardTop}>
          <View style={styles.drugInfo}>
            <Text style={styles.drugName}>
              {language === "en" ? item.name_english : item.name_chichewa}
            </Text>
            <Text style={styles.drugCode}>{item.drug_code}</Text>
          </View>
          {low && (
            <View style={styles.lowBadge}>
              <Ionicons
                name="warning-outline"
                size={12}
                color={COLORS.danger}
              />
              <Text style={styles.lowBadgeText}>Low</Text>
            </View>
          )}
        </View>

        {/* Stock bar */}
        <View style={styles.stockBarBg}>
          <View
            style={[
              styles.stockBarFill,
              {
                width: `${pct}%`,
                backgroundColor: low ? COLORS.danger : COLORS.success,
              },
            ]}
          />
        </View>

        <View style={styles.cardBottom}>
          <View>
            <Text
              style={[
                styles.stockNum,
                { color: low ? COLORS.danger : COLORS.success },
              ]}
            >
              {item.quantity_current}
            </Text>
            <Text style={styles.stockUnit}>{item.unit}s remaining</Text>
          </View>

          <View style={styles.qtyControls}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQty(item, -1)}
            >
              <Ionicons name="remove" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQty(item, 1)}
            >
              <Ionicons name="add" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {low && (
            <TouchableOpacity
              style={styles.restockBtn}
              onPress={() => requestRestock(item)}
            >
              <Ionicons name="refresh-outline" size={14} color={COLORS.white} />
              <Text style={styles.restockBtnText}>Restock</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === "en" ? "Drug Stock" : "Mankhwala"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {lowCount > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={18} color={COLORS.danger} />
          <Text style={styles.alertBannerText}>
            {lowCount} drug{lowCount > 1 ? "s" : ""} running low — request
            restock
          </Text>
        </View>
      )}

      <FlatList
        data={drugs}
        keyExtractor={(item) => item.id}
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flask-outline" size={60} color={COLORS.border} />
            <Text style={styles.emptyText}>No drug stock recorded</Text>
            <Text style={styles.emptySubText}>
              Drug stock will appear after syncing with the server
            </Text>
          </View>
        }
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
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.danger,
  },
  alertBannerText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    color: COLORS.danger,
    fontWeight: "600",
  },
  list: { padding: SIZES.lg, gap: SIZES.sm },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardLow: { borderColor: COLORS.danger, borderWidth: 1.5 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.sm,
  },
  drugInfo: {},
  drugName: { fontSize: SIZES.fontMd, fontWeight: "600", color: COLORS.text },
  drugCode: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    fontFamily: "monospace",
  },
  lowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.dangerLight,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lowBadgeText: { fontSize: 10, color: COLORS.danger, fontWeight: "bold" },
  stockBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: SIZES.md,
  },
  stockBarFill: { height: 6, borderRadius: 3 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockNum: { fontSize: SIZES.fontXl, fontWeight: "bold" },
  stockUnit: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  qtyControls: { flexDirection: "row", gap: SIZES.sm },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  restockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.danger,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  restockBtnText: {
    color: COLORS.white,
    fontSize: SIZES.fontXs,
    fontWeight: "bold",
  },
  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: SIZES.md },
  emptyText: { fontSize: SIZES.fontLg, color: COLORS.textSecondary },
  emptySubText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: SIZES.xl,
  },
});
