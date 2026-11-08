import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { SYMPTOMS, DANGER_SIGNS } from "../../../constants/diseases";

interface Visit {
  id: string;
  local_id: string;
  member_id: string;
  household_id: string;
  visited_at: string;
  visit_type: string;
  symptoms: string;
  temperature: number;
  muac_mm: number;
  muac_status: string;
  danger_signs: string;
  referral_needed: number;
  gps_lat: number;
  gps_lng: number;
  notes: string;
  synced: number;
}

interface Member {
  full_name: string;
  sex: string;
}

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const db = await getDb();
        const v = await db.getFirstAsync<Visit>(
          "SELECT * FROM visits WHERE id = ? OR local_id = ?",
          [id, id],
        );
        if (!v) return;
        setVisit(v);
        const m = await db.getFirstAsync<Member>(
          "SELECT full_name, sex FROM members WHERE id = ?",
          [v.member_id],
        );
        setMember(m);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const parseJson = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  };

  const muacColor = !visit?.muac_status
    ? COLORS.textMuted
    : visit.muac_status === "NORMAL"
      ? COLORS.success
      : visit.muac_status === "MODERATE_MALNUTRITION"
        ? COLORS.warning
        : COLORS.danger;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading)
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.textMuted }}>Loading...</Text>
      </View>
    );
  if (!visit)
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.textMuted }}>Visit not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: COLORS.primary, marginTop: SIZES.md }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );

  const symptomsArr: string[] = parseJson(visit.symptoms);
  const dangerArr: string[] = parseJson(visit.danger_signs);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Visit Record</Text>
          <Text style={styles.headerSub}>{member?.full_name || "Unknown"}</Text>
        </View>
        <View
          style={[
            styles.syncDot,
            { backgroundColor: visit.synced ? COLORS.success : COLORS.warning },
          ]}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Referral alert */}
          {visit.referral_needed ? (
            <View style={styles.referralAlert}>
              <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
              <Text style={styles.referralAlertText}>
                Referral was required for this visit
              </Text>
            </View>
          ) : null}

          {/* Basic info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Visit Information</Text>
            {[
              { k: "Patient", v: member?.full_name || "Unknown" },
              { k: "Date & Time", v: formatDate(visit.visited_at) },
              { k: "Visit Type", v: visit.visit_type.replace("_", " ") },
              {
                k: "Sync Status",
                v: visit.synced ? "Synced ✓" : "Pending sync",
              },
              {
                k: "GPS",
                v: visit.gps_lat
                  ? `${visit.gps_lat.toFixed(4)}, ${visit.gps_lng?.toFixed(4)}`
                  : "Not captured",
              },
            ].map((r) => (
              <View key={r.k} style={styles.row}>
                <Text style={styles.rowKey}>{r.k}</Text>
                <Text style={styles.rowVal}>{r.v}</Text>
              </View>
            ))}
          </View>

          {/* Measurements */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Measurements</Text>
            <View style={styles.measureRow}>
              <View style={styles.measureBox}>
                <Text style={styles.measureLabel}>Temperature</Text>
                <Text
                  style={[
                    styles.measureVal,
                    {
                      color:
                        visit.temperature >= 38 ? COLORS.danger : COLORS.text,
                    },
                  ]}
                >
                  {visit.temperature ? `${visit.temperature}°C` : "—"}
                </Text>
              </View>
              <View style={[styles.measureBox, { borderColor: muacColor }]}>
                <Text style={styles.measureLabel}>MUAC</Text>
                <Text style={[styles.measureVal, { color: muacColor }]}>
                  {visit.muac_mm ? `${visit.muac_mm}mm` : "—"}
                </Text>
                {visit.muac_status && (
                  <Text style={[styles.measureStatus, { color: muacColor }]}>
                    {visit.muac_status.replace("_", " ")}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Symptoms */}
          {symptomsArr.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Symptoms ({symptomsArr.length})
              </Text>
              <View style={styles.tagWrap}>
                {symptomsArr.map((code) => {
                  const s = SYMPTOMS.find((x) => x.code === code);
                  return (
                    <View key={code} style={styles.symptomTag}>
                      <Text style={styles.symptomTagText}>
                        {s?.labelEn || code}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Danger signs */}
          {dangerArr.length > 0 && (
            <View style={[styles.card, { borderColor: COLORS.danger }]}>
              <Text style={[styles.cardTitle, { color: COLORS.danger }]}>
                ⚠ Danger Signs ({dangerArr.length})
              </Text>
              {dangerArr.map((code) => {
                const d = DANGER_SIGNS.find((x) => x.code === code);
                return (
                  <View key={code} style={styles.dangerItem}>
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color={COLORS.danger}
                    />
                    <Text style={styles.dangerItemText}>
                      {d?.labelEn || code}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Notes */}
          {visit.notes ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Notes</Text>
              <Text style={styles.notesText}>{visit.notes}</Text>
            </View>
          ) : null}
        </View>
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
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
  },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: SIZES.fontXs },
  syncDot: { width: 10, height: 10, borderRadius: 5 },
  content: { padding: SIZES.lg, gap: SIZES.md },
  referralAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  referralAlertText: {
    color: COLORS.danger,
    fontWeight: "600",
    fontSize: SIZES.fontSm,
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowKey: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  rowVal: { fontSize: SIZES.fontSm, fontWeight: "500", color: COLORS.text },
  measureRow: { flexDirection: "row", gap: SIZES.md },
  measureBox: {
    flex: 1,
    alignItems: "center",
    padding: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  measureLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  measureVal: {
    fontSize: SIZES.fontXxl,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 4,
  },
  measureStatus: { fontSize: 10, marginTop: 4, textAlign: "center" },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  symptomTag: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  symptomTagText: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    fontWeight: "600",
  },
  dangerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  dangerItemText: { fontSize: SIZES.fontSm, color: COLORS.danger },
  notesText: { fontSize: SIZES.fontSm, color: COLORS.text, lineHeight: 22 },
});
