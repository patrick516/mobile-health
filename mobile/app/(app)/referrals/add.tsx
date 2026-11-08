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
import * as Crypto from "expo-crypto";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { useAppStore } from "../../../src/store";
import api from "../../../src/services/api";
import { getDb } from "../../../src/db/schema";
import { enqueue } from "../../../src/db/sync-queue";
import { REFERRAL_REASONS } from "../../../constants/diseases";
import {
  saveDraft,
  loadDraft,
  clearDraft,
} from "../../../src/utils/draftStorage";
import { showSuccess, showError, showInfo } from "../../../src/utils/toast";

const DRAFT_KEY = "referral_add";

interface Facility {
  id: string;
  name: string;
}

interface Patient {
  id: string;
  local_id: string;
  full_name: string;
  sex: string;
  estimated_age: number | null;
  date_of_birth: string | null;
  relationship_to_head: string | null;
  household_number: string | null;
  head_of_household_name: string | null;
}

export default function AddReferralScreen() {
  const language = useAppStore((s) => s.language);

  const [patientId, setPatientId] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [memberName, setMemberName] = useState("");
  const [lastVisitId, setLastVisitId] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<"ROUTINE" | "URGENT" | "EMERGENCY">(
    "URGENT",
  );
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContext();
  }, []);

  const resolveVisit = async (
    memberId: string,
    memberLocalId: string,
    preferVisitId?: string | null,
  ) => {
    if (preferVisitId) {
      setLastVisitId(preferVisitId);
      return;
    }
    const db = await getDb();
    const v = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM visits WHERE member_id = ? OR member_id = ? ORDER BY visited_at DESC LIMIT 1`,
      [memberId, memberLocalId],
    );
    setLastVisitId(v?.id || "");
  };

  const choosePatient = (p: Patient) => {
    setPatientId(p.id);
    setMemberName(p.full_name);
    useAppStore.getState().setSelectedMember(p.id);
    resolveVisit(p.id, p.local_id);
  };

  const loadContext = async () => {
    try {
      const db = await getDb();

      const rows = await db.getAllAsync<Patient>(
        `SELECT m.id, m.local_id, m.full_name, m.sex, m.estimated_age, m.date_of_birth,
                m.relationship_to_head, h.household_number, h.head_of_household_name
         FROM members m
         LEFT JOIN households h ON m.household_id = h.id OR m.household_id = h.local_id
         WHERE m.status = 'ACTIVE'
         ORDER BY h.head_of_household_name ASC, m.full_name ASC`,
      );
      setPatients(rows);

      const draft = await loadDraft<any>(DRAFT_KEY);
      const storedId = useAppStore.getState().selectedMemberId;
      const storedVisitId = useAppStore.getState().selectedVisitId;
      const find = (id?: string | null) =>
        id ? rows.find((r) => r.id === id || r.local_id === id) : undefined;

      const fromDraft = find(draft?.memberId);
      const initial = fromDraft ?? find(storedId);
      if (initial) {
        setPatientId(initial.id);
        setMemberName(initial.full_name);
        const matchesStore =
          storedId &&
          (initial.id === storedId || initial.local_id === storedId);
        resolveVisit(
          initial.id,
          initial.local_id,
          matchesStore ? storedVisitId : null,
        );
      }

      if (
        draft &&
        (draft.reason ||
          draft.notes ||
          draft.selectedFacilityId ||
          draft.memberId)
      ) {
        if (draft.reason) setReason(draft.reason);
        if (draft.urgency) setUrgency(draft.urgency);
        if (draft.selectedFacilityId)
          setSelectedFacilityId(draft.selectedFacilityId);
        if (draft.notes) setNotes(draft.notes);
        showInfo("Draft Restored", "Continuing your previous referral entry.");
      }

      // Load facilities (non-blocking — failure is acceptable offline)
      try {
        const res = await api.get("/admin/facilities");
        setFacilities(res.data.data || []);
      } catch {
        // Offline or no facilities configured — silently ignore
      }
    } catch (err) {
      console.error("Load referral context error:", err);
    }
  };

  // Auto-save draft (debounced 800ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(DRAFT_KEY, {
        memberId: patientId || null,
        reason,
        urgency,
        selectedFacilityId,
        notes,
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [patientId, reason, urgency, selectedFacilityId, notes]);

  const handleSave = async () => {
    if (!patientId) {
      return showError(
        "No Patient Selected",
        "Search and select the patient for this referral.",
      );
    }
    if (!reason) {
      return showError("Required", "Please select a reason for referral.");
    }
    // ─── FIX: visit_id is now optional — removed the hard block

    setSaving(true);
    try {
      const localId = Crypto.randomUUID();
      const db = await getDb();

      const dueBy = new Date();
      if (urgency === "EMERGENCY") dueBy.setHours(dueBy.getHours() + 6);
      else if (urgency === "URGENT") dueBy.setDate(dueBy.getDate() + 2);
      else dueBy.setDate(dueBy.getDate() + 7);

      const member = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM members WHERE id = ? OR local_id = ?",
        [patientId, patientId],
      );
      if (!member) throw new Error("Member not found in local database.");

      // ─── FIX: visit_id uses lastVisitId || null — no longer required
      await db.runAsync(
        `INSERT INTO referrals (
          id, local_id, visit_id, member_id, reason, urgency,
          status, due_by, synced
        ) VALUES (?,?,?,?,?,?,?,?,0)`,
        [
          localId,
          localId,
          lastVisitId || null,
          member.id,
          reason,
          urgency,
          "PENDING",
          dueBy.toISOString(),
        ],
      );

      await enqueue("REFERRAL", {
        localId,
        visitId: lastVisitId || null,
        memberId: member.id,
        destinationFacilityId: selectedFacilityId || null,
        reason,
        urgency,
        dueBy: dueBy.toISOString(),
        notes: notes.trim() || null,
      });

      await clearDraft(DRAFT_KEY);
      showSuccess(
        urgency === "EMERGENCY"
          ? "🚨 Emergency Referral Created"
          : "Referral Created",
        `Saved for ${memberName}.`,
      );

      Alert.alert(
        urgency === "EMERGENCY"
          ? "🚨 Emergency Referral Created"
          : "Referral Created ✓",
        `Referral for ${memberName} has been saved.\n\nDue: ${dueBy.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}\n\nIt will be sent to the clinic when you sync.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      console.error("Save referral error:", err);
      showError("Save Failed", "Failed to save referral. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const urgencyConfig = [
    {
      code: "ROUTINE",
      label: "Routine",
      sub: "Within 7 days",
      color: COLORS.success,
      icon: "time-outline",
    },
    {
      code: "URGENT",
      label: "Urgent",
      sub: "Within 48 hours",
      color: COLORS.warning,
      icon: "alert-outline",
    },
    {
      code: "EMERGENCY",
      label: "Emergency",
      sub: "Same day",
      color: COLORS.danger,
      icon: "alert-circle",
    },
  ];

  const getAge = (p: Patient) => {
    if (p.estimated_age) return `${p.estimated_age}y`;
    if (p.date_of_birth) {
      const age = Math.floor(
        (Date.now() - new Date(p.date_of_birth).getTime()) /
          (1000 * 60 * 60 * 24 * 365),
      );
      return `${age}y`;
    }
    return "";
  };

  const q = patientQuery.trim().toLowerCase();
  const filteredPatients = q
    ? patients.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          (p.household_number || "").toLowerCase().includes(q) ||
          (p.head_of_household_name || "").toLowerCase().includes(q),
      )
    : patients;
  const visiblePatients = filteredPatients.slice(0, 50);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Referral</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {/* Selected patient */}
          <Text style={styles.label}>Patient *</Text>
          {memberName ? (
            <View style={styles.patientCard}>
              <View style={styles.patientAvatar}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{memberName}</Text>
                <Text style={styles.patientSub}>Patient being referred</Text>
              </View>
            </View>
          ) : (
            <View style={styles.patientCard}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textMuted}
              />
              <Text style={{ color: COLORS.textMuted, fontSize: SIZES.fontSm }}>
                Search below and tap a patient to refer
              </Text>
            </View>
          )}

          {/* Instant search */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={patientQuery}
              onChangeText={setPatientQuery}
              placeholder="Search household ID, head name, or member name..."
              placeholderTextColor={COLORS.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {patientQuery.length > 0 && (
              <TouchableOpacity onPress={() => setPatientQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Patient list */}
          <View style={styles.patientList}>
            {patients.length === 0 ? (
              <Text style={styles.emptyListText}>
                No members found on this device
              </Text>
            ) : filteredPatients.length === 0 ? (
              <Text style={styles.emptyListText}>
                No matches for "{patientQuery}"
              </Text>
            ) : (
              visiblePatients.map((p) => {
                const isSelected =
                  patientId === p.id || patientId === p.local_id;
                return (
                  <TouchableOpacity
                    key={p.local_id}
                    style={[
                      styles.patientRow,
                      isSelected && styles.patientRowSelected,
                    ]}
                    onPress={() => choosePatient(p)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{p.full_name}</Text>
                      <Text style={styles.rowSub}>
                        {[getAge(p), p.sex, p.household_number || "No ID"]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      {p.head_of_household_name ? (
                        <Text style={styles.rowHead}>
                          Head: {p.head_of_household_name}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={COLORS.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
            {filteredPatients.length > visiblePatients.length && (
              <Text style={styles.emptyListText}>
                Showing first {visiblePatients.length} of{" "}
                {filteredPatients.length} — refine your search
              </Text>
            )}
          </View>

          {/* Urgency */}
          <Text style={styles.label}>Urgency Level *</Text>
          <View style={styles.urgencyGrid}>
            {urgencyConfig.map((u) => (
              <TouchableOpacity
                key={u.code}
                style={[
                  styles.urgencyCard,
                  urgency === u.code && {
                    borderColor: u.color,
                    backgroundColor: u.color + "12",
                  },
                ]}
                onPress={() => setUrgency(u.code as any)}
              >
                <Ionicons name={u.icon as any} size={24} color={u.color} />
                <Text style={[styles.urgencyLabel, { color: u.color }]}>
                  {u.label}
                </Text>
                <Text style={styles.urgencySub}>{u.sub}</Text>
                {urgency === u.code && (
                  <View
                    style={[styles.urgencyCheck, { backgroundColor: u.color }]}
                  >
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {urgency === "EMERGENCY" && (
            <View style={styles.emergencyAlert}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={styles.emergencyText}>
                Emergency referral — patient must go to clinic TODAY. An SMS
                alert will be sent.
              </Text>
            </View>
          )}

          {/* Reason */}
          <Text style={styles.label}>Reason for Referral *</Text>
          <View style={styles.optionGrid}>
            {REFERRAL_REASONS.map((r) => (
              <TouchableOpacity
                key={r.code}
                style={[
                  styles.option,
                  reason === r.code && styles.optionSelected,
                ]}
                onPress={() => setReason(r.code)}
              >
                <Text
                  style={[
                    styles.optionText,
                    reason === r.code && styles.optionTextSelected,
                  ]}
                >
                  {language === "en" ? r.labelEn : r.labelNy}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Destination facility */}
          {facilities.length > 0 && (
            <>
              <Text style={styles.label}>Destination Facility</Text>
              <View style={styles.optionGrid}>
                {facilities.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.option,
                      selectedFacilityId === f.id && styles.optionSelected,
                    ]}
                    onPress={() => setSelectedFacilityId(f.id)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedFacilityId === f.id &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Additional notes */}
          <Text style={styles.label}>Additional Notes (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional clinical information for the clinic..."
            placeholderTextColor={COLORS.placeholder}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.saveBtn,
              urgency === "EMERGENCY" && { backgroundColor: COLORS.danger },
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
                  name="medical-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.saveBtnText}>
                  {urgency === "EMERGENCY"
                    ? "Send Emergency Referral"
                    : "Create Referral"}
                </Text>
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
    gap: SIZES.md,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    marginBottom: SIZES.md,
    ...SHADOWS.sm,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  patientName: {
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
    color: COLORS.text,
  },
  patientSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.md,
    paddingVertical: 10,
    marginBottom: SIZES.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.fontSm,
    color: COLORS.text,
    padding: 0,
  },
  patientList: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    maxHeight: 260,
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + "66",
  },
  patientRowSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  rowName: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
  },
  rowSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 1 },
  rowHead: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 1 },
  emptyListText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    textAlign: "center",
    padding: SIZES.md,
  },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: SIZES.md,
  },
  urgencyGrid: { flexDirection: "row", gap: SIZES.sm },
  urgencyCard: {
    flex: 1,
    alignItems: "center",
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 4,
    position: "relative",
  },
  urgencyLabel: { fontSize: SIZES.fontSm, fontWeight: "bold" },
  urgencySub: { fontSize: 10, color: COLORS.textMuted, textAlign: "center" },
  urgencyCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyAlert: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: COLORS.dangerLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginTop: SIZES.sm,
  },
  emergencyText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    color: COLORS.danger,
    fontWeight: "500",
  },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
