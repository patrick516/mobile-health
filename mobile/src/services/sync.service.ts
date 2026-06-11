import NetInfo from "@react-native-community/netinfo";
import { getPending, markSynced, incrementRetry } from "../db/sync-queue";
import api from "./api";
import { getDb } from "../db/schema";

// Download drug stock from server
const downloadDrugStock = async () => {
  try {
    const response = await api.get("/drugs/stock");
    const stockData = response.data.data;

    if (!stockData || stockData.length === 0) {
      console.log("[SYNC] No drug stock to download");
      return;
    }

    const db = await getDb();

    for (const item of stockData) {
      // Insert or replace drug stock in local database
      await db.runAsync(
        `INSERT OR REPLACE INTO drug_stock (
          id, drug_id, drug_code, name_english, name_chichewa, 
          unit, quantity_current, quantity_minimum, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.drugId,
          item.drug.drugCode,
          item.drug.nameEnglish,
          item.drug.nameChichewa,
          item.drug.unit,
          item.quantityCurrent,
          item.quantityMinimum,
          new Date().toISOString(),
        ],
      );
    }

    console.log(`[SYNC] Downloaded ${stockData.length} drug stock records`);
  } catch (err) {
    console.error("[SYNC] Failed to download drug stock:", err);
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
      console.log("[SYNC] Nothing to sync");
      // Still try to download latest data
      await downloadDrugStock();
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
          console.log("[SYNC] Failed records:", JSON.stringify(failed));
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

    // After uploading, download latest drug stock
    await downloadDrugStock();

    return { synced: totalSynced, failed: totalFailed };
  } catch (err) {
    console.error("[SYNC] Unexpected error:", err);
    return { synced: 0, failed: 0 };
  }
};
