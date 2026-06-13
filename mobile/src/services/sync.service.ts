import NetInfo from "@react-native-community/netinfo";
import { getPending, markSynced, incrementRetry } from "../db/sync-queue";
import api from "./api";
import { getDb } from "../db/schema";
import * as Crypto from "expo-crypto";

// Pull immunisation schedules, drug stock and referral feedback from server
const pullFromServer = async () => {
  try {
    const db = await getDb();

    // Check if notifications table exists, create if not
    const tables = await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    const hasNotifications = tables.some(
      (t: any) => t.name === "notifications",
    );
    console.log(`[SYNC] Notifications table exists: ${hasNotifications}`);

    if (!hasNotifications) {
      console.log(`[SYNC] Creating notifications table...`);
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

    // 1. Pull immunisation schedules for children in our households
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

    // 2. Pull referral feedback (nurse sent back to CHW)
    const referralsRes = await api.get("/referrals", {
      params: { limit: 100 },
    });
    const referrals = referralsRes.data.data || [];

    // Fetch member names for each referral (if not already included)
    for (const r of referrals) {
      if (!r.member && r.memberId) {
        const member = await db.getFirstAsync<{ full_name: string }>(
          `SELECT full_name FROM members WHERE id = ? OR local_id = ?`,
          [r.memberId, r.memberId],
        );
        if (member) {
          r.member = { fullName: member.full_name };
        }
      }
    }

    console.log(`[SYNC] === REFERRAL DEBUG ===`);
    console.log(`[SYNC] Server returned ${referrals.length} referrals`);

    for (const r of referrals) {
      console.log(
        `[SYNC] Server referral: id=${r.id}, localId=${r.localId}, status=${r.status}, member=${r.member?.fullName}`,
      );

      // Try to find local referral by server id or local_id
      const existing = await db.getFirstAsync<{ id: string; local_id: string }>(
        `SELECT id, local_id FROM referrals WHERE id = ? OR local_id = ?`,
        [r.id, r.localId],
      );

      if (existing) {
        // Get old status before update
        const oldStatus = await db.getFirstAsync<{ status: string }>(
          `SELECT status FROM referrals WHERE id = ?`,
          [existing.id],
        );

        console.log(
          `[SYNC] Old status: ${oldStatus?.status}, New status: ${r.status}`,
        );

        await db.runAsync(
          `UPDATE referrals SET 
             status = ?, diagnosis = ?, treatment_given = ?, 
             feedback_note = ?, synced = 1
           WHERE id = ?`,
          [
            r.status,
            r.diagnosis || null,
            r.treatmentGiven || null,
            r.feedbackNote || null,
            existing.id,
          ],
        );

        // CREATE NOTIFICATION if status changed to TREATED or FEEDBACK_SENT
        const shouldNotify =
          oldStatus?.status !== r.status &&
          (r.status === "TREATED" || r.status === "FEEDBACK_SENT");

        console.log(`[SYNC] Should create notification? ${shouldNotify}`);

        if (shouldNotify) {
          const memberName = r.member?.fullName || "a patient";
          const message = r.feedbackNote
            ? `Nurse feedback for ${memberName}: ${r.feedbackNote.substring(0, 100)}`
            : `Referral for ${memberName} has been marked as ${r.status}`;

          const notificationId = Crypto.randomUUID();

          await db.runAsync(
            `INSERT INTO notifications (
              id, title, message, type, related_id, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              notificationId,
              "Referral Feedback Received",
              message,
              "REFERRAL",
              r.id,
              0,
              new Date().toISOString(),
            ],
          );
          console.log(
            `[SYNC] 🔔 Created notification for referral ${r.id} (ID: ${notificationId})`,
          );
        }

        console.log(`[SYNC] ✅ Updated referral ${r.id} status to ${r.status}`);
      } else {
        console.log(`[SYNC] ⚠️ Referral ${r.id} not found locally, skipping`);
      }
    }

    // 3. Pull drug stock from server
    const stockRes = await api.get("/drugs/stock");
    const stocks = stockRes.data.data || [];

    for (const s of stocks) {
      await db.runAsync(
        `INSERT OR REPLACE INTO drug_stock 
         (id, drug_id, drug_code, name_english, name_chichewa, unit, quantity_current, quantity_minimum)
         VALUES (?,?,?,?,?,?,?,?)`,
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
    }

    // Clear old test notifications if any
    await db.runAsync(
      `DELETE FROM notifications WHERE type = 'TEST' OR title = '📱 System Test'`,
    );

    // Count notifications for debugging
    const notifCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM notifications",
    );
    console.log(`[SYNC] Total notifications in DB: ${notifCount?.count || 0}`);

    console.log(
      `[SYNC] Pulled ${schedules.length} vaccine schedules, ${referrals.length} referrals, ${stocks.length} drug stocks`,
    );
  } catch (err) {
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
      console.log(`[SYNC] Sending ${pending.length} records...`);

      // DEBUG: Log each record in detail
      pending.forEach((record, index) => {
        console.log(
          `[SYNC] Record ${index + 1}:`,
          JSON.stringify(
            {
              type: record.type,
              localId: record.localId,
              payload: record.payload,
            },
            null,
            2,
          ),
        );
      });

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
            totalSynced += confirmed.length;
          }

          if (failed?.length > 0) {
            console.log("[SYNC] Failed:", JSON.stringify(failed));
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
    } else {
      console.log("[SYNC] Nothing to sync");
    }

    // ALWAYS pull latest data from server
    console.log("[SYNC] Pulling latest data from server...");
    await pullFromServer();

    console.log(`[SYNC] Done — ${totalSynced} synced, ${totalFailed} failed`);
    return { synced: totalSynced, failed: totalFailed };
  } catch (err) {
    console.error("[SYNC] Unexpected error:", err);
    return { synced: 0, failed: 0 };
  }
};
