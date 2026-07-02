import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  // Wait if initialization is in progress
  while (isInitializing) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!db) {
    try {
      isInitializing = true;
      const rawDb = await SQLite.openDatabaseAsync("mobilehealth.db");
      await rawDb.execAsync(
        "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;",
      );
      db = wrapWithQueue(rawDb);
      console.log("[DB] Database opened successfully");
    } catch (error) {
      console.error("[DB] Failed to open database:", error);
      throw error;
    } finally {
      isInitializing = false;
    }
  }
  return db;
};

// ─── Serialize concurrent statement execution ──────────────────────
// expo-sqlite on Android has thrown native NullPointerExceptions in
// prepareAsync when two callers issue statements on the same connection
// at the same moment (e.g. background sync pull running while a screen
// mounts and queries at the same time). This wraps the four async query
// methods so every call — from any of the ~50 getDb() call sites across
// the app — runs strictly one after another, in the order requested.
// Nothing about the returned object's shape or usage changes; every
// existing call site keeps working exactly as written.
function wrapWithQueue(rawDb: SQLite.SQLiteDatabase): SQLite.SQLiteDatabase {
  let queue: Promise<any> = Promise.resolve();
  const serialize = <T extends (...args: any[]) => Promise<any>>(fn: T): T => {
    return ((...args: any[]) => {
      const run = () => fn.apply(rawDb, args);
      const result = queue.then(run, run);
      queue = result.catch(() => {});
      return result;
    }) as T;
  };

  rawDb.runAsync = serialize(rawDb.runAsync.bind(rawDb));
  rawDb.getAllAsync = serialize(rawDb.getAllAsync.bind(rawDb));
  rawDb.getFirstAsync = serialize(rawDb.getFirstAsync.bind(rawDb));
  rawDb.execAsync = serialize(rawDb.execAsync.bind(rawDb));

  return rawDb;
}

export const initDb = async (): Promise<void> => {
  try {
    const database = await getDb();

    // Migration — add new columns to existing tables (safe to run repeatedly)
    const addColumnIfMissing = async (
      table: string,
      column: string,
      definition: string,
    ) => {
      try {
        await database.execAsync(
          `ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`,
        );
      } catch (e: any) {
        // Ignore "duplicate column" errors — means it already exists
        if (!e?.message?.includes("duplicate column")) {
          console.warn(
            `[DB] Migration warning on ${table}.${column}:`,
            e?.message,
          );
        }
      }
    };

    await addColumnIfMissing("households", "head_national_id", "TEXT");
    await addColumnIfMissing(
      "households",
      "consent_given",
      "INTEGER DEFAULT 0",
    );
    await addColumnIfMissing("households", "consent_signature_url", "TEXT");
    await addColumnIfMissing("members", "national_id", "TEXT");
    await addColumnIfMissing("cached_users", "facility", "TEXT DEFAULT NULL");
    // Needed for same-zone visibility + "Added by X" attribution label
    await addColumnIfMissing("households", "registered_by_user_id", "TEXT");
    await addColumnIfMissing("households", "registered_by_name", "TEXT");
    // New structure fields
    await addColumnIfMissing("households", "wall_material", "TEXT");
    await addColumnIfMissing("households", "roof_material", "TEXT");
    await addColumnIfMissing("households", "floor_type", "TEXT");
    await addColumnIfMissing(
      "households",
      "has_electricity",
      "INTEGER DEFAULT 0",
    );
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT NOT NULL UNIQUE,
        record_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        sync_attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS households (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        village_id TEXT NOT NULL,
        village_name TEXT NOT NULL,
        zone_name TEXT NOT NULL,
        ta_name TEXT NOT NULL,
        head_of_household_name TEXT NOT NULL,
        head_phone TEXT,
        head_national_id TEXT,
        consent_given INTEGER DEFAULT 0,
        consent_signature_url TEXT,
        household_number TEXT,
        structure_type TEXT,
        wall_material TEXT,
        roof_material TEXT,
        floor_type TEXT,
        has_electricity INTEGER DEFAULT 0,
        water_source TEXT,
        latrine_present INTEGER DEFAULT 0,
        latrine_type TEXT,
        handwashing_facility INTEGER DEFAULT 0,
        distance_to_facility TEXT,
        mosquito_nets TEXT,
        number_of_rooms INTEGER,
        landmark TEXT,
        gps_lat REAL,
        gps_lng REAL,
        status TEXT DEFAULT 'ACTIVE',
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        household_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        date_of_birth TEXT,
        estimated_age INTEGER,
        sex TEXT NOT NULL,
        relationship_to_head TEXT NOT NULL,
        is_pregnant INTEGER DEFAULT 0,
        lmp_date TEXT,
        expected_delivery_date TEXT,
        chronic_illnesses TEXT,
        has_disability INTEGER DEFAULT 0,
        disability_type TEXT,
        national_id TEXT,
        phone TEXT,
        status TEXT DEFAULT 'ACTIVE',
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        member_id TEXT NOT NULL,
        household_id TEXT NOT NULL,
        visited_at TEXT NOT NULL,
        visit_type TEXT NOT NULL,
        symptoms TEXT,
        temperature REAL,
        muac_mm INTEGER,
        muac_status TEXT,
        danger_signs TEXT,
        referral_needed INTEGER DEFAULT 0,
        gps_lat REAL,
        gps_lng REAL,
        notes TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        visit_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        destination_facility_id TEXT,
        reason TEXT NOT NULL,
        urgency TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        due_by TEXT,
        feedback_note TEXT,
        diagnosis TEXT,
        treatment_given TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS immunisations (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        member_id TEXT NOT NULL,
        vaccine_code TEXT NOT NULL,
        dose_number INTEGER NOT NULL,
        given_at TEXT NOT NULL,
        batch_number TEXT,
        route TEXT,
        next_due_date TEXT,
        facility_or_outreach TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS immunisation_schedules (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        vaccine_code TEXT NOT NULL,
        dose_number INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT DEFAULT 'DUE',
        given_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS anc_visits (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        anc_number INTEGER NOT NULL,
        expected_date TEXT NOT NULL,
        status TEXT DEFAULT 'SCHEDULED',
        attended_date TEXT,
        notes TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS drug_stock (
        id TEXT PRIMARY KEY,
        drug_id TEXT NOT NULL,
        drug_code TEXT NOT NULL,
        name_english TEXT NOT NULL,
        name_chichewa TEXT NOT NULL,
        unit TEXT NOT NULL,
        quantity_current INTEGER NOT NULL DEFAULT 0,
        quantity_minimum INTEGER NOT NULL DEFAULT 5,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS drug_dispenses (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        visit_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        drug_id TEXT NOT NULL,
        quantity_dispensed INTEGER NOT NULL,
        dispensed_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS villages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        zone_id TEXT NOT NULL,
        zone_name TEXT NOT NULL,
        gps_lat REAL,
        gps_lng REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
     CREATE TABLE IF NOT EXISTS cached_users (
        id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL UNIQUE,
        pin_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        zone_allocations TEXT DEFAULT '[]',
        ta_allocations TEXT DEFAULT '[]',
        token TEXT,
        facility TEXT DEFAULT NULL,
        cached_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS zones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ta_id TEXT,
        ta_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
        success INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS login_lockouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL UNIQUE,
        locked_until TEXT,
        lockout_count INTEGER DEFAULT 0,
        last_lockout_at TEXT,
        is_permanent INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        related_id TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stock_requests (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        drug_id TEXT NOT NULL,
        quantity_requested INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING',
        notes TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    console.log("[DB] SQLite initialised successfully");
  } catch (err) {
    console.error("[DB] Init error:", err);
    throw err;
  }
};
// ─── ONE-TIME BACKFILL ──────────────────────────────────────────────
// Before markRecordTablesSynced existed, confirmed sync_queue records
// never propagated synced=1 onto their actual table (households,
// members, etc). This catches anything stuck in that state. Safe to
// run on every app start — it only touches rows that are still 0.
export const backfillSyncedFlags = async (): Promise<void> => {
  try {
    const database = await getDb();
    const tableByType: Record<string, string> = {
      HOUSEHOLD: "households",
      MEMBER: "members",
      VISIT: "visits",
      REFERRAL: "referrals",
      IMMUNISATION: "immunisations",
      DRUG_DISPENSE: "drug_dispenses",
      STOCK_REQUEST: "stock_requests",
      ANC_VISIT: "anc_visits",
    };

    for (const [type, table] of Object.entries(tableByType)) {
      const result: any = await database.runAsync(
        `UPDATE ${table} SET synced = 1
         WHERE synced = 0
         AND local_id IN (
           SELECT local_id FROM sync_queue
           WHERE record_type = ? AND synced = 1
         )`,
        [type],
      );
      if (result?.changes > 0) {
        console.log(
          `[DB] Backfilled ${result.changes} synced flag(s) on ${table}`,
        );
      }
    }
  } catch (err) {
    console.error("[DB] Backfill error:", err);
  }
};
// ─── RESET DATABASE ──────────────────────────────────────────────
export const resetDatabase = async (): Promise<void> => {
  try {
    const database = await getDb();

    // Drop all tables
    await database.execAsync(`
      DROP TABLE IF EXISTS sync_queue;
      DROP TABLE IF EXISTS households;
      DROP TABLE IF EXISTS members;
      DROP TABLE IF EXISTS visits;
      DROP TABLE IF EXISTS referrals;
      DROP TABLE IF EXISTS immunisations;
      DROP TABLE IF EXISTS immunisation_schedules;
      DROP TABLE IF EXISTS anc_visits;
      DROP TABLE IF EXISTS drug_stock;
      DROP TABLE IF EXISTS drug_dispenses;
      DROP TABLE IF EXISTS villages;
      DROP TABLE IF EXISTS cached_users;
      DROP TABLE IF EXISTS zones;
      DROP TABLE IF EXISTS login_attempts;
      DROP TABLE IF EXISTS login_lockouts;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS stock_requests;
    `);

    console.log("[DB]  Database reset successfully");

    // Reinitialize
    await initDb();
    console.log("[DB] Database reinitialized after reset");
  } catch (error) {
    console.error("[DB] Reset error:", error);
    throw error;
  }
};
