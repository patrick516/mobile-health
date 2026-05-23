import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { fetchLikes, LikedByUser } from "../../src/services/swipeService";
import { useAuthStore } from "../../src/store/authStore";

export default function LikesScreen() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [users, setUsers] = useState<LikedByUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const isPremium = user?.isPremium ?? false;

  useEffect(() => {
    fetchLikes()
      .then((res) => setUsers(res.users))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Likes</Text>
        <Text style={styles.headerSub}>
          {isPremium
            ? `${users.length} people liked you`
            : `${users.length} people liked you — upgrade to see who`}
        </Text>
      </View>

      {/* Premium banner — only for free users */}
      {!isPremium && (
        <TouchableOpacity
          onPress={() => setShowUpgrade(true)}
          activeOpacity={0.88}
          style={styles.bannerTouch}
        >
          <LinearGradient
            colors={["#EE2090", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.banner}
          >
            <Text style={styles.bannerText}>
              👑 Go Premium to see who liked you
            </Text>
            <Text style={styles.bannerArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {users.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>💜</Text>
          <Text style={styles.emptyTitle}>No likes yet</Text>
          <Text style={styles.emptySub}>
            Keep swiping to get more visibility!
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const photoUri = item.photoUrl ?? item.photos?.[0]?.url ?? null;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  if (isPremium) {
                    router.push({
                      pathname: "/profile-detail",
                      params: { userId: item.id },
                    });
                  } else {
                    setShowUpgrade(true);
                  }
                }}
                activeOpacity={0.9}
              >
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.cardImg}
                    blurRadius={isPremium ? 0 : 18}
                  />
                ) : (
                  <View style={[styles.cardImg, styles.noPhoto]} />
                )}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.7)"]}
                  style={styles.cardGrad}
                />
                {!isPremium && (
                  <View style={styles.lockWrap}>
                    <View style={styles.lockCircle}>
                      <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>
                    {isPremium ? `${item.name}, ${item.age}` : "???"}
                  </Text>
                  <Text style={styles.cardSub}>
                    {isPremium ? (item.town ?? "") : "Premium only"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Upgrade Modal */}
      <Modal
        visible={showUpgrade}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpgrade(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowUpgrade(false)}
        >
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.crown}>👑</Text>
            <Text style={styles.sheetTitle}>See Who Likes You</Text>
            <Text style={styles.sheetSub}>
              Upgrade to Premium and see all {users.length} people who liked
              your profile
            </Text>
            {[
              { icon: "💜", text: "See everyone who liked you" },
              { icon: "⚡", text: "Unlimited Likes every day" },
              { icon: "↺", text: "Unlimited Rewinds" },
              { icon: "🌍", text: "Match with people anywhere" },
            ].map((f) => (
              <View key={f.text} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.upgradeTouch}
              activeOpacity={0.85}
              onPress={() => {
                setShowUpgrade(false);
                router.push("/premium");
              }}
            >
              <LinearGradient
                colors={["#EE2090", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeBtn}
              >
                <Text style={styles.upgradeTxt}>Upgrade Now</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowUpgrade(false)}
              style={styles.laterBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.laterTxt}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F0A3C",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#1F0A3C" },
  headerSub: { fontSize: 13, color: "#6B7280", marginTop: 3 },
  bannerTouch: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  bannerText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF", flex: 1 },
  bannerArrow: { fontSize: 22, color: "rgba(255,255,255,0.8)" },
  grid: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    height: 200,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E0D0F0",
    position: "relative",
  },
  cardImg: { width: "100%", height: "100%", position: "absolute" },
  noPhoto: { backgroundColor: "#E0D0F0" },
  cardGrad: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  lockWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  lockCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: { fontSize: 22 },
  cardInfo: { position: "absolute", bottom: 10, left: 10, right: 10 },
  cardName: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  cardSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,2,40,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
    alignItems: "center",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E9D8FD",
    marginBottom: 20,
  },
  crown: { fontSize: 52, marginBottom: 12 },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F0A3C",
    marginBottom: 8,
    textAlign: "center",
  },
  sheetSub: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: "100%",
    marginBottom: 14,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  featureIcon: { fontSize: 18 },
  featureText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  upgradeTouch: {
    width: "100%",
    borderRadius: 50,
    overflow: "hidden",
    marginTop: 10,
  },
  upgradeBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 50 },
  upgradeTxt: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  laterBtn: { paddingVertical: 12, alignItems: "center", width: "100%" },
  laterTxt: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },
});
