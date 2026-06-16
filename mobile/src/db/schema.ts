import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync("mobilehealth.db");
    await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  }
  return db;
};

export const initDb = async (): Promise<void> => {
  try {
    const database = await getDb();
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
        household_number TEXT,
        structure_type TEXT,
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
    `);

    // Migration — add new tables if they don't exist yet
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_users (
        id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL UNIQUE,
        pin_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        zone_allocations TEXT DEFAULT '[]',
        ta_allocations TEXT DEFAULT '[]',
        token TEXT,
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
