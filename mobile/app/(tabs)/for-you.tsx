import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { FAKE_USERS, LIFESTYLE_LABELS, User } from "../../src/data/fakeUsers";

const { width: W } = Dimensions.get("window");
const CARD_W = (W - 48) / 2;

// Current user gender (male) → shows females. TODO: pull from auth context.
const MY_GENDER: "male" | "female" = "male";
const OPPOSITE: "male" | "female" = MY_GENDER === "male" ? "female" : "male";

function PinIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="2"
      />
      <Circle cx="12" cy="10" r="2" fill="rgba(255,255,255,0.85)" />
    </Svg>
  );
}
function VerifiedIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        fill="#3B82F6"
      />
    </Svg>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() =>
        router.push({
          pathname: "/profile-detail",
          params: { userId: user.id },
        })
      }
    >
      <Image
        source={{ uri: user.photo }}
        style={styles.cardImg}
        resizeMode="cover"
      />

      {/* Online dot */}
      {user.online && <View style={styles.onlineDot} />}

      {/* Gradient overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.82)"]}
        style={styles.cardGrad}
      />

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {user.name}, {user.age}
          </Text>
          {user.verified && <VerifiedIcon />}
        </View>

        <View style={styles.locationRow}>
          <PinIcon />
          <Text style={styles.locationText} numberOfLines={1}>
            {user.town}
          </Text>
        </View>

        {/* One lifestyle pill */}
        <View style={styles.lifestylePill}>
          <Text style={styles.lifestyleText} numberOfLines={1}>
            {LIFESTYLE_LABELS.relationshipGoal[user.lifestyle.relationshipGoal]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ForYouScreen() {
  const users = FAKE_USERS.filter((u) => u.gender === OPPOSITE);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>For You</Text>
          <Text style={styles.headerSub}>{users.length} people near you</Text>
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => router.push("/preferences")}
          activeOpacity={0.8}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              d="M4 6h16M7 12h10M10 18h4"
              stroke="#1F0A3C"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <UserCard user={item} />}
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
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#1F0A3C" },
  headerSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  filterBtn: {
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

  grid: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { gap: 12, marginBottom: 12 },

  card: {
    width: CARD_W,
    height: CARD_W * 1.35,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E0D0F0",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardImg: { width: "100%", height: "100%", position: "absolute" },

  onlineDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 2,
  },

  cardGrad: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
  },

  cardInfo: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  cardName: { fontSize: 14, fontWeight: "800", color: "#FFFFFF", flex: 1 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  locationText: { fontSize: 11, color: "rgba(255,255,255,0.8)" },

  lifestylePill: {
    backgroundColor: "rgba(233,30,140,0.75)",
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  lifestyleText: { fontSize: 9, color: "#FFFFFF", fontWeight: "600" },
});
