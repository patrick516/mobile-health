import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { fetchMatches, Match } from "../../src/services/matchesService";
import { timeAgo } from "../../src/lib/utils";

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
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchMatches()
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

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

      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💜</Text>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptySub}>
              Keep swiping to find your match!
            </Text>
            <TouchableOpacity
              style={styles.discoverBtn}
              onPress={() => router.push("/(tabs)/discover")}
              activeOpacity={0.8}
            >
              <Text style={styles.discoverBtnText}>Go to Discover →</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const photoUri = item.user.photoUrl ?? null;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                if (item.conversationId) {
                  router.push({
                    pathname: "/chat",
                    params: { conversationId: item.conversationId },
                  });
                } else {
                  router.push({
                    pathname: "/profile-detail",
                    params: { userId: item.user.id },
                  });
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.avatarWrap}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {item.user.name?.[0] ?? "?"}
                    </Text>
                  </View>
                )}
                {item.user.online && <View style={styles.onlineDot} />}
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.user.name}</Text>
                <Text style={styles.msg} numberOfLines={1}>
                  {[item.user.town, item.user.district]
                    .filter(Boolean)
                    .join(", ") || "Say hello! 👋"}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.time}>{timeAgo(item.matchedAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7FF" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF7FF",
  },
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
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F0A3C",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 24,
    textAlign: "center",
  },
  discoverBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#7C3AED",
    borderRadius: 50,
  },
  discoverBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
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
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9D8FD",
  },
  avatarInitial: { fontSize: 22, fontWeight: "700", color: "#7C3AED" },
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
});
