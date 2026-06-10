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

interface Facility {
  id: string;
  name: string;
}

export default function AddReferralScreen() {
  const language = useAppStore((s) => s.language);

  // ─── FIX: Read from getState() directly to avoid race condition ───
  // useAppStore hook may not reflect latest Zustand state when this screen
  // first mounts immediately after router.push() from member detail screen.
  // getState() always returns the current value synchronously.
  const selectedMemberId =
    useAppStore((s) => s.selectedMemberId) ??
    useAppStore.getState().selectedMemberId;
  const selectedVisitId =
    useAppStore((s) => s.selectedVisitId) ??
    useAppStore.getState().selectedVisitId;

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
  }, [selectedMemberId]); // ─── FIX: re-run if selectedMemberId changes

  const loadContext = async () => {
    try {
      const db = await getDb();

      // ─── FIX: Re-read from store at call time in case hook value is stale
      const memberId =
        selectedMemberId ?? useAppStore.getState().selectedMemberId;
      const visitId = selectedVisitId ?? useAppStore.getState().selectedVisitId;

      if (memberId) {
        const m = await db.getFirstAsync<{ full_name: string; id: string }>(
          "SELECT id, full_name FROM members WHERE id = ? OR local_id = ?",
          [memberId, memberId],
        );
        if (m) {
          setMemberName(m.full_name);

          if (visitId) {
            // Visit ID passed directly from visit flow
            setLastVisitId(visitId);
          } else {
            // Fallback: find most recent visit for this member
            const v = await db.getFirstAsync<{ id: string }>(
              `SELECT id FROM visits WHERE member_id = ? ORDER BY visited_at DESC LIMIT 1`,
              [m.id],
            );
            if (v) setLastVisitId(v.id);
            // If still no visit — that is fine, visit_id is now optional
          }
        }
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

  const handleSave = async () => {
    // ─── FIX: Re-read from store directly at save time — belt and braces
    const memberId =
      selectedMemberId ?? useAppStore.getState().selectedMemberId;

    if (!memberId) {
      return Alert.alert(
        "No Patient Selected",
        "Go back and tap a patient, then tap Refer.",
      );
    }
    if (!reason) {
      return Alert.alert("Required", "Please select a reason for referral.");
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
        [memberId, memberId],
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

      Alert.alert(
        urgency === "EMERGENCY"
          ? "🚨 Emergency Referral Created"
          : "Referral Created ✓",
        `Referral for ${memberName} has been saved.\n\nDue: ${dueBy.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}\n\nIt will be sent to the clinic when you sync.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      console.error("Save referral error:", err);
      Alert.alert("Error", "Failed to save referral. Please try again.");
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
          {/* Patient info */}
          {memberName ? (
            <View style={styles.patientCard}>
              <View style={styles.patientAvatar}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.patientName}>{memberName}</Text>
                <Text style={styles.patientSub}>Patient being referred</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.patientCard, { borderColor: COLORS.danger }]}>
              <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
              <Text style={{ color: COLORS.danger, fontSize: SIZES.fontSm }}>
                No patient selected — go back and tap a patient first
              </Text>
            </View>
          )}

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
