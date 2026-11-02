import crypto from 'node:crypto';
import { db } from '../db.js';
import { hashPassword, registerUser } from './authService.js';

export const DEMO_PATIENT = {
  name: 'Ramesh Patel (Demo Patient)',
  email: 'demo.patient@smartreminder.org',
  password: 'DemoPatient123!',
  role: 'patient'
};

export const DEMO_CARETAKER = {
  name: 'Sunita Patel (Demo Caretaker)',
  email: 'demo.caretaker@smartreminder.org',
  password: 'DemoCaretaker123!',
  role: 'caretaker'
};

export const seedDemoAccounts = async () => {
  try {
    // 1. Ensure Demo Patient exists
    let patientRow = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(DEMO_PATIENT.email);
    if (!patientRow) {
      const reg = registerUser({
        name: DEMO_PATIENT.name,
        email: DEMO_PATIENT.email,
        password: DEMO_PATIENT.password,
        role: DEMO_PATIENT.role,
        language: 'en'
      });
      patientRow = { id: reg.user.id, email: reg.user.email, role: reg.user.role };
      console.log(`[Demo Seed] Created Demo Patient (ID: ${patientRow.id})`);
    }

    // 2. Ensure Demo Caretaker exists
    let caretakerRow = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(DEMO_CARETAKER.email);
    if (!caretakerRow) {
      const reg = registerUser({
        name: DEMO_CARETAKER.name,
        email: DEMO_CARETAKER.email,
        password: DEMO_CARETAKER.password,
        role: DEMO_CARETAKER.role,
        language: 'en'
      });
      caretakerRow = { id: reg.user.id, email: reg.user.email, role: reg.user.role };
      console.log(`[Demo Seed] Created Demo Caretaker (ID: ${caretakerRow.id})`);
    }

    const patientId = patientRow.id;
    const caretakerId = caretakerRow.id;

    // 3. Ensure Medicines exist for Demo Patient
    const existingMeds = db.prepare('SELECT id FROM medicines WHERE user_id = ?').all(patientId);
    if (existingMeds.length === 0) {
      const med1Id = `med-demo-101`;
      const med2Id = `med-demo-102`;
      const med3Id = `med-demo-103`;

      db.prepare(`
        INSERT INTO medicines (
          id, user_id, name, medicine_form, route, dosage_amount, dosage_unit,
          doses_per_day, times_json, start_date, is_ongoing, food_instruction,
          status, doctor_name, notes, quantity_remaining, quantity_unit,
          refill_threshold, created_at, updated_at
        ) VALUES (
          ?, ?, 'Metformin Hydrochloride', 'tablet', 'oral', '500', 'mg',
          '2', '["08:00","20:00"]', '2026-10-01', 1, 'afterFood',
          'active', 'Dr. Anand Verma', 'Take after food to avoid stomach discomfort.',
          28, 'tablets', 10, datetime('now'), datetime('now')
        )
      `).run(med1Id, patientId);

      db.prepare(`
        INSERT INTO medicines (
          id, user_id, name, medicine_form, route, dosage_amount, dosage_unit,
          doses_per_day, times_json, start_date, is_ongoing, food_instruction,
          status, doctor_name, notes, quantity_remaining, quantity_unit,
          refill_threshold, created_at, updated_at
        ) VALUES (
          ?, ?, 'Amlodipine Besylate', 'tablet', 'oral', '5', 'mg',
          '1', '["09:00"]', '2026-10-01', 1, 'beforeFood',
          'active', 'Dr. Ramesh Gupta', 'Blood pressure management.',
          14, 'tablets', 5, datetime('now'), datetime('now')
        )
      `).run(med2Id, patientId);

      db.prepare(`
        INSERT INTO medicines (
          id, user_id, name, medicine_form, route, dosage_amount, dosage_unit,
          doses_per_day, times_json, start_date, is_ongoing, food_instruction,
          status, doctor_name, notes, quantity_remaining, quantity_unit,
          refill_threshold, created_at, updated_at
        ) VALUES (
          ?, ?, 'Atorvastatin Calcium', 'tablet', 'oral', '10', 'mg',
          '1', '["21:00"]', '2026-10-01', 1, 'afterFood',
          'active', 'Dr. Ramesh Gupta', 'Low stock warning test.',
          4, 'tablets', 10, datetime('now'), datetime('now')
        )
      `).run(med3Id, patientId);

      console.log(`[Demo Seed] Seeded 3 medicines for Demo Patient`);

      // Seed Dose Occurrences for today
      const todayStr = new Date().toISOString().slice(0, 10);
      const nowIso = new Date().toISOString();

      db.prepare(`
        INSERT OR IGNORE INTO dose_occurrences (
          id, user_id, dose_occurrence_id, medicine_id, medicine_name, date,
          scheduled_time, status, recorded_time, snooze_count, dosage, food_instruction,
          created_at, updated_at
        ) VALUES
        (?, ?, 'demo-occ-01', ?, 'Metformin Hydrochloride', ?, '08:00', 'taken', ?, 0, '500 mg', 'afterFood', ?, ?),
        (?, ?, 'demo-occ-02', ?, 'Amlodipine Besylate', ?, '09:00', 'missed', NULL, 3, '5 mg', 'beforeFood', ?, ?),
        (?, ?, 'demo-occ-03', ?, 'Metformin Hydrochloride', ?, '20:00', 'upcoming', NULL, 0, '500 mg', 'afterFood', ?, ?),
        (?, ?, 'demo-occ-04', ?, 'Atorvastatin Calcium', ?, '21:00', 'upcoming', NULL, 0, '10 mg', 'afterFood', ?, ?)
      `).run(
        `doc-${crypto.randomUUID()}`, patientId, med1Id, todayStr, nowIso, nowIso, nowIso,
        `doc-${crypto.randomUUID()}`, patientId, med2Id, todayStr, nowIso, nowIso,
        `doc-${crypto.randomUUID()}`, patientId, med1Id, todayStr, nowIso, nowIso,
        `doc-${crypto.randomUUID()}`, patientId, med3Id, todayStr, nowIso, nowIso
      );

      // Seed Dose History
      db.prepare(`
        INSERT OR IGNORE INTO dose_history (
          id, user_id, dose_occurrence_id, medicine_id, medicine_name, date,
          scheduled_time, status, recorded_time, snooze_count, notes, dosage, created_at
        ) VALUES
        (?, ?, 'demo-occ-01', ?, 'Metformin Hydrochloride', ?, '08:00', 'taken', ?, 0, 'Taken with breakfast', '500 mg', ?),
        (?, ?, 'demo-occ-02', ?, 'Amlodipine Besylate', ?, '09:00', 'missed', NULL, 3, 'Dose window expired', '5 mg', ?)
      `).run(
        `dh-${crypto.randomUUID()}`, patientId, med1Id, todayStr, nowIso, nowIso,
        `dh-${crypto.randomUUID()}`, patientId, med2Id, todayStr, nowIso
      );
    }

    // 4. Ensure Caretaker Details profile exists
    const existingCaretakerProfile = db.prepare('SELECT user_id FROM caretaker_profiles WHERE user_id = ?').get(patientId);
    if (!existingCaretakerProfile) {
      db.prepare(`
        INSERT OR REPLACE INTO caretaker_profiles (
          user_id, name, relationship, phone, email, preferred_language, preferred_channel,
          alerts_enabled, notify_missed, notify_snooze_limit, notify_low_stock, updated_at
        ) VALUES (
          ?, 'Sunita Patel', 'Daughter & Primary Caregiver', '+91 98765 43210', 'demo.caretaker@smartreminder.org',
          'en', 'email', 1, 1, 1, 1, datetime('now')
        )
      `).run(patientId);
    }

    // 5. Ensure Active Link in patient_caretaker_links exists between Patient and Caretaker
    const existingLink = db.prepare(`
      SELECT id FROM patient_caretaker_links
      WHERE patient_id = ? AND caretaker_id = ?
    `).get(patientId, caretakerId);

    if (!existingLink) {
      db.prepare(`
        INSERT INTO patient_caretaker_links (
          patient_id, caretaker_id, status, permissions_json, created_at, updated_at
        ) VALUES (
          ?, ?, 'active', '{"viewSchedule":true,"viewHistory":true,"receiveAlerts":true}',
          datetime('now'), datetime('now')
        )
      `).run(patientId, caretakerId);
      console.log(`[Demo Seed] Established active link between Patient ${patientId} and Caretaker ${caretakerId}`);
    }

    // 6. Ensure Realistic Alerts in caretaker_alerts exist
    const existingAlerts = db.prepare('SELECT id FROM caretaker_alerts WHERE user_id = ?').all(patientId);
    if (existingAlerts.length === 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const nowIso = new Date().toISOString();
      const recipientJson = JSON.stringify({ name: 'Sunita Patel', to: 'demo.caretaker@smartreminder.org', channel: 'email' });

      db.prepare(`
        INSERT INTO caretaker_alerts (
          id, user_id, alert_type, medicine_name, scheduled_date, scheduled_time,
          channel, recipient_json, status, reason, created_at,
          acknowledged, caretaker_note, acknowledged_at, acknowledged_by
        ) VALUES
        (
          ?, ?, 'missed_dose', 'Amlodipine Besylate (5 mg)', ?, '09:00',
          'email', ?, 'sent',
          'Patient did not take dose within 5-minute grace period after 3 snoozes.',
          datetime('now', '-45 minutes'), 0, NULL, NULL, NULL
        ),
        (
          ?, ?, 'missed_dose', 'Metformin Hydrochloride (500 mg)', date(?, '-1 day'), '20:00',
          'email', ?, 'delivered',
          'Missed evening dose.', datetime('now', '-14 hours'), 1,
          'Called father, he confirmed he was asleep and took it later.',
          datetime('now', '-13 hours'), ?
        ),
        (
          ?, ?, 'low_stock', 'Atorvastatin Calcium (10 mg)', ?, '21:00',
          'email', ?, 'sent',
          'Low stock warning: only 4 tablets remaining (threshold is 10).',
          datetime('now', '-2 hours'), 0, NULL, NULL, NULL
        )
      `).run(
        `alt-${crypto.randomUUID()}`, patientId, todayStr, recipientJson,
        `alt-${crypto.randomUUID()}`, patientId, todayStr, recipientJson, caretakerId,
        `alt-${crypto.randomUUID()}`, patientId, todayStr, recipientJson
      );
      console.log(`[Demo Seed] Seeded 3 sample caretaker alerts (unresolved and acknowledged)`);
    }

    console.log('[Demo Seed] Demo accounts and sample datasets successfully verified.');
    return { success: true };
  } catch (err) {
    console.error('[Demo Seed Error]:', err);
    return { success: false, error: err.message };
  }
};
