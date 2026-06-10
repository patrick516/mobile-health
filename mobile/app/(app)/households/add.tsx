import { useState, useEffect, useRef } from "react";
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
  Image,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { useAppStore } from "../../../src/store";
import { getDb, initDb } from "../../../src/db/schema";
import { enqueue } from "../../../src/db/sync-queue";
import api from "../../../src/services/api";
import {
  WATER_SOURCES,
  STRUCTURE_TYPES,
  DISTANCE_OPTIONS,
} from "../../../constants/diseases";

interface Village {
  id: string;
  name: string;
  zone_id: string;
  zone_name: string;
}
interface Zone {
  id: string;
  name: string;
}
interface ExistingHousehold {
  id: string;
  household_number: string;
  head_of_household_name: string;
  village_name: string;
}

const STEPS = ["ID", "Location", "Details", "Review"];

export default function AddHouseholdScreen() {
  const language = useAppStore((s) => s.language);
  const user = useAppStore((s) => s.user);
  const [step, setStep] = useState(0);

  // Step 0 — Household ID
  const [idPrefix, setIdPrefix] = useState("");
  const [idPreview, setIdPreview] = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const [existingMatches, setExistingMatches] = useState<ExistingHousehold[]>(
    [],
  );
  const [idConfirmed, setIdConfirmed] = useState(false);

  // Step 1 — Location
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [newVillageName, setNewVillageName] = useState("");
  const [showNewVillage, setShowNewVillage] = useState(false);
  const [landmark, setLandmark] = useState("");
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Step 2 — Details
  const [headName, setHeadName] = useState("");
  const [headPhone, setHeadPhone] = useState("");
  const [structureType, setStructureType] = useState("");
  const [waterSource, setWaterSource] = useState("");
  const [latrinePresent, setLatrinePresent] = useState(false);
  const [handwashing, setHandwashing] = useState(false);
  const [distanceToFacility, setDistanceToFacility] = useState("");
  const [mosquitoNets, setMosquitoNets] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState("");
  const [householdPhoto, setHouseholdPhoto] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // Health score calculation
  const healthScore = (() => {
    let score = 0;
    if (latrinePresent) score += 20;
    if (handwashing) score += 20;
    if (["BOREHOLE", "PIPED", "PROTECTED_WELL"].includes(waterSource))
      score += 20;
    if (mosquitoNets === "Yes") score += 20;
    if (distanceToFacility === "UNDER_5KM") score += 20;
    return score;
  })();

  const healthScoreColor =
    healthScore >= 80
      ? COLORS.success
      : healthScore >= 50
        ? COLORS.warning
        : COLORS.danger;

  useEffect(() => {
    loadZones();
    captureGps();
  }, []);
  useEffect(() => {
    if (selectedZoneId) loadVillages(selectedZoneId);
  }, [selectedZoneId]);

  const loadZones = async () => {
    try {
      const res = await api.get("/geography/zones");
      setZones(res.data.data);
      if (res.data.data.length === 1) setSelectedZoneId(res.data.data[0].id);
    } catch {}
  };

  const loadVillages = async (zoneId: string) => {
    try {
      const res = await api.get(`/geography/villages?zoneId=${zoneId}`);
      setVillages(res.data.data);
    } catch {
      const db = await getDb();
      const rows = await db.getAllAsync<Village>(
        "SELECT * FROM villages WHERE zone_id = ? ORDER BY name ASC",
        [zoneId],
      );
      setVillages(rows);
    }
  };

  const captureGps = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setGpsLat(loc.coords.latitude);
      setGpsLng(loc.coords.longitude);
    } catch {
    } finally {
      setGpsLoading(false);
    }
  };

  const checkHouseholdId = async () => {
    if (!idPrefix.trim() || idPrefix.length < 2) {
      Alert.alert(
        "Required",
        "Please enter at least 2 characters for the household prefix.",
      );
      return;
    }
    setIdChecking(true);
    setExistingMatches([]);
    try {
      // Ensure DB is ready before querying
      await initDb();
      const db = await getDb();
      const prefix = idPrefix.toUpperCase().trim();
      const local = await db.getAllAsync<ExistingHousehold>(
        `SELECT id, household_number, head_of_household_name, village_name
         FROM households WHERE household_number LIKE ? AND status = 'ACTIVE'
         ORDER BY household_number ASC`,
        [`${prefix}-%`],
      );

      if (local.length > 0) {
        setExistingMatches(local);
        const maxNum = local.reduce((max, h) => {
          const num = parseInt(h.household_number.split("-")[1] || "0");
          return num > max ? num : max;
        }, 0);
        setIdPreview(`${prefix}-${String(maxNum + 1).padStart(4, "0")}`);
      } else {
        setIdPreview(`${prefix}-0001`);
      }
    } catch {
      const prefix = idPrefix.toUpperCase().trim();
      setIdPreview(`${prefix}-0001`);
    } finally {
      setIdChecking(false);
    }
  };

  const takeHouseholdPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Camera permission is required to take a photo.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });
    if (!result.canceled) setHouseholdPhoto(result.assets[0].uri);
  };

  const handleAddVillage = async () => {
    if (!newVillageName.trim()) return;
    try {
      const res = await api.post("/geography/villages", {
        name: newVillageName.trim(),
        zoneId: selectedZoneId,
        gpsLat,
        gpsLng,
      });
      if (res.data.isDuplicate) {
        Alert.alert(
          "Similar Village Found",
          `"${res.data.potentialDuplicates[0].name}" already exists. Use existing or add new?`,
          [
            {
              text: "Use Existing",
              onPress: () => {
                setSelectedVillageId(res.data.potentialDuplicates[0].id);
                setShowNewVillage(false);
              },
            },
            {
              text: "Add New",
              style: "destructive",
              onPress: async () => {
                const r2 = await api.post("/geography/villages", {
                  name: newVillageName.trim(),
                  zoneId: selectedZoneId,
                  gpsLat,
                  gpsLng,
                });
                const v = r2.data.data;

                //  Save to local SQLite
                const db = await getDb();
                await db.runAsync(
                  "INSERT OR REPLACE INTO villages (id, name, zone_id, zone_name) VALUES (?,?,?,?)",
                  [v.id, v.name, selectedZoneId, ""],
                );

                // Enqueue village for sync
                await enqueue("VILLAGE", {
                  id: v.id,
                  name: v.name,
                  zoneId: selectedZoneId,
                  gpsLat,
                  gpsLng,
                });

                setVillages((p) => [...p, v]);
                setSelectedVillageId(v.id);
                setShowNewVillage(false);
              },
            },
          ],
        );
        return;
      }
      const v = res.data.data;

      const db = await getDb();
      await db.runAsync(
        "INSERT OR REPLACE INTO villages (id, name, zone_id, zone_name) VALUES (?,?,?,?)",
        [v.id, v.name, selectedZoneId, ""],
      );

      // ADD THIS - Enqueue village for sync
      await enqueue("VILLAGE", {
        id: v.id,
        name: v.name,
        zoneId: selectedZoneId,
        gpsLat,
        gpsLng,
      });

      setVillages((p) => [...p, v]);
      setVillages((p) => [...p, v]);
      setSelectedVillageId(v.id);
      setShowNewVillage(false);
      setNewVillageName("");
    } catch {
      Alert.alert("Error", "Could not add village. Check your connection.");
    }
  };

  const handleSave = async () => {
    if (!headName.trim())
      return Alert.alert("Required", "Head of household name is required.");
    if (!selectedVillageId)
      return Alert.alert("Required", "Please select or add a village.");
    if (!structureType)
      return Alert.alert("Required", "Please select structure type.");
    if (!waterSource)
      return Alert.alert("Required", "Please select water source.");
    if (!distanceToFacility)
      return Alert.alert("Required", "Please select distance to facility.");

    setSaving(true);
    try {
      // Safety guard — ensure DB and all tables exist before inserting
      await initDb();

      const localId = Crypto.randomUUID();
      const db = await getDb();
      const village = villages.find((v) => v.id === selectedVillageId);
      const zone = zones.find((z) => z.id === selectedZoneId);

      await db.runAsync(
        `INSERT INTO households (
          id, local_id, village_id, village_name, zone_name, ta_name,
          head_of_household_name, head_phone, household_number,
          structure_type, water_source, latrine_present, handwashing_facility,
          distance_to_facility, mosquito_nets, number_of_rooms,
          landmark, gps_lat, gps_lng, status, synced
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
        [
          localId,
          localId,
          selectedVillageId,
          village?.name || "",
          zone?.name || "",
          "",
          headName.trim(),
          headPhone.trim() || null,
          idPreview,
          structureType,
          waterSource,
          latrinePresent ? 1 : 0,
          handwashing ? 1 : 0,
          distanceToFacility,
          mosquitoNets || null,
          numberOfRooms ? parseInt(numberOfRooms) : null,
          landmark.trim() || null,
          gpsLat,
          gpsLng,
          "ACTIVE",
        ],
      );

      await enqueue("HOUSEHOLD", {
        localId,
        villageId: selectedVillageId,
        headOfHouseholdName: headName.trim(),
        headPhone: headPhone.trim() || null,
        householdNumber: idPreview,
        structureType,
        waterSource,
        latrinePresent,
        handwashingFacility: handwashing,
        distanceToFacility,
        mosquitoNets: mosquitoNets || null,
        numberOfRooms: numberOfRooms ? parseInt(numberOfRooms) : null,
        landmark: landmark.trim() || null,
        gpsLat,
        gpsLng,
      });

      Alert.alert(
        "Saved ✓",
        `Household ${idPreview} registered successfully.`,
        [
          {
            text: "Add Members",
            onPress: () => router.replace(`/(app)/households/${localId}`),
          },
          { text: "Done", onPress: () => router.back() },
        ],
      );
    } catch (err: any) {
      console.error("SAVE ERROR:", err);
      Alert.alert(
        "Error",
        err?.message ||
          JSON.stringify(err) ||
          "Failed to save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const Opt = ({ label, selected, onPress }: any) => (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const canGoNext = () => {
    if (step === 0) return idConfirmed;
    if (step === 1) return selectedVillageId !== "";
    if (step === 2)
      return (
        headName.trim() !== "" &&
        structureType !== "" &&
        waterSource !== "" &&
        distanceToFacility !== ""
      );
    return true;
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
        <Text style={styles.headerTitle}>Register Household</Text>
        <Text style={styles.headerStep}>
          {step + 1}/{STEPS.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / STEPS.length) * 100}%` },
          ]}
        />
      </View>

      {/* Step labels */}
      <View style={styles.stepLabels}>
        {STEPS.map((s, i) => (
          <Text
            key={s}
            style={[styles.stepLabel, i === step && styles.stepLabelActive]}
          >
            {s}
          </Text>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── STEP 0: HOUSEHOLD ID ─────────────────────────────── */}
        {step === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Household ID</Text>
            <Text style={styles.sectionDesc}>
              Create a short memorable prefix for this household. Example: for
              the Makhetha family type <Text style={styles.bold}>MKTHA</Text> —
              the system will generate{" "}
              <Text style={styles.bold}>MKTHA-0001</Text>
            </Text>

            <Text style={styles.label}>Household Prefix *</Text>
            <View style={styles.idRow}>
              <TextInput
                style={[styles.input, styles.idInput]}
                value={idPrefix}
                onChangeText={(t) => {
                  setIdPrefix(t.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                  setIdPreview("");
                  setIdConfirmed(false);
                  setExistingMatches([]);
                }}
                placeholder="e.g. MKTHA"
                placeholderTextColor={COLORS.placeholder}
                autoCapitalize="characters"
                maxLength={8}
              />
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={checkHouseholdId}
                disabled={idChecking}
              >
                {idChecking ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.checkBtnText}>Check</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* ID Preview */}
            {idPreview !== "" && (
              <View style={styles.previewBox}>
                <Ionicons name="home" size={20} color={COLORS.primary} />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewLabel}>New Household ID</Text>
                  <Text style={styles.previewId}>{idPreview}</Text>
                </View>
              </View>
            )}

            {/* Existing matches */}
            {existingMatches.length > 0 && (
              <View style={styles.matchesBox}>
                <View style={styles.matchesHeader}>
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color={COLORS.warning}
                  />
                  <Text style={styles.matchesTitle}>
                    {existingMatches.length} household
                    {existingMatches.length > 1 ? "s" : ""} with this prefix
                    already exist
                  </Text>
                </View>
                {existingMatches.map((h) => (
                  <TouchableOpacity
                    key={h.id}
                    style={styles.matchItem}
                    onPress={() => router.replace(`/(app)/households/${h.id}`)}
                  >
                    <View style={styles.matchLeft}>
                      <Text style={styles.matchId}>{h.household_number}</Text>
                      <Text style={styles.matchName}>
                        {h.head_of_household_name}
                      </Text>
                      <Text style={styles.matchVillage}>{h.village_name}</Text>
                    </View>
                    <View style={styles.viewBtn}>
                      <Text style={styles.viewBtnText}>View</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={COLORS.primary}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
                <Text style={styles.matchesContinue}>
                  Or continue below to register a new household with ID{" "}
                  <Text style={styles.bold}>{idPreview}</Text>
                </Text>
              </View>
            )}

            {idPreview !== "" && (
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  idConfirmed && styles.confirmBtnDone,
                ]}
                onPress={() => setIdConfirmed(true)}
              >
                <Ionicons
                  name={
                    idConfirmed
                      ? "checkmark-circle"
                      : "checkmark-circle-outline"
                  }
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.confirmBtnText}>
                  {idConfirmed
                    ? `Confirmed: ${idPreview}`
                    : `Use this ID: ${idPreview}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── STEP 1: LOCATION ─────────────────────────────────── */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>

            <View style={styles.gpsRow}>
              <Ionicons
                name={gpsLat ? "location" : "location-outline"}
                size={18}
                color={gpsLat ? COLORS.success : COLORS.textMuted}
              />
              <Text style={styles.gpsText}>
                {gpsLoading
                  ? "Capturing GPS..."
                  : gpsLat
                    ? `GPS: ${gpsLat.toFixed(5)}, ${gpsLng?.toFixed(5)}`
                    : "GPS not captured"}
              </Text>
              {!gpsLat && !gpsLoading && (
                <TouchableOpacity onPress={captureGps}>
                  <Text style={styles.retryGps}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>Zone *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View
                style={{ flexDirection: "row", gap: 8, marginBottom: SIZES.sm }}
              >
                {zones.map((z) => (
                  <Opt
                    key={z.id}
                    label={z.name}
                    selected={selectedZoneId === z.id}
                    onPress={() => setSelectedZoneId(z.id)}
                  />
                ))}
              </View>
            </ScrollView>

            {selectedZoneId !== "" && (
              <>
                <Text style={styles.label}>Village / Area *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginBottom: SIZES.sm,
                    }}
                  >
                    {villages.map((v) => (
                      <Opt
                        key={v.id}
                        label={v.name}
                        selected={selectedVillageId === v.id}
                        onPress={() => {
                          setSelectedVillageId(v.id);
                          setShowNewVillage(false);
                        }}
                      />
                    ))}
                    <TouchableOpacity
                      style={[styles.option, styles.optionAdd]}
                      onPress={() => setShowNewVillage(true)}
                    >
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                      <Text style={styles.optionAddText}>New</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}

            {showNewVillage && (
              <View style={styles.newVillageBox}>
                <TextInput
                  style={styles.input}
                  value={newVillageName}
                  onChangeText={setNewVillageName}
                  placeholder="Enter village name"
                  placeholderTextColor={COLORS.placeholder}
                  autoFocus
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowNewVillage(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveVillageBtn}
                    onPress={handleAddVillage}
                  >
                    <Text style={styles.saveVillageBtnText}>Add Village</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.label}>Landmark / Directions</Text>
            <TextInput
              style={[
                styles.input,
                { minHeight: 70, textAlignVertical: "top" },
              ]}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Near the borehole, red door"
              placeholderTextColor={COLORS.placeholder}
              multiline
            />

            {/* Household Photo */}
            <Text style={styles.label}>Household Photo (optional)</Text>
            <TouchableOpacity
              style={styles.photoBtn}
              onPress={takeHouseholdPhoto}
            >
              {householdPhoto ? (
                <Image
                  source={{ uri: householdPhoto }}
                  style={styles.photoPreview}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons
                    name="camera-outline"
                    size={32}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.photoPlaceholderText}>
                    Tap to take photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── STEP 2: DETAILS ──────────────────────────────────── */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Household Details</Text>

            {/* Health Score Preview */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Household Health Score</Text>
              <View style={styles.scoreBarBg}>
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: `${healthScore}%`,
                      backgroundColor: healthScoreColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.scoreNum, { color: healthScoreColor }]}>
                {healthScore}/100
              </Text>
              <Text style={styles.scoreDesc}>
                {healthScore >= 80
                  ? "Good household conditions"
                  : healthScore >= 50
                    ? "Some improvements needed"
                    : "High risk — needs follow up"}
              </Text>
            </View>

            <Text style={styles.label}>Head of Household Name *</Text>
            <TextInput
              style={styles.input}
              value={headName}
              onChangeText={setHeadName}
              placeholder="Full name"
              placeholderTextColor={COLORS.placeholder}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Head Phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={headPhone}
              onChangeText={setHeadPhone}
              placeholder="e.g. 0888123456"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Structure Type *</Text>
            <View style={styles.optionGrid}>
              {STRUCTURE_TYPES.map((s) => (
                <Opt
                  key={s.code}
                  label={language === "en" ? s.labelEn : s.labelNy}
                  selected={structureType === s.code}
                  onPress={() => setStructureType(s.code)}
                />
              ))}
            </View>

            <Text style={styles.label}>Water Source *</Text>
            <View style={styles.optionGrid}>
              {WATER_SOURCES.map((w) => (
                <Opt
                  key={w.code}
                  label={language === "en" ? w.labelEn : w.labelNy}
                  selected={waterSource === w.code}
                  onPress={() => setWaterSource(w.code)}
                />
              ))}
            </View>

            <Text style={styles.label}>Distance to Health Facility *</Text>
            <View style={styles.optionGrid}>
              {DISTANCE_OPTIONS.map((d) => (
                <Opt
                  key={d.code}
                  label={language === "en" ? d.labelEn : d.labelNy}
                  selected={distanceToFacility === d.code}
                  onPress={() => setDistanceToFacility(d.code)}
                />
              ))}
            </View>

            {[
              {
                label: "Latrine Present",
                sub: "Does the household have a latrine?",
                val: latrinePresent,
                set: setLatrinePresent,
              },
              {
                label: "Handwashing Facility",
                sub: "With soap available?",
                val: handwashing,
                set: setHandwashing,
              },
            ].map((sw) => (
              <View key={sw.label} style={styles.switchRow}>
                <View style={{ flex: 1, marginRight: SIZES.md }}>
                  <Text style={styles.switchLabel}>{sw.label}</Text>
                  <Text style={styles.switchSub}>{sw.sub}</Text>
                </View>
                <Switch
                  value={sw.val}
                  onValueChange={sw.set}
                  trackColor={{
                    false: COLORS.border,
                    true: COLORS.primaryLight,
                  }}
                  thumbColor={sw.val ? COLORS.primary : COLORS.textMuted}
                />
              </View>
            ))}

            <Text style={styles.label}>Number of Rooms</Text>
            <TextInput
              style={styles.input}
              value={numberOfRooms}
              onChangeText={setNumberOfRooms}
              placeholder="e.g. 3"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Mosquito Nets</Text>
            <View style={styles.optionGrid}>
              {["Yes", "No", "Partial"].map((opt) => (
                <Opt
                  key={opt}
                  label={opt}
                  selected={mosquitoNets === opt}
                  onPress={() => setMosquitoNets(opt)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ─── STEP 3: REVIEW ───────────────────────────────────── */}
        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review & Save</Text>

            <View style={styles.reviewCard}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Household ID</Text>
                <Text style={styles.reviewVal}>{idPreview}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Head of Household</Text>
                <Text style={styles.reviewVal}>{headName}</Text>
              </View>
              {headPhone ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Phone</Text>
                  <Text style={styles.reviewVal}>{headPhone}</Text>
                </View>
              ) : null}
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Village</Text>
                <Text style={styles.reviewVal}>
                  {villages.find((v) => v.id === selectedVillageId)?.name ||
                    "-"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Water Source</Text>
                <Text style={styles.reviewVal}>
                  {WATER_SOURCES.find((w) => w.code === waterSource)?.labelEn ||
                    "-"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Latrine</Text>
                <Text style={styles.reviewVal}>
                  {latrinePresent ? "Yes" : "No"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Distance to Facility</Text>
                <Text style={styles.reviewVal}>
                  {DISTANCE_OPTIONS.find((d) => d.code === distanceToFacility)
                    ?.labelEn || "-"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>GPS</Text>
                <Text style={styles.reviewVal}>
                  {gpsLat
                    ? `${gpsLat.toFixed(4)}, ${gpsLng?.toFixed(4)}`
                    : "Not captured"}
                </Text>
              </View>
              <View style={[styles.reviewRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.reviewKey}>Health Score</Text>
                <Text
                  style={[
                    styles.reviewVal,
                    { color: healthScoreColor, fontWeight: "bold" },
                  ]}
                >
                  {healthScore}/100
                </Text>
              </View>
            </View>

            {householdPhoto && (
              <Image
                source={{ uri: householdPhoto }}
                style={styles.reviewPhoto}
              />
            )}

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
                  <Text style={styles.saveBtnText}>Register Household</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.editBtn} onPress={() => setStep(2)}>
              <Text style={styles.editBtnText}>Edit Details</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom nav */}
      {step < 3 && (
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
            style={[
              styles.nextBtn,
              !canGoNext() && styles.nextBtnDisabled,
              step === 0 && { flex: 1 },
            ]}
            onPress={() => canGoNext() && setStep((s) => s + 1)}
            disabled={!canGoNext()}
          >
            <Text style={styles.nextBtnText}>
              {step === 2 ? "Review" : "Next"}
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
  headerStep: { color: "rgba(255,255,255,0.8)", fontSize: SIZES.fontSm },
  progressBar: { height: 4, backgroundColor: COLORS.border },
  progressFill: { height: 4, backgroundColor: COLORS.primary },
  stepLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  stepLabelActive: { color: COLORS.primary, fontWeight: "bold" },
  scroll: { flex: 1 },
  section: { padding: SIZES.lg },
  sectionTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
    lineHeight: 20,
  },
  bold: { fontWeight: "bold", color: COLORS.text },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: SIZES.md,
  },
  idRow: { flexDirection: "row", gap: 8 },
  idInput: {
    flex: 1,
    marginBottom: 0,
    fontFamily: "monospace",
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
  },
  checkBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.lg,
    justifyContent: "center",
  },
  checkBtnText: { color: COLORS.white, fontWeight: "bold" },
  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginTop: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  previewInfo: {},
  previewLabel: { fontSize: SIZES.fontXs, color: COLORS.primary },
  previewId: {
    fontSize: SIZES.fontXxl,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: "monospace",
  },
  matchesBox: {
    backgroundColor: COLORS.warningLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginTop: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  matchesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SIZES.sm,
  },
  matchesTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.amber,
    flex: 1,
  },
  matchItem: {
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
  matchLeft: {},
  matchId: {
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: "monospace",
  },
  matchName: { fontSize: SIZES.fontSm, color: COLORS.text },
  matchVillage: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  viewBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewBtnText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  matchesContinue: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginTop: SIZES.lg,
  },
  confirmBtnDone: { backgroundColor: COLORS.success },
  confirmBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: SIZES.fontMd,
  },
  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gpsText: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  retryGps: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: SIZES.fontSm,
  },
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
  optionAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
  },
  optionAddText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  newVillageBox: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    marginBottom: SIZES.md,
  },
  cancelBtn: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: "600" },
  saveVillageBtn: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  saveVillageBtnText: { color: COLORS.white, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    marginBottom: SIZES.sm,
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
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  switchLabel: {
    fontSize: SIZES.fontMd,
    fontWeight: "600",
    color: COLORS.text,
  },
  switchSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  photoBtn: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: SIZES.radiusMd,
    overflow: "hidden",
    marginBottom: SIZES.md,
  },
  photoPreview: { width: "100%", height: 180 },
  photoPlaceholder: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.background,
  },
  photoPlaceholderText: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  scoreCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  scoreLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  scoreBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: SIZES.sm,
  },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreNum: { fontSize: SIZES.fontXxl, fontWeight: "bold" },
  scoreDesc: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 4 },
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
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
  },
  reviewPhoto: {
    width: "100%",
    height: 160,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.lg,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: SIZES.fontMd,
  },
  editBtn: {
    alignItems: "center",
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
  },
  editBtnText: { color: COLORS.textSecondary, fontSize: SIZES.fontSm },
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
