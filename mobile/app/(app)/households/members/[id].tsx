import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../../constants/theme";
import { getDb } from "../../../../src/db/schema";
import { useAppStore } from "../../../../src/store";

interface Member {
  id: string;
  local_id: string;
  household_id: string;
  full_name: string;
  sex: string;
  date_of_birth: string;
  estimated_age: number;
  relationship_to_head: string;
  is_pregnant: number;
  lmp_date: string;
  expected_delivery_date: string;
  chronic_illnesses: string;
  has_disability: number;
  disability_type: string;
  phone: string;
  status: string;
  synced: number;
}

interface Visit {
  id: string;
  visited_at: string;
  visit_type: string;
  muac_mm: number;
  muac_status: string;
  referral_needed: number;
  symptoms: string;
}

interface ImmunisationSchedule {
  id: string;
  vaccine_code: string;
  dose_number: number;
  due_date: string;
  status: string;
  given_at: string;
}

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const language = useAppStore((s) => s.language);
  const setSelectedMember = useAppStore((s) => s.setSelectedMember);
  const setSelectedHousehold = useAppStore((s) => s.setSelectedHousehold);

  const [member, setMember] = useState<Member | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [schedules, setSchedules] = useState<ImmunisationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "visits" | "vaccines"
  >("overview");

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const m = await db.getFirstAsync<Member>(
        "SELECT * FROM members WHERE local_id = ? OR id = ?",
        [id, id],
      );
      if (!m) return;
      setMember(m);

      const vis = await db.getAllAsync<Visit>(
        `SELECT * FROM visits WHERE member_id = ? ORDER BY visited_at DESC LIMIT 20`,
        [m.id],
      );
      setVisits(vis);

      const sched = await db.getAllAsync<ImmunisationSchedule>(
        `SELECT * FROM immunisation_schedules WHERE member_id = ? ORDER BY due_date ASC`,
        [m.id],
      );
      setSchedules(sched);
    } catch (err) {
      console.error("Load member error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const getAge = () => {
    if (!member) return "";
    if (member.estimated_age) return `${member.estimated_age} years`;
    if (member.date_of_birth) {
      const age = Math.floor(
        (Date.now() - new Date(member.date_of_birth).getTime()) /
          (1000 * 60 * 60 * 24 * 365),
      );
      return `${age} years`;
    }
    return "Unknown age";
  };

  const isUnder5 = () => {
    if (!member) return false;
    const age =
      member.estimated_age ||
      (member.date_of_birth
        ? Math.floor(
            (Date.now() - new Date(member.date_of_birth).getTime()) /
              (1000 * 60 * 60 * 24 * 365),
          )
        : 99);
    return age < 5;
  };

  const formatDate = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "N/A";

  const chronicList = () => {
    if (!member?.chronic_illnesses) return "None";
    try {
      const arr = JSON.parse(member.chronic_illnesses);
      return arr.join(", ");
    } catch {
      return member.chronic_illnesses;
    }
  };

  const vaccinesDue = schedules.filter(
    (s) => s.status === "DUE" || s.status === "OVERDUE",
  ).length;
  const vaccinesGiven = schedules.filter((s) => s.status === "GIVEN").length;

  const statusColor = (s: string) =>
    s === "GIVEN"
      ? COLORS.success
      : s === "OVERDUE"
        ? COLORS.danger
        : s === "DUE"
          ? COLORS.warning
          : COLORS.textMuted;

  if (loading)
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.textMuted }}>Loading...</Text>
      </View>
    );

  if (!member)
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color={COLORS.border} />
        <Text style={{ color: COLORS.textMuted, marginTop: SIZES.md }}>
          Member not found
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: COLORS.primary, marginTop: SIZES.sm }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{member.full_name}</Text>
          <Text style={styles.headerSub}>
            {getAge()} · {member.sex}
          </Text>
        </View>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor:
                member.sex === "FEMALE" ? "#DB2777" : COLORS.secondary,
            },
          ]}
        >
          <Ionicons
            name={member.sex === "FEMALE" ? "woman" : "man"}
            size={18}
            color={COLORS.white}
          />
        </View>
      </View>

      {/* Alert badges */}
      {(member.is_pregnant === 1 || vaccinesDue > 0) && (
        <View style={styles.alertStrip}>
          {member.is_pregnant === 1 && (
            <View
              style={[
                styles.alertBadge,
                { backgroundColor: "#FDF2F8", borderColor: "#DB2777" },
              ]}
            >
              <Ionicons name="heart" size={12} color="#DB2777" />
              <Text style={[styles.alertBadgeText, { color: "#DB2777" }]}>
                Pregnant
              </Text>
            </View>
          )}
          {vaccinesDue > 0 && (
            <View
              style={[
                styles.alertBadge,
                {
                  backgroundColor: COLORS.warningLight,
                  borderColor: COLORS.warning,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={12}
                color={COLORS.warning}
              />
              <Text style={[styles.alertBadgeText, { color: COLORS.amber }]}>
                {vaccinesDue} vaccine{vaccinesDue > 1 ? "s" : ""} due
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.qAction}
          onPress={() => {
            setSelectedHousehold(member.household_id);
            setSelectedMember(member.id);
            router.push("/(app)/visits/add" as any);
          }}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.qActionText}>Record Visit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.qAction}
          onPress={() => {
            setSelectedMember(member.id);
            router.push("/(app)/referrals/add" as any);
          }}
        >
          <Ionicons name="medical-outline" size={20} color={COLORS.danger} />
          <Text style={[styles.qActionText, { color: COLORS.danger }]}>
            Refer
          </Text>
        </TouchableOpacity>
        {isUnder5() && (
          <TouchableOpacity
            style={styles.qAction}
            onPress={() => router.push("/(app)/immunisations/index" as any)}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#7C3AED"
            />
            <Text style={[styles.qActionText, { color: "#7C3AED" }]}>
              Vaccines
            </Text>
          </TouchableOpacity>
        )}
        {member.is_pregnant === 1 && (
          <TouchableOpacity
            style={styles.qAction}
            onPress={() => router.push("/(app)/anc/index" as any)}
          >
            <Ionicons name="heart-outline" size={20} color="#DB2777" />
            <Text style={[styles.qActionText, { color: "#DB2777" }]}>ANC</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["overview", "visits", "vaccines"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text
              style={[styles.tabText, activeTab === t && styles.tabTextActive]}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "visits" && ` (${visits.length})`}
              {t === "vaccines" &&
                schedules.length > 0 &&
                ` (${vaccinesGiven}/${schedules.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
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
      >
        {/* Overview tab */}
        {activeTab === "overview" && (
          <View style={styles.tabContent}>
            {[
              { k: "Full Name", v: member.full_name },
              { k: "Sex", v: member.sex },
              { k: "Age", v: getAge() },
              {
                k: "Date of Birth",
                v: member.date_of_birth
                  ? formatDate(member.date_of_birth)
                  : "Not recorded",
              },
              {
                k: "Relationship",
                v: member.relationship_to_head.replace("_", " "),
              },
              { k: "Pregnant", v: member.is_pregnant ? "Yes" : "No" },
              {
                k: "Expected Delivery",
                v: member.expected_delivery_date
                  ? formatDate(member.expected_delivery_date)
                  : "N/A",
              },
              { k: "Chronic Illnesses", v: chronicList() },
              {
                k: "Disability",
                v: member.has_disability
                  ? member.disability_type || "Yes"
                  : "No",
              },
              { k: "Phone", v: member.phone || "Not provided" },
              { k: "Status", v: member.status },
              { k: "Sync", v: member.synced ? "Synced ✓" : "Pending sync" },
            ].map((row) => (
              <View key={row.k} style={styles.detailRow}>
                <Text style={styles.detailKey}>{row.k}</Text>
                <Text style={styles.detailVal}>{row.v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Visits tab */}
        {activeTab === "visits" && (
          <View style={styles.tabContent}>
            {visits.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="calendar-outline"
                  size={40}
                  color={COLORS.border}
                />
                <Text style={styles.emptyText}>No visits recorded</Text>
              </View>
            ) : (
              visits.map((v, i) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.visitCard}
                  onPress={() => router.push(`/(app)/visits/${v.id}` as any)}
                >
                  <View
                    style={[
                      styles.visitDot,
                      {
                        backgroundColor: v.referral_needed
                          ? COLORS.danger
                          : COLORS.success,
                      },
                    ]}
                  />
                  <View style={styles.visitInfo}>
                    <Text style={styles.visitDate}>
                      {formatDate(v.visited_at)}
                    </Text>
                    <Text style={styles.visitType}>
                      {v.visit_type.replace("_", " ")}
                    </Text>
                    {v.muac_mm && (
                      <Text
                        style={{
                          fontSize: SIZES.fontXs,
                          color:
                            v.muac_status === "SEVERE_MALNUTRITION"
                              ? COLORS.danger
                              : COLORS.textMuted,
                        }}
                      >
                        MUAC: {v.muac_mm}mm
                      </Text>
                    )}
                  </View>
                  <View style={styles.visitRight}>
                    {v.referral_needed ? (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: COLORS.dangerLight },
                        ]}
                      >
                        <Text
                          style={[styles.badgeText, { color: COLORS.danger }]}
                        >
                          Referred
                        </Text>
                      </View>
                    ) : null}
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.textMuted}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Vaccines tab */}
        {activeTab === "vaccines" && (
          <View style={styles.tabContent}>
            {schedules.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="shield-outline"
                  size={40}
                  color={COLORS.border}
                />
                <Text style={styles.emptyText}>No vaccine schedule</Text>
                <Text style={styles.emptySubText}>
                  Only available for children under 5
                </Text>
              </View>
            ) : (
              <>
                {/* Summary */}
                <View style={styles.vaccineSummary}>
                  <View style={styles.vaccineCount}>
                    <Text
                      style={[
                        styles.vaccineCountNum,
                        { color: COLORS.success },
                      ]}
                    >
                      {vaccinesGiven}
                    </Text>
                    <Text style={styles.vaccineCountLabel}>Given</Text>
                  </View>
                  <View style={styles.vaccineCount}>
                    <Text
                      style={[
                        styles.vaccineCountNum,
                        { color: COLORS.warning },
                      ]}
                    >
                      {schedules.filter((s) => s.status === "DUE").length}
                    </Text>
                    <Text style={styles.vaccineCountLabel}>Due</Text>
                  </View>
                  <View style={styles.vaccineCount}>
                    <Text
                      style={[styles.vaccineCountNum, { color: COLORS.danger }]}
                    >
                      {schedules.filter((s) => s.status === "OVERDUE").length}
                    </Text>
                    <Text style={styles.vaccineCountLabel}>Overdue</Text>
                  </View>
                </View>

                {schedules.map((s) => (
                  <View
                    key={s.id}
                    style={[
                      styles.vaccineRow,
                      { borderLeftColor: statusColor(s.status) },
                    ]}
                  >
                    <View style={styles.vaccineInfo}>
                      <Text style={styles.vaccineName}>
                        {s.vaccine_code} — Dose {s.dose_number}
                      </Text>
                      <Text style={styles.vaccineDate}>
                        {s.status === "GIVEN"
                          ? `Given: ${formatDate(s.given_at)}`
                          : `Due: ${formatDate(s.due_date)}`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: statusColor(s.status) + "18",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: statusColor(s.status) },
                        ]}
                      >
                        {s.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  headerName: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
  },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: SIZES.fontXs },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  alertStrip: {
    flexDirection: "row",
    gap: 8,
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
  },
  alertBadgeText: { fontSize: SIZES.fontXs, fontWeight: "600" },
  quickActions: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  qAction: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SIZES.md,
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  qActionText: { fontSize: 11, fontWeight: "600", color: COLORS.primary },
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
  tabContent: { padding: SIZES.lg },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailKey: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, flex: 1 },
  detailVal: {
    fontSize: SIZES.fontSm,
    fontWeight: "500",
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
    textTransform: "capitalize",
  },
  visitCard: {
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
  visitDot: { width: 10, height: 10, borderRadius: 5 },
  visitInfo: { flex: 1 },
  visitDate: { fontSize: SIZES.fontSm, fontWeight: "600", color: COLORS.text },
  visitType: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    textTransform: "capitalize",
  },
  visitRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radiusFull,
  },
  badgeText: { fontSize: 10, fontWeight: "600" },
  emptyBox: {
    alignItems: "center",
    paddingVertical: SIZES.xxxl,
    gap: SIZES.sm,
  },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.fontSm },
  emptySubText: { color: COLORS.textMuted, fontSize: SIZES.fontXs },
  vaccineSummary: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vaccineCount: { flex: 1, alignItems: "center" },
  vaccineCountNum: { fontSize: SIZES.fontXxl, fontWeight: "bold" },
  vaccineCountLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  vaccineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  vaccineInfo: { flex: 1 },
  vaccineName: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
  },
  vaccineDate: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
