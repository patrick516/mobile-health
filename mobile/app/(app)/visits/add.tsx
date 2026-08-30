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
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { useAppStore } from "../../../src/store";
import { getDb } from "../../../src/db/schema";
import { enqueue } from "../../../src/db/sync-queue";
import {
  SYMPTOMS,
  DANGER_SIGNS,
  VISIT_TYPES,
} from "../../../constants/diseases";
import {
  saveDraft,
  loadDraft,
  clearDraft,
} from "../../../src/utils/draftStorage";
import { showSuccess, showError, showInfo } from "../../../src/utils/toast";

const DRAFT_KEY = "visit_add";

interface Member {
  id: string;
  local_id: string;
  full_name: string;
  sex: string;
  estimated_age: number;
  date_of_birth: string;
}

interface Drug {
  id: string;
  drug_code: string;
  name_english: string;
  name_chichewa: string;
  unit: string;
  quantity_current: number;
}

export default function AddVisitScreen() {
  const language = useAppStore((s) => s.language);
  const user = useAppStore((s) => s.user);
  const selectedHouseholdId = useAppStore((s) => s.selectedHouseholdId);

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [visitType, setVisitType] = useState("ROUTINE");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [dangerSigns, setDangerSigns] = useState<string[]>([]);
  const [temperature, setTemperature] = useState("");
  const [muacMm, setMuacMm] = useState("");
  const [referralNeeded, setReferralNeeded] = useState(false);
  const [notes, setNotes] = useState("");
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [dispensed, setDispensed] = useState<Record<string, number>>({});
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");

  const STEPS = ["Patient", "Symptoms", "Measurements", "Drugs", "Review"];

  const muacNum = parseInt(muacMm);
  const muacStatus = !muacMm
    ? null
    : muacNum >= 125
      ? "NORMAL"
      : muacNum >= 115
        ? "MODERATE_MALNUTRITION"
        : "SEVERE_MALNUTRITION";

  // ── Growth monitoring — only for children under 5 ──
  const selectedMember = members.find(
    (m) => m.local_id === selectedMemberId || m.id === selectedMemberId,
  );
  const ageMonths = (() => {
    if (!selectedMember) return null;
    if (selectedMember.date_of_birth) {
      return Math.floor(
        (Date.now() - new Date(selectedMember.date_of_birth).getTime()) /
          (1000 * 60 * 60 * 24 * 30.44),
      );
    }
    if (selectedMember.estimated_age) return selectedMember.estimated_age * 12;
    return null;
  })();
  const isUnderFive = ageMonths !== null && ageMonths < 60;

  // WHO simplified thresholds — weight-for-age Z-score approximation
  const calcGrowthStatus = (): {
    zWfa: number | null;
    zHfa: number | null;
    zWfh: number | null;
    status: string | null;
  } => {
    if (!isUnderFive || !weightKg || !heightCm || ageMonths === null)
      return { zWfa: null, zHfa: null, zWfh: null, status: null };

    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const ageM = ageMonths;
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0)
      return { zWfa: null, zHfa: null, zWfh: null, status: null };

    // WHO median weight-for-age (simplified linear approximation)
    const medianWFA = ageM < 12 ? 3.3 + ageM * 0.55 : 9.0 + (ageM - 12) * 0.17;
    const sdWFA = medianWFA * 0.15;
    const zWfa = parseFloat(((w - medianWFA) / sdWFA).toFixed(2));

    // WHO median height-for-age
    const medianHFA = ageM < 12 ? 49.9 + ageM * 2.6 : 75.7 + (ageM - 12) * 1.0;
    const sdHFA = medianHFA * 0.04;
    const zHfa = parseFloat(((h - medianHFA) / sdHFA).toFixed(2));

    // Weight-for-height
    const expectedW = (h / 100) * (h / 100) * 16.5;
    const zWfh = parseFloat(((w - expectedW) / (expectedW * 0.15)).toFixed(2));

    let status = "NORMAL";
    if (zWfa < -3 || zWfh < -3) status = "SEVERELY_WASTED";
    else if (zWfa < -2 || zWfh < -2) status = "WASTED";
    else if (zHfa < -3) status = "SEVERELY_STUNTED";
    else if (zHfa < -2) status = "STUNTED";
    else if (zWfa < -2) status = "UNDERWEIGHT";

    return { zWfa, zHfa, zWfh, status };
  };

  const growth = calcGrowthStatus();
  const growthColor =
    growth.status === "NORMAL" || !growth.status
      ? COLORS.success
      : growth.status?.startsWith("SEVERE")
        ? COLORS.danger
        : COLORS.warning;
  const muacColor =
    muacStatus === "NORMAL"
      ? COLORS.success
      : muacStatus === "MODERATE_MALNUTRITION"
        ? COLORS.warning
        : muacStatus === "SEVERE_MALNUTRITION"
          ? COLORS.danger
          : COLORS.border;

  const hasDangerSigns = dangerSigns.length > 0;
  const autoReferral = muacStatus === "SEVERE_MALNUTRITION" || hasDangerSigns;

  useEffect(() => {
    loadMembers();
    loadDrugs();
    captureGps();
    restoreDraft();
  }, []);

  const restoreDraft = async () => {
    const draft = await loadDraft<any>(DRAFT_KEY);
    if (!draft) return;
    if (draft.householdId !== selectedHouseholdId) return;
    if (draft.selectedMemberId) setSelectedMemberId(draft.selectedMemberId);
    if (draft.visitType) setVisitType(draft.visitType);
    if (draft.symptoms) setSymptoms(draft.symptoms);
    if (draft.dangerSigns) setDangerSigns(draft.dangerSigns);
    if (draft.temperature) setTemperature(draft.temperature);
    if (draft.muacMm) setMuacMm(draft.muacMm);
    if (typeof draft.referralNeeded === "boolean")
      setReferralNeeded(draft.referralNeeded);
    if (draft.notes) setNotes(draft.notes);
    if (draft.dispensed) setDispensed(draft.dispensed);
    if (draft.weightKg) setWeightKg(draft.weightKg);
    if (draft.heightCm) setHeightCm(draft.heightCm);
    if (typeof draft.step === "number") setStep(draft.step);
    showInfo("Draft Restored", "Continuing your previous visit entry.");
  };

  // Auto-save draft (debounced 800ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(DRAFT_KEY, {
        householdId: selectedHouseholdId,
        selectedMemberId,
        visitType,
        symptoms,
        dangerSigns,
        temperature,
        muacMm,
        referralNeeded,
        notes,
        dispensed,
        step,
        weightKg,
        heightCm,
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [
    selectedHouseholdId,
    selectedMemberId,
    visitType,
    symptoms,
    dangerSigns,
    temperature,
    muacMm,
    referralNeeded,
    notes,
    dispensed,
    step,
  ]);

  useEffect(() => {
    if (autoReferral) setReferralNeeded(true);
  }, [autoReferral]);

  const loadMembers = async () => {
    if (!selectedHouseholdId) return;
    const db = await getDb();
    const rows = await db.getAllAsync<Member>(
      `SELECT * FROM members WHERE household_id = ? AND status = 'ACTIVE' ORDER BY full_name ASC`,
      [selectedHouseholdId],
    );
    setMembers(rows);
    if (rows.length === 1) setSelectedMemberId(rows[0].local_id);
  };

  const loadDrugs = async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<Drug>(
      "SELECT * FROM drug_stock WHERE quantity_current > 0 ORDER BY name_english ASC",
    );
    setDrugs(rows);
  };

  const captureGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setGpsLat(loc.coords.latitude);
      setGpsLng(loc.coords.longitude);
    } catch {}
  };

  const toggleSymptom = (code: string) => {
    setSymptoms((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
  };

  const toggleDangerSign = (code: string) => {
    setDangerSigns((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
  };

  const updateDispensed = (drugId: string, qty: number) => {
    setDispensed((prev) => ({ ...prev, [drugId]: Math.max(0, qty) }));
  };

  const handleSave = async () => {
    if (!selectedMemberId)
      return showError("Required", "Please select a patient.");

    setSaving(true);
    try {
      const db = await getDb();
      const visitId = Crypto.randomUUID();
      const now = new Date().toISOString();

      // Find server-side member id
      const member = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM members WHERE local_id = ? OR id = ?",
        [selectedMemberId, selectedMemberId],
      );

      if (!member) throw new Error("Member not found");

      // Save visit
      await db.runAsync(
        `INSERT INTO visits (
          id, local_id, member_id, household_id, visited_at, visit_type,
          symptoms, temperature, muac_mm, muac_status, danger_signs,
          referral_needed, gps_lat, gps_lng, notes,
          weight_kg, height_cm, z_score_wfa, z_score_hfa, z_score_wfh, growth_status,
          synced
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
        [
          visitId,
          visitId,
          member.id,
          selectedHouseholdId || "",
          now,
          visitType,
          symptoms.length > 0 ? JSON.stringify(symptoms) : null,
          temperature ? parseFloat(temperature) : null,
          muacMm ? parseInt(muacMm) : null,
          muacStatus,
          dangerSigns.length > 0 ? JSON.stringify(dangerSigns) : null,
          referralNeeded ? 1 : 0,
          gpsLat,
          gpsLng,
          notes.trim() || null,
          weightKg ? parseFloat(weightKg) : null,
          heightCm ? parseFloat(heightCm) : null,
          growth.zWfa ?? null,
          growth.zHfa ?? null,
          growth.zWfh ?? null,
          growth.status ?? null,
        ],
      );

      // Save drug dispenses and update stock
      const dispensePayloads = [];
      for (const [drugId, qty] of Object.entries(dispensed)) {
        if (qty <= 0) continue;
        const dispenseId = Crypto.randomUUID();
        await db.runAsync(
          `INSERT INTO drug_dispenses (id, local_id, visit_id, member_id, drug_id, quantity_dispensed, dispensed_at, synced)
           VALUES (?,?,?,?,?,?,?,0)`,
          [dispenseId, dispenseId, visitId, member.id, drugId, qty, now],
        );
        await db.runAsync(
          "UPDATE drug_stock SET quantity_current = quantity_current - ?, updated_at = ? WHERE id = ?",
          [qty, now, drugId],
        );
        dispensePayloads.push({ localId: dispenseId, drugId, quantity: qty });
      }

      // Enqueue visit for sync
      const visitPayload: any = {
        localId: visitId,
        memberId: member.id,
        householdId: selectedHouseholdId,
        visitedAt: now,
        visitType,
        symptoms: symptoms.length > 0 ? symptoms : null,
        temperature: temperature ? parseFloat(temperature) : null,
        muacMm: muacMm ? parseInt(muacMm) : null,
        muacStatus,
        dangerSigns: dangerSigns.length > 0 ? dangerSigns : null,
        referralNeeded,
        gpsLat,
        gpsLng,
        notes: notes.trim() || null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        heightCm: heightCm ? parseFloat(heightCm) : null,
        zScoreWfa: growth.zWfa ?? null,
        zScoreHfa: growth.zHfa ?? null,
        zScoreWfh: growth.zWfh ?? null,
        growthStatus: growth.status ?? null,
      };

      // Only add dispenses if there are any
      if (dispensePayloads.length > 0) {
        visitPayload.dispenses = dispensePayloads;
      }

      await enqueue("VISIT", visitPayload);
      await clearDraft(DRAFT_KEY);
      showSuccess("Visit Saved", "Visit recorded successfully.");

      // If referral needed, go straight to referral screen
      if (referralNeeded) {
        // Set both the member AND the visit ID so referral screen has everything
        useAppStore.getState().setSelectedVisit(visitId);
        useAppStore.getState().setSelectedMember(member.id);

        Alert.alert(
          "Visit Saved ✓",
          muacStatus === "SEVERE_MALNUTRITION"
            ? "SEVERE MALNUTRITION detected. Please create a referral immediately."
            : hasDangerSigns
              ? "Danger signs recorded. Please create a referral."
              : "Visit saved. Create a referral?",
          [
            {
              text: "Create Referral",
              style: "destructive",
              onPress: () => router.replace("/(app)/referrals/add" as any),
            },
            { text: "Later", onPress: () => router.back() },
          ],
        );
      } else {
        Alert.alert("Visit Saved ✓", "Visit recorded successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      console.error("Save visit error:", err);
      showError("Save Failed", "Failed to save visit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canGoNext = () => {
    if (step === 0) return selectedMemberId !== "";
    return true;
  };

  const getAge = (m: Member) => {
    if (m.estimated_age) return `${m.estimated_age}y`;
    if (m.date_of_birth) {
      const age = Math.floor(
        (Date.now() - new Date(m.date_of_birth).getTime()) /
          (1000 * 60 * 60 * 24 * 365),
      );
      return `${age}y`;
    }
    return "";
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Record Visit</Text>
          <Text style={styles.headerStep}>{STEPS[step]}</Text>
        </View>
        <Text style={styles.headerStepNum}>
          {step + 1}/{STEPS.length}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / STEPS.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── STEP 0: SELECT PATIENT ───────────────────────────── */}
        {step === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who is being visited?</Text>

            {members.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="people-outline"
                  size={40}
                  color={COLORS.border}
                />
                <Text style={styles.emptyText}>
                  No members in this household
                </Text>
                <TouchableOpacity
                  style={styles.addMemberLink}
                  onPress={() =>
                    router.push("/(app)/households/members/add" as any)
                  }
                >
                  <Text style={styles.addMemberLinkText}>
                    Add a member first
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              members.map((m) => (
                <TouchableOpacity
                  key={m.local_id}
                  style={[
                    styles.memberCard,
                    selectedMemberId === m.local_id &&
                      styles.memberCardSelected,
                  ]}
                  onPress={() => setSelectedMemberId(m.local_id)}
                >
                  <View
                    style={[
                      styles.memberAvatar,
                      {
                        backgroundColor:
                          m.sex === "FEMALE" ? "#FDF2F8" : "#EFF6FF",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        m.sex === "FEMALE" ? "woman-outline" : "man-outline"
                      }
                      size={20}
                      color={m.sex === "FEMALE" ? "#DB2777" : COLORS.secondary}
                    />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.full_name}</Text>
                    <Text style={styles.memberAge}>
                      {m.sex} · {getAge(m)}
                    </Text>
                  </View>
                  {selectedMemberId === m.local_id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              ))
            )}

            <Text style={styles.label}>Visit Type</Text>
            <View style={styles.optionGrid}>
              {VISIT_TYPES.map((v) => (
                <TouchableOpacity
                  key={v.code}
                  style={[
                    styles.option,
                    visitType === v.code && styles.optionSelected,
                  ]}
                  onPress={() => setVisitType(v.code)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      visitType === v.code && styles.optionTextSelected,
                    ]}
                  >
                    {language === "en" ? v.labelEn : v.labelNy}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─── STEP 1: SYMPTOMS ─────────────────────────────────── */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Symptoms</Text>
            <Text style={styles.sectionSub}>Tap all symptoms that apply</Text>

            <View style={styles.symptomGrid}>
              {SYMPTOMS.map((s) => (
                <TouchableOpacity
                  key={s.code}
                  style={[
                    styles.symptomBtn,
                    symptoms.includes(s.code) && styles.symptomBtnSelected,
                  ]}
                  onPress={() => toggleSymptom(s.code)}
                >
                  <Text style={styles.symptomIcon}>
                    {s.code === "FEVER"
                      ? "🌡️"
                      : s.code === "COUGH"
                        ? "😮‍💨"
                        : s.code === "DIARRHOEA"
                          ? "💧"
                          : s.code === "VOMITING"
                            ? "🤢"
                            : s.code === "RASH"
                              ? "🔴"
                              : s.code === "BREATHLESS"
                                ? "😮"
                                : s.code === "CONVULSIONS"
                                  ? "⚡"
                                  : s.code === "SWELLING"
                                    ? "🔵"
                                    : s.code === "UNCONSCIOUS"
                                      ? "😴"
                                      : "🔶"}
                  </Text>
                  <Text
                    style={[
                      styles.symptomLabel,
                      symptoms.includes(s.code) && styles.symptomLabelSelected,
                    ]}
                  >
                    {language === "en" ? s.labelEn : s.labelNy}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: SIZES.xl }]}>
              Danger Signs
            </Text>
            <Text style={styles.sectionSub}>
              These require immediate referral
            </Text>

            {DANGER_SIGNS.map((d) => (
              <TouchableOpacity
                key={d.code}
                style={[
                  styles.dangerSignRow,
                  dangerSigns.includes(d.code) && styles.dangerSignRowSelected,
                ]}
                onPress={() => toggleDangerSign(d.code)}
              >
                <View
                  style={[
                    styles.dangerCheckbox,
                    dangerSigns.includes(d.code) &&
                      styles.dangerCheckboxSelected,
                  ]}
                >
                  {dangerSigns.includes(d.code) && (
                    <Ionicons name="checkmark" size={14} color={COLORS.white} />
                  )}
                </View>
                <Text
                  style={[
                    styles.dangerSignText,
                    dangerSigns.includes(d.code) && {
                      color: COLORS.danger,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {language === "en" ? d.labelEn : d.labelNy}
                </Text>
              </TouchableOpacity>
            ))}

            {hasDangerSigns && (
              <View style={styles.alertBox}>
                <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
                <Text style={styles.alertText}>
                  Danger signs present — referral will be recommended
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ─── STEP 2: MEASUREMENTS ─────────────────────────────── */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Measurements</Text>

            <Text style={styles.label}>Temperature (°C)</Text>
            <TextInput
              style={styles.input}
              value={temperature}
              onChangeText={setTemperature}
              placeholder="e.g. 37.5"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="decimal-pad"
            />
            {temperature && parseFloat(temperature) >= 38 && (
              <Text
                style={{
                  color: COLORS.danger,
                  fontSize: SIZES.fontXs,
                  marginTop: 4,
                }}
              >
                ⚠ Fever detected ({temperature}°C)
              </Text>
            )}
            {/* ── GROWTH MONITORING (under 5 only) ── */}
            {isUnderFive && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: SIZES.xl }]}>
                  Growth Monitoring
                </Text>
                <Text style={styles.sectionSub}>
                  Weight and height for children under 5
                </Text>

                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="e.g. 8.5"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="e.g. 72"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="decimal-pad"
                />

                {growth.status && (
                  <View
                    style={[
                      styles.muacResult,
                      {
                        backgroundColor: growthColor + "18",
                        borderColor: growthColor,
                        marginBottom: SIZES.md,
                      },
                    ]}
                  >
                    <View
                      style={[styles.muacDot, { backgroundColor: growthColor }]}
                    />
                    <View>
                      <Text style={[styles.muacStatus, { color: growthColor }]}>
                        {growth.status === "NORMAL"
                          ? "✓ Normal Growth"
                          : growth.status === "WASTED"
                            ? "⚠ Wasted"
                            : growth.status === "SEVERELY_WASTED"
                              ? "✗ SEVERELY WASTED"
                              : growth.status === "STUNTED"
                                ? "⚠ Stunted"
                                : growth.status === "SEVERELY_STUNTED"
                                  ? "✗ SEVERELY STUNTED"
                                  : "⚠ Underweight"}
                      </Text>
                      <Text style={styles.muacRange}>
                        WFA: {growth.zWfa ?? "—"} | HFA: {growth.zHfa ?? "—"} |
                        WFH: {growth.zWfh ?? "—"}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            <Text style={styles.label}>MUAC (mm) — children under 5 only</Text>
            <TextInput
              style={[
                styles.input,
                muacMm && { borderColor: muacColor, borderWidth: 2 },
              ]}
              value={muacMm}
              onChangeText={setMuacMm}
              placeholder="e.g. 120"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="number-pad"
              maxLength={3}
            />

            {muacStatus && (
              <View
                style={[
                  styles.muacResult,
                  { backgroundColor: muacColor + "18", borderColor: muacColor },
                ]}
              >
                <View
                  style={[styles.muacDot, { backgroundColor: muacColor }]}
                />
                <View>
                  <Text style={[styles.muacStatus, { color: muacColor }]}>
                    {muacStatus === "NORMAL"
                      ? "✓ Normal"
                      : muacStatus === "MODERATE_MALNUTRITION"
                        ? "⚠ Moderate Malnutrition"
                        : "✗ SEVERE MALNUTRITION"}
                  </Text>
                  <Text style={styles.muacRange}>
                    {muacStatus === "NORMAL"
                      ? "≥125mm — Green band"
                      : muacStatus === "MODERATE_MALNUTRITION"
                        ? "115–124mm — Yellow band"
                        : "<115mm — Red band — REFER IMMEDIATELY"}
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.switchRow, { marginTop: SIZES.xl }]}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Referral Needed</Text>
                <Text style={styles.switchSub}>
                  {autoReferral
                    ? "Auto-set due to danger signs or MUAC"
                    : "Set manually if needed"}
                </Text>
              </View>
              <Switch
                value={referralNeeded}
                onValueChange={setReferralNeeded}
                trackColor={{ false: COLORS.border, true: COLORS.dangerLight }}
                thumbColor={referralNeeded ? COLORS.danger : COLORS.textMuted}
              />
            </View>

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[
                styles.input,
                { minHeight: 80, textAlignVertical: "top" },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional observations..."
              placeholderTextColor={COLORS.placeholder}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{notes.length}/500</Text>
          </View>
        )}

        {/* ─── STEP 3: DRUGS ────────────────────────────────────── */}
        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drug Dispensing</Text>
            <Text style={styles.sectionSub}>Leave at 0 if not dispensing</Text>

            {drugs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="flask-outline"
                  size={40}
                  color={COLORS.border}
                />
                <Text style={styles.emptyText}>No drugs in stock</Text>
              </View>
            ) : (
              drugs.map((drug) => (
                <View key={drug.id} style={styles.drugRow}>
                  <View style={styles.drugInfo}>
                    <Text style={styles.drugName}>
                      {language === "en"
                        ? drug.name_english
                        : drug.name_chichewa}
                    </Text>
                    <Text style={styles.drugStock}>
                      Stock: {drug.quantity_current} {drug.unit}
                    </Text>
                  </View>
                  <View style={styles.drugQty}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() =>
                        updateDispensed(drug.id, (dispensed[drug.id] || 0) - 1)
                      }
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={COLORS.primary}
                      />
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{dispensed[drug.id] || 0}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => {
                        const max = drug.quantity_current;
                        const current = dispensed[drug.id] || 0;
                        if (current >= max) {
                          showError(
                            "Stock Limit",
                            `Only ${max} ${drug.unit} available.`,
                          );
                          return;
                        }
                        updateDispensed(drug.id, current + 1);
                      }}
                    >
                      <Ionicons name="add" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── STEP 4: REVIEW ───────────────────────────────────── */}
        {step === 4 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review & Save</Text>

            {/* Alert if danger */}
            {(referralNeeded || autoReferral) && (
              <View style={styles.alertBox}>
                <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
                <Text style={styles.alertText}>
                  This visit requires a referral
                </Text>
              </View>
            )}

            <View style={styles.reviewCard}>
              {[
                {
                  k: "Patient",
                  v:
                    members.find((m) => m.local_id === selectedMemberId)
                      ?.full_name || "-",
                },
                { k: "Visit Type", v: visitType.replace("_", " ") },
                {
                  k: "Symptoms",
                  v:
                    symptoms.length > 0
                      ? `${symptoms.length} symptom(s)`
                      : "None",
                },
                {
                  k: "Danger Signs",
                  v:
                    dangerSigns.length > 0
                      ? `${dangerSigns.length} sign(s)`
                      : "None",
                },
                {
                  k: "Temperature",
                  v: temperature ? `${temperature}°C` : "Not recorded",
                },
                {
                  k: "MUAC",
                  v: muacMm
                    ? `${muacMm}mm — ${muacStatus?.replace("_", " ")}`
                    : "Not measured",
                },
                ...(isUnderFive
                  ? [
                      {
                        k: "Growth",
                        v: growth.status
                          ? `${growth.status.replace(/_/g, " ")} (W:${weightKg}kg H:${heightCm}cm)`
                          : "Not measured",
                      },
                    ]
                  : []),
                { k: "Referral", v: referralNeeded ? "YES — Required" : "No" },
                {
                  k: "Drugs dispensed",
                  v:
                    Object.values(dispensed).filter((q) => q > 0).length > 0
                      ? `${Object.values(dispensed).filter((q) => q > 0).length} drug(s)`
                      : "None",
                },
                {
                  k: "GPS",
                  v: gpsLat
                    ? `${gpsLat.toFixed(4)}, ${gpsLng?.toFixed(4)}`
                    : "Not captured",
                },
              ].map((row) => (
                <View key={row.k} style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>{row.k}</Text>
                  <Text
                    style={[
                      styles.reviewVal,
                      row.k === "Referral" &&
                        referralNeeded && {
                          color: COLORS.danger,
                          fontWeight: "bold",
                        },
                      row.k === "MUAC" &&
                        muacStatus === "SEVERE_MALNUTRITION" && {
                          color: COLORS.danger,
                        },
                    ]}
                  >
                    {row.v}
                  </Text>
                </View>
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
                    name="checkmark-circle-outline"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.saveBtnText}>Save Visit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom nav */}
      {step < 4 && (
        <View style={styles.bottomNav}>
          {step > 0 && (
            <TouchableOpacity
              style={styles.prevBtn}
              onPress={() => setStep((s) => s - 1)}
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
              <Text style={styles.prevBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canGoNext() && styles.nextBtnDisabled]}
            onPress={() => canGoNext() && setStep((s) => s + 1)}
            disabled={!canGoNext()}
          >
            <Text style={styles.nextBtnText}>
              {step === 3 ? "Review" : "Next"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    paddingHorizontal: SIZES.xl,
    gap: SIZES.md,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
  },
  headerStep: { color: "rgba(255,255,255,0.8)", fontSize: SIZES.fontXs },
  headerStepNum: { color: "rgba(255,255,255,0.8)", fontSize: SIZES.fontSm },
  progressBar: { height: 4, backgroundColor: COLORS.border },
  progressFill: { height: 4, backgroundColor: COLORS.primary },
  scroll: { flex: 1 },
  section: { padding: SIZES.lg },
  sectionTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
  },
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
  charCount: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 4,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  memberCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primaryLight,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: SIZES.fontMd, fontWeight: "600", color: COLORS.text },
  memberAge: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
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
  symptomGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  symptomBtn: {
    width: "30%",
    alignItems: "center",
    padding: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  symptomBtnSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  symptomIcon: { fontSize: 24, marginBottom: 4 },
  symptomLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  symptomLabelSelected: { color: COLORS.primary, fontWeight: "600" },
  dangerSignRow: {
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
  dangerSignRowSelected: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  dangerCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerCheckboxSelected: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  dangerSignText: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.text },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginTop: SIZES.md,
  },
  alertText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    color: COLORS.danger,
    fontWeight: "600",
  },
  muacResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    marginTop: SIZES.sm,
  },
  muacDot: { width: 12, height: 12, borderRadius: 6 },
  muacStatus: { fontSize: SIZES.fontMd, fontWeight: "bold" },
  muacRange: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchInfo: { flex: 1, marginRight: SIZES.md },
  switchLabel: {
    fontSize: SIZES.fontMd,
    fontWeight: "600",
    color: COLORS.text,
  },
  switchSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  drugRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  drugInfo: { flex: 1 },
  drugName: { fontSize: SIZES.fontMd, fontWeight: "600", color: COLORS.text },
  drugStock: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  drugQty: { flexDirection: "row", alignItems: "center", gap: SIZES.md },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyNum: {
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
    color: COLORS.text,
    minWidth: 24,
    textAlign: "center",
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.lg,
    ...SHADOWS.sm,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reviewKey: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, flex: 1 },
  reviewVal: {
    fontSize: SIZES.fontSm,
    fontWeight: "500",
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: SIZES.fontMd,
  },
  emptyBox: { alignItems: "center", padding: SIZES.xxxl, gap: SIZES.sm },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontSm },
  addMemberLink: { marginTop: SIZES.sm },
  addMemberLinkText: { color: COLORS.primary, fontWeight: "600" },
  bottomNav: {
    flexDirection: "row",
    gap: SIZES.md,
    padding: SIZES.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  prevBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  prevBtnText: { color: COLORS.primary, fontWeight: "600" },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
  },
  nextBtnDisabled: { backgroundColor: COLORS.disabled },
  nextBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: SIZES.fontMd,
  },
});
