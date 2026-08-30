import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { enqueue } from "../../../src/db/sync-queue";
import { useAppStore } from "../../../src/store";

interface FpRecord {
  id: string;
  member_id: string;
  full_name: string;
  household_number: string;
  village_name: string;
  method: string;
  visit_date: string;
  next_follow_up_date: string | null;
  referral_needed: number;
}

const FP_METHODS = [
  { value: "CONDOM", label: "Condoms", icon: "shield-outline", needsQty: true },
  {
    value: "ORAL_CONTRACEPTIVE",
    label: "Oral Pills",
    icon: "medical-outline",
    needsQty: true,
  },
  {
    value: "INJECTABLE",
    label: "Injectable",
    icon: "fitness-outline",
    needsQty: false,
  },
  {
    value: "IMPLANT",
    label: "Implant",
    icon: "git-branch-outline",
    needsQty: false,
    needsReferral: true,
  },
  {
    value: "IUD",
    label: "IUD",
    icon: "radio-button-on-outline",
    needsQty: false,
    needsReferral: true,
  },
  {
    value: "STERILISATION",
    label: "Sterilisation",
    icon: "cut-outline",
    needsQty: false,
    needsReferral: true,
  },
  {
    value: "NATURAL_FAMILY_PLANNING",
    label: "NFP",
    icon: "calendar-outline",
    needsQty: false,
  },
  {
    value: "OTHER",
    label: "Other",
    icon: "ellipsis-horizontal-outline",
    needsQty: false,
  },
];

const SIDE_EFFECTS_LIST = [
  "Nausea",
  "Headache",
  "Weight gain",
  "Irregular bleeding",
  "Mood changes",
  "Breast tenderness",
  "Reduced libido",
];

export default function FpScreen() {
  const user = useAppStore((s) => s.user);
  const [records, setRecords] = useState<FpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"follow-ups" | "history">("follow-ups");

  // Form state
  const [memberId, setMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [quantity, setQuantity] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [sideEffects, setSideEffects] = useState<string[]>([]);
  const [referralNeeded, setReferralNeeded] = useState(false);
  const [counsellingGiven, setCounsellingGiven] = useState(true);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const uid = user?.id || "";
      const now = new Date().toISOString();

      const rows = await db.getAllAsync<FpRecord>(
        tab === "follow-ups"
          ? `SELECT f.*, m.full_name, h.household_number, h.village_name
             FROM fp_visits f
             LEFT JOIN members m ON m.id = f.member_id
             LEFT JOIN households h ON h.id = m.household_id
             WHERE h.registered_by_user_id = ?
               AND f.next_follow_up_date <= ?
             ORDER BY f.next_follow_up_date ASC`
          : `SELECT f.*, m.full_name, h.household_number, h.village_name
             FROM fp_visits f
             LEFT JOIN members m ON m.id = f.member_id
             LEFT JOIN households h ON h.id = m.household_id
             WHERE h.registered_by_user_id = ?
             ORDER BY f.visit_date DESC
             LIMIT 100`,
        tab === "follow-ups" ? [uid, now] : [uid],
      );
      setRecords(rows);
    } catch (err) {
      console.error("[FP] Load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const searchMembers = async (q: string) => {
    if (q.length < 2) {
      setMemberResults([]);
      return;
    }
    const db = await getDb();
    const uid = user?.id || "";
    const rows = await db.getAllAsync<any>(
      `SELECT m.id, m.full_name, m.sex, h.household_number
       FROM members m
       LEFT JOIN households h ON h.id = m.household_id
       WHERE m.full_name LIKE ?
         AND h.registered_by_user_id = ?
         AND m.status = 'ACTIVE'
       LIMIT 10`,
      [`%${q}%`, uid],
    );
    setMemberResults(rows);
  };

  const toggleSideEffect = (e: string) =>
    setSideEffects((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );

  const selectedMethodObj = FP_METHODS.find((m) => m.value === selectedMethod);

  const handleSave = async () => {
    if (!memberId || !selectedMethod) {
      Alert.alert("Required", "Please select a member and a method.");
      return;
    }
    setSaving(true);
    try {
      const db = await getDb();
      const localId = Crypto.randomUUID();
      const now = new Date().toISOString();
      const followUpDate = nextFollowUp
        ? new Date(nextFollowUp).toISOString()
        : null;

      await db.runAsync(
        `INSERT INTO fp_visits (
          id, local_id, member_id, visited_by_id, visit_date,
          method, quantity_given, next_follow_up_date,
          side_effects, referral_needed, counselling_given, notes, synced
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)`,
        [
          localId,
          localId,
          memberId,
          user?.id ?? "local",
          now,
          selectedMethod,
          quantity ? parseInt(quantity) : null,
          followUpDate,
          sideEffects.length ? JSON.stringify(sideEffects) : null,
          referralNeeded ? 1 : 0,
          counsellingGiven ? 1 : 0,
          notes || null,
        ],
      );

      await enqueue("FP_VISIT", {
        localId,
        memberId,
        visitDate: now,
        method: selectedMethod,
        quantityGiven: quantity ? parseInt(quantity) : null,
        nextFollowUpDate: followUpDate,
        sideEffects: sideEffects.length ? sideEffects : null,
        referralNeeded,
        counsellingGiven,
        notes: notes || null,
      });

      Alert.alert("Saved", "Family planning visit recorded.", [
        {
          text: "OK",
          onPress: () => {
            setShowForm(false);
            resetForm();
            load();
          },
        },
      ]);
    } catch (e) {
      console.error("[FP] Save error:", e);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setMemberId("");
    setMemberSearch("");
    setMemberResults([]);
    setSelectedMethod("");
    setQuantity("");
    setNextFollowUp("");
    setSideEffects([]);
    setReferralNeeded(false);
    setCounsellingGiven(true);
    setNotes("");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const daysOverdue = (d: string) => {
    const diff = Math.floor(
      (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff > 0 ? `${diff}d overdue` : "Due today";
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Planning</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <Ionicons name="add-circle-outline" size={26} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["follow-ups", "history"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => {
              setTab(t);
              setLoading(true);
            }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "follow-ups" ? "Follow-ups Due" : "Visit History"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="heart-circle-outline"
              size={60}
              color={COLORS.border}
            />
            <Text style={styles.emptyTitle}>
              {tab === "follow-ups"
                ? "No follow-ups due"
                : "No FP visits recorded"}
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.addBtnText}>+ Record FP Visit</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              item.referral_needed === 1 && styles.cardReferral,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.methodBadge}>
                <Ionicons
                  name={
                    (FP_METHODS.find((m) => m.value === item.method)?.icon ??
                      "ellipse-outline") as any
                  }
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.methodText}>
                  {FP_METHODS.find((m) => m.value === item.method)?.label ??
                    item.method}
                </Text>
              </View>
              {item.referral_needed === 1 && (
                <View style={styles.referralBadge}>
                  <Text style={styles.referralText}>Referral</Text>
                </View>
              )}
            </View>
            <Text style={styles.memberName}>{item.full_name}</Text>
            <Text style={styles.hhInfo}>
              {item.household_number} · {item.village_name}
            </Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>
                Visited: {formatDate(item.visit_date)}
              </Text>
              {item.next_follow_up_date && tab === "follow-ups" && (
                <Text style={styles.overdueText}>
                  {daysOverdue(item.next_follow_up_date)}
                </Text>
              )}
              {item.next_follow_up_date && tab === "history" && (
                <Text style={styles.followUpText}>
                  Follow-up: {formatDate(item.next_follow_up_date)}
                </Text>
              )}
            </View>
          </View>
        )}
      />

      {/* Record FP Visit Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Record FP Visit</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Member search */}
            <Text style={styles.label}>Search Member</Text>
            <TextInput
              style={styles.input}
              value={memberSearch}
              onChangeText={(v) => {
                setMemberSearch(v);
                searchMembers(v);
              }}
              placeholder="Type member name..."
              placeholderTextColor={COLORS.placeholder}
            />
            {memberResults.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.memberResult,
                  memberId === m.id && styles.memberResultSelected,
                ]}
                onPress={() => {
                  setMemberId(m.id);
                  setMemberSearch(m.full_name);
                  setMemberResults([]);
                }}
              >
                <Text style={styles.memberResultName}>{m.full_name}</Text>
                <Text style={styles.memberResultSub}>
                  {m.sex} · {m.household_number}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Method */}
            <Text style={styles.label}>Method Provided</Text>
            <View style={styles.methodGrid}>
              {FP_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.methodChip,
                    selectedMethod === m.value && styles.methodChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedMethod(m.value);
                    if (m.needsReferral) setReferralNeeded(true);
                  }}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={18}
                    color={
                      selectedMethod === m.value ? COLORS.white : COLORS.primary
                    }
                  />
                  <Text
                    style={[
                      styles.methodChipText,
                      selectedMethod === m.value &&
                        styles.methodChipTextSelected,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Referral notice for long-term methods */}
            {selectedMethodObj?.needsReferral && (
              <View style={styles.referralNotice}>
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={COLORS.warning}
                />
                <Text style={styles.referralNoticeText}>
                  This method requires referral to a nurse or clinic for
                  insertion/procedure.
                </Text>
              </View>
            )}

            {/* Quantity */}
            {selectedMethodObj?.needsQty && (
              <>
                <Text style={styles.label}>Quantity Given</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholder="e.g. 12"
                  placeholderTextColor={COLORS.placeholder}
                />
              </>
            )}

            {/* Next follow-up */}
            <Text style={styles.label}>Next Follow-up Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={nextFollowUp}
              onChangeText={setNextFollowUp}
              placeholder="e.g. 2026-09-15"
              placeholderTextColor={COLORS.placeholder}
            />

            {/* Side effects */}
            <Text style={styles.label}>Side Effects Reported</Text>
            <View style={styles.chipGrid}>
              {SIDE_EFFECTS_LIST.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[
                    styles.chip,
                    sideEffects.includes(e) && styles.chipSelected,
                  ]}
                  onPress={() => toggleSideEffect(e)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sideEffects.includes(e) && styles.chipTextSelected,
                    ]}
                  >
                    {e}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Counselling + Referral */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Counselling Given</Text>
              <Switch
                value={counsellingGiven}
                onValueChange={setCounsellingGiven}
                trackColor={{ true: COLORS.primary }}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Referral Needed</Text>
              <Switch
                value={referralNeeded}
                onValueChange={setReferralNeeded}
                trackColor={{ true: COLORS.danger }}
              />
            </View>

            {/* Notes */}
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Any observations..."
              placeholderTextColor={COLORS.placeholder}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save FP Visit</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
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
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: SIZES.md, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: "600" },
  list: { padding: SIZES.lg, gap: SIZES.md },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardReferral: { borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  methodText: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    fontWeight: "600",
  },
  referralBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
  },
  referralText: { fontSize: 10, color: COLORS.warning, fontWeight: "600" },
  memberName: { fontSize: SIZES.fontMd, fontWeight: "600", color: COLORS.text },
  hhInfo: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginBottom: 6 },
  dateRow: { flexDirection: "row", justifyContent: "space-between" },
  dateLabel: { fontSize: SIZES.fontXs, color: COLORS.textSecondary },
  overdueText: {
    fontSize: SIZES.fontXs,
    color: COLORS.danger,
    fontWeight: "600",
  },
  followUpText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: SIZES.sm,
    paddingHorizontal: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  addBtn: {
    marginTop: SIZES.md,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
  },
  addBtnText: { color: COLORS.white, fontWeight: "600" },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: SIZES.lg,
    paddingHorizontal: SIZES.xl,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
  },
  modalBody: { flex: 1, padding: SIZES.lg },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SIZES.lg,
    marginBottom: 8,
  },
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
  memberResult: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    marginTop: 4,
  },
  memberResultSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  memberResultName: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
  },
  memberResultSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  methodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.white,
  },
  methodChipSelected: { backgroundColor: COLORS.primary },
  methodChipText: { fontSize: SIZES.fontSm, color: COLORS.primary },
  methodChipTextSelected: { color: COLORS.white, fontWeight: "600" },
  referralNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.warningLight,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    marginTop: SIZES.sm,
  },
  referralNoticeText: {
    flex: 1,
    fontSize: SIZES.fontXs,
    color: COLORS.warning,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
  },
  chipSelected: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  chipText: { fontSize: SIZES.fontXs, color: COLORS.text },
  chipTextSelected: { color: COLORS.white, fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchLabel: { fontSize: SIZES.fontMd, color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    alignItems: "center",
    marginTop: SIZES.xl,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    fontWeight: "700",
  },
});
