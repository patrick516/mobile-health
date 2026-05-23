import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import apiClient from "../src/lib/apiClient";
import { useAuthStore } from "../src/store/authStore";

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

const FEATURES = [
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

const PLANS = [
  {
    id: "monthly",
    label: "1 Month",
    price: "MWK 2,500",
    perMonth: "MWK 2,500/mo",
  },
  {
    id: "yearly",
    label: "12 Months",
    price: "MWK 20,000",
    perMonth: "MWK 1,667/mo",
    badge: "Best Value",
  },
];

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const { user, setAuth, token } = useAuthStore();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await apiClient.post(`/mobile/users/${user?.id}/premium`, {
        plan: selectedPlan,
        days: selectedPlan === "yearly" ? 365 : 30,
      });
      if (token && user) {
        setAuth(token, { ...user, isPremium: true });
      }
      Alert.alert(
        "🎉 Welcome to Premium!",
        "You now have full access to all features.",
        [{ text: "Let's Go!", onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Could not process upgrade.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#1A0535", "#3D0F6E", "#6B1F9E", "#3D0F6E", "#1A0535"]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" />

      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={styles.backBtn}
      >
        <BackIcon />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.title}>Go Premium</Text>
        <Text style={styles.subtitle}>
          Unlock all features and{"\n"}get more matches
        </Text>
        <Text style={styles.deco}>💗</Text>

        {/* Plan selector */}
        <View style={styles.planRow}>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardActive,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={0.85}
            >
              {plan.badge && (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}
              <Text
                style={[
                  styles.planLabel,
                  selectedPlan === plan.id && styles.planLabelActive,
                ]}
              >
                {plan.label}
              </Text>
              <Text
                style={[
                  styles.planPrice,
                  selectedPlan === plan.id && styles.planPriceActive,
                ]}
              >
                {plan.price}
              </Text>
              <Text
                style={[
                  styles.planPer,
                  selectedPlan === plan.id && styles.planPerActive,
                ]}
              >
                {plan.perMonth}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.upgradeTouchable}
          onPress={handleUpgrade}
          disabled={loading}
        >
          <LinearGradient
            colors={["#EE2090", "#C2175A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeBtn}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.upgradeTxt}>Upgrade Now</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
  scroll: { paddingTop: 100, paddingHorizontal: 28, alignItems: "center" },
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
  deco: { fontSize: 28, marginTop: 8, marginBottom: 24 },
  planRow: { flexDirection: "row", gap: 12, width: "100%", marginBottom: 28 },
  planCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    position: "relative",
    overflow: "hidden",
  },
  planCardActive: {
    borderColor: "#EE2090",
    backgroundColor: "rgba(238,32,144,0.15)",
  },
  planBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EE2090",
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  planBadgeText: { fontSize: 9, fontWeight: "700", color: "#FFFFFF" },
  planLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 6,
  },
  planLabelActive: { color: "#FFFFFF" },
  planPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  planPriceActive: { color: "#FFFFFF" },
  planPer: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  planPerActive: { color: "rgba(255,255,255,0.7)" },
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
