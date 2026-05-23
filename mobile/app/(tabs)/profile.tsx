import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { fetchMe, MyProfile } from "../../src/services/userService";
import { getMyPhotos } from "../../src/services/photosService";
import { useAuthStore } from "../../src/store/authStore";

function SettingsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle
        cx="12"
        cy="12"
        r="3"
        stroke="#1F0A3C"
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="#1F0A3C"
        strokeWidth="2"
        fill="none"
      />
    </Svg>
  );
}

function EditIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="#7C3AED"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

function SectionCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {onEdit && (
          <TouchableOpacity
            style={styles.editRow}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <EditIcon />
            <Text style={styles.editTxt}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
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
  children: {
    have_and_want_more: "Has kids, wants more",
    have_dont_want_more: "Has kids",
    dont_have_want: "Wants kids",
    dont_have_dont_want: "No kids",
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
  diet: {
    omnivore: "Omnivore",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    pescatarian: "Pescatarian",
    halal: "Halal",
    kosher: "Kosher",
  },
  religion: {
    christian: "Christian",
    muslim: "Muslim",
    hindu: "Hindu",
    buddhist: "Buddhist",
    none: "No religion",
    other: "Other religion",
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

function getCompleteness(profile: MyProfile, photosCount: number): number {
  let score = 0;
  if (profile.name) score += 15;
  if (profile.bio) score += 15;
  if (profile.profession) score += 10;
  if (profile.country) score += 10;
  if (photosCount > 0) score += 20;
  if (profile.interests?.length > 0) score += 15;
  if (profile.lifestyle) score += 15;
  return score;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { clearAuth } = useAuthStore();

  const load = useCallback(() => {
    Promise.all([fetchMe(), getMyPhotos()])
      .then(([me, myPhotos]) => {
        setProfile(me);
        setPhotos(myPhotos);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          clearAuth();
          router.replace("/");
        },
      },
    ]);
  };

  if (loading || !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const completeness = getCompleteness(profile, photos.length);
  const mainPhoto = photos.find((p) => p.isMain) ?? photos[0];
  const location = [profile.town, profile.district, profile.country]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <SettingsIcon />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Photo section */}
        <View style={styles.photoSection}>
          <View style={styles.photoWrap}>
            {mainPhoto?.url ? (
              <Image source={{ uri: mainPhoto.url }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Text style={styles.photoFallbackText}>
                  {profile.name?.[0] ?? "?"}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editPhotoBtn}
              onPress={() => router.push("/upload-photos")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#EE2090", "#7C3AED"]}
                style={styles.editPhotoBtnGrad}
              >
                <Text style={{ fontSize: 14 }}>📷</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {profile.name}, {profile.age ?? "?"}
            </Text>
            {profile.verified && (
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  fill="#3B82F6"
                />
              </Svg>
            )}
          </View>

          {location ? <Text style={styles.location}>📍 {location}</Text> : null}

          {/* Completeness bar */}
          <View style={styles.completenessBox}>
            <View style={styles.completenessTop}>
              <Text style={styles.completenessLabel}>
                Profile {completeness}% complete
              </Text>
              <Text style={styles.completenessHint}>Tap Edit to improve</Text>
            </View>
            <View style={styles.bar}>
              <LinearGradient
                colors={["#EE2090", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.barFill, { width: `${completeness}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Premium banner */}
        {!profile.isPremium && (
          <TouchableOpacity
            onPress={() => router.push("/premium")}
            activeOpacity={0.88}
            style={styles.premiumTouch}
          >
            <LinearGradient
              colors={["#1A0535", "#6B1F9E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumBanner}
            >
              <Text style={{ fontSize: 18 }}>👑</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.premiumTitle}>Go Premium</Text>
                <Text style={styles.premiumSub}>
                  See who likes you & unlimited matches
                </Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 22 }}>
                ›
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* About me */}
        <SectionCard
          title="About Me"
          onEdit={() => router.push("/edit-profile")}
        >
          <Text style={styles.bio}>
            {profile.bio || "No bio yet. Tap Edit to add one."}
          </Text>
        </SectionCard>

        {/* Interests */}
        {profile.interests?.length > 0 && (
          <SectionCard
            title="Interests"
            onEdit={() => router.push("/edit-profile")}
          >
            <View style={styles.tagsWrap}>
              {profile.interests.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Lifestyle */}
        {profile.lifestyle && (
          <SectionCard
            title="Lifestyle & Preferences"
            onEdit={() => router.push("/preferences")}
          >
            <View style={styles.lifestyleGrid}>
              {Object.entries(profile.lifestyle)
                .filter(([k, v]) => v && k !== "height" && k !== "zodiac")
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
          </SectionCard>
        )}

        {/* Quick facts */}
        {(profile.lifestyle?.height ||
          profile.lifestyle?.zodiac ||
          profile.profession) && (
          <SectionCard title="Quick Facts">
            <View style={styles.statsRow}>
              {profile.lifestyle?.height && (
                <View style={styles.stat}>
                  <Text style={styles.statVal}>{profile.lifestyle.height}</Text>
                  <Text style={styles.statLabel}>Height</Text>
                </View>
              )}
              {profile.lifestyle?.zodiac && (
                <View style={styles.stat}>
                  <Text style={styles.statVal}>{profile.lifestyle.zodiac}</Text>
                  <Text style={styles.statLabel}>Zodiac</Text>
                </View>
              )}
              {profile.profession && (
                <View style={styles.stat}>
                  <Text style={styles.statVal}>{profile.profession}</Text>
                  <Text style={styles.statLabel}>Job</Text>
                </View>
              )}
            </View>
          </SectionCard>
        )}
        {/* Verification */}
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={() => router.push("/verification")}
          activeOpacity={0.8}
        >
          <Text style={styles.verifyText}>🪪 Verify My Identity</Text>
        </TouchableOpacity>
        {/* Log out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#1F0A3C" },
  settingsBtn: {
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
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  photoSection: { alignItems: "center", paddingVertical: 20 },
  photoWrap: { position: "relative", marginBottom: 12 },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#E91E8C",
  },
  photoFallback: {
    backgroundColor: "#E9D8FD",
    alignItems: "center",
    justifyContent: "center",
  },
  photoFallbackText: { fontSize: 40, fontWeight: "800", color: "#7C3AED" },
  editPhotoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  editPhotoBtnGrad: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  name: { fontSize: 22, fontWeight: "800", color: "#1F0A3C" },
  location: { fontSize: 13, color: "#6B7280", marginBottom: 16 },
  completenessBox: { width: "100%", gap: 6 },
  completenessTop: { flexDirection: "row", justifyContent: "space-between" },
  completenessLabel: { fontSize: 12, color: "#7C3AED", fontWeight: "600" },
  completenessHint: { fontSize: 11, color: "#9CA3AF" },
  bar: {
    height: 6,
    backgroundColor: "#E9D8FD",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  premiumTouch: { borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
  },
  premiumTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  premiumSub: { fontSize: 12, color: "rgba(220,190,255,0.8)", marginTop: 2 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1F0A3C" },
  editRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  editTxt: { fontSize: 13, color: "#7C3AED", fontWeight: "600" },
  bio: { fontSize: 14, color: "#6B7280", lineHeight: 22 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F3EEFF",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#E9D8FD",
  },
  tagText: { fontSize: 13, color: "#7C3AED", fontWeight: "600" },
  lifestyleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lifestyleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFF0F9",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#FBCFE8",
  },
  lifestyleChipText: { fontSize: 12, color: "#BE185D", fontWeight: "500" },
  statsRow: { flexDirection: "row", gap: 12 },
  stat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F9F5FF",
    borderRadius: 12,
    paddingVertical: 12,
  },
  statVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F0A3C",
    marginBottom: 3,
  },
  statLabel: { fontSize: 11, color: "#9CA3AF" },

  verifyBtn: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#F3EEFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9D8FD",
    marginBottom: 8,
  },
  verifyText: { fontSize: 15, fontWeight: "700", color: "#7C3AED" },
  logoutBtn: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
});
