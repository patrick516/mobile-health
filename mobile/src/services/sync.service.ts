import NetInfo from "@react-native-community/netinfo";
import { getPending, markSynced, incrementRetry } from "../db/sync-queue";
import api from "./api";
import { getDb } from "../db/schema";

// Pull immunisation schedules, drug stock and referral feedback from server
const pullFromServer = async () => {
  try {
    const db = await getDb();

    // 1. Pull immunisation schedules for children in our households
    const schedulesRes = await api.get("/immunisations/schedules");
    const schedules = schedulesRes.data.data || [];

    for (const s of schedules) {
      await db.runAsync(
        `INSERT OR REPLACE INTO immunisation_schedules 
         (id, member_id, vaccine_code, dose_number, due_date, status, given_at)
         VALUES (?,?,?,?,?,?,?)`,
        [
          s.id,
          s.memberId,
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

    for (const r of referrals) {
      await db.runAsync(
        `UPDATE referrals SET 
           status = ?, diagnosis = ?, treatment_given = ?, 
           feedback_note = ?
         WHERE local_id = ? OR id = ?`,
        [
          r.status,
          r.diagnosis || null,
          r.treatmentGiven || null,
          r.feedbackNote || null,
          r.localId,
          r.id,
        ],
      );
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
    if (pending.length === 0) {
      console.log("[SYNC] Nothing to sync — pulling latest data");
      await pullFromServer();
      return { synced: 0, failed: 0 };
    }

    console.log(`[SYNC] Sending ${pending.length} records...`);

    const BATCH_SIZE = 20;
    let totalSynced = 0;
    let totalFailed = 0;

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
        console.error("[SYNC] Batch error:", err.response?.data || err.message);
        await incrementRetry(batch.map((r) => r.localId));
        totalFailed += batch.length;
      }
    }

    // After pushing, pull latest data from server
    if (totalSynced > 0) {
      await pullFromServer();
    }

    console.log(`[SYNC] Done — ${totalSynced} synced, ${totalFailed} failed`);
    return { synced: totalSynced, failed: totalFailed };
  } catch (err) {
    console.error("[SYNC] Unexpected error:", err);
    return { synced: 0, failed: 0 };
  }
};
