import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { useAppStore } from "../../../src/store";

interface Household {
  id: string;
  local_id: string;
  head_of_household_name: string;
  household_number: string;
  village_name: string;
  zone_name: string;
  status: string;
  member_count?: number;
}

export default function HouseholdsScreen() {
  const language = useAppStore((s) => s.language);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHouseholds = useCallback(async (searchTerm = "") => {
    try {
      const db = await getDb();
      const query = searchTerm
        ? `SELECT h.*, COUNT(m.id) as member_count
           FROM households h
           LEFT JOIN members m ON m.household_id = h.id AND m.status = 'ACTIVE'
           WHERE h.status = 'ACTIVE'
           AND (h.head_of_household_name LIKE ? OR h.household_number LIKE ? OR h.village_name LIKE ?)
           GROUP BY h.id ORDER BY h.created_at DESC`
        : `SELECT h.*, COUNT(m.id) as member_count
           FROM households h
           LEFT JOIN members m ON m.household_id = h.id AND m.status = 'ACTIVE'
           WHERE h.status = 'ACTIVE'
           GROUP BY h.id ORDER BY h.created_at DESC`;

      const params = searchTerm
        ? [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
        : [];
      const rows = await db.getAllAsync<Household>(query, params);
      setHouseholds(rows);
    } catch (err) {
      console.error("Load households error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHouseholds(search);
    }, [loadHouseholds]),
  );

  useEffect(() => {
    const timer = setTimeout(() => loadHouseholds(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHouseholds(search);
  };

  const renderItem = ({ item }: { item: Household }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/households/${item.local_id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Ionicons name="home" size={20} color={COLORS.primary} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.headName}>{item.head_of_household_name}</Text>
        <Text style={styles.hhNumber}>
          {item.household_number || "Unassigned"}
        </Text>
        <Text style={styles.location}>
          <Ionicons name="location-outline" size={12} /> {item.village_name} ·{" "}
          {item.zone_name}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.memberBadge}>
          <Text style={styles.memberCount}>{item.member_count ?? 0}</Text>
          <Text style={styles.memberLabel}>
            {language === "en" ? "members" : "anthu"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === "en" ? "Households" : "Nyumba"}
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/(app)/households/add")}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={
            language === "en" ? "Search households..." : "Sakani nyumba..."
          }
          placeholderTextColor={COLORS.placeholder}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Count */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {households.length} household{households.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : households.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="home-outline" size={60} color={COLORS.border} />
          <Text style={styles.emptyTitle}>
            {language === "en" ? "No households yet" : "Palibe nyumba"}
          </Text>
          <Text style={styles.emptyText}>
            {language === "en"
              ? "Tap + to register your first household"
              : "Dina + kuyandikitsa nyumba"}
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(app)/households/add")}
          >
            <Text style={styles.emptyBtnText}>
              {language === "en" ? "Register Household" : "Yandikitsa Nyumba"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={households}
          keyExtractor={(item) => item.local_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    margin: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.text },
  countBar: { paddingHorizontal: SIZES.xl, paddingBottom: SIZES.sm },
  countText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  list: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xxxl,
    gap: SIZES.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLeft: { marginRight: SIZES.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  headName: { fontSize: SIZES.fontMd, fontWeight: "600", color: COLORS.text },
  hhNumber: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    fontWeight: "500",
    marginTop: 2,
  },
  location: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 3 },
  cardRight: { alignItems: "center", gap: 4, marginLeft: SIZES.sm },
  memberBadge: { alignItems: "center" },
  memberCount: {
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  memberLabel: { fontSize: 10, color: COLORS.textMuted },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginTop: SIZES.lg,
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SIZES.sm,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
    marginTop: SIZES.xl,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: "bold" },
});
