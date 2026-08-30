import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { useAppStore } from "../../../src/store";
import api from "../../../src/services/api";
import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";

interface Household {
  id: string;
  local_id: string;
  household_number: string;
  head_of_household_name: string;
  head_phone: string;
  village_name: string;
  zone_name: string;
  structure_type: string;
  water_source: string;
  latrine_present: number;
  handwashing_facility: number;
  distance_to_facility: string;
  mosquito_nets: string;
  number_of_rooms: number;
  landmark: string;
  gps_lat: number;
  gps_lng: number;
  status: string;
  synced: number;
}

interface Member {
  id: string;
  local_id: string;
  full_name: string;
  sex: string;
  date_of_birth: string;
  estimated_age: number;
  relationship_to_head: string;
  is_pregnant: number;
  has_disability: number;
  status: string;
}

interface Visit {
  id: string;
  visited_at: string;
  visit_type: string;
  referral_needed: number;
  muac_status: string;
}

export default function HouseholdDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const language = useAppStore((s) => s.language);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [lastVisit, setLastVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "visits" | "details">(
    "members",
  );
  const [visits, setVisits] = useState<Visit[]>([]);
  const [showRelocateModal, setShowRelocateModal] = useState(false);
  const [relocating, setRelocating] = useState(false);
  const [showWashModal, setShowWashModal] = useState(false);
  const [washSaving, setWashSaving] = useState(false);
  const [washLatrine, setWashLatrine] = useState<string>("NO");
  const [washHandwashing, setWashHandwashing] = useState<string>("NO");
  const [washWaterSource, setWashWaterSource] = useState<string>("BOREHOLE");

  const load = useCallback(async () => {
    try {
      const db = await getDb();

      // Load household — search by local_id or id
      const hh = await db.getFirstAsync<Household>(
        "SELECT * FROM households WHERE local_id = ? OR id = ?",
        [id, id],
      );
      if (!hh) return;
      setHousehold(hh);

      // Load members using BOTH id and local_id to find matches
      const mems = await db.getAllAsync<Member>(
        `SELECT * FROM members 
       WHERE (household_id = ? OR household_id = ?) 
       AND status = 'ACTIVE' 
       ORDER BY full_name ASC`,
        [hh.id, hh.local_id],
      );
      setMembers(mems);

      // Load visits using BOTH id and local_id
      const vis = await db.getAllAsync<Visit>(
        `SELECT * FROM visits 
       WHERE household_id = ? OR household_id = ?
       ORDER BY visited_at DESC LIMIT 20`,
        [hh.id, hh.local_id],
      );
      setVisits(vis);
      if (vis.length > 0) setLastVisit(vis[0]);
    } catch (err) {
      console.error("Load household detail error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Health score
  const healthScore = household
    ? (() => {
        let score = 0;
        if (household.latrine_present) score += 20;
        if (household.handwashing_facility) score += 20;
        if (
          ["BOREHOLE", "PIPED", "PROTECTED_WELL"].includes(
            household.water_source,
          )
        )
          score += 20;
        if (household.mosquito_nets === "Yes") score += 20;
        if (household.distance_to_facility === "UNDER_5KM") score += 10;
        // Children vaccinated (simplified — full check needs immunisation table)
        const hasChildren = members.some((m) => {
          const age =
            m.estimated_age ||
            (m.date_of_birth
              ? Math.floor(
                  (Date.now() - new Date(m.date_of_birth).getTime()) /
                    (1000 * 60 * 60 * 24 * 365),
                )
              : 99);
          return age < 5;
        });
        if (!hasChildren) score += 10;
        return Math.min(score, 100);
      })()
    : 0;

  const scoreColor =
    healthScore >= 80
      ? COLORS.success
      : healthScore >= 50
        ? COLORS.warning
        : COLORS.danger;

  const daysSinceLastVisit = lastVisit
    ? Math.floor(
        (Date.now() - new Date(lastVisit.visited_at).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const visitStatusColor =
    daysSinceLastVisit === null
      ? COLORS.textMuted
      : daysSinceLastVisit > 30
        ? COLORS.danger
        : daysSinceLastVisit > 14
          ? COLORS.warning
          : COLORS.success;

  const getAge = (m: Member) => {
    if (m.estimated_age) return `${m.estimated_age}y`;
    if (m.date_of_birth) {
      const age = Math.floor(
        (Date.now() - new Date(m.date_of_birth).getTime()) /
          (1000 * 60 * 60 * 24 * 365),
      );
      return `${age}y`;
    }
    return "?";
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleWashUpdate = async () => {
    if (!household) return;
    setWashSaving(true);
    try {
      const db = await getDb();
      await db.runAsync(
        `UPDATE households SET
          latrine_present = ?,
          handwashing_facility = ?,
          water_source = ?,
          synced = 0
         WHERE id = ? OR local_id = ?`,
        [
          washLatrine !== "NO" ? 1 : 0,
          washHandwashing === "YES" ? 1 : 0,
          washWaterSource,
          household.id,
          household.local_id,
        ],
      );

      const net = await NetInfo.fetch();
      if (net.isConnected) {
        try {
          await api.patch(`/households/${household.id}`, {
            latrinePresent: washLatrine !== "NO",
            latrineType: washLatrine !== "NO" ? washLatrine : null,
            handwashingFacility: washHandwashing === "YES",
            waterSource: washWaterSource,
          });
          await db.runAsync(
            "UPDATE households SET synced = 1 WHERE id = ? OR local_id = ?",
            [household.id, household.local_id],
          );
        } catch (e) {
          console.warn("[WASH] Sync failed, will retry:", e);
        }
      }

      Alert.alert("WASH Updated", "Sanitation data updated successfully.");
      setShowWashModal(false);
      load();
    } catch (err) {
      console.error("[WASH] Update error:", err);
      Alert.alert("Error", "Failed to update WASH data.");
    } finally {
      setWashSaving(false);
    }
  };

  const handleRelocateSameZone = async () => {
    if (!household) return;
    Alert.alert(
      "Update Location",
      "This will update the GPS coordinates for this household. Make sure you are standing at the new location.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Capture New GPS & Update",
          onPress: async () => {
            setRelocating(true);
            try {
              const { status } =
                await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                Alert.alert(
                  "Permission Needed",
                  "Location permission is required.",
                );
                return;
              }
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });
              const newLat = loc.coords.latitude;
              const newLng = loc.coords.longitude;

              const db = await getDb();
              await db.runAsync(
                "UPDATE households SET gps_lat = ?, gps_lng = ?, synced = 0 WHERE id = ? OR local_id = ?",
                [newLat, newLng, household.id, household.local_id],
              );

              const net = await NetInfo.fetch();
              if (net.isConnected) {
                try {
                  await api.patch(
                    `/households/${household.id}/relocate-same-zone`,
                    {
                      gpsLat: newLat,
                      gpsLng: newLng,
                      reason: "Moved within same area",
                    },
                  );
                  await db.runAsync(
                    "UPDATE households SET synced = 1 WHERE id = ? OR local_id = ?",
                    [household.id, household.local_id],
                  );
                } catch (e) {
                  console.warn("[RELOCATE] Sync failed, will retry later:", e);
                }
              }

              Alert.alert(
                "Location Updated",
                "Household GPS has been updated successfully.",
              );
              load();
            } catch (err) {
              console.error("Relocate same zone error:", err);
              Alert.alert("Error", "Failed to update location.");
            } finally {
              setRelocating(false);
              setShowRelocateModal(false);
            }
          },
        },
      ],
    );
  };

  const handleRelocateNewZone = async () => {
    if (!household) return;
    Alert.alert(
      "Mark Household as Relocated",
      "This household will be marked as RELOCATED. Its history (visits, vaccines, referrals) stays preserved. You should re-register this family fresh if you find them in a new zone or district.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Relocation",
          style: "destructive",
          onPress: async () => {
            setRelocating(true);
            try {
              const db = await getDb();
              await db.runAsync(
                "UPDATE households SET status = 'RELOCATED', synced = 0 WHERE id = ? OR local_id = ?",
                [household.id, household.local_id],
              );

              const net = await NetInfo.fetch();
              if (net.isConnected) {
                try {
                  await api.patch(
                    `/households/${household.id}/relocate-new-zone`,
                    {
                      reason: "Household moved to a different area",
                    },
                  );
                  await db.runAsync(
                    "UPDATE households SET synced = 1 WHERE id = ? OR local_id = ?",
                    [household.id, household.local_id],
                  );
                } catch (e) {
                  console.warn("[RELOCATE] Sync failed, will retry later:", e);
                }
              }

              Alert.alert(
                "Household Marked as Relocated",
                "This household's history has been preserved. Re-register the family if found in a new area.",
                [{ text: "OK", onPress: () => router.back() }],
              );
            } catch (err) {
              console.error("Relocate new zone error:", err);
              Alert.alert("Error", "Failed to mark household as relocated.");
            } finally {
              setRelocating(false);
              setShowRelocateModal(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.textMuted }}>Loading...</Text>
      </View>
    );
  }

  if (!household) {
    return (
      <View style={styles.center}>
        <Ionicons name="home-outline" size={48} color={COLORS.border} />
        <Text style={styles.emptyText}>Household not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: COLORS.primary, marginTop: SIZES.md }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerHHNum}>{household.household_number}</Text>
          <Text style={styles.headerName}>
            {household.head_of_household_name}
          </Text>
        </View>
        <View
          style={[
            styles.syncBadge,
            household.synced ? styles.syncDone : styles.syncPending,
          ]}
        >
          <Ionicons
            name={
              household.synced ? "cloud-done-outline" : "cloud-upload-outline"
            }
            size={14}
            color={household.synced ? COLORS.success : COLORS.warning}
          />
        </View>
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
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons
                name="location-outline"
                size={16}
                color={COLORS.textMuted}
              />
              <Text style={styles.summaryText}>
                {household.village_name || "Unknown village"}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons
                name="people-outline"
                size={16}
                color={COLORS.textMuted}
              />
              <Text style={styles.summaryText}>
                {members.length} member{members.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {/* Visit status */}
          <View
            style={[
              styles.visitStatusBar,
              { borderLeftColor: visitStatusColor },
            ]}
          >
            <View>
              <Text style={styles.visitStatusLabel}>Last Visit</Text>
              <Text
                style={[styles.visitStatusValue, { color: visitStatusColor }]}
              >
                {daysSinceLastVisit === null
                  ? "Never visited"
                  : daysSinceLastVisit === 0
                    ? "Today"
                    : daysSinceLastVisit === 1
                      ? "Yesterday"
                      : `${daysSinceLastVisit} days ago`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.visitNowBtn}
              onPress={() => {
                useAppStore.getState().setSelectedHousehold(household.id);
                router.push("/(app)/visits/add" as any);
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={COLORS.white}
              />
              <Text style={styles.visitNowText}>Record Visit</Text>
            </TouchableOpacity>
          </View>

          {/* Health score */}
          <View style={styles.scoreSection}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreTitle}>Family Health Score</Text>
              <Text style={[styles.scoreNum, { color: scoreColor }]}>
                {healthScore}/100
              </Text>
            </View>
            <View style={styles.scoreBarBg}>
              <View
                style={[
                  styles.scoreBarFill,
                  { width: `${healthScore}%`, backgroundColor: scoreColor },
                ]}
              />
            </View>
            <Text style={[styles.scoreDesc, { color: scoreColor }]}>
              {healthScore >= 80
                ? "✓ Good household conditions"
                : healthScore >= 50
                  ? "⚠ Some improvements needed"
                  : "✗ High risk — needs urgent attention"}
            </Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {[
            {
              icon: "medical-outline",
              label: "Referral",
              color: COLORS.danger,
              route: "/(app)/referrals/add",
            },
            {
              icon: "shield-checkmark-outline",
              label: "Vaccine",
              color: "#7C3AED",
              route: "/(app)/immunisations/index",
            },
            {
              icon: "heart-outline",
              label: "ANC",
              color: "#DB2777",
              route: "/(app)/anc/index",
            },
            {
              icon: "flask-outline",
              label: "Drugs",
              color: COLORS.warning,
              route: "/(app)/drugs/index",
            },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickAction}
              onPress={() => router.push(a.route as any)}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: a.color + "18" },
                ]}
              >
                <Ionicons name={a.icon as any} size={22} color={a.color} />
              </View>
              <Text style={styles.quickActionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* WASH quick update */}
        <TouchableOpacity
          style={styles.washBtn}
          onPress={() => {
            setWashLatrine(
              household.latrine_present ? "TRADITIONAL_PIT" : "NO",
            );
            setWashHandwashing(household.handwashing_facility ? "YES" : "NO");
            setWashWaterSource(household.water_source || "BOREHOLE");
            setShowWashModal(true);
          }}
        >
          <Ionicons name="water-outline" size={18} color="#1971C2" />
          <Text style={styles.washBtnText}>Update WASH / Sanitation</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["members", "visits", "details"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === t && styles.tabTextActive,
                ]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "members" && ` (${members.length})`}
                {t === "visits" && ` (${visits.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Members tab */}
        {activeTab === "members" && (
          <View style={styles.tabContent}>
            <TouchableOpacity
              style={styles.addMemberBtn}
              onPress={() => {
                useAppStore.getState().setSelectedHousehold(household.id);
                router.push("/(app)/households/members/add" as any);
              }}
            >
              <Ionicons
                name="person-add-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.addMemberText}>Add Member</Text>
            </TouchableOpacity>

            {members.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons
                  name="people-outline"
                  size={40}
                  color={COLORS.border}
                />
                <Text style={styles.emptyTabText}>No members added yet</Text>
              </View>
            ) : (
              members.map((m) => (
                <TouchableOpacity
                  key={m.local_id}
                  style={styles.memberCard}
                  onPress={() =>
                    router.push(
                      `/(app)/households/members/${m.local_id}` as any,
                    )
                  }
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
                    <Text style={styles.memberSub}>
                      {m.relationship_to_head.replace("_", " ")} · {getAge(m)}
                    </Text>
                    <View style={styles.memberTags}>
                      {m.is_pregnant === 1 && (
                        <View
                          style={[styles.tag, { backgroundColor: "#FDF2F8" }]}
                        >
                          <Text style={[styles.tagText, { color: "#DB2777" }]}>
                            Pregnant
                          </Text>
                        </View>
                      )}
                      {m.has_disability === 1 && (
                        <View
                          style={[
                            styles.tag,
                            { backgroundColor: COLORS.secondaryLight },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagText,
                              { color: COLORS.secondary },
                            ]}
                          >
                            Disability
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Visits tab */}
        {activeTab === "visits" && (
          <View style={styles.tabContent}>
            {visits.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons
                  name="calendar-outline"
                  size={40}
                  color={COLORS.border}
                />
                <Text style={styles.emptyTabText}>No visits recorded yet</Text>
              </View>
            ) : (
              visits.map((v, i) => (
                <View key={v.id} style={styles.visitItem}>
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
                  {i < visits.length - 1 && <View style={styles.visitLine} />}
                  <View style={styles.visitContent}>
                    <Text style={styles.visitDate}>
                      {formatDate(v.visited_at)}
                    </Text>
                    <Text style={styles.visitType}>
                      {v.visit_type.replace("_", " ")}
                    </Text>
                    {v.referral_needed ? (
                      <View
                        style={[
                          styles.tag,
                          { backgroundColor: COLORS.dangerLight },
                        ]}
                      >
                        <Text
                          style={[styles.tagText, { color: COLORS.danger }]}
                        >
                          Referral made
                        </Text>
                      </View>
                    ) : null}
                    {v.muac_status === "SEVERE_MALNUTRITION" && (
                      <View
                        style={[
                          styles.tag,
                          { backgroundColor: COLORS.dangerLight },
                        ]}
                      >
                        <Text
                          style={[styles.tagText, { color: COLORS.danger }]}
                        >
                          SAM
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Details tab */}
        {activeTab === "details" && (
          <View style={styles.tabContent}>
            {[
              { key: "Household ID", val: household.household_number },
              { key: "Village", val: household.village_name },
              { key: "Zone", val: household.zone_name },
              { key: "Landmark", val: household.landmark || "Not provided" },
              {
                key: "Structure",
                val: household.structure_type?.replace("_", " "),
              },
              {
                key: "Water Source",
                val: household.water_source?.replace("_", " "),
              },
              { key: "Latrine", val: household.latrine_present ? "Yes" : "No" },
              {
                key: "Handwashing",
                val: household.handwashing_facility ? "Yes" : "No",
              },
              {
                key: "Mosquito Nets",
                val: household.mosquito_nets || "Unknown",
              },
              {
                key: "Rooms",
                val: household.number_of_rooms?.toString() || "Unknown",
              },
              {
                key: "Distance to Facility",
                val: household.distance_to_facility?.replace(/_/g, " "),
              },
              {
                key: "GPS",
                val: household.gps_lat
                  ? `${household.gps_lat.toFixed(5)}, ${household.gps_lng?.toFixed(5)}`
                  : "Not captured",
              },
              {
                key: "Head Phone",
                val: household.head_phone || "Not provided",
              },
              {
                key: "Sync Status",
                val: household.synced ? "Synced ✓" : "Pending sync",
              },
            ].map((row) => (
              <View key={row.key} style={styles.detailRow}>
                <Text style={styles.detailKey}>{row.key}</Text>
                <Text style={styles.detailVal}>{row.val}</Text>
              </View>
            ))}

            {/* Relocation Actions */}
            <View style={styles.relocateSection}>
              <Text style={styles.relocateSectionTitle}>
                Household Relocation
              </Text>
              <Text style={styles.relocateSectionDesc}>
                Use this if the household has physically moved from its
                registered location.
              </Text>

              <TouchableOpacity
                style={styles.relocateBtn}
                onPress={handleRelocateSameZone}
                disabled={relocating}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.relocateBtnTitle}>
                    Moved Within Same Area
                  </Text>
                  <Text style={styles.relocateBtnSub}>
                    Update GPS location only — history stays
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.relocateBtn, styles.relocateBtnDanger]}
                onPress={handleRelocateNewZone}
                disabled={relocating}
              >
                <Ionicons name="exit-outline" size={18} color={COLORS.danger} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.relocateBtnTitle, { color: COLORS.danger }]}
                  >
                    Moved to Different Zone/District
                  </Text>
                  <Text style={styles.relocateBtnSub}>
                    Mark as relocated — re-register in the new area
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* WASH Update Modal */}
      <Modal
        visible={showWashModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWashModal(false)}
      >
        <View style={styles.washModalOverlay}>
          <View style={styles.washModalCard}>
            <Text style={styles.washModalTitle}>Update WASH / Sanitation</Text>
            <Text style={styles.washModalSub}>
              {household?.household_number} — {household?.village_name}
            </Text>

            <Text style={styles.washLabel}>Latrine Status</Text>
            {[
              "NO",
              "TRADITIONAL_PIT",
              "IMPROVED_PIT",
              "VIP",
              "FLUSH_TOILET",
            ].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.washOption,
                  washLatrine === opt && styles.washOptionSelected,
                ]}
                onPress={() => setWashLatrine(opt)}
              >
                <Text
                  style={[
                    styles.washOptionText,
                    washLatrine === opt && styles.washOptionTextSelected,
                  ]}
                >
                  {opt === "NO" ? "No Latrine" : opt.replace(/_/g, " ")}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.washLabel}>Handwashing Facility</Text>
            {["YES", "NO"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.washOption,
                  washHandwashing === opt && styles.washOptionSelected,
                ]}
                onPress={() => setWashHandwashing(opt)}
              >
                <Text
                  style={[
                    styles.washOptionText,
                    washHandwashing === opt && styles.washOptionTextSelected,
                  ]}
                >
                  {opt === "YES"
                    ? "Has handwashing facility"
                    : "No handwashing facility"}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.washLabel}>Water Source</Text>
            {[
              "BOREHOLE",
              "PIPED",
              "PROTECTED_WELL",
              "UNPROTECTED_WELL",
              "RIVER",
              "RAIN_WATER",
              "OTHER",
            ].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.washOption,
                  washWaterSource === opt && styles.washOptionSelected,
                ]}
                onPress={() => setWashWaterSource(opt)}
              >
                <Text
                  style={[
                    styles.washOptionText,
                    washWaterSource === opt && styles.washOptionTextSelected,
                  ]}
                >
                  {opt.replace(/_/g, " ")}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.washModalBtns}>
              <TouchableOpacity
                style={styles.washCancelBtn}
                onPress={() => setShowWashModal(false)}
              >
                <Text style={styles.washCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.washSaveBtn, washSaving && { opacity: 0.6 }]}
                onPress={handleWashUpdate}
                disabled={washSaving}
              >
                {washSaving ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.washSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerHHNum: {
    color: "rgba(255,255,255,0.8)",
    fontSize: SIZES.fontXs,
    fontFamily: "monospace",
  },
  headerName: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
  },
  syncBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  syncDone: {},
  syncPending: {},
  summaryCard: {
    backgroundColor: COLORS.white,
    margin: SIZES.lg,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  summaryRow: { flexDirection: "row", gap: SIZES.xl, marginBottom: SIZES.md },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  visitStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 3,
    paddingLeft: SIZES.md,
    marginBottom: SIZES.md,
    paddingVertical: 4,
  },
  visitStatusLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  visitStatusValue: { fontSize: SIZES.fontMd, fontWeight: "bold" },
  visitNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  visitNowText: {
    color: COLORS.white,
    fontSize: SIZES.fontSm,
    fontWeight: "600",
  },
  scoreSection: {},
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  scoreTitle: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  scoreNum: { fontSize: SIZES.fontLg, fontWeight: "bold" },
  scoreBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 6,
  },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreDesc: { fontSize: SIZES.fontXs },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
    gap: SIZES.sm,
  },
  quickAction: { flex: 1, alignItems: "center", gap: 6 },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: SIZES.md, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: "600" },
  tabContent: { padding: SIZES.lg },
  addMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    justifyContent: "center",
    marginBottom: SIZES.md,
  },
  addMemberText: { color: COLORS.primary, fontWeight: "600" },
  emptyTab: {
    alignItems: "center",
    paddingVertical: SIZES.xxxl,
    gap: SIZES.sm,
  },
  emptyTabText: { color: COLORS.textMuted, fontSize: SIZES.fontSm },
  emptyText: { color: COLORS.textMuted, marginTop: SIZES.md },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SIZES.md,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: SIZES.fontMd, fontWeight: "600", color: COLORS.text },
  memberSub: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  memberTags: { flexDirection: "row", gap: 6, marginTop: 4 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  tagText: { fontSize: 10, fontWeight: "600" },
  visitItem: { flexDirection: "row", marginBottom: SIZES.md },
  visitDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.md,
    marginTop: 4,
  },
  visitLine: {
    position: "absolute",
    left: 5,
    top: 16,
    bottom: -SIZES.md,
    width: 2,
    backgroundColor: COLORS.border,
  },
  visitContent: { flex: 1 },
  visitDate: { fontSize: SIZES.fontSm, fontWeight: "600", color: COLORS.text },
  visitType: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    textTransform: "capitalize",
  },
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
  },
  relocateSection: {
    marginTop: SIZES.lg,
    paddingTop: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  relocateSectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  relocateSectionDesc: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginBottom: SIZES.md,
  },
  relocateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  relocateBtnDanger: {
    borderColor: COLORS.dangerLight,
  },
  relocateBtnTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
  },
  relocateBtnSub: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  washBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
  },
  washBtnText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: "#1971C2",
  },
  washModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  washModalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SIZES.xl,
    maxHeight: "85%",
  },
  washModalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  washModalSub: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    marginBottom: SIZES.lg,
  },
  washLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: 8,
  },
  washOption: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    marginBottom: 6,
    backgroundColor: COLORS.white,
  },
  washOptionSelected: {
    borderColor: "#1971C2",
    backgroundColor: "#EFF6FF",
  },
  washOptionText: { fontSize: SIZES.fontSm, color: COLORS.text },
  washOptionTextSelected: { color: "#1971C2", fontWeight: "600" },
  washModalBtns: {
    flexDirection: "row",
    gap: SIZES.md,
    marginTop: SIZES.xl,
  },
  washCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    alignItems: "center",
  },
  washCancelText: { color: COLORS.textSecondary, fontWeight: "600" },
  washSaveBtn: {
    flex: 1,
    backgroundColor: "#1971C2",
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    alignItems: "center",
  },
  washSaveText: { color: COLORS.white, fontWeight: "700" },
});
