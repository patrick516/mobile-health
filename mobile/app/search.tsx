import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import apiClient from "../src/lib/apiClient";
import { useDebounce } from "../src/hooks/useDebounce";

function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        stroke="#9CA3AF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get("/mobile/search", {
        params: { q, limit: 20 },
      });
      setUsers(res.data.users ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedQuery = useDebounce(query, 400);

  useState(() => {
    doSearch(debouncedQuery);
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>Search</Text>
      <View style={styles.searchBox}>
        <SearchIcon />
        <TextInput
          placeholder="Search people..."
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            doSearch(t);
          }}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
          autoFocus
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#7C3AED"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            query.length > 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results for "{query}"</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const photoUri = item.photoUrl ?? item.photos?.[0]?.url ?? null;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/profile-detail",
                    params: { userId: item.id },
                  })
                }
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {item.name?.[0] ?? "?"}
                    </Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name}>
                    {item.name}, {item.age ?? "?"}
                  </Text>
                  <Text style={styles.sub}>
                    {item.profession ||
                      [item.town, item.district].filter(Boolean).join(", ") ||
                      "Member"}
                  </Text>
                </View>
                {item.online && <View style={styles.onlineDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAF7FF",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1F0A3C",
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    borderRadius: 14,
    height: 48,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F3EEFF",
  },
  input: { marginLeft: 10, flex: 1, fontSize: 14, color: "#111827" },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 14, color: "#9CA3AF" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#E5E7EB",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9D8FD",
  },
  avatarInitial: { fontSize: 18, fontWeight: "700", color: "#7C3AED" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: "#1F0A3C" },
  sub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
});
