import { getDb } from "./schema";
import * as Crypto from "expo-crypto";
const uuidv4 = () => Crypto.randomUUID();

export type SyncRecordType =
  | "HOUSEHOLD"
  | "MEMBER"
  | "VISIT"
  | "REFERRAL"
  | "IMMUNISATION"
  | "DRUG_DISPENSE"
  | "STOCK_REQUEST"
  | "ANC_VISIT"
  | "PNC_VISIT"
  | "TB_DOT_VISIT"
  | "FP_VISIT"
  | "VILLAGE";

export interface SyncRecord {
  localId: string;
  type: SyncRecordType;
  payload: Record<string, unknown>;
}

// ─── CHECK IF RECORD EXISTS IN MAIN TABLE ───
const recordExists = async (
  db: any,
  type: string,
  localId: string,
  payload: any,
): Promise<boolean> => {
  try {
    let result: any;
    switch (type) {
      case "HOUSEHOLD":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM households WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;

      case "MEMBER":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM members WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;

      case "VISIT":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM visits WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;

      case "REFERRAL":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM referrals WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;

      case "IMMUNISATION":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM immunisations WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;

      case "DRUG_DISPENSE":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM drug_dispenses WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;

      case "STOCK_REQUEST":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM stock_requests WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;

      case "ANC_VISIT":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM anc_visits WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;
      case "FP_VISIT":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM fp_visits WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;
      case "TB_DOT_VISIT":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM tb_dot_visits WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;

      case "PNC_VISIT":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM pnc_visits WHERE local_id = ? OR id = ?`,
          [localId, localId],
        );
        return (result?.count || 0) > 0;

      case "VILLAGE":
        result = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM villages WHERE id = ?`,
          [payload?.id || localId],
        );
        return (result?.count || 0) > 0;

      default:
        return true;
    }
  } catch (error) {
    console.error(`[SYNC] Error checking ${type}:`, error);
    return true;
  }
};

// ─── CLEAN ORPHANED RECORDS ───
export const cleanOrphanedRecords = async (): Promise<number> => {
  try {
    const db = await getDb();
    let cleanedCount = 0;

    const pending: any[] = await db.getAllAsync(
      `SELECT local_id, record_type, payload FROM sync_queue
       WHERE synced = 0 AND sync_attempts < 10`,
    );

    if (pending.length === 0) {
      return 0;
    }

    console.log(`[SYNC] Checking ${pending.length} pending records...`);

    for (const record of pending) {
      const payload = JSON.parse(record.payload);
      const localId = record.local_id;
      const type = record.record_type;

      const exists = await recordExists(db, type, localId, payload);

      if (!exists) {
        await db.runAsync(`DELETE FROM sync_queue WHERE local_id = ?`, [
          localId,
        ]);
        cleanedCount++;
        console.log(`[SYNC] 🗑️ Removed orphaned: ${type} (${localId})`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`[SYNC] ✅ Cleaned ${cleanedCount} orphaned records`);
    } else {
      console.log(`[SYNC] ✅ No orphaned records found`);
    }

    return cleanedCount;
  } catch (error) {
    console.error("[SYNC] Error cleaning orphaned records:", error);
    return 0;
  }
};

// ─── FORCE CLEAR ALL PENDING ───
export const forceClearSyncQueue = async (): Promise<number> => {
  try {
    const db = await getDb();
    const result: any = await db.runAsync(
      `DELETE FROM sync_queue WHERE synced = 0`,
    );
    console.log(`[SYNC] 🧹 Force cleared ${result.changes} records`);
    return result.changes || 0;
  } catch (error) {
    console.error("[SYNC] Force clear error:", error);
    return 0;
  }
};

// ─── DEBUG: Show pending records ───
export const debugPendingRecords = async (): Promise<any[]> => {
  try {
    const db = await getDb();
    const rows: any[] = await db.getAllAsync(
      `SELECT local_id, record_type, payload, sync_attempts, created_at 
       FROM sync_queue 
       WHERE synced = 0 AND sync_attempts < 10`,
    );

    console.log(`[DEBUG] 📊 Pending records: ${rows.length}`);
    for (const row of rows) {
      console.log(
        `  - ${row.record_type}: ${row.local_id} (attempts: ${row.sync_attempts})`,
      );
    }
    return rows;
  } catch (error) {
    console.error("[DEBUG] Error:", error);
    return [];
  }
};

// ─── ADD RECORD TO SYNC QUEUE ───
export const enqueue = async (
  type: SyncRecordType,
  payload: Record<string, unknown>,
): Promise<string> => {
  const db = await getDb();
  const localId = (payload.localId as string) || uuidv4();

  await db.runAsync(
    `INSERT OR REPLACE INTO sync_queue (local_id, record_type, payload, synced, sync_attempts)
     VALUES (?, ?, ?, 0, 0)`,
    [localId, type, JSON.stringify(payload)],
  );

  return localId;
};

// ─── GET PENDING RECORDS ───
export const getPending = async (): Promise<SyncRecord[]> => {
  const db = await getDb();

  await cleanOrphanedRecords();

  const rows: any[] = await db.getAllAsync(
    `SELECT local_id, record_type, payload FROM sync_queue
     WHERE synced = 0 AND sync_attempts < 10
      ORDER BY 
       CASE record_type
         WHEN 'VILLAGE' THEN 0
         WHEN 'HOUSEHOLD' THEN 1
         WHEN 'MEMBER' THEN 2
         WHEN 'VISIT' THEN 3
         WHEN 'REFERRAL' THEN 4
         WHEN 'IMMUNISATION' THEN 5
         WHEN 'DRUG_DISPENSE' THEN 6
         WHEN 'STOCK_REQUEST' THEN 7
         WHEN 'ANC_VISIT' THEN 8
        WHEN 'PNC_VISIT' THEN 9
        WHEN 'TB_DOT_VISIT' THEN 10
         WHEN 'FP_VISIT' THEN 11
         ELSE 12
       END,
       created_at ASC
     LIMIT 50`,
  );

  return rows.map((r: any) => ({
    localId: r.local_id,
    type: r.record_type as SyncRecordType,
    payload: JSON.parse(r.payload),
  }));
};

// ─── MARK RECORDS AS SYNCED ───
export const markSynced = async (localIds: string[]): Promise<void> => {
  if (localIds.length === 0) return;
  const db = await getDb();
  const placeholders = localIds.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE sync_queue SET synced = 1 WHERE local_id IN (${placeholders})`,
    localIds,
  );
};

// ─── INCREMENT RETRY COUNTER ───
export const incrementRetry = async (localIds: string[]): Promise<void> => {
  if (localIds.length === 0) return;
  const db = await getDb();
  const placeholders = localIds.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE sync_queue
     SET sync_attempts = sync_attempts + 1, last_attempt_at = datetime('now')
     WHERE local_id IN (${placeholders})`,
    localIds,
  );
};

// ─── COUNT PENDING RECORDS ───
export const getPendingCount = async (): Promise<number> => {
  const db = await getDb();

  await cleanOrphanedRecords();

  const result: any = await db.getFirstAsync(
    `SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0 AND sync_attempts < 10`,
  );
  return result?.count ?? 0;
};
