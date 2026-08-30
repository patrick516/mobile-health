import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { getDb } from "../../../src/db/schema";
import { enqueue } from "../../../src/db/sync-queue";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";

const DOT_STATUS_OPTIONS = [
  {
    value: "OBSERVED",
    label: "Observed",
    desc: "Watched patient swallow medication",
    icon: "checkmark-circle",
    color: "#2B8A3E",
  },
  {
    value: "MISSED",
    label: "Missed",
    desc: "Patient was not available or refused",
    icon: "close-circle",
    color: "#C92A2A",
  },
  {
    value: "SELF_ADMINISTERED",
    label: "Self-Administered",
    desc: "Patient took medication without observation",
    icon: "person-circle",
    color: "#1971C2",
  },
];

const TB_DRUGS = [
  "Isoniazid (H)",
  "Rifampicin (R)",
  "Pyrazinamide (Z)",
  "Ethambutol (E)",
  "Streptomycin (S)",
];

export default function TbRecordScreen() {
  const { caseId, memberName, category } = useLocalSearchParams<{
    caseId: string;
    memberName: string;
    category: string;
  }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [dotStatus, setDotStatus] = useState("OBSERVED");
  const [drugsGiven, setDrugsGiven] = useState<string[]>([]);
  const [missedReason, setMissedReason] = useState("");
  const [notes, setNotes] = useState("");

  const MISSED_REASONS = [
    "Not at home",
    "Refused",
    "Side effects",
    "Travelling",
    "Other",
  ];

  const toggleDrug = (drug: string) => {
    setDrugsGiven((prev) =>
      prev.includes(drug) ? prev.filter((d) => d !== drug) : [...prev, drug],
    );
  };

  const handleSave = async () => {
    if (!caseId) return;
    if (dotStatus === "MISSED" && !missedReason) {
      Alert.alert("Required", "Please select a reason for the missed dose.");
      return;
    }
    if (dotStatus === "OBSERVED" && drugsGiven.length === 0) {
      Alert.alert("Required", "Please select at least one drug given.");
      return;
    }

    setSaving(true);
    try {
      const db = await getDb();
      const localId = Crypto.randomUUID();
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO tb_dot_visits (
          id, local_id, tb_case_id, visited_by_id, visit_date,
          status, drugs_given, missed_reason, notes, synced
        ) VALUES (?,?,?,?,?,?,?,?,?,0)`,
        [
          localId,
          localId,
          caseId,
          "local_user",
          now,
          dotStatus,
          drugsGiven.length ? JSON.stringify(drugsGiven) : null,
          dotStatus === "MISSED" ? missedReason : null,
          notes || null,
        ],
      );

      await enqueue("TB_DOT_VISIT", {
        localId,
        tbCaseId: caseId,
        visitDate: now,
        status: dotStatus,
        drugsGiven: drugsGiven.length ? drugsGiven : null,
        missedReason: dotStatus === "MISSED" ? missedReason : null,
        notes: notes || null,
      });

      Alert.alert(
        "DOT Visit Recorded",
        dotStatus === "MISSED"
          ? "Missed dose recorded. Please follow up with the patient."
          : "Observed dose recorded successfully.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      console.error("[TB] Save DOT error:", e);
      Alert.alert("Error", "Failed to save DOT visit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Record DOT Visit</Text>
          <Text style={styles.headerSub}>
            {memberName} · {category?.replace("_", " ")}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* DOT Status */}
        <Text style={styles.sectionTitle}>Observation Status</Text>
        {DOT_STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.statusCard,
              dotStatus === opt.value && {
                borderColor: opt.color,
                backgroundColor: opt.color + "10",
              },
            ]}
            onPress={() => setDotStatus(opt.value)}
          >
            <Ionicons
              name={opt.icon as any}
              size={28}
              color={dotStatus === opt.value ? opt.color : COLORS.textMuted}
            />
            <View style={styles.statusInfo}>
              <Text
                style={[
                  styles.statusLabel,
                  dotStatus === opt.value && { color: opt.color },
                ]}
              >
                {opt.label}
              </Text>
              <Text style={styles.statusDesc}>{opt.desc}</Text>
            </View>
            {dotStatus === opt.value && (
              <Ionicons name="checkmark-circle" size={20} color={opt.color} />
            )}
          </TouchableOpacity>
        ))}

        {/* Drugs given — only for OBSERVED */}
        {dotStatus === "OBSERVED" && (
          <>
            <Text style={styles.sectionTitle}>Drugs Given</Text>
            <View style={styles.drugGrid}>
              {TB_DRUGS.map((drug) => (
                <TouchableOpacity
                  key={drug}
                  style={[
                    styles.drugChip,
                    drugsGiven.includes(drug) && styles.drugChipSelected,
                  ]}
                  onPress={() => toggleDrug(drug)}
                >
                  <Text
                    style={[
                      styles.drugChipText,
                      drugsGiven.includes(drug) && styles.drugChipTextSelected,
                    ]}
                  >
                    {drug}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Missed reason — only for MISSED */}
        {dotStatus === "MISSED" && (
          <>
            <Text style={styles.sectionTitle}>Reason for Missed Dose</Text>
            <View style={styles.reasonGrid}>
              {MISSED_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.reasonChip,
                    missedReason === r && styles.reasonChipSelected,
                  ]}
                  onPress={() => setMissedReason(r)}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      missedReason === r && styles.reasonChipTextSelected,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="Any observations about the patient's condition..."
          placeholderTextColor={COLORS.placeholder}
        />

        {/* Save */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor:
                dotStatus === "MISSED" ? COLORS.danger : COLORS.primary,
            },
            saving && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons
                name={
                  dotStatus === "MISSED"
                    ? "close-circle-outline"
                    : "checkmark-circle-outline"
                }
                size={20}
                color={COLORS.white}
              />
              <Text style={styles.saveBtnText}>
                {dotStatus === "MISSED"
                  ? "Record Missed Dose"
                  : "Record DOT Visit"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: SIZES.lg,
    paddingHorizontal: SIZES.lg,
    gap: SIZES.md,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: SIZES.fontXs,
    marginTop: 2,
  },
  body: { padding: SIZES.lg },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SIZES.xl,
    marginBottom: SIZES.md,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    ...SHADOWS.sm,
  },
  statusInfo: { flex: 1 },
  statusLabel: {
    fontSize: SIZES.fontMd,
    fontWeight: "600",
    color: COLORS.text,
  },
  statusDesc: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  drugGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  drugChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.white,
  },
  drugChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  drugChipText: { fontSize: SIZES.fontSm, color: COLORS.text },
  drugChipTextSelected: { color: COLORS.white, fontWeight: "600" },
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.white,
  },
  reasonChipSelected: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  reasonChipText: { fontSize: SIZES.fontSm, color: COLORS.text },
  reasonChipTextSelected: { color: COLORS.white, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.text,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    marginTop: SIZES.xl,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    fontWeight: "700",
  },
});
