import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Crypto from "expo-crypto";
import { COLORS, SIZES, SHADOWS } from "../../../../constants/theme";
import { useAppStore } from "../../../../src/store";
import { getDb } from "../../../../src/db/schema";
import { enqueue } from "../../../../src/db/sync-queue";
import {
  RELATIONSHIP_OPTIONS,
  CHRONIC_ILLNESSES,
} from "../../../../constants/diseases";

export default function AddMemberScreen() {
  const language = useAppStore((s) => s.language);
  const selectedHouseholdId = useAppStore((s) => s.selectedHouseholdId);

  const [fullName, setFullName] = useState("");
  const [sex, setSex] = useState<"MALE" | "FEMALE" | "UNKNOWN" | "">("");
  const [relationship, setRelationship] = useState("");
  const [useDob, setUseDob] = useState(true);
  const [dob, setDob] = useState(new Date());
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [estimatedAge, setEstimatedAge] = useState("");
  const [isPregnant, setIsPregnant] = useState(false);
  const [lmpDate, setLmpDate] = useState(new Date());
  const [showLmpPicker, setShowLmpPicker] = useState(false);
  const [chronicIllnesses, setChronicIllnesses] = useState<string[]>([]);
  const [hasDisability, setHasDisability] = useState(false);
  const [disabilityType, setDisabilityType] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const showPregnancy =
    sex === "FEMALE" &&
    (() => {
      if (useDob) {
        const age = Math.floor(
          (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365),
        );
        return age >= 10 && age <= 49;
      }
      return parseInt(estimatedAge) >= 10 && parseInt(estimatedAge) <= 49;
    })();

  const toggleIllness = (code: string) => {
    if (code === "NONE") {
      setChronicIllnesses(["NONE"]);
      return;
    }
    setChronicIllnesses((prev) => {
      const without = prev.filter((c) => c !== "NONE");
      return without.includes(code)
        ? without.filter((c) => c !== code)
        : [...without, code];
    });
  };

  const getAgeDisplay = () => {
    if (useDob) {
      const age = Math.floor(
        (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365),
      );
      return `${age} years old`;
    }
    return estimatedAge ? `~${estimatedAge} years old` : "";
  };

  const isUnder5 = () => {
    if (useDob) {
      return (
        Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365)) <
        5
      );
    }
    return parseInt(estimatedAge) < 5;
  };

  const handleSave = async () => {
    if (!fullName.trim())
      return Alert.alert("Required", "Full name is required.");
    if (!sex) return Alert.alert("Required", "Please select sex.");
    if (!relationship)
      return Alert.alert("Required", "Please select relationship to head.");
    if (!selectedHouseholdId)
      return Alert.alert(
        "Error",
        "No household selected. Go back and try again.",
      );
    if (!useDob && !estimatedAge)
      return Alert.alert("Required", "Please enter estimated age.");

    setSaving(true);
    try {
      const localId = Crypto.randomUUID();
      const db = await getDb();

      // Calculate expected delivery date if pregnant
      let expectedDelivery: string | null = null;
      if (isPregnant) {
        const edd = new Date(lmpDate);
        edd.setDate(edd.getDate() + 280);
        expectedDelivery = edd.toISOString();
      }

      const dobStr = useDob ? dob.toISOString() : null;
      const ageVal = !useDob ? parseInt(estimatedAge) : null;

      // Save to local SQLite
      await db.runAsync(
        `INSERT INTO members (
          id, local_id, household_id, full_name, date_of_birth, estimated_age,
          sex, relationship_to_head, is_pregnant, lmp_date, expected_delivery_date,
          chronic_illnesses, has_disability, disability_type, phone, status, synced
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
        [
          localId,
          localId,
          selectedHouseholdId,
          fullName.trim(),
          dobStr,
          ageVal,
          sex,
          relationship,
          isPregnant ? 1 : 0,
          isPregnant ? lmpDate.toISOString() : null,
          expectedDelivery,
          chronicIllnesses.length > 0 ? JSON.stringify(chronicIllnesses) : null,
          hasDisability ? 1 : 0,
          hasDisability && disabilityType ? disabilityType : null,
          phone.trim() || null,
          "ACTIVE",
        ],
      );

      // Add to sync queue
      await enqueue("MEMBER", {
        localId,
        householdId: selectedHouseholdId,
        fullName: fullName.trim(),
        dateOfBirth: dobStr,
        estimatedAge: ageVal,
        sex,
        relationshipToHead: relationship,
        isPregnant,
        lmpDate: isPregnant ? lmpDate.toISOString() : null,
        expectedDeliveryDate: expectedDelivery,
        chronicIllnesses: chronicIllnesses.length > 0 ? chronicIllnesses : null,
        hasDisability,
        disabilityType: hasDisability ? disabilityType : null,
        phone: phone.trim() || null,
      });

      // If under 5 — note: vaccine schedule created server-side on sync
      // If pregnant — ANC schedule created server-side on sync

      Alert.alert(
        "Member Added ✓",
        `${fullName} has been added.${isUnder5() ? "\n\nVaccination schedule will be set up on sync." : ""}${isPregnant ? "\n\nANC schedule will be set up on sync." : ""}`,
        [
          {
            text: "Add Another",
            onPress: () => {
              setFullName("");
              setSex("");
              setRelationship("");
              setIsPregnant(false);
              setChronicIllnesses([]);
              setHasDisability(false);
              setPhone("");
            },
          },
          { text: "Done", onPress: () => router.back() },
        ],
      );
    } catch (err) {
      console.error("Add member error:", err);
      Alert.alert("Error", "Failed to save member. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const Opt = ({ label, selected, onPress }: any) => (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === "en" ? "Add Member" : "Onjeza Munthu"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {/* Full Name */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor={COLORS.placeholder}
            autoCapitalize="words"
          />

          {/* Sex */}
          <Text style={styles.label}>Sex *</Text>
          <View style={styles.sexRow}>
            {(["MALE", "FEMALE", "UNKNOWN"] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.sexBtn,
                  sex === s && styles.sexBtnSelected,
                  s === "FEMALE" &&
                    sex === s && {
                      backgroundColor: "#DB2777",
                      borderColor: "#DB2777",
                    },
                  s === "MALE" &&
                    sex === s && {
                      backgroundColor: COLORS.secondary,
                      borderColor: COLORS.secondary,
                    },
                ]}
                onPress={() => {
                  setSex(s);
                  setIsPregnant(false);
                }}
              >
                <Ionicons
                  name={
                    s === "FEMALE"
                      ? "woman-outline"
                      : s === "MALE"
                        ? "man-outline"
                        : "person-outline"
                  }
                  size={20}
                  color={sex === s ? COLORS.white : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.sexBtnText,
                    sex === s && { color: COLORS.white },
                  ]}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date of birth */}
          <View style={styles.dobToggleRow}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.dobToggle}
              onPress={() => setUseDob(!useDob)}
            >
              <Text style={styles.dobToggleText}>
                {useDob
                  ? "Use estimated age instead"
                  : "Use date of birth instead"}
              </Text>
            </TouchableOpacity>
          </View>

          {useDob ? (
            <>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowDobPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.dateBtnText}>
                  {dob.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                {getAgeDisplay() ? (
                  <Text style={styles.ageHint}>{getAgeDisplay()}</Text>
                ) : null}
              </TouchableOpacity>
              {showDobPicker && (
                <DateTimePicker
                  value={dob}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDobPicker(false);
                    if (date) setDob(date);
                  }}
                />
              )}
            </>
          ) : (
            <View style={styles.ageRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={estimatedAge}
                onChangeText={setEstimatedAge}
                placeholder="Age in years"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.ageUnit}>years</Text>
            </View>
          )}

          {/* Under-5 indicator */}
          {isUnder5() && (
            <View style={styles.infoBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.infoText}>
                Child under 5 — vaccination schedule will be created
                automatically
              </Text>
            </View>
          )}

          {/* Relationship */}
          <Text style={styles.label}>Relationship to Head *</Text>
          <View style={styles.optionGrid}>
            {RELATIONSHIP_OPTIONS.map((r) => (
              <Opt
                key={r.code}
                label={language === "en" ? r.labelEn : r.labelNy}
                selected={relationship === r.code}
                onPress={() => setRelationship(r.code)}
              />
            ))}
          </View>

          {/* Pregnancy — only show for females 10-49 */}
          {showPregnancy && (
            <>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Currently Pregnant</Text>
                  <Text style={styles.switchSub}>
                    ANC schedule will be created automatically
                  </Text>
                </View>
                <Switch
                  value={isPregnant}
                  onValueChange={setIsPregnant}
                  trackColor={{ false: COLORS.border, true: "#FDF2F8" }}
                  thumbColor={isPregnant ? "#DB2777" : COLORS.textMuted}
                />
              </View>

              {isPregnant && (
                <>
                  <Text style={styles.label}>Last Menstrual Period (LMP)</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setShowLmpPicker(true)}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#DB2777"
                    />
                    <Text style={styles.dateBtnText}>
                      {lmpDate.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showLmpPicker && (
                    <DateTimePicker
                      value={lmpDate}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(_, date) => {
                        setShowLmpPicker(false);
                        if (date) setLmpDate(date);
                      }}
                    />
                  )}
                  <View
                    style={[
                      styles.infoBox,
                      { borderColor: "#DB2777", backgroundColor: "#FDF2F8" },
                    ]}
                  >
                    <Ionicons name="heart-outline" size={16} color="#DB2777" />
                    <Text style={[styles.infoText, { color: "#DB2777" }]}>
                      Expected delivery:{" "}
                      {(() => {
                        const edd = new Date(lmpDate);
                        edd.setDate(edd.getDate() + 280);
                        return edd.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        });
                      })()}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}

          {/* Chronic illness */}
          <Text style={styles.label}>Chronic Illness</Text>
          <View style={styles.optionGrid}>
            {CHRONIC_ILLNESSES.map((c) => (
              <Opt
                key={c.code}
                label={language === "en" ? c.labelEn : c.labelNy}
                selected={chronicIllnesses.includes(c.code)}
                onPress={() => toggleIllness(c.code)}
              />
            ))}
          </View>

          {/* Disability */}
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Has Disability</Text>
              <Text style={styles.switchSub}>
                Any physical or cognitive disability
              </Text>
            </View>
            <Switch
              value={hasDisability}
              onValueChange={setHasDisability}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={hasDisability ? COLORS.primary : COLORS.textMuted}
            />
          </View>

          {hasDisability && (
            <>
              <Text style={styles.label}>Disability Type</Text>
              <View style={styles.optionGrid}>
                {["Visual", "Hearing", "Mobility", "Cognitive", "Other"].map(
                  (d) => (
                    <Opt
                      key={d}
                      label={d}
                      selected={disabilityType === d}
                      onPress={() => setDisabilityType(d)}
                    />
                  ),
                )}
              </View>
            </>
          )}

          {/* Phone */}
          <Text style={styles.label}>Phone Number (optional)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 0888123456"
            placeholderTextColor={COLORS.placeholder}
            keyboardType="phone-pad"
          />

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name="person-add-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.saveBtnText}>Add Member</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: SIZES.lg,
    paddingHorizontal: SIZES.xl,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
  },
  scroll: { flex: 1 },
  section: { padding: SIZES.lg },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: SIZES.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  sexRow: { flexDirection: "row", gap: SIZES.sm },
  sexBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  sexBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  sexBtnText: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  dobToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SIZES.md,
  },
  dobToggle: {},
  dobToggleText: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    fontWeight: "600",
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    backgroundColor: COLORS.white,
  },
  dateBtnText: { fontSize: SIZES.fontMd, color: COLORS.text, flex: 1 },
  ageHint: { fontSize: SIZES.fontXs, color: COLORS.primary, fontWeight: "600" },
  ageRow: { flexDirection: "row", alignItems: "center", gap: SIZES.md },
  ageUnit: { fontSize: SIZES.fontMd, color: COLORS.textSecondary },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginTop: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  infoText: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.primary },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: SIZES.sm,
  },
  option: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: { fontSize: SIZES.fontSm, color: COLORS.text },
  optionTextSelected: { color: COLORS.white, fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SIZES.md,
  },
  switchInfo: { flex: 1, marginRight: SIZES.md },
  switchLabel: {
    fontSize: SIZES.fontMd,
    fontWeight: "600",
    color: COLORS.text,
  },
  switchSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    marginTop: SIZES.xl,
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: SIZES.fontMd,
  },
});
