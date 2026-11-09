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
  Modal,
  TextInput,
} from "react-native";
import { goBack } from "../../../src/utils/nav";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../../constants/theme";
import { getDb } from "../../../src/db/schema";
import { enqueue } from "../../../src/db/sync-queue";
import { useAppStore } from "../../../src/store";
import api from "../../../src/services/api";
import * as Crypto from "expo-crypto";

interface DrugStock {
  id: string;
  drug_id: string;
  drug_code: string;
  name_english: string;
  name_chichewa: string;
  unit: string;
  quantity_current: number;
  quantity_minimum: number;
}

interface FormularyDrug {
  id: string;
  drug_code: string | null;
  name_english: string;
  name_chichewa: string | null;
  unit: string;
  minimum_threshold: number | null;
}

interface StockRequestRow {
  id: string;
  drug_id: string;
  drug_name: string | null;
  quantity_requested: number;
  status: string;
  notes: string | null;
  created_at: string;
}

const REQUEST_BADGES: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  PENDING: { bg: "#FEF3C7", fg: "#B45309", label: "Pending" },
  APPROVED: { bg: "#DBEAFE", fg: "#1D4ED8", label: "Approved" },
  FULFILLED: { bg: "#D1FAE5", fg: "#047857", label: "Fulfilled" },
  REJECTED: { bg: "#FEE2E2", fg: "#B91C1C", label: "Rejected" },
};

export default function DrugsScreen() {
  const language = useAppStore((s) => s.language);
  const [drugs, setDrugs] = useState<DrugStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"stock" | "requests">("stock");
  const [requests, setRequests] = useState<StockRequestRow[]>([]);

  // Request modal
  const [showRequest, setShowRequest] = useState(false);
  const [formulary, setFormulary] = useState<FormularyDrug[]>([]);
  const [selDrug, setSelDrug] = useState<FormularyDrug | null>(null);
  const [formSearch, setFormSearch] = useState("");
  const [reqQty, setReqQty] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<DrugStock>(
        "SELECT * FROM drug_stock ORDER BY name_english ASC",
      );
      setDrugs(rows);
    } catch (err) {
      console.error("Load drugs error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<StockRequestRow>(
        "SELECT * FROM stock_requests ORDER BY created_at DESC",
      );
      setRequests(rows);
    } catch (err) {
      console.error("Load stock requests error:", err);
    }
  }, []);

  const loadFormulary = useCallback(async () => {
    try {
      const res = await api.get("/drugs");
      const list = res.data.data || [];
      const db = await getDb();
      for (const d of list) {
        await db.runAsync(
          `INSERT OR REPLACE INTO drugs (id, drug_code, name_english, name_chichewa, unit, minimum_threshold, is_active)
           VALUES (?,?,?,?,?,?,?)`,
          [
            d.id,
            d.drugCode,
            d.nameEnglish,
            d.nameChichewa,
            d.unit,
            d.minimumThreshold,
            d.isActive ? 1 : 0,
          ],
        );
      }
    } catch {
      // Offline — fall back to the last synced formulary below
    }
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<FormularyDrug>(
        "SELECT * FROM drugs WHERE is_active = 1 ORDER BY name_english ASC",
      );
      setFormulary(rows);
    } catch (err) {
      console.error("Load formulary error:", err);
    }
  }, []);

  useEffect(() => {
    load();
    loadRequests();
  }, [load, loadRequests]);

  const submitRequestCore = async (opts: {
    drugId: string;
    drugName: string;
    qty: number;
  }) => {
    const db = await getDb();
    const dup = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM stock_requests WHERE drug_id = ? AND status = 'PENDING'`,
      [opts.drugId],
    );
    if (dup) {
      throw new Error(
        `A restock request for ${opts.drugName} is already pending.`,
      );
    }
    const localId = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO stock_requests (id, local_id, drug_id, drug_name, quantity_requested, status, notes, synced)
       VALUES (?,?,?,?,?,'PENDING',?,0)`,
      [
        localId,
        localId,
        opts.drugId,
        opts.drugName,
        opts.qty,
        "Requested via mobile app",
      ],
    );
    await enqueue("STOCK_REQUEST", {
      localId,
      drugId: opts.drugId,
      quantityRequested: opts.qty,
      notes: "Requested via mobile app",
    });
  };

  const openRequest = () => {
    setSelDrug(null);
    setReqQty("");
    setFormSearch("");
    setShowRequest(true);
    loadFormulary();
  };

  const sendRequest = async () => {
    if (!selDrug) {
      Alert.alert("Select a drug", "Choose a drug from the list first.");
      return;
    }
    const defaultQty = (selDrug.minimum_threshold || 5) * 3;
    const qty = parseInt(reqQty, 10) || defaultQty;
    if (qty <= 0) {
      Alert.alert("Invalid quantity", "Enter a quantity of 1 or more.");
      return;
    }
    setSending(true);
    try {
      await submitRequestCore({
        drugId: selDrug.id,
        drugName: selDrug.name_english || selDrug.name_chichewa || "Drug",
        qty,
      });
      setShowRequest(false);
      setTab("requests");
      await loadRequests();
      Alert.alert(
        "Requested ✓",
        `Request for ${qty} ${selDrug.unit}s of ${selDrug.name_english} will be sent on next sync.`,
      );
    } catch (err: any) {
      Alert.alert("Request Failed", err?.message || "Could not queue request.");
    } finally {
      setSending(false);
    }
  };

  const updateQty = async (drug: DrugStock, change: number) => {
    const newQty = Math.max(0, drug.quantity_current + change);
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE drug_stock SET quantity_current = ?, updated_at = ? WHERE id = ?",
        [newQty, new Date().toISOString(), drug.id],
      );
      setDrugs((prev) =>
        prev.map((d) =>
          d.id === drug.id ? { ...d, quantity_current: newQty } : d,
        ),
      );
    } catch (err) {
      console.error("Update drug qty error:", err);
    }
  };

  const requestRestock = (drug: DrugStock) => {
    Alert.alert(
      "Request Restock",
      `Request resupply of ${language === "en" ? drug.name_english : drug.name_chichewa}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            try {
              await submitRequestCore({
                drugId: drug.drug_id || drug.id,
                drugName: drug.name_english,
                qty: Math.max(1, drug.quantity_minimum * 3),
              });
              await loadRequests();
              Alert.alert(
                "Requested ✓",
                "Restock request will be sent on next sync.",
              );
            } catch (err: any) {
              Alert.alert(
                "Request Failed",
                err?.message || "Could not queue request.",
              );
            }
          },
        },
      ],
    );
  };

  const isLow = (d: DrugStock) => d.quantity_current <= d.quantity_minimum;
  const lowCount = drugs.filter(isLow).length;
  const pendingReqCount = requests.filter((r) => r.status === "PENDING").length;

  const filteredFormulary = formulary.filter((d) => {
    const q = formSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (d.name_english || "").toLowerCase().includes(q) ||
      (d.name_chichewa || "").toLowerCase().includes(q) ||
      (d.drug_code || "").toLowerCase().includes(q)
    );
  });

  const renderItem = ({ item }: { item: DrugStock }) => {
    const low = isLow(item);
    const pct = Math.min(
      100,
      (item.quantity_current / Math.max(item.quantity_minimum * 3, 1)) * 100,
    );

    return (
      <View style={[styles.card, low && styles.cardLow]}>
        <View style={styles.cardTop}>
          <View style={styles.drugInfo}>
            <Text style={styles.drugName}>
              {language === "en" ? item.name_english : item.name_chichewa}
            </Text>
            <Text style={styles.drugCode}>{item.drug_code}</Text>
          </View>
          {low && (
            <View style={styles.lowBadge}>
              <Ionicons
                name="warning-outline"
                size={12}
                color={COLORS.danger}
              />
              <Text style={styles.lowBadgeText}>Low</Text>
            </View>
          )}
        </View>

        {/* Stock bar */}
        <View style={styles.stockBarBg}>
          <View
            style={[
              styles.stockBarFill,
              {
                width: `${pct}%`,
                backgroundColor: low ? COLORS.danger : COLORS.success,
              },
            ]}
          />
        </View>

        <View style={styles.cardBottom}>
          <View>
            <Text
              style={[
                styles.stockNum,
                { color: low ? COLORS.danger : COLORS.success },
              ]}
            >
              {item.quantity_current}
            </Text>
            <Text style={styles.stockUnit}>{item.unit}s remaining</Text>
          </View>

          <View style={styles.qtyControls}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQty(item, -1)}
            >
              <Ionicons name="remove" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQty(item, 1)}
            >
              <Ionicons name="add" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {low && (
            <TouchableOpacity
              style={styles.restockBtn}
              onPress={() => requestRestock(item)}
            >
              <Ionicons name="refresh-outline" size={14} color={COLORS.white} />
              <Text style={styles.restockBtnText}>Restock</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderRequest = ({ item }: { item: StockRequestRow }) => {
    const badge = REQUEST_BADGES[item.status] || {
      bg: COLORS.border,
      fg: COLORS.textMuted,
      label: item.status,
    };
    return (
      <View style={styles.reqCard}>
        <View style={styles.reqTop}>
          <Text style={styles.reqName}>{item.drug_name || "Drug"}</Text>
          <View style={[styles.reqBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.reqBadgeText, { color: badge.fg }]}>
              {badge.label}
            </Text>
          </View>
        </View>
        <Text style={styles.reqMeta}>
          {item.quantity_requested} requested ·{" "}
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.status === "PENDING" && (
          <Text style={styles.reqHint}>
            Waiting for nurse/pharmacy approval
          </Text>
        )}
        {item.status === "APPROVED" && (
          <Text style={styles.reqHint}>
            Approved — collect from the facility
          </Text>
        )}
        {item.status === "FULFILLED" && (
          <Text style={styles.reqHint}>Stock issued — pull to sync</Text>
        )}
        {!!item.notes?.startsWith("ESCALATED") && (
          <Text style={styles.reqHint}>Escalated to district pharmacy</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === "en" ? "Drug Stock" : "Mankhwala"}
        </Text>
        <TouchableOpacity onPress={openRequest} style={styles.headerBtn}>
          <Ionicons name="cart-outline" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.segRow}>
        <TouchableOpacity
          style={[styles.segBtn, tab === "stock" && styles.segBtnActive]}
          onPress={() => setTab("stock")}
        >
          <Text
            style={[styles.segText, tab === "stock" && styles.segTextActive]}
          >
            Stock
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, tab === "requests" && styles.segBtnActive]}
          onPress={() => {
            setTab("requests");
            loadRequests();
          }}
        >
          <Text
            style={[styles.segText, tab === "requests" && styles.segTextActive]}
          >
            Requests{pendingReqCount > 0 ? ` (${pendingReqCount})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "stock" && lowCount > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={18} color={COLORS.danger} />
          <Text style={styles.alertBannerText}>
            {lowCount} drug{lowCount > 1 ? "s" : ""} running low — request
            restock
          </Text>
        </View>
      )}

      {tab === "stock" ? (
        <FlatList
          data={drugs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
                loadRequests();
              }}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flask-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyText}>No drug stock recorded</Text>
              <Text style={styles.emptySubText}>
                Drug stock will appear after syncing with the server
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openRequest}>
                <Ionicons name="cart-outline" size={18} color={COLORS.white} />
                <Text style={styles.emptyBtnText}>Request Drugs</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadRequests();
                setRefreshing(false);
              }}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyText}>No requests yet</Text>
              <Text style={styles.emptySubText}>
                Tap the cart icon to request drugs for your kit
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openRequest}>
                <Ionicons name="cart-outline" size={18} color={COLORS.white} />
                <Text style={styles.emptyBtnText}>Request Drugs</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal
        visible={showRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequest(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Drugs</Text>
              <TouchableOpacity onPress={() => setShowRequest(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              value={formSearch}
              onChangeText={setFormSearch}
              placeholder="Search drug..."
              placeholderTextColor={COLORS.placeholder}
            />

            <FlatList
              data={filteredFormulary}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.drugRow,
                    selDrug?.id === item.id && styles.drugRowSel,
                  ]}
                  onPress={() => {
                    setSelDrug(item);
                    setReqQty(String((item.minimum_threshold || 5) * 3));
                  }}
                >
                  <View style={styles.drugRowInfo}>
                    <Text style={styles.drugRowName}>
                      {language === "en"
                        ? item.name_english
                        : item.name_chichewa || item.name_english}
                    </Text>
                    <Text style={styles.drugRowSub}>
                      {item.drug_code} · {item.unit}
                    </Text>
                  </View>
                  {selDrug?.id === item.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.modalEmpty}>
                  No drugs found. Sync while online to load the formulary.
                </Text>
              }
            />

            {selDrug && (
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>Quantity ({selDrug.unit}s)</Text>
                <TextInput
                  style={styles.qtyInput}
                  value={reqQty}
                  onChangeText={setReqQty}
                  keyboardType="number-pad"
                  placeholder="e.g. 30"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!selDrug || sending) && styles.sendBtnDisabled,
              ]}
              disabled={!selDrug || sending}
              onPress={sendRequest}
            >
              <Text style={styles.sendBtnText}>
                {sending ? "Sending..." : "Send Request"}
              </Text>
            </TouchableOpacity>
          </View>
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
  headerBtn: { padding: 2 },
  segRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.sm,
  },
  segBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SIZES.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginHorizontal: 4,
  },
  segBtnActive: { borderBottomColor: COLORS.primary },
  segText: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  segTextActive: { color: COLORS.primary },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.danger,
  },
  alertBannerText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    color: COLORS.danger,
    fontWeight: "600",
  },
  list: { padding: SIZES.lg, gap: SIZES.sm },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardLow: { borderColor: COLORS.danger, borderWidth: 1.5 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.sm,
  },
  drugInfo: {},
  drugName: { fontSize: SIZES.fontMd, fontWeight: "600", color: COLORS.text },
  drugCode: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    fontFamily: "monospace",
  },
  lowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.dangerLight,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lowBadgeText: { fontSize: 10, color: COLORS.danger, fontWeight: "bold" },
  stockBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: SIZES.md,
  },
  stockBarFill: { height: 6, borderRadius: 3 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockNum: { fontSize: SIZES.fontXl, fontWeight: "bold" },
  stockUnit: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  qtyControls: { flexDirection: "row", gap: SIZES.sm },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  restockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.danger,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  restockBtnText: {
    color: COLORS.white,
    fontSize: SIZES.fontXs,
    fontWeight: "bold",
  },
  reqCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  reqTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reqName: {
    flex: 1,
    marginRight: 8,
    fontSize: SIZES.fontMd,
    fontWeight: "600",
    color: COLORS.text,
  },
  reqBadge: {
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reqBadgeText: { fontSize: 10, fontWeight: "bold" },
  reqMeta: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  reqHint: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: "600",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
    gap: SIZES.md,
  },
  emptyText: { fontSize: SIZES.fontLg, color: COLORS.textSecondary },
  emptySubText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: SIZES.xl,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    marginTop: SIZES.sm,
  },
  emptyBtnText: {
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    fontWeight: "bold",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  modalSearch: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    marginBottom: SIZES.sm,
  },
  modalList: { maxHeight: 300, marginBottom: SIZES.sm },
  drugRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.sm,
    backgroundColor: COLORS.white,
  },
  drugRowSel: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  drugRowInfo: { flex: 1 },
  drugRowName: {
    fontSize: SIZES.fontMd,
    fontWeight: "600",
    color: COLORS.text,
  },
  drugRowSub: {
    fontSize: SIZES.fontXs,
    color: COLORS.textMuted,
    fontFamily: "monospace",
    marginTop: 2,
  },
  modalEmpty: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: SIZES.fontSm,
    paddingVertical: SIZES.lg,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    marginBottom: SIZES.md,
    marginTop: SIZES.sm,
  },
  qtyLabel: { fontSize: SIZES.fontSm, fontWeight: "600", color: COLORS.text },
  qtyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    alignItems: "center",
    paddingVertical: SIZES.md,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: SIZES.fontMd,
  },
});
