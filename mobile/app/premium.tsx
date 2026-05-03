import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";

const { width: W } = Dimensions.get("window");

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M19 12H5M12 5l-7 7 7 7"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface FeatureRow {
  icon: string;
  title: string;
  desc: string;
  iconBg: string;
}

const FEATURES: FeatureRow[] = [
  {
    icon: "💜",
    title: "Unlimited Likes",
    desc: "Like as many people as you want",
    iconBg: "rgba(233,30,140,0.2)",
  },
  {
    icon: "👁",
    title: "See Who Likes You",
    desc: "See who already liked you",
    iconBg: "rgba(233,30,140,0.2)",
  },
  {
    icon: "↺",
    title: "Unlimited Rewinds",
    desc: "Go back and change your mind",
    iconBg: "rgba(124,58,237,0.2)",
  },
  {
    icon: "🌍",
    title: "Passport",
    desc: "Match with people anywhere",
    iconBg: "rgba(124,58,237,0.2)",
  },
];

export default function PremiumScreen() {
  return (
    <LinearGradient
      colors={["#1A0535", "#3D0F6E", "#6B1F9E", "#3D0F6E", "#1A0535"]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" />

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={styles.laterBtn}
      >
        <BackIcon />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Crown emoji */}
        <Text style={styles.crown}>👑</Text>

        {/* ── Heading ── */}
        <Text style={styles.title}>Go Premium</Text>
        <Text style={styles.subtitle}>
          Unlock all features and{"\n"}get more matches
        </Text>

        {/* Decorative hearts */}
        <Text style={styles.deco}>💗</Text>

        {/* ── Feature cards ── */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View
                style={[styles.featureIconBg, { backgroundColor: f.iconBg }]}
              >
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Bottom CTAs ── */}
      <View style={styles.footer}>
        {/* Upgrade Now */}
        <TouchableOpacity activeOpacity={0.85} style={styles.upgradeTouchable}>
          <LinearGradient
            colors={["#EE2090", "#C2175A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeBtn}
          >
            <Text style={styles.upgradeTxt}>Upgrade Now</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Maybe later */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.laterBtn}
        >
          <Text style={styles.laterTxt}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    position: "absolute",
    top: 52,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: {
    paddingTop: 100,
    paddingHorizontal: 28,
    alignItems: "center",
  },

  crown: { fontSize: 70, marginBottom: 16 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(220,190,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  deco: { fontSize: 28, marginTop: 8, marginBottom: 32 },

  // Features
  features: { width: "100%", gap: 16 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureIcon: { fontSize: 22 },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    color: "rgba(220,190,255,0.75)",
    lineHeight: 18,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 16,
    gap: 12,
  },
  upgradeTouchable: { borderRadius: 50, overflow: "hidden" },
  upgradeBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 50 },
  upgradeTxt: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  laterBtn: { paddingVertical: 10, alignItems: "center" },
  laterTxt: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
});
