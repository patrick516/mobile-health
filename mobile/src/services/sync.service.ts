import NetInfo from "@react-native-community/netinfo";
import { getPending, markSynced, incrementRetry } from "../db/sync-queue";
import api from "./api";

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
      return { synced: 0, failed: 0 };
    }

    console.log(`[SYNC] Sending ${pending.length} records...`);

    // Send in batches of 20
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
          await incrementRetry(
            failed.map((f: { localId: string }) => f.localId),
          );
          totalFailed += failed.length;
        }
      } catch (err) {
        console.error("[SYNC] Batch failed:", err);
        await incrementRetry(batch.map((r) => r.localId));
        totalFailed += batch.length;
      }
    }

    console.log(`[SYNC] Done — ${totalSynced} synced, ${totalFailed} failed`);
    return { synced: totalSynced, failed: totalFailed };
  } catch (err) {
    console.error("[SYNC] Unexpected error:", err);
    return { synced: 0, failed: 0 };
  }
};
