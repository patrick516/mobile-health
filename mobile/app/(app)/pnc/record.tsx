import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getDb } from "../../../src/db/schema";
import { enqueue } from "../../../src/db/sync-queue";

export default function PncRecordScreen() {
  const { visitId, memberName } = useLocalSearchParams<{
    visitId: string;
    memberName: string;
  }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Mother fields
  const [motherTemp, setMotherTemp] = useState("");
  const [motherBP, setMotherBP] = useState("");
  const [motherBreast, setMotherBreast] = useState("");
  const [motherUterus, setMotherUterus] = useState("");
  const [motherDangerSigns, setMotherDangerSigns] = useState<string[]>([]);

  // Newborn fields
  const [newbornWeight, setNewbornWeight] = useState("");
  const [newbornTemp, setNewbornTemp] = useState("");
  const [cordStatus, setCordStatus] = useState("");
  const [isBreastfeeding, setIsBreastfeeding] = useState(false);
  const [newbornDangerSigns, setNewbornDangerSigns] = useState<string[]>([]);

  const [referralNeeded, setReferralNeeded] = useState(false);
  const [notes, setNotes] = useState("");

  const MOTHER_DANGER_SIGNS = [
    "Heavy bleeding",
    "Fever > 38°C",
    "Foul discharge",
    "Severe headache",
    "Convulsions",
  ];

  const NEWBORN_DANGER_SIGNS = [
    "Not feeding",
    "Fast breathing",
    "Cord infection",
    "Jaundice",
    "Convulsions",
    "Hypothermia",
  ];

  const toggleSign = (
    sign: string,
    list: string[],
    setter: (v: string[]) => void,
  ) => {
    setter(
      list.includes(sign) ? list.filter((s) => s !== sign) : [...list, sign],
    );
  };

  const handleSave = async () => {
    if (!visitId) return;
    setSaving(true);
    try {
      const db = await getDb();
      const now = new Date().toISOString();

      await db.runAsync(
        `UPDATE pnc_visits SET
          status = 'ATTENDED',
          visited_date = ?,
          mother_temperature = ?,
          mother_blood_pressure = ?,
          mother_breast_status = ?,
          mother_uterus_status = ?,
          mother_danger_signs = ?,
          newborn_weight = ?,
          newborn_temperature = ?,
          newborn_cord_status = ?,
          is_breastfeeding = ?,
          newborn_danger_signs = ?,
          referral_needed = ?,
          notes = ?,
          synced = 0
        WHERE id = ?`,
        [
          now,
          motherTemp ? parseFloat(motherTemp) : null,
          motherBP || null,
          motherBreast || null,
          motherUterus || null,
          motherDangerSigns.length ? JSON.stringify(motherDangerSigns) : null,
          newbornWeight ? parseFloat(newbornWeight) : null,
          newbornTemp ? parseFloat(newbornTemp) : null,
          cordStatus || null,
          isBreastfeeding ? 1 : 0,
          newbornDangerSigns.length ? JSON.stringify(newbornDangerSigns) : null,
          referralNeeded ? 1 : 0,
          notes || null,
          visitId,
        ],
      );

      // Get local_id for sync queue
      const row = await db.getFirstAsync<{
        local_id: string;
        member_id: string;
      }>(`SELECT local_id, member_id FROM pnc_visits WHERE id = ?`, [visitId]);

      if (row) {
        await enqueue("PNC_VISIT", {
          localId: row.local_id,
          memberId: row.member_id,
          visitedDate: now,
          motherTemperature: motherTemp ? parseFloat(motherTemp) : null,
          motherBloodPressure: motherBP || null,
          motherBreastStatus: motherBreast || null,
          motherUterusStatus: motherUterus || null,
          motherDangerSigns: motherDangerSigns.length
            ? motherDangerSigns
            : null,
          newbornWeight: newbornWeight ? parseFloat(newbornWeight) : null,
          newbornTemperature: newbornTemp ? parseFloat(newbornTemp) : null,
          newbornCordStatus: cordStatus || null,
          isBreastfeeding,
          newbornDangerSigns: newbornDangerSigns.length
            ? newbornDangerSigns
            : null,
          referralNeeded,
          notes: notes || null,
        });
      }

      Alert.alert("Saved", "PNC visit recorded successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error("[PNC] Save error:", e);
      Alert.alert("Error", "Failed to save PNC visit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Record PNC Visit</Text>
      <Text style={styles.subtitle}>{memberName}</Text>

      {/* ── MOTHER SECTION */}
      <Text style={styles.sectionHeader}>Mother Assessment</Text>

      <Text style={styles.label}>Temperature (°C)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={motherTemp}
        onChangeText={setMotherTemp}
        placeholder="e.g. 36.5"
      />

      <Text style={styles.label}>Blood Pressure</Text>
      <TextInput
        style={styles.input}
        value={motherBP}
        onChangeText={setMotherBP}
        placeholder="e.g. 120/80"
      />

      <Text style={styles.label}>Breast Status</Text>
      <TextInput
        style={styles.input}
        value={motherBreast}
        onChangeText={setMotherBreast}
        placeholder="e.g. Normal, Engorged, Cracked nipples"
      />

      <Text style={styles.label}>Uterus Status</Text>
      <TextInput
        style={styles.input}
        value={motherUterus}
        onChangeText={setMotherUterus}
        placeholder="e.g. Involuting normally"
      />

      <Text style={styles.label}>Danger Signs (mother)</Text>
      <View style={styles.checkGroup}>
        {MOTHER_DANGER_SIGNS.map((sign) => (
          <TouchableOpacity
            key={sign}
            style={[
              styles.checkItem,
              motherDangerSigns.includes(sign) && styles.checkItemSelected,
            ]}
            onPress={() =>
              toggleSign(sign, motherDangerSigns, setMotherDangerSigns)
            }
          >
            <Text
              style={[
                styles.checkText,
                motherDangerSigns.includes(sign) && styles.checkTextSelected,
              ]}
            >
              {sign}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── NEWBORN SECTION */}
      <Text style={styles.sectionHeader}>Newborn Assessment</Text>

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={newbornWeight}
        onChangeText={setNewbornWeight}
        placeholder="e.g. 3.2"
      />

      <Text style={styles.label}>Temperature (°C)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={newbornTemp}
        onChangeText={setNewbornTemp}
        placeholder="e.g. 36.8"
      />

      <Text style={styles.label}>Cord Status</Text>
      <TextInput
        style={styles.input}
        value={cordStatus}
        onChangeText={setCordStatus}
        placeholder="e.g. Dry and clean, Infected"
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Breastfeeding</Text>
        <Switch
          value={isBreastfeeding}
          onValueChange={setIsBreastfeeding}
          trackColor={{ true: "#2B8A3E" }}
        />
      </View>

      <Text style={styles.label}>Danger Signs (newborn)</Text>
      <View style={styles.checkGroup}>
        {NEWBORN_DANGER_SIGNS.map((sign) => (
          <TouchableOpacity
            key={sign}
            style={[
              styles.checkItem,
              newbornDangerSigns.includes(sign) && styles.checkItemSelected,
            ]}
            onPress={() =>
              toggleSign(sign, newbornDangerSigns, setNewbornDangerSigns)
            }
          >
            <Text
              style={[
                styles.checkText,
                newbornDangerSigns.includes(sign) && styles.checkTextSelected,
              ]}
            >
              {sign}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── OUTCOME */}
      <Text style={styles.sectionHeader}>Outcome</Text>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Referral Needed</Text>
        <Switch
          value={referralNeeded}
          onValueChange={setReferralNeeded}
          trackColor={{ true: "#C92A2A" }}
        />
      </View>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        placeholder="Any observations..."
      />

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.saveBtnText}>Save PNC Visit</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#495057", marginBottom: 20 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2B8A3E",
    marginTop: 24,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#DEE2E6",
    paddingBottom: 6,
  },
  label: { fontSize: 14, color: "#495057", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1A1A1A",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  checkGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  checkItem: {
    borderWidth: 1,
    borderColor: "#CED4DA",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFF",
  },
  checkItemSelected: {
    backgroundColor: "#C92A2A",
    borderColor: "#C92A2A",
  },
  checkText: { fontSize: 13, color: "#495057" },
  checkTextSelected: { color: "#FFF", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#2B8A3E",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 32,
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
