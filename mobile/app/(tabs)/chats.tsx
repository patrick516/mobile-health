import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  TextInput,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { FAKE_USERS } from "../../src/data/fakeUsers";

function SearchIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        stroke="#9CA3AF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ChatsScreen() {
  const [query, setQuery] = useState("");
  const conversations = FAKE_USERS.filter((u) => u.lastMessage !== undefined);
  const filtered = query
    ? conversations.filter((u) =>
        u.name.toLowerCase().includes(query.toLowerCase()),
      )
    : conversations;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <Text style={styles.headerSub}>
          {conversations.length} conversations
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <SearchIcon />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No conversations found</Text>
          </View>
        }
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

  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#1F0A3C" },
  headerSub: { fontSize: 13, color: "#6B7280", marginTop: 3 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: "#E9D8FD",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1F0A3C" },

  list: { paddingHorizontal: 20, paddingBottom: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 14,
  },
  sep: { height: 1, backgroundColor: "#F3EEFF" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 14, color: "#9CA3AF" },

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
