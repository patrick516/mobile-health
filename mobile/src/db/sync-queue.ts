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
  | "VILLAGE"; // ← ADD THIS LINE

export interface SyncRecord {
  localId: string;
  type: SyncRecordType;
  payload: Record<string, unknown>;
}

// Add a record to the sync queue
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

export const getPending = async (): Promise<SyncRecord[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    local_id: string;
    record_type: string;
    payload: string;
  }>(
    `SELECT local_id, record_type, payload FROM sync_queue
     WHERE synced = 0 AND sync_attempts < 10
      ORDER BY 
       CASE record_type
         WHEN 'VILLAGE' THEN 0       -- ← Sync villages FIRST
         WHEN 'HOUSEHOLD' THEN 1
         WHEN 'MEMBER' THEN 2
         WHEN 'VISIT' THEN 3
         WHEN 'REFERRAL' THEN 4
         WHEN 'IMMUNISATION' THEN 5
         WHEN 'DRUG_DISPENSE' THEN 6
         WHEN 'STOCK_REQUEST' THEN 7
         WHEN 'ANC_VISIT' THEN 8
         ELSE 9
       END,
       created_at ASC
     LIMIT 50`,
  );
  return rows.map((r) => ({
    localId: r.local_id,
    type: r.record_type as SyncRecordType,
    payload: JSON.parse(r.payload),
  }));
};

// Mark records as synced
export const markSynced = async (localIds: string[]): Promise<void> => {
  if (localIds.length === 0) return;
  const db = await getDb();
  const placeholders = localIds.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE sync_queue SET synced = 1 WHERE local_id IN (${placeholders})`,
    localIds,
  );
};

// Increment retry counter for failed records
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

// Count pending records (for UI badge)
export const getPendingCount = async (): Promise<number> => {
  const db = await getDb();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0 AND sync_attempts < 10`,
  );
  return result?.count ?? 0;
};
