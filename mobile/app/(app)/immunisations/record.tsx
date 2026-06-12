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
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Crypto from "expo-crypto";
import { COLORS, SIZES } from "../../../constants/theme";
import { useAppStore } from "../../../src/store";
import { getDb } from "../../../src/db/schema";
import { enqueue } from "../../../src/db/sync-queue";
import { VACCINES } from "../../../constants/diseases";

interface PendingVaccine {
  schedule_id: string;
  vaccine_code: string;
  dose_number: number;
  due_date: string;
  status: string;
}

export default function RecordImmunisationScreen() {
  const language = useAppStore((s) => s.language);
  const selectedMemberId = useAppStore((s) => s.selectedMemberId);

  const [memberName, setMemberName] = useState("");
  const [pending, setPending] = useState<PendingVaccine[]>([]);
  const [selectedVaccine, setSelectedVaccine] = useState("");
  const [selectedDose, setSelectedDose] = useState(1);
  const [givenDate, setGivenDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [route, setRoute] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    const memberId =
      selectedMemberId ?? useAppStore.getState().selectedMemberId;
    if (!memberId) return;
    const db = await getDb();

    // Find member by either id or local_id
    const m = await db.getFirstAsync<{ full_name: string; id: string }>(
      "SELECT id, full_name FROM members WHERE id = ? OR local_id = ?",
      [memberId, memberId],
    );
    if (m) setMemberName(m.full_name);

    // Use the actual DB id (not the passed-in memberId) for schedule lookup
    const actualId = m?.id ?? memberId;

    const schedules = await db.getAllAsync<PendingVaccine>(
      `SELECT id as schedule_id, vaccine_code, dose_number, due_date, status
     FROM immunisation_schedules WHERE member_id = ? AND status IN ('DUE','OVERDUE')
     ORDER BY due_date ASC`,
      [actualId],
    );
    setPending(schedules);
    if (schedules.length > 0) {
      setSelectedVaccine(schedules[0].vaccine_code);
      setSelectedDose(schedules[0].dose_number);
    }
  };

  const handleSave = async () => {
    const memberId =
      selectedMemberId ?? useAppStore.getState().selectedMemberId;
    if (!memberId) return Alert.alert("Error", "No patient selected.");
    if (!selectedVaccine)
      return Alert.alert("Required", "Please select a vaccine.");

    setSaving(true);
    try {
      const localId = Crypto.randomUUID();
      const db = await getDb();
      const member = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM members WHERE id = ? OR local_id = ?",
        [memberId, memberId],
      );
      if (!member) throw new Error("Member not found");

      // Find next due date for this vaccine
      const vaccine = VACCINES.find((v) => v.code === selectedVaccine);
      const nextDue = null; // Server calculates next dose

      // Save to SQLite
      await db.runAsync(
        `INSERT INTO immunisations (
          id, local_id, member_id, vaccine_code, dose_number,
          given_at, batch_number, route, next_due_date, synced
        ) VALUES (?,?,?,?,?,?,?,?,?,0)`,
        [
          localId,
          localId,
          member.id,
          selectedVaccine,
          selectedDose,
          givenDate.toISOString(),
          batchNumber.trim() || null,
          route || null,
          nextDue,
        ],
      );

      // Update local schedule
      await db.runAsync(
        `UPDATE immunisation_schedules SET status = 'GIVEN', given_at = ?
         WHERE member_id = ? AND vaccine_code = ? AND dose_number = ?`,
        [givenDate.toISOString(), member.id, selectedVaccine, selectedDose],
      );

      // Enqueue
      await enqueue("IMMUNISATION", {
        localId,
        memberId: member.id,
        vaccineCode: selectedVaccine,
        doseNumber: selectedDose,
        givenAt: givenDate.toISOString(),
        batchNumber: batchNumber.trim() || null,
        route: route || null,
      });

      Alert.alert(
        "Recorded ✓",
        `${selectedVaccine} Dose ${selectedDose} recorded for ${memberName}.`,
        [
          {
            text: "Record Another",
            onPress: () => {
              setSelectedVaccine("");
              setBatchNumber("");
              setRoute("");
              loadContext();
            },
          },
          { text: "Done", onPress: () => router.back() },
        ],
      );
    } catch (err) {
      console.error("Record immunisation error:", err);
      Alert.alert("Error", "Failed to record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Immunisation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {memberName ? (
            <View style={styles.patientCard}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
              <Text style={styles.patientName}>{memberName}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Select Vaccine *</Text>
          {pending.length > 0 ? (
            <>
              <Text style={styles.sublabel}>Due vaccines (tap to select)</Text>
              {pending.map((v) => (
                <TouchableOpacity
                  key={v.schedule_id}
                  style={[
                    styles.vaccineRow,
                    selectedVaccine === v.vaccine_code &&
                      selectedDose === v.dose_number &&
                      styles.vaccineRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedVaccine(v.vaccine_code);
                    setSelectedDose(v.dose_number);
                  }}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          v.status === "OVERDUE"
                            ? COLORS.danger
                            : COLORS.warning,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vaccineName}>
                      {v.vaccine_code} — Dose {v.dose_number}
                    </Text>
                    <Text style={styles.vaccineDue}>
                      {v.status === "OVERDUE" ? "⚠ Overdue: " : "Due: "}
                      {new Date(v.due_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                  </View>
                  {selectedVaccine === v.vaccine_code &&
                    selectedDose === v.dose_number && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={COLORS.primary}
                      />
                    )}
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.optionGrid}>
              {VACCINES.map((v) => (
                <TouchableOpacity
                  key={`${v.code}-${v.dose}`}
                  style={[
                    styles.option,
                    selectedVaccine === v.code &&
                      selectedDose === v.dose &&
                      styles.optionSelected,
                  ]}
                  onPress={() => {
                    setSelectedVaccine(v.code);
                    setSelectedDose(v.dose);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedVaccine === v.code &&
                        selectedDose === v.dose &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {v.code} D{v.dose}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Date Given *</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.dateBtnText}>
              {givenDate.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={givenDate}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (d) setGivenDate(d);
              }}
            />
          )}

          <Text style={styles.label}>Batch Number (optional)</Text>
          <TextInput
            style={styles.input}
            value={batchNumber}
            onChangeText={setBatchNumber}
            placeholder="e.g. MV2024-001"
            placeholderTextColor={COLORS.placeholder}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Route</Text>
          <View style={styles.optionGrid}>
            {["IM", "SC", "Oral", "ID"].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.option, route === r && styles.optionSelected]}
                onPress={() => setRoute(r)}
              >
                <Text
                  style={[
                    styles.optionText,
                    route === r && styles.optionTextSelected,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
                  name="shield-checkmark-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.saveBtnText}>Record Immunisation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
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
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  patientName: {
    fontSize: SIZES.fontMd,
    fontWeight: "600",
    color: COLORS.primary,
  },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: SIZES.md,
  },
  sublabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginBottom: SIZES.sm,
  },
  vaccineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vaccineRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  vaccineName: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
  },
  vaccineDue: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
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
  dateBtnText: { fontSize: SIZES.fontMd, color: COLORS.text },
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
