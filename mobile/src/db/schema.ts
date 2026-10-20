import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
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
        if (!e?.message?.includes("duplicate column")) {
          console.warn(
            `[DB] Migration warning on ${table}.${column}:`,
            e?.message,
          );
        }
      }
    };

    // ─── ALTER statements (safe — run every startup, ignored if column exists) ───
    // ── Name split for members ──
    await addColumnIfMissing("members", "first_name", "TEXT");
    await addColumnIfMissing("members", "last_name", "TEXT");
    // ── Name split for cached_users ──
    await addColumnIfMissing("cached_users", "first_name", "TEXT");
    await addColumnIfMissing("cached_users", "last_name", "TEXT");
    // ── Existing other migrations ──
    await addColumnIfMissing("households", "head_national_id", "TEXT");
    await addColumnIfMissing(
      "households",
      "consent_given",
      "INTEGER DEFAULT 0",
    );
    await addColumnIfMissing("households", "consent_signature_url", "TEXT");
    await addColumnIfMissing("members", "national_id", "TEXT");
    await addColumnIfMissing("cached_users", "facility", "TEXT DEFAULT NULL");
    await addColumnIfMissing("notifications", "user_id", "TEXT");
    await addColumnIfMissing("households", "registered_by_name", "TEXT");
    await addColumnIfMissing("households", "wall_material", "TEXT");
    await addColumnIfMissing("households", "roof_material", "TEXT");
    await addColumnIfMissing("households", "floor_type", "TEXT");
    await addColumnIfMissing(
      "households",
      "has_electricity",
      "INTEGER DEFAULT 0",
    );
    await addColumnIfMissing("visits", "weight_kg", "REAL");
    await addColumnIfMissing("visits", "height_cm", "REAL");
    await addColumnIfMissing("visits", "z_score_wfa", "REAL");
    await addColumnIfMissing("visits", "z_score_hfa", "REAL");
    await addColumnIfMissing("visits", "z_score_wfh", "REAL");
    await addColumnIfMissing("visits", "growth_status", "TEXT");
    await addColumnIfMissing("tb_cases", "treatment_number", "TEXT");

    // ─── CREATE TABLE IF NOT EXISTS (for fresh installs) ───
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
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        full_name TEXT,
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
        weight_kg REAL,
        height_cm REAL,
        z_score_wfa REAL,
        z_score_hfa REAL,
        z_score_wfh REAL,
        growth_status TEXT,
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
        first_name TEXT,
        last_name TEXT,
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
        user_id TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS supervisor_feedback (
        id TEXT PRIMARY KEY,
        ccw_id TEXT NOT NULL,
        supervisor_id TEXT NOT NULL,
        supervisor_name TEXT,
        period_month INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        visits_count INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS fp_visits (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        member_id TEXT NOT NULL,
        visited_by_id TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        method TEXT NOT NULL,
        quantity_given INTEGER,
        next_follow_up_date TEXT,
        side_effects TEXT,
        referral_needed INTEGER DEFAULT 0,
        counselling_given INTEGER DEFAULT 1,
        notes TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS tb_cases (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        member_id TEXT NOT NULL,
        registered_by_id TEXT NOT NULL,
        treatment_start_date TEXT NOT NULL,
        treatment_category TEXT NOT NULL,
        facility_id TEXT,
        treatment_number TEXT,
        is_active INTEGER DEFAULT 1,
        outcome TEXT,
        outcome_date TEXT,
        notes TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS tb_dot_visits (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        tb_case_id TEXT NOT NULL,
        visited_by_id TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        status TEXT DEFAULT 'OBSERVED',
        drugs_given TEXT,
        missed_reason TEXT,
        notes TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS pnc_visits (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL UNIQUE,
        member_id TEXT NOT NULL,
        pnc_number INTEGER NOT NULL,
        expected_date TEXT NOT NULL,
        status TEXT DEFAULT 'SCHEDULED',
        visited_date TEXT,
        visited_by_id TEXT,
        mother_temperature REAL,
        mother_blood_pressure TEXT,
        mother_breast_status TEXT,
        mother_uterus_status TEXT,
        mother_danger_signs TEXT,
        newborn_weight REAL,
        newborn_temperature REAL,
        newborn_cord_status TEXT,
        is_breastfeeding INTEGER DEFAULT 0,
        newborn_danger_signs TEXT,
        referral_needed INTEGER DEFAULT 0,
        notes TEXT,
        synced INTEGER DEFAULT 0,
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

    // ─── BACKFILL: split existing full_name into first/last ───
    try {
      const membersToBackfill = await database.getAllAsync<{
        id: string;
        full_name: string;
      }>(
        "SELECT id, full_name FROM members WHERE full_name IS NOT NULL AND (first_name IS NULL OR first_name = '')",
      );
      for (const m of membersToBackfill) {
        const parts = (m.full_name || "").trim().split(/\s+/);
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";
        await database.runAsync(
          "UPDATE members SET first_name = ?, last_name = ? WHERE id = ?",
          [firstName, lastName, m.id],
        );
      }
      if (membersToBackfill.length > 0) {
        console.log(`[DB] Backfilled ${membersToBackfill.length} member names`);
      }
    } catch (e) {
      console.warn("[DB] Failed to backfill member names:", e);
    }

    try {
      const usersToBackfill = await database.getAllAsync<{
        id: string;
        full_name: string;
      }>(
        "SELECT id, full_name FROM cached_users WHERE full_name IS NOT NULL AND (first_name IS NULL OR first_name = '')",
      );
      for (const u of usersToBackfill) {
        const parts = (u.full_name || "").trim().split(/\s+/);
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";
        await database.runAsync(
          "UPDATE cached_users SET first_name = ?, last_name = ? WHERE id = ?",
          [firstName, lastName, u.id],
        );
      }
      if (usersToBackfill.length > 0) {
        console.log(`[DB] Backfilled ${usersToBackfill.length} user names`);
      }
    } catch (e) {
      console.warn("[DB] Failed to backfill user names:", e);
    }

    console.log("[DB] SQLite initialised successfully");
  } catch (err) {
    console.error("[DB] Init error:", err);
    throw err;
  }
};

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
      PNC_VISIT: "pnc_visits",
      TB_DOT_VISIT: "tb_dot_visits",
      FP_VISIT: "fp_visits",
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

export const resetDatabase = async (): Promise<void> => {
  try {
    const database = await getDb();

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
      DROP TABLE IF EXISTS supervisor_feedback;
      DROP TABLE IF EXISTS fp_visits;
      DROP TABLE IF EXISTS tb_dot_visits;
      DROP TABLE IF EXISTS tb_cases;
      DROP TABLE IF EXISTS pnc_visits;
      DROP TABLE IF EXISTS stock_requests;
    `);

    console.log("[DB] Database reset successfully");
    await initDb();
    console.log("[DB] Database reinitialized after reset");
  } catch (error) {
    console.error("[DB] Reset error:", error);
    throw error;
  }
};
