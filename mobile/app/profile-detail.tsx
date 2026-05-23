import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { fetchUserById } from "../src/services/userService";
import { likeUser, passUser } from "../src/services/swipeService";
import apiClient from "../src/lib/apiClient";

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
function ChatIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke="#FFFFFF"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const LIFESTYLE_LABELS: Record<string, Record<string, string>> = {
  smoking: {
    never: "Non-smoker",
    socially: "Social smoker",
    regularly: "Smoker",
    trying_to_quit: "Trying to quit",
  },
  alcohol: {
    never: "No alcohol",
    socially: "Social drinker",
    regularly: "Regular drinker",
  },
  relationshipGoal: {
    serious: "Serious relationship",
    casual: "Casual dating",
    friendship: "Friendship",
    not_sure: "Not sure yet",
  },
  exercise: {
    never: "No exercise",
    sometimes: "Sometimes active",
    often: "Often active",
    daily: "Daily workout",
  },
  religion: {
    christian: "Christian",
    muslim: "Muslim",
    hindu: "Hindu",
    buddhist: "Buddhist",
    none: "No religion",
    other: "Other",
  },
  education: {
    high_school: "High School",
    diploma: "Diploma",
    bachelors: "Bachelor's",
    masters: "Master's",
    phd: "PhD",
    other: "Other",
  },
};

export default function ProfileDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<any>(null);
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchBanner, setMatchBanner] = useState(false);
  const [newConversationId, setNewConversationId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetchUserById(userId),
      apiClient
        .get(`/mobile/matches/with/${userId}`)
        .then((r) => r.data.match)
        .catch(() => null),
    ])
      .then(([u, m]) => {
        setUser(u);
        setMatch(m);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const handleLike = async () => {
    if (!userId) return;
    try {
      const result = await likeUser(userId);
      if (result.matched) {
        setNewConversationId(result.match?.conversation?.id ?? null);
        setMatch(result.match);
        setMatchBanner(true);
        setTimeout(() => setMatchBanner(false), 4000);
      } else {
        router.back();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handlePass = async () => {
    if (!userId) return;
    try {
      await passUser(userId);
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleChat = () => {
    const conversationId = match?.conversation?.id ?? newConversationId;
    if (conversationId) {
      router.push({ pathname: "/chat", params: { conversationId } });
    }
  };

  if (loading || !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const photoUri = user.photoUrl ?? user.photos?.[0]?.url ?? null;
  const location = [user.town, user.district, user.country]
    .filter(Boolean)
    .join(", ");
  const isMatched = !!match;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero image */}
        <View style={styles.heroContainer}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.noPhoto]}>
              <Text style={styles.noPhotoText}>{user.name?.[0] ?? "?"}</Text>
            </View>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.25)", "transparent", "rgba(0,0,0,0.6)"]}
            style={StyleSheet.absoluteFill}
          />

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

          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>
                {user.name}, {user.age ?? "?"}
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
            {user.profession && (
              <View style={styles.metaRow}>
                <ProfIcon />
                <Text style={styles.heroMeta}>{user.profession}</Text>
              </View>
            )}
            {location ? (
              <View style={styles.metaRow}>
                <PinIcon />
                <Text style={styles.heroMeta}>{location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {user.bio ? (
            <>
              <Text style={styles.sectionTitle}>About Me</Text>
              <Text style={styles.bio}>{user.bio}</Text>
            </>
          ) : null}

          {user.interests?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.interestsWrap}>
                {user.interests.map((tag: string) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {user.lifestyle && (
            <>
              <Text style={styles.sectionTitle}>Lifestyle</Text>
              <View style={styles.interestsWrap}>
                {Object.entries(user.lifestyle)
                  .filter(
                    ([k, v]) =>
                      v &&
                      k !== "height" &&
                      k !== "zodiac" &&
                      k !== "id" &&
                      k !== "userId" &&
                      k !== "updatedAt",
                  )
                  .map(([key, val]) => {
                    const label = LIFESTYLE_LABELS[key]?.[val as string];
                    if (!label) return null;
                    return (
                      <View key={key} style={styles.lifestyleChip}>
                        <Text style={styles.lifestyleChipText}>{label}</Text>
                      </View>
                    );
                  })}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom action buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={handlePass}
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

        <TouchableOpacity activeOpacity={0.85} onPress={handleLike}>
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

        {/* Chat button — only if matched */}
        {isMatched && (
          <TouchableOpacity activeOpacity={0.85} onPress={handleChat}>
            <LinearGradient
              colors={["#7C3AED", "#4F46E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chatBtn}
            >
              <ChatIcon />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Match overlay */}
      {matchBanner && (
        <View style={styles.matchOverlay}>
          <LinearGradient
            colors={["rgba(238,32,144,0.93)", "rgba(124,58,237,0.93)"]}
            style={styles.matchBanner}
          >
            <Text style={styles.matchEmoji}>💜</Text>
            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchSub}>
              You and {user.name} liked each other
            </Text>
            <TouchableOpacity
              style={styles.matchChatBtn}
              activeOpacity={0.85}
              onPress={() => {
                setMatchBanner(false);
                handleChat();
              }}
            >
              <Text style={styles.matchChatTxt}>Send a Message 💬</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.matchSkipBtn}
              activeOpacity={0.7}
              onPress={() => {
                setMatchBanner(false);
                router.back();
              }}
            >
              <Text style={styles.matchSkipTxt}>Continue Browsing</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
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
  heroContainer: { width: W, height: H * 0.55, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  noPhoto: {
    backgroundColor: "#E9D8FD",
    alignItems: "center",
    justifyContent: "center",
  },
  noPhotoText: { fontSize: 64, fontWeight: "800", color: "#7C3AED" },
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
  lifestyleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFF0F9",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  lifestyleChipText: { fontSize: 12, color: "#BE185D", fontWeight: "500" },
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
  chatBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
    paddingHorizontal: 28,
  },
  matchBanner: {
    width: "100%",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
  },
  matchEmoji: { fontSize: 56, marginBottom: 8 },
  matchTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  matchSub: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  matchChatBtn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 50,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    marginBottom: 12,
  },
  matchChatTxt: { fontSize: 16, fontWeight: "700", color: "#E91E8C" },
  matchSkipBtn: { paddingVertical: 10, alignItems: "center" },
  matchSkipTxt: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
});
