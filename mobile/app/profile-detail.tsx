import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { FAKE_USERS } from "../src/data/fakeUsers";

const { width: W, height: H } = Dimensions.get("window");

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M19 12H5M12 5l-7 7 7 7"
        stroke="#1F0A3C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
function MoreIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx="12" cy="5" r="1.5" fill="#1F0A3C" />
      <Circle cx="12" cy="12" r="1.5" fill="#1F0A3C" />
      <Circle cx="12" cy="19" r="1.5" fill="#1F0A3C" />
    </Svg>
  );
}
function PinIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        fill="none"
        stroke="#E91E8C"
        strokeWidth="2"
      />
      <Path d="M12 10a1 1 0 100-2 1 1 0 000 2z" fill="#E91E8C" />
    </Svg>
  );
}
function ProfIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path
        d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"
        stroke="#7C3AED"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ProfileDetailScreen() {
  const { userId } = useLocalSearchParams();
  const user = FAKE_USERS.find((u) => u.id === userId) ?? FAKE_USERS[0];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── Hero image ── */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: user.photo }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.25)", "transparent", "rgba(0,0,0,0.6)"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Nav buttons */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <BackIcon />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} activeOpacity={0.8}>
              <MoreIcon />
            </TouchableOpacity>
          </View>

          {/* Name overlay on image */}
          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>
                {user.name}, {user.age}
              </Text>
              {user.verified && (
                <View style={styles.verifiedBadge}>
                  <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      fill="#3B82F6"
                    />
                  </Svg>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <ProfIcon />
              <Text style={styles.heroMeta}>{user.profession}</Text>
            </View>
            <View style={styles.metaRow}>
              <PinIcon />
              <Text style={styles.heroMeta}>
                {user.town}, {user.district}, {user.country}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>
          {/* About Me */}
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.bio}>{user.bio}</Text>

          {/* Interests */}
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsWrap}>
            {user.interests.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom action buttons ── */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Svg width={28} height={28} viewBox="0 0 24 24">
            <Path
              d="M18 6L6 18M6 6l12 12"
              stroke="#EF4444"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/chat",
              params: { userId: user.id },
            })
          }
        >
          <LinearGradient
            colors={["#EE2090", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.likeBtn}
          >
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Path
                d="M12 21C12 21 3 14 3 8.5C3 5.4 5.4 3 8.5 3C10.2 3 11.7 3.8 12 5C12.3 3.8 13.8 3 15.5 3C18.6 3 21 5.4 21 8.5C21 14 12 21 12 21Z"
                fill="#FFFFFF"
              />
            </Svg>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7FF" },

  heroContainer: { width: W, height: H * 0.55, position: "relative" },
  heroImage: { width: "100%", height: "100%" },

  navRow: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroInfo: { position: "absolute", bottom: 20, left: 20, right: 20 },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  heroName: { fontSize: 26, fontWeight: "800", color: "#FFFFFF" },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  heroMeta: { fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: "500" },

  content: { padding: 24, paddingBottom: 120 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F0A3C",
    marginBottom: 10,
    marginTop: 8,
  },
  bio: { fontSize: 14, color: "#6B7280", lineHeight: 22 },

  interestsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F3EEFF",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#E9D8FD",
  },
  tagText: { fontSize: 13, color: "#7C3AED", fontWeight: "600" },

  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0EBF8",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  rejectBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FEE2E2",
  },
  likeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
