import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPending, markSynced, incrementRetry } from "../db/sync-queue";

import api from "./api";
import { getDb } from "../db/schema";
import { useAppStore } from "../store";
import * as Crypto from "expo-crypto";
import { Alert } from "react-native";

const TABLE_BY_TYPE: Record<string, string> = {
  HOUSEHOLD: "households",
  MEMBER: "members",
  VISIT: "visits",
  REFERRAL: "referrals",
  IMMUNISATION: "immunisations",
  DRUG_DISPENSE: "drug_dispenses",
  STOCK_REQUEST: "stock_requests",
  PNC_VISIT: "pnc_visits",
  TB_DOT_VISIT: "tb_dot_visits",
  FP_VISIT: "fp_visits",
};

const markRecordTablesSynced = async (
  batch: { type: string; localId: string }[],
  confirmedLocalIds: string[],
) => {
  const db = await getDb();
  const confirmedSet = new Set(confirmedLocalIds);
  const idsByTable: Record<string, string[]> = {};
  for (const record of batch) {
    if (!confirmedSet.has(record.localId)) continue;
    const table = TABLE_BY_TYPE[record.type];
    if (!table) continue;
    if (!idsByTable[table]) idsByTable[table] = [];
    idsByTable[table].push(record.localId);
  }
  for (const [table, ids] of Object.entries(idsByTable)) {
    if (ids.length === 0) continue;
    const placeholders = ids.map(() => "?").join(",");
    try {
      await db.runAsync(
        `UPDATE ${table} SET synced = 1 WHERE local_id IN (${placeholders})`,
        ids,
      );
    } catch (err) {
      console.error(`[SYNC] Failed to mark ${table} synced:`, err);
    }
  }
};

const pullFromServer = async () => {
  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (!token) {
      console.log("[SYNC] No auth token, skipping pull");
      return;
    }

    const db = await getDb();

    const tables = await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    const hasNotifications = tables.some(
      (t: any) => t.name === "notifications",
    );
    if (!hasNotifications) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          related_id TEXT,
          is_read INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    }

    // ── Households + members: download them so a new phone starts with its data
    try {
      let page = 1;
      let totalPages = 1;
      do {
        const hhRes = await api.get("/households", {
          params: { page, limit: 100 },
        });
        const serverHouseholds = hhRes.data.data || [];
        totalPages = hhRes.data.pagination?.totalPages || 1;

        Alert.alert(
          "Sync debug",
          `Households page ${page}: ${serverHouseholds.length} received`,
        );
        for (const h of serverHouseholds) {
          const existingHh = await db.getFirstAsync<{ id: string }>(
            `SELECT id FROM households
             WHERE id = ? OR local_id = ?
                OR (household_number IS NOT NULL AND household_number = ?)`,
            [h.id, h.localId || h.id, h.householdNumber || ""],
          );
          if (existingHh) continue;

          await db.runAsync(
            `INSERT INTO households
             (id, local_id, village_id, village_name, zone_name, ta_name,
              head_of_household_name, head_phone, head_national_id, consent_given,
              registered_by_name, registered_by_user_id, household_number,
              structure_type, wall_material, roof_material, floor_type,
              has_electricity, water_source, latrine_present, latrine_type,
              handwashing_facility, distance_to_facility, mosquito_nets,
              number_of_rooms, landmark, gps_lat, gps_lng, status, synced,
              created_at, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
            [
              h.id,
              h.localId || h.id,
              h.villageId,
              h.village?.name || "",
              h.village?.zone?.name || "",
              h.village?.zone?.ta?.name || "",
              h.headOfHouseholdName,
              h.headPhone || null,
              h.headNationalId || null,
              h.consentGiven ? 1 : 0,
              h.registeredByName || null,
              h.registeredByUserId || h.registeredById || null,
              h.householdNumber || null,
              h.structureType || null,
              h.wallMaterial || null,
              h.roofMaterial || null,
              h.floorType || null,
              h.hasElectricity ? 1 : 0,
              h.waterSource || null,
              h.latrinePresent ? 1 : 0,
              h.latrineType || null,
              h.handwashingFacility ? 1 : 0,
              h.distanceToFacility || null,
              h.mosquitoNets || null,
              h.numberOfRooms ?? null,
              h.landmark || null,
              h.gpsLat ?? null,
              h.gpsLng ?? null,
              h.status || "ACTIVE",
              h.createdAt || new Date().toISOString(),
              h.updatedAt || new Date().toISOString(),
            ],
          );

          for (const m of h.members || []) {
            const existingMember = await db.getFirstAsync<{ id: string }>(
              `SELECT id FROM members WHERE id = ? OR local_id = ?`,
              [m.id, m.localId || m.id],
            );
            if (existingMember) continue;
            await db.runAsync(
              `INSERT INTO members
               (id, local_id, household_id, first_name, last_name, full_name,
                date_of_birth, estimated_age, sex, relationship_to_head,
                is_pregnant, status, synced)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`,
              [
                m.id,
                m.localId || m.id,
                h.id,
                m.firstName || "",
                m.lastName || "",
                `${m.firstName || ""} ${m.lastName || ""}`.trim() || null,
                m.dateOfBirth || null,
                m.estimatedAge ?? null,
                m.sex || "",
                m.relationshipToHead || "",
                m.isPregnant ? 1 : 0,
                "ACTIVE",
              ],
            );
          }
        }
        page += 1;
      } while (page <= totalPages);
    } catch (hhErr: any) {
      console.log("[SYNC] Household pull skipped:", hhErr?.message);
    }
    Alert.alert("Sync debug", `Household pull failed: ${hhErr?.message}`);
    const schedulesRes = await api.get("/immunisations/schedules", {
      params: { _t: Date.now() },
    });
    const schedules = schedulesRes.data.data || [];
    for (const s of schedules) {
      const localMember = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM members WHERE id = ? OR local_id = ?`,
        [s.memberId, s.memberId],
      );
      const resolvedMemberId = localMember?.id ?? s.memberId;
      await db.runAsync(
        `INSERT OR REPLACE INTO immunisation_schedules 
         (id, member_id, vaccine_code, dose_number, due_date, status, given_at)
         VALUES (?,?,?,?,?,?,?)`,
        [
          s.id,
          resolvedMemberId,
          s.vaccineCode,
          s.doseNumber,
          s.dueDate,
          s.status,
          s.givenAt || null,
        ],
      );
    }

    const referralsRes = await api.get("/referrals", {
      params: { limit: 100 },
    });
    const referrals = referralsRes.data.data || [];

    // Resolve member names from local DB using split names
    for (const r of referrals) {
      if (!r.member && r.memberId) {
        const member = await db.getFirstAsync<{
          first_name: string;
          last_name: string;
          full_name: string | null;
        }>(
          `SELECT first_name, last_name, full_name FROM members WHERE id = ? OR local_id = ?`,
          [r.memberId, r.memberId],
        );
        if (member) {
          const resolvedName =
            `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
            member.full_name ||
            "Unknown";
          r.member = { fullName: resolvedName };
        }
      } else if (r.member && r.member.firstName !== undefined) {
        // Server now returns firstName/lastName on nested member
        r.member.fullName =
          `${r.member.firstName || ""} ${r.member.lastName || ""}`.trim() ||
          r.member.fullName;
      }
    }

    for (const r of referrals) {
      const existing = await db.getFirstAsync<{ id: string; local_id: string }>(
        `SELECT id, local_id FROM referrals WHERE id = ? OR local_id = ?`,
        [r.id, r.localId],
      );

      if (existing) {
        const oldStatus = await db.getFirstAsync<{ status: string }>(
          `SELECT status FROM referrals WHERE id = ?`,
          [existing.id],
        );

        await db.runAsync(
          `UPDATE referrals SET status = ?, diagnosis = ?, treatment_given = ?, feedback_note = ?, synced = 1 WHERE id = ?`,
          [
            r.status,
            r.diagnosis || null,
            r.treatmentGiven || null,
            r.feedbackNote || null,
            existing.id,
          ],
        );

        const shouldNotify =
          oldStatus?.status !== r.status &&
          (r.status === "TREATED" ||
            r.status === "FEEDBACK_SENT" ||
            r.status === "COMPLETED");
        if (shouldNotify) {
          const memberName = r.member?.fullName || "a patient";
          const message = r.feedbackNote
            ? `Nurse feedback for ${memberName}: ${r.feedbackNote.substring(0, 100)}`
            : `Referral for ${memberName} has been marked as ${r.status}`;
          const notificationId = Crypto.randomUUID();
          await db.runAsync(
            `INSERT INTO notifications (id, title, message, type, related_id, user_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              notificationId,
              "Referral Feedback Received",
              message,
              "REFERRAL",
              r.id,
              useAppStore.getState().user?.id || null,
              0,
              new Date().toISOString(),
            ],
          );
        }
      }
    }

    try {
      const ancRes = await api.get("/anc/schedules", {
        params: { _t: Date.now() },
      });
      const ancVisits = ancRes.data.data || [];
      for (const a of ancVisits) {
        const localMember = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM members WHERE id = ? OR local_id = ?`,
          [a.memberId, a.memberId],
        );
        const resolvedMemberId = localMember?.id ?? a.memberId;
        await db.runAsync(
          `INSERT OR REPLACE INTO anc_visits (id, member_id, anc_number, expected_date, status, attended_date, notes) VALUES (?,?,?,?,?,?,?)`,
          [
            a.id,
            resolvedMemberId,
            a.ancNumber,
            a.expectedDate,
            a.status,
            a.attendedDate || null,
            a.notes || null,
          ],
        );

        // ── No date memorisation: remind the CCW when a contact is due
        //    soon (≤3 days) or already overdue. Deduped by related_id,
        //    and cleared once the contact is attended.
        if (a.status === "ATTENDED") {
          await db.runAsync(
            `DELETE FROM notifications WHERE related_id = ? AND type = 'ANC'`,
            [a.id],
          );
          continue;
        }
        const dueSoon =
          a.status === "OVERDUE" ||
          (a.status === "SCHEDULED" &&
            new Date(a.expectedDate).getTime() - Date.now() <=
              3 * 24 * 60 * 60 * 1000);
        if (dueSoon) {
          const already = await db.getFirstAsync<{ id: string }>(
            `SELECT id FROM notifications WHERE related_id = ? AND type = 'ANC'`,
            [a.id],
          );
          if (!already) {
            const mother = a.memberName || "A pregnant woman";
            const when = new Date(a.expectedDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });
            const message =
              a.status === "OVERDUE"
                ? `ANC ${a.ancNumber} for ${mother} is OVERDUE (due ${when}) — follow up today`
                : `ANC ${a.ancNumber} for ${mother} is due ${when} — remind her at the next household visit`;
            await db.runAsync(
              `INSERT INTO notifications (id, title, message, type, related_id, user_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                Crypto.randomUUID(),
                "ANC Follow-up Reminder",
                message,
                "ANC",
                a.id,
                useAppStore.getState().user?.id || null,
                0,
                new Date().toISOString(),
              ],
            );
          }
        }
      }
    } catch (ancErr) {
      console.log("[SYNC] ANC pull skipped");
    }

    let stocks: any[] = [];
    try {
      const stockRes = await api.get("/drugs/stock");
      stocks = stockRes.data.data || [];
      const meId = useAppStore.getState().user?.id;
      let pickupFacility =
        (useAppStore.getState().user as any)?.facility?.name || "";
      const pickedUp: string[] = [];
      for (const s of stocks) {
        const prev = await db.getFirstAsync<{ quantity_current: number }>(
          `SELECT quantity_current FROM drug_stock WHERE id = ?`,
          [s.id],
        );
        await db.runAsync(
          `INSERT OR REPLACE INTO drug_stock (id, drug_id, drug_code, name_english, name_chichewa, unit, quantity_current, quantity_minimum) VALUES (?,?,?,?,?,?,?,?)`,
          [
            s.id,
            s.drugId || s.drug.id,
            s.drug.drugCode,
            s.drug.nameEnglish,
            s.drug.nameChichewa,
            s.drug.unit,
            s.quantityCurrent,
            s.quantityMinimum,
          ],
        );
        if (
          meId &&
          s.user?.id === meId &&
          (!prev || s.quantityCurrent > prev.quantity_current)
        ) {
          pickedUp.push(s.drug.nameEnglish);
          pickupFacility = pickupFacility || s.user?.facility?.name || "";
        }
      }
      if (pickedUp.length > 0) {
        await db.runAsync(
          `INSERT INTO notifications (id, title, message, type, related_id, user_id, is_read, created_at) VALUES (?,?,?,?,?,?,?,?)`,
          [
            Crypto.randomUUID(),
            "Drugs Issued — Pick Up",
            `Visit ${pickupFacility || "your facility"} to pick up: ${pickedUp.join(", ")}`,
            "DRUG_PICKUP",
            null,
            meId || null,
            0,
            new Date().toISOString(),
          ],
        );
      }
    } catch (stockErr: any) {
      console.log("[SYNC] Drug stock pull skipped:", stockErr?.message);
    }

    // Drug formulary — lets the CCW pick a drug when requesting a restock
    try {
      const formRes = await api.get("/drugs");
      const formulary = formRes.data.data || [];
      for (const d of formulary) {
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
    } catch (err: any) {
      console.log("[SYNC] Drug formulary pull skipped:", err.message);
    }

    try {
      const stockReqsRes = await api.get("/drugs/requests", {
        params: { limit: 50 },
      });
      const stockRequests = stockReqsRes.data.data || [];
      const notifyRequestOutcome = async (req: any) => {
        const notifId = Crypto.randomUUID();
        await db.runAsync(
          `INSERT INTO notifications (id, title, message, type, related_id, user_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            notifId,
            req.status === "FULFILLED"
              ? " Stock Request Fulfilled"
              : " Stock Request Rejected",
            req.status === "FULFILLED"
              ? `Your request for ${req.quantityRequested} ${req.drug?.unit}s of ${req.drug?.nameEnglish} is ready.`
              : `Your stock request for ${req.drug?.nameEnglish} was rejected.`,
            "STOCK_REQUEST",
            req.id,
            useAppStore.getState().user?.id || null,
            0,
            new Date().toISOString(),
          ],
        );
      };
      for (const req of stockRequests) {
        // 1) Exact match — requests created from this phone use the local id
        //    as the server id, so they always match here.
        let existing = await db.getFirstAsync<{ id: string; status: string }>(
          `SELECT id, status FROM stock_requests WHERE id = ? OR local_id = ?`,
          [req.id, req.localId || req.id],
        );

        // 2) Fallback — same drug + quantity, still open (covers rows created
        //    before this fix or from another device).
        if (!existing && req.drug?.id) {
          existing = await db.getFirstAsync<{ id: string; status: string }>(
            `SELECT id, status FROM stock_requests
             WHERE drug_id = ? AND quantity_requested = ?
               AND status IN ('PENDING','APPROVED')
             ORDER BY created_at DESC LIMIT 1`,
            [req.drug.id, req.quantityRequested],
          );
        }

        if (existing) {
          // Only act on a real status transition (stops repeat notifications)
          if (existing.status === req.status || req.status === "PENDING")
            continue;
          await db.runAsync(
            `UPDATE stock_requests SET status = ?, synced = 1 WHERE id = ?`,
            [req.status, existing.id],
          );
          if (req.status === "FULFILLED" || req.status === "REJECTED") {
            await notifyRequestOutcome(req);
          }
          continue;
        }

        // 3) Not tracked locally (made on web / another device / reinstall)
        if (req.status === "PENDING" || !req.drug) continue;
        const mirrored = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM stock_requests
           WHERE drug_id = ? AND status = ? AND quantity_requested = ?
           LIMIT 1`,
          [req.drug.id, req.status, req.quantityRequested],
        );
        if (mirrored) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO stock_requests (id, local_id, drug_id, drug_name, quantity_requested, status, notes, synced)
           VALUES (?,?,?,?,?,?,?,1)`,
          [
            req.id,
            req.id,
            req.drug.id,
            req.drug.nameEnglish,
            req.quantityRequested,
            req.status,
            req.notes || null,
          ],
        );
        if (req.status === "FULFILLED" || req.status === "REJECTED") {
          await notifyRequestOutcome(req);
        }
      }
    } catch (err: any) {
      console.log("[SYNC] Stock requests pull skipped:", err.message);
    }

    try {
      const fbRes = await api.get("/feedback/my");
      const feedbackList = fbRes.data?.data || [];
      for (const fb of feedbackList) {
        // Supervisor name — prefer split names from server, fall back to fullName
        const supFirstName = fb.supervisor?.firstName || "";
        const supLastName = fb.supervisor?.lastName || "";
        const supFullName =
          `${supFirstName} ${supLastName}`.trim() ||
          fb.supervisor?.fullName ||
          null;

        await db.runAsync(
          `INSERT OR REPLACE INTO supervisor_feedback (id, ccw_id, supervisor_id, supervisor_name, period_month, period_year, rating, comment, visits_count, is_read, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            fb.id,
            fb.ccwId,
            fb.supervisorId,
            supFullName,
            fb.periodMonth,
            fb.periodYear,
            fb.rating,
            fb.comment,
            fb.visitsCount ?? null,
            fb.isRead ? 1 : 0,
            fb.createdAt,
          ],
        );

        if (!fb.isRead) {
          const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const period = `${months[fb.periodMonth - 1]} ${fb.periodYear}`;
          const notifId = Crypto.randomUUID();
          const existing = await db.getFirstAsync<{ id: string }>(
            `SELECT id FROM notifications WHERE related_id = ?`,
            [fb.id],
          );
          if (!existing) {
            await db.runAsync(
              `INSERT INTO notifications (id, title, message, type, related_id, user_id, is_read, created_at) VALUES (?,?,?,?,?,?,?,?)`,
              [
                notifId,
                "Supervisor Feedback Received",
                `${supFullName || "Your supervisor"} rated your performance ${fb.rating}/5 for ${period}: "${fb.comment.substring(0, 80)}${fb.comment.length > 80 ? "..." : ""}"`,
                "FEEDBACK",
                fb.id,
                useAppStore.getState().user?.id || null,
                0,
                new Date().toISOString(),
              ],
            );
          }
        }
      }
    } catch (fbErr: any) {
      console.log("[SYNC] Feedback pull skipped:", fbErr.message);
    }

    await db.runAsync(
      `DELETE FROM notifications WHERE type = 'TEST' OR title = '📱 System Test'`,
    );
    console.log(
      `[SYNC] Pulled ${schedules.length} vaccine schedules, ${referrals.length} referrals, ${stocks.length} drug stocks`,
    );
  } catch (err: any) {
    console.error("[SYNC] Pull error:", err);
  }
};

export const runSync = async (): Promise<{
  synced: number;
  failed: number;
}> => {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log("[SYNC] No connection — skipping");
      return { synced: 0, failed: 0 };
    }

    const pending = await getPending();
    let totalSynced = 0;
    let totalFailed = 0;

    if (pending.length > 0) {
      const BATCH_SIZE = 20;
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        try {
          const response = await api.post("/sync", {
            records: batch.map((r) => ({
              type: r.type,
              localId: r.localId,
              payload: r.payload,
            })),
          });
          const { confirmed, failed } = response.data;
          if (confirmed?.length > 0) {
            await markSynced(confirmed);
            await markRecordTablesSynced(batch, confirmed);
            totalSynced += confirmed.length;
          }
          if (failed?.length > 0) {
            await incrementRetry(
              failed.map((f: { localId: string }) => f.localId),
            );
            totalFailed += failed.length;
          }
        } catch (err: any) {
          console.error(
            "[SYNC] Batch error:",
            err.response?.data || err.message,
          );
          await incrementRetry(batch.map((r) => r.localId));
          totalFailed += batch.length;
        }
      }
    }

    await pullFromServer();
    console.log(`[SYNC] Done — ${totalSynced} synced, ${totalFailed} failed`);
    return { synced: totalSynced, failed: totalFailed };
  } catch (err: any) {
    console.error("[SYNC] Unexpected error:", err);
    return { synced: 0, failed: 0 };
  }
};
