import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

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

// ── Option group component ────────────────────────────────────────────────────
function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { val: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((o) => {
          const active = value === o.val;
          return (
            <TouchableOpacity
              key={o.val}
              style={[styles.optionChip, active && styles.optionChipActive]}
              onPress={() => onChange(o.val)}
              activeOpacity={0.8}
            >
              {active && (
                <LinearGradient
                  colors={["#EE2090", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text
                style={[styles.optionText, active && styles.optionTextActive]}
              >
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Interest tag toggle ───────────────────────────────────────────────────────
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
];

export default function PreferencesScreen() {
  // Dating preferences
  const [lookingFor, setLookingFor] = useState("everyone");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [distance, setDistance] = useState(20);

  // Lifestyle preferences
  const [smoking, setSmoking] = useState("any");
  const [alcohol, setAlcohol] = useState("any");
  const [children, setChildren] = useState("any");
  const [exercise, setExercise] = useState("any");
  const [diet, setDiet] = useState("any");
  const [religion, setReligion] = useState("any");
  const [education, setEducation] = useState("any");
  const [relGoal, setRelGoal] = useState("any");

  // Interests
  const [interests, setInterests] = useState<string[]>([
    "Travel",
    "Coffee",
    "Music",
  ]);

  const toggleInterest = (tag: string) =>
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const resetAll = () => {
    setLookingFor("everyone");
    setAgeMin(18);
    setAgeMax(35);
    setDistance(20);
    setSmoking("any");
    setAlcohol("any");
    setChildren("any");
    setExercise("any");
    setDiet("any");
    setReligion("any");
    setEducation("any");
    setRelGoal("any");
    setInterests([]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <TouchableOpacity onPress={resetAll} activeOpacity={0.8}>
          <Text style={styles.resetTxt}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Dating ── */}
        <Text style={styles.sectionTitle}>Dating Preferences</Text>

        <OptionGroup
          label="I'm looking for"
          value={lookingFor}
          onChange={setLookingFor}
          options={[
            { val: "men", label: "Men" },
            { val: "women", label: "Women" },
            { val: "everyone", label: "Everyone" },
          ]}
        />

        {/* Age range */}
        <View style={styles.group}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.groupLabel}>Age Range</Text>
            <Text style={styles.sliderVal}>
              {ageMin} – {ageMax} yrs
            </Text>
          </View>
          <View style={styles.sliderTrack}>
            <LinearGradient
              colors={["#EE2090", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.sliderFill,
                { width: `${((ageMax - 18) / 42) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.ageButtons}>
            {[18, 20, 25, 30, 35, 40, 50, 60].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.ageBtn, ageMax === v && styles.ageBtnActive]}
                onPress={() => {
                  if (v > ageMin) setAgeMax(v);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.ageBtnTxt,
                    ageMax === v && styles.ageBtnTxtActive,
                  ]}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Distance */}
        <View style={styles.group}>
          <View style={styles.sliderLabelRow}>
            <Text style={styles.groupLabel}>Distance</Text>
            <Text style={styles.sliderVal}>{distance} km</Text>
          </View>
          <View style={styles.sliderTrack}>
            <LinearGradient
              colors={["#EE2090", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.sliderFill,
                { width: `${(distance / 100) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.distButtons}>
            {[5, 10, 20, 50, 100].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.ageBtn, distance === v && styles.ageBtnActive]}
                onPress={() => setDistance(v)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.ageBtnTxt,
                    distance === v && styles.ageBtnTxtActive,
                  ]}
                >
                  {v}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Lifestyle ── */}
        <Text style={styles.sectionTitle}>Lifestyle Preferences</Text>
        <Text style={styles.sectionNote}>
          Filter matches by their lifestyle habits
        </Text>

        <OptionGroup
          label="Smoking"
          value={smoking}
          onChange={setSmoking}
          options={[
            { val: "any", label: "Any" },
            { val: "never", label: "Non-smoker 🚭" },
            { val: "socially", label: "Social 🚬" },
          ]}
        />

        <OptionGroup
          label="Alcohol"
          value={alcohol}
          onChange={setAlcohol}
          options={[
            { val: "any", label: "Any" },
            { val: "never", label: "Doesn't drink 🚫" },
            { val: "socially", label: "Social 🥂" },
          ]}
        />

        <OptionGroup
          label="Children"
          value={children}
          onChange={setChildren}
          options={[
            { val: "any", label: "Any" },
            { val: "dont_have_want", label: "Wants kids 👶" },
            { val: "dont_have_dont_want", label: "Childfree 🚫" },
          ]}
        />

        <OptionGroup
          label="Relationship Goal"
          value={relGoal}
          onChange={setRelGoal}
          options={[
            { val: "any", label: "Any" },
            { val: "serious", label: "Serious 💍" },
            { val: "casual", label: "Casual" },
            { val: "friendship", label: "Friends 🤝" },
          ]}
        />

        <OptionGroup
          label="Exercise"
          value={exercise}
          onChange={setExercise}
          options={[
            { val: "any", label: "Any" },
            { val: "often", label: "Active 💪" },
            { val: "daily", label: "Gym freak 🏋️" },
            { val: "never", label: "Not into gym" },
          ]}
        />

        <OptionGroup
          label="Diet"
          value={diet}
          onChange={setDiet}
          options={[
            { val: "any", label: "Any" },
            { val: "omnivore", label: "Omnivore 🍗" },
            { val: "vegetarian", label: "Veggie 🥦" },
            { val: "vegan", label: "Vegan 🌱" },
            { val: "halal", label: "Halal 🕌" },
          ]}
        />

        <OptionGroup
          label="Religion"
          value={religion}
          onChange={setReligion}
          options={[
            { val: "any", label: "Any" },
            { val: "christian", label: "Christian ✝️" },
            { val: "muslim", label: "Muslim ☪️" },
            { val: "none", label: "None" },
          ]}
        />

        <OptionGroup
          label="Education"
          value={education}
          onChange={setEducation}
          options={[
            { val: "any", label: "Any" },
            { val: "bachelors", label: "Degree 🎓" },
            { val: "masters", label: "Masters 🎓" },
            { val: "phd", label: "PhD 🎓" },
          ]}
        />

        {/* ── Interests ── */}
        <Text style={styles.sectionTitle}>Interests</Text>
        <View style={styles.interestGrid}>
          {ALL_INTERESTS.map((tag) => {
            const sel = interests.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.interestTag, sel && styles.interestTagActive]}
                onPress={() => toggleInterest(tag)}
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
                  style={[styles.interestTxt, sel && styles.interestTxtActive]}
                >
                  {sel ? "✓  " : ""}
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Apply button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.85}
          style={styles.applyTouch}
        >
          <LinearGradient
            colors={["#EE2090", "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyBtn}
          >
            <Text style={styles.applyTxt}>Apply Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1F0A3C" },
  resetTxt: { fontSize: 14, fontWeight: "600", color: "#E91E8C" },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F0A3C",
    marginTop: 20,
    marginBottom: 4,
  },
  sectionNote: { fontSize: 12, color: "#9CA3AF", marginBottom: 12 },

  group: { marginBottom: 16 },
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#E9D8FD",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    position: "relative",
  },
  optionChipActive: { borderColor: "transparent" },
  optionText: { fontSize: 13, fontWeight: "600", color: "#6B7280", zIndex: 1 },
  optionTextActive: { color: "#FFFFFF" },

  sliderLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sliderVal: { fontSize: 13, fontWeight: "700", color: "#E91E8C" },
  sliderTrack: {
    height: 6,
    backgroundColor: "#E9D8FD",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  sliderFill: { height: "100%", borderRadius: 3 },

  ageButtons: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  distButtons: { flexDirection: "row", gap: 8 },
  ageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#E9D8FD",
    backgroundColor: "#FFFFFF",
  },
  ageBtnActive: { backgroundColor: "#F3EEFF", borderColor: "#7C3AED" },
  ageBtnTxt: { fontSize: 12, color: "#6B7280" },
  ageBtnTxtActive: { color: "#7C3AED", fontWeight: "700" },

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
  applyTouch: { borderRadius: 50, overflow: "hidden" },
  applyBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 50 },
  applyTxt: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
