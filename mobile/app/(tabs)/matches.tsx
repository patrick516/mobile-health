import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { FAKE_USERS } from "../../src/data/fakeUsers";

function SearchIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        stroke="#1F0A3C"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function MatchesScreen() {
  const [activeTab, setActiveTab] = useState<"all" | "liked">("all");
  const matches = FAKE_USERS.filter((u) => u.lastMessage);
  const likedYou = FAKE_USERS.slice(2, 6);
  const data = activeTab === "all" ? matches : likedYou;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        <TouchableOpacity
          style={styles.searchBtn}
          activeOpacity={0.8}
          onPress={() => router.push("/search")}
        >
          <SearchIcon />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(["all", "liked"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={styles.tab}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.tabText, activeTab === t && styles.tabTextActive]}
            >
              {t === "all" ? "All Matches" : "Liked You"}
            </Text>
            {activeTab === t && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              router.push({ pathname: "/chat", params: { userId: item.id } })
            }
            activeOpacity={0.8}
          >
            <View style={styles.avatarWrap}>
              <Image source={{ uri: item.photo }} style={styles.avatar} />
              {item.online && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.msg} numberOfLines={1}>
                {item.lastMessage || "Say hello! 👋"}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.time}>{item.lastMessageTime || ""}</Text>
              {(item.unreadCount ?? 0) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7FF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#1F0A3C" },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EBF8",
    marginBottom: 8,
  },
  tab: { paddingVertical: 12, paddingRight: 24, position: "relative" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#9CA3AF" },
  tabTextActive: { color: "#E91E8C" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 24,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "#E91E8C",
  },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 14,
  },
  sep: { height: 1, backgroundColor: "#F3EEFF" },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E0D0F0",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FAF7FF",
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: "#1F0A3C", marginBottom: 4 },
  msg: { fontSize: 13, color: "#6B7280" },
  right: { alignItems: "flex-end", gap: 6 },
  time: { fontSize: 12, color: "#9CA3AF" },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E91E8C",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 11, color: "#FFFFFF", fontWeight: "700" },
});
