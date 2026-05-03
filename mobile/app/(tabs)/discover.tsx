import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
  Animated,
  PanResponder,
} from "react-native";
import { useRef, useState } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { FAKE_USERS, User } from "../../src/data/fakeUsers";

const { width: W, height: H } = Dimensions.get("window");
const CARD_W = W - 32;
const CARD_H = H * 0.58;
const SWIPE_THRESHOLD = 100;

// ── Icons ────────────────────────────────────────────────────────────────────
function RewindIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
        fill="#F59E0B"
      />
    </Svg>
  );
}

function CrossIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke="#EF4444"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function HeartIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path
        d="M12 21C12 21 3 14 3 8.5C3 5.4 5.4 3 8.5 3C10.2 3 11.7 3.8 12 5C12.3 3.8 13.8 3 15.5 3C18.6 3 21 5.4 21 8.5C21 14 12 21 12 21Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function StarIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="#3B82F6"
      />
    </Svg>
  );
}

function FilterIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="#1F0A3C"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PinIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2"
      />
      <Circle cx="12" cy="10" r="2" fill="rgba(255,255,255,0.9)" />
    </Svg>
  );
}

function BagIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path
        d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

function VerifiedIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        fill="#3B82F6"
      />
    </Svg>
  );
}

// ── Swipe stamps ─────────────────────────────────────────────────────────────
function LikeStamp({
  opacity,
}: {
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <Animated.View style={[styles.stamp, styles.stampLike, { opacity }]}>
      <Text style={styles.stampLikeTxt}>LIKE 💜</Text>
    </Animated.View>
  );
}

function NopeStamp({
  opacity,
}: {
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <Animated.View style={[styles.stamp, styles.stampNope, { opacity }]}>
      <Text style={styles.stampNopeTxt}>NOPE ✕</Text>
    </Animated.View>
  );
}

// ── Profile card content ──────────────────────────────────────────────────────
function ProfileCard({ user, onPress }: { user: User; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={0.97}
      onPress={onPress}
    >
      <Image
        source={{ uri: user.photo }}
        style={styles.cardImage}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.22)", "rgba(0,0,0,0.84)"]}
        locations={[0.3, 0.6, 1]}
        style={styles.cardGradient}
      />

      {/* Online badge */}
      {user.online && (
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      )}

      {/* Card info */}
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>
            {user.name}, {user.age}
          </Text>
          {user.verified && (
            <View style={{ marginLeft: 6 }}>
              <VerifiedIcon />
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <BagIcon />
          <Text style={styles.cardMeta}>{user.profession}</Text>
        </View>

        <View style={styles.metaRow}>
          <PinIcon />
          <Text style={styles.cardMeta}>
            {user.town}, {user.district}
          </Text>
        </View>

        <View style={styles.tagsRow}>
          {user.interests.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.cardTag}>
              <Text style={styles.cardTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchBanner, setMatchBanner] = useState<User | null>(null);

  const pan = useRef(new Animated.ValueXY()).current;

  const rotate = pan.x.interpolate({
    inputRange: [-W / 2, 0, W / 2],
    outputRange: ["-8deg", "0deg", "8deg"],
    extrapolate: "clamp",
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const nextCardScale = pan.x.interpolate({
    inputRange: [-W / 2, 0, W / 2],
    outputRange: [1, 0.94, 1],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start();
        }
      },
    }),
  ).current;

  const nextCard = () => {
    pan.setValue({ x: 0, y: 0 });
    setCurrentIndex((i) => (i + 1) % FAKE_USERS.length);
  };

  const swipeLeft = () => {
    Animated.timing(pan, {
      toValue: { x: -W * 1.5, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => nextCard());
  };

  const swipeRight = () => {
    const liked = FAKE_USERS[currentIndex];
    Animated.timing(pan, {
      toValue: { x: W * 1.5, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      nextCard();
      // Fake match 30% probability
      if (Math.random() < 0.3) {
        setMatchBanner(liked);
        setTimeout(() => setMatchBanner(null), 4000);
      }
    });
  };

  const rewind = () => {
    pan.setValue({ x: 0, y: 0 });
    setCurrentIndex((i) => (i === 0 ? FAKE_USERS.length - 1 : i - 1));
  };

  const user = FAKE_USERS[currentIndex];
  const nextUser = FAKE_USERS[(currentIndex + 1) % FAKE_USERS.length];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSub}>Find your match today</Text>
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => router.push("/preferences")}
          activeOpacity={0.8}
        >
          <FilterIcon />
        </TouchableOpacity>
      </View>

      {/* ── Card stack ── */}
      <View style={styles.cardStack}>
        {/* Back card */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBehind,
            { transform: [{ scale: nextCardScale }] },
          ]}
        >
          <Image
            source={{ uri: nextUser.photo }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.cardGradient}
          />
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>
              {nextUser.name}, {nextUser.age}
            </Text>
          </View>
        </Animated.View>

        {/* Front swipeable card */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { rotate },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <LikeStamp opacity={likeOpacity} />
          <NopeStamp opacity={nopeOpacity} />
          <ProfileCard
            user={user}
            onPress={() =>
              router.push({
                pathname: "/profile-detail",
                params: { userId: user.id },
              })
            }
          />
        </Animated.View>
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionSm]}
          onPress={rewind}
          activeOpacity={0.8}
        >
          <RewindIcon />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionMd]}
          onPress={swipeLeft}
          activeOpacity={0.8}
        >
          <CrossIcon />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionLg}
          onPress={swipeRight}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#EE2090", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionLgGrad}
          >
            <HeartIcon />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionMd]}
          onPress={() => router.push("/premium")}
          activeOpacity={0.8}
        >
          <StarIcon />
        </TouchableOpacity>
      </View>

      {/* ── It's a Match overlay ── */}
      {matchBanner && (
        <View style={styles.matchOverlay}>
          <LinearGradient
            colors={["rgba(238,32,144,0.93)", "rgba(124,58,237,0.93)"]}
            style={styles.matchBanner}
          >
            <Text style={styles.matchEmoji}>💜</Text>
            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchSub}>
              You and {matchBanner.name} liked each other
            </Text>
            <TouchableOpacity
              style={styles.matchChatBtn}
              activeOpacity={0.85}
              onPress={() => {
                setMatchBanner(null);
                router.push({
                  pathname: "/chat",
                  params: { userId: matchBanner.id },
                });
              }}
            >
              <Text style={styles.matchChatTxt}>Send a Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMatchBanner(null)}
              style={styles.matchKeepBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.matchKeepTxt}>Keep Swiping</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7FF" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#1F0A3C" },
  headerSub: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Card stack
  cardStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    overflow: "hidden",
    position: "absolute",
    backgroundColor: "#E0D0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  cardBehind: { zIndex: 0 },
  cardImage: { width: "100%", height: "100%", position: "absolute" },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },

  // Online badge
  onlineBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  onlineText: { fontSize: 11, color: "#FFFFFF", fontWeight: "600" },

  // Card info overlay
  cardInfo: { position: "absolute", bottom: 22, left: 20, right: 20 },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  cardName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  cardMeta: {
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "500",
  },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  cardTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  cardTagText: { fontSize: 11, color: "#FFFFFF", fontWeight: "600" },

  // Stamps
  stamp: {
    position: "absolute",
    top: 48,
    zIndex: 10,
    borderWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  stampLike: {
    left: 20,
    borderColor: "#22C55E",
    backgroundColor: "rgba(34,197,94,0.12)",
    transform: [{ rotate: "-15deg" }],
  },
  stampNope: {
    right: 20,
    borderColor: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.12)",
    transform: [{ rotate: "15deg" }],
  },
  stampLikeTxt: {
    fontSize: 22,
    fontWeight: "900",
    color: "#22C55E",
    letterSpacing: 1,
  },
  stampNopeTxt: {
    fontSize: 22,
    fontWeight: "900",
    color: "#EF4444",
    letterSpacing: 1,
  },

  // Action buttons
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 18,
    paddingBottom: 10,
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  actionSm: { width: 50, height: 50 },
  actionMd: { width: 58, height: 58 },
  actionLg: {
    shadowColor: "#E91E8C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    borderRadius: 100,
  },
  actionLgGrad: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  // Match banner overlay
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
  matchKeepBtn: { paddingVertical: 10, alignItems: "center" },
  matchKeepTxt: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
});
