import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { FAKE_USERS } from "../src/data/fakeUsers";

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

  const filteredUsers = FAKE_USERS.filter((user) =>
    user.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Text style={styles.title}>Search</Text>

      {/* Search bar */}
      <View style={styles.searchBox}>
        <SearchIcon />
        <TextInput
          placeholder="Search people..."
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Results */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
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
            <Image source={{ uri: item.photo }} style={styles.avatar} />

            <View style={styles.info}>
              <Text style={styles.name}>
                {item.name}, {item.age}
              </Text>
              <Text style={styles.sub}>{item.profession || "Member"}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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

  input: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },

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

  info: {
    flex: 1,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F0A3C",
  },

  sub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
});
