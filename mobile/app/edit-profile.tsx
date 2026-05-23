import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import {
  fetchMe,
  updateMe,
  updateInterests,
} from "../src/services/userService";

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

const ALL_INTERESTS = [
  "Travel",
  "Photography",
  "Coffee",
  "Movies",
  "Hiking",
  "Music",
  "Reading",
  "Fitness",
  "Cooking",
  "Art",
  "Technology",
  "Dancing",
  "Gaming",
  "Fashion",
  "Food",
  "Sports",
  "Yoga",
  "Pets",
];

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profession, setProfession] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    fetchMe()
      .then((me) => {
        setName(me.name ?? "");
        setBio(me.bio ?? "");
        setProfession(me.profession ?? "");
        setInterests(me.interests ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        updateMe({
          name: name.trim(),
          bio: bio.trim(),
          profession: profession.trim(),
        }),
        updateInterests(interests),
      ]);
      Alert.alert("✅ Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

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
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Profession */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Profession</Text>
          <TextInput
            style={styles.input}
            value={profession}
            onChangeText={setProfession}
            placeholder="e.g. Software Developer"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Bio */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>About Me</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Write something about yourself…"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </View>

        {/* Interests */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Interests</Text>
          <Text style={styles.sublabel}>Select up to 10</Text>
          <View style={styles.interestGrid}>
            {ALL_INTERESTS.map((tag) => {
              const sel = interests.includes(tag);
              const disabled = !sel && interests.length >= 10;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.interestTag,
                    sel && styles.interestTagActive,
                    disabled && styles.interestTagDisabled,
                  ]}
                  onPress={() => !disabled && toggleInterest(tag)}
                  activeOpacity={0.8}
                >
                  {sel && (
                    <LinearGradient
                      colors={["#EE2090", "#7C3AED"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text
                    style={[
                      styles.interestTxt,
                      sel && styles.interestTxtActive,
                    ]}
                  >
                    {sel ? "✓  " : ""}
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.85}
          style={styles.saveTouch}
          disabled={saving}
        >
          <LinearGradient
            colors={["#EE2090", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveTxt}>Save Changes</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1F0A3C" },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  fieldWrap: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  sublabel: { fontSize: 12, color: "#9CA3AF", marginBottom: 10 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E9D8FD",
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1F0A3C",
  },
  bioInput: { height: 120, textAlignVertical: "top", paddingTop: 13 },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 4,
  },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestTag: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#E9D8FD",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    position: "relative",
  },
  interestTagActive: { borderColor: "transparent" },
  interestTagDisabled: { opacity: 0.4 },
  interestTxt: { fontSize: 13, fontWeight: "600", color: "#6B7280", zIndex: 1 },
  interestTxtActive: { color: "#FFFFFF" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0EBF8",
  },
  saveTouch: { borderRadius: 50, overflow: "hidden" },
  saveBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 50 },
  saveTxt: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
