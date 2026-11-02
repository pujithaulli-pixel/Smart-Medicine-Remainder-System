/**
 * SQLite Database Module for Smart Medical Reminder System (Phase 7)
 * Powered by Node.js native DatabaseSync (node:sqlite)
 * Full relational schema, ACID transactions, foreign keys, and indexes.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine database path (supports in-memory for testing)
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultDbPath = path.join(dataDir, 'medical_reminder.db');
const dbFilePath = process.env.DB_PATH || defaultDbPath;

export const db = new DatabaseSync(dbFilePath);

// Enable foreign keys and WAL mode for reliability
db.exec('PRAGMA foreign_keys = ON;');
if (dbFilePath !== ':memory:') {
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch (e) {
    // WAL mode may not be supported on all file systems
  }
}

/**
 * Initialize all database tables and indexes
 */
export const initSchema = () => {
  db.exec(`
    -- 1. Users Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'patient',
      language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 2. Sessions Table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- 3. Medicines Table
    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      medicine_form TEXT DEFAULT 'tablet',
      route TEXT DEFAULT 'oral',
      dosage_amount TEXT NOT NULL,
      dosage_unit TEXT DEFAULT 'mg',
      doses_per_day TEXT DEFAULT '1',
      times_json TEXT NOT NULL,
      custom_reminder_label TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_ongoing INTEGER DEFAULT 1,
      food_instruction TEXT DEFAULT 'afterFood',
      image_url TEXT,
      prescription_file TEXT,
      doctor_name TEXT,
      prescription_reference TEXT,
      reason TEXT,
      instructions TEXT,
      quantity_remaining INTEGER DEFAULT 30,
      quantity_unit TEXT DEFAULT 'tablets',
      refill_threshold INTEGER DEFAULT 5,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 4. Dose Occurrences Table (Active Schedule & Reminders)
    CREATE TABLE IF NOT EXISTS dose_occurrences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dose_occurrence_id TEXT NOT NULL,
      medicine_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT DEFAULT 'upcoming',
      snooze_count INTEGER DEFAULT 0,
      snooze_deadline INTEGER,
      initial_alert_time INTEGER,
      recorded_time TEXT,
      skip_reason TEXT,
      notes TEXT,
      dosage TEXT,
      food_instruction TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, dose_occurrence_id)
    );

    -- 5. Dose History Table (Historical Log of Taken, Skipped, and Missed Doses)
    CREATE TABLE IF NOT EXISTS dose_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dose_occurrence_id TEXT NOT NULL,
      medicine_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL,
      recorded_time TEXT,
      snooze_count INTEGER DEFAULT 0,
      skip_reason TEXT,
      notes TEXT,
      dosage TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, dose_occurrence_id)
    );

    -- 6. Medicine History Table (Completed, Paused, or Discontinued Prescription Archive)
    CREATE TABLE IF NOT EXISTS medicine_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      medicine_id TEXT,
      name TEXT NOT NULL,
      dosage TEXT,
      category TEXT,
      start_date TEXT,
      end_date TEXT,
      is_ongoing INTEGER DEFAULT 0,
      duration TEXT,
      reason TEXT,
      doctor_name TEXT,
      image_url TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT NOT NULL
    );

    -- 7. Caretaker Profiles Table
    CREATE TABLE IF NOT EXISTS caretaker_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name TEXT,
      relationship TEXT,
      phone TEXT,
      email TEXT,
      preferred_channel TEXT DEFAULT 'email',
      preferred_language TEXT DEFAULT 'en',
      alerts_enabled INTEGER DEFAULT 1,
      notify_missed INTEGER DEFAULT 1,
      notify_low_stock INTEGER DEFAULT 1,
      notify_daily_summary INTEGER DEFAULT 0,
      quiet_hours_enabled INTEGER DEFAULT 0,
      quiet_hours_start TEXT DEFAULT '22:00',
      quiet_hours_end TEXT DEFAULT '07:00',
      emergency_notes TEXT,
      updated_at TEXT NOT NULL
    );

    -- 8. Caretaker Alerts Table (Logged Missed Doses, Snooze Limits, and External Deliveries)
    CREATE TABLE IF NOT EXISTS caretaker_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      idempotency_key TEXT UNIQUE,
      alert_type TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      scheduled_date TEXT,
      scheduled_time TEXT,
      dose_occurrence_id TEXT,
      channel TEXT,
      recipient_json TEXT,
      status TEXT NOT NULL,
      provider_message_id TEXT,
      error_message TEXT,
      reason TEXT,
      retry_count INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      created_at TEXT NOT NULL
    );

    -- 9. User Preferences Table
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      large_text_mode INTEGER DEFAULT 0,
      sound_enabled INTEGER DEFAULT 1,
      is_test_mode INTEGER DEFAULT 0,
      alarm_sound TEXT DEFAULT 'gentle-chime',
      updated_at TEXT NOT NULL
    );

    -- 10. User Uploads Table (Secure File Metadata)
    CREATE TABLE IF NOT EXISTS user_uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      stored_filename TEXT UNIQUE NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- 11. Patient-Caretaker Relationship Links (Phase 10)
    CREATE TABLE IF NOT EXISTS patient_caretaker_links (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      caretaker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'active',
      permissions_json TEXT DEFAULT '{"viewSchedule":true,"viewHistory":true,"receiveAlerts":true}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(patient_id, caretaker_id)
    );

    -- 12. Patient Caretaker Invitations (Phase 10)
    CREATE TABLE IF NOT EXISTS patient_invitations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invitation_code TEXT UNIQUE NOT NULL COLLATE NOCASE,
      permissions_json TEXT DEFAULT '{"viewSchedule":true,"viewHistory":true,"receiveAlerts":true}',
      status TEXT DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      used_by_caretaker_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      used_at TEXT
    );

    -- Indexes for performance and multi-tenant queries
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_medicines_user ON medicines(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_dose_occ_user_date ON dose_occurrences(user_id, date, status);
    CREATE INDEX IF NOT EXISTS idx_dose_hist_user_date ON dose_history(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_caretaker_alerts_user ON caretaker_alerts(user_id, alert_type, status);
    CREATE INDEX IF NOT EXISTS idx_user_uploads_user ON user_uploads(user_id);
    CREATE INDEX IF NOT EXISTS idx_patient_links_patient ON patient_caretaker_links(patient_id, status);
    CREATE INDEX IF NOT EXISTS idx_patient_links_caretaker ON patient_caretaker_links(caretaker_id, status);
    CREATE INDEX IF NOT EXISTS idx_patient_invitations_code ON patient_invitations(invitation_code, status);
  `);

  try {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'patient';");
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE user_preferences ADD COLUMN alarm_sound TEXT DEFAULT 'gentle-chime';");
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE caretaker_alerts ADD COLUMN acknowledged INTEGER DEFAULT 0;");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE caretaker_alerts ADD COLUMN acknowledged_at TEXT;");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE caretaker_alerts ADD COLUMN acknowledged_by TEXT;");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE caretaker_alerts ADD COLUMN caretaker_note TEXT;");
  } catch (e) {}
};

// Auto-run schema initialization
initSchema();
