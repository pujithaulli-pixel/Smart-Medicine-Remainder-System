/**
 * Data Persistence Service for Smart Medical Reminder System (Phase 7)
 * Multi-tenant, isolated database operations per authenticated user.
 */

import crypto from 'node:crypto';
import { db } from '../db.js';

// -----------------------------------------------------------------------------
// MEDICINES
// -----------------------------------------------------------------------------

export const getMedicines = (userId, { status = 'all', search = '' } = {}) => {
  let query = 'SELECT * FROM medicines WHERE user_id = ?';
  const params = [userId];

  if (status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search && search.trim()) {
    query += ' AND (name LIKE ? OR doctor_name LIKE ? OR reason LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params);

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    category: r.medicine_form,
    medicineForm: r.medicine_form,
    route: r.route,
    dosageAmount: r.dosage_amount,
    dosageUnit: r.dosage_unit,
    dosage: `${r.dosage_amount} ${r.dosage_unit}`,
    dosesPerDay: r.doses_per_day,
    times: r.times_json ? JSON.parse(r.times_json) : ['08:00'],
    reminderTimes: r.times_json ? JSON.parse(r.times_json) : ['08:00'],
    customReminderLabel: r.custom_reminder_label,
    startDate: r.start_date,
    endDate: r.end_date,
    isOngoing: Boolean(r.is_ongoing),
    ongoing: Boolean(r.is_ongoing),
    foodInstruction: r.food_instruction,
    imageUrl: r.image_url,
    medicineImage: r.image_url,
    prescriptionFile: r.prescription_file,
    doctorName: r.doctor_name,
    prescriptionReference: r.prescription_reference,
    reason: r.reason,
    instructions: r.instructions,
    remainingQuantity: r.quantity_remaining,
    quantityRemaining: r.quantity_remaining,
    quantityUnit: r.quantity_unit,
    refillThreshold: r.refill_threshold,
    notes: r.notes,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
};

export const getMedicineById = (userId, id) => {
  const r = db.prepare('SELECT * FROM medicines WHERE user_id = ? AND id = ?').get(userId, id);
  if (!r) return null;

  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    category: r.medicine_form,
    medicineForm: r.medicine_form,
    route: r.route,
    dosageAmount: r.dosage_amount,
    dosageUnit: r.dosage_unit,
    dosage: `${r.dosage_amount} ${r.dosage_unit}`,
    dosesPerDay: r.doses_per_day,
    times: r.times_json ? JSON.parse(r.times_json) : ['08:00'],
    reminderTimes: r.times_json ? JSON.parse(r.times_json) : ['08:00'],
    customReminderLabel: r.custom_reminder_label,
    startDate: r.start_date,
    endDate: r.end_date,
    isOngoing: Boolean(r.is_ongoing),
    ongoing: Boolean(r.is_ongoing),
    foodInstruction: r.food_instruction,
    imageUrl: r.image_url,
    medicineImage: r.image_url,
    prescriptionFile: r.prescription_file,
    doctorName: r.doctor_name,
    prescriptionReference: r.prescription_reference,
    reason: r.reason,
    instructions: r.instructions,
    remainingQuantity: r.quantity_remaining,
    quantityRemaining: r.quantity_remaining,
    quantityUnit: r.quantity_unit,
    refillThreshold: r.refill_threshold,
    notes: r.notes,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
};

export const createMedicine = (userId, data) => {
  const id = data.id || `med-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const nowIso = new Date().toISOString();
  const times = Array.isArray(data.times)
    ? data.times
    : Array.isArray(data.reminderTimes)
    ? data.reminderTimes
    : ['08:00'];

  const stmt = db.prepare(`
    INSERT INTO medicines (
      id, user_id, name, medicine_form, route, dosage_amount, dosage_unit,
      doses_per_day, times_json, custom_reminder_label, start_date, end_date,
      is_ongoing, food_instruction, image_url, prescription_file, doctor_name,
      prescription_reference, reason, instructions, quantity_remaining,
      quantity_unit, refill_threshold, notes, status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    id,
    userId,
    data.name.trim(),
    data.category || data.medicineForm || 'tablet',
    data.route || 'oral',
    String(data.dosageAmount || data.dosage || '1').trim(),
    data.dosageUnit || 'mg',
    String(data.dosesPerDay || times.length || '1'),
    JSON.stringify(times),
    data.customReminderLabel || '',
    data.startDate,
    data.endDate || null,
    data.isOngoing !== false && data.ongoing !== false ? 1 : 0,
    data.foodInstruction || 'afterFood',
    data.imageUrl || data.medicineImage || '',
    data.prescriptionFile || data.prescriptionDoc || '',
    data.doctorName || '',
    data.prescriptionReference || '',
    data.reason || '',
    data.instructions || '',
    parseInt(data.quantityRemaining || data.remainingQuantity, 10) || 30,
    data.quantityUnit || 'tablets',
    parseInt(data.refillThreshold, 10) || 5,
    data.notes || '',
    data.status || 'active',
    nowIso,
    nowIso
  );

  return getMedicineById(userId, id);
};

export const updateMedicine = (userId, id, data) => {
  const existing = getMedicineById(userId, id);
  if (!existing) throw new Error('Medicine not found or unauthorized.');

  const nowIso = new Date().toISOString();
  const times = Array.isArray(data.times)
    ? data.times
    : Array.isArray(data.reminderTimes)
    ? data.reminderTimes
    : existing.times;

  const stmt = db.prepare(`
    UPDATE medicines SET
      name = ?, medicine_form = ?, route = ?, dosage_amount = ?, dosage_unit = ?,
      doses_per_day = ?, times_json = ?, custom_reminder_label = ?, start_date = ?, end_date = ?,
      is_ongoing = ?, food_instruction = ?, image_url = ?, prescription_file = ?, doctor_name = ?,
      prescription_reference = ?, reason = ?, instructions = ?, quantity_remaining = ?,
      quantity_unit = ?, refill_threshold = ?, notes = ?, status = ?, updated_at = ?
    WHERE user_id = ? AND id = ?
  `);

  stmt.run(
    data.name !== undefined ? data.name.trim() : existing.name,
    data.category || data.medicineForm || existing.category,
    data.route || existing.route,
    data.dosageAmount !== undefined ? String(data.dosageAmount) : existing.dosageAmount,
    data.dosageUnit || existing.dosageUnit,
    data.dosesPerDay !== undefined ? String(data.dosesPerDay) : existing.dosesPerDay,
    JSON.stringify(times),
    data.customReminderLabel !== undefined ? data.customReminderLabel : existing.customReminderLabel,
    data.startDate || existing.startDate,
    data.endDate !== undefined ? data.endDate : existing.endDate,
    data.isOngoing !== undefined ? (data.isOngoing ? 1 : 0) : existing.isOngoing ? 1 : 0,
    data.foodInstruction || existing.foodInstruction,
    data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
    data.prescriptionFile !== undefined ? data.prescriptionFile : existing.prescriptionFile,
    data.doctorName !== undefined ? data.doctorName : existing.doctorName,
    data.prescriptionReference !== undefined ? data.prescriptionReference : existing.prescriptionReference,
    data.reason !== undefined ? data.reason : existing.reason,
    data.instructions !== undefined ? data.instructions : existing.instructions,
    data.quantityRemaining !== undefined ? parseInt(data.quantityRemaining, 10) : existing.remainingQuantity,
    data.quantityUnit || existing.quantityUnit,
    data.refillThreshold !== undefined ? parseInt(data.refillThreshold, 10) : existing.refillThreshold,
    data.notes !== undefined ? data.notes : existing.notes,
    data.status || existing.status,
    nowIso,
    userId,
    id
  );

  return getMedicineById(userId, id);
};

export const deleteMedicine = (userId, id) => {
  const existing = getMedicineById(userId, id);
  if (!existing) return false;

  // Insert snapshot into medicine_history to preserve prescription record
  const histId = `med-hist-${Date.now()}`;
  db.prepare(`
    INSERT INTO medicine_history (
      id, user_id, medicine_id, name, dosage, category, start_date, end_date,
      is_ongoing, duration, reason, doctor_name, image_url, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    histId,
    userId,
    existing.id,
    existing.name,
    existing.dosage,
    existing.category,
    existing.startDate,
    existing.endDate || new Date().toISOString().slice(0, 10),
    0,
    'Prescription course archived.',
    'Removed from active prescriptions (historical records preserved).',
    existing.doctorName,
    existing.imageUrl,
    'discontinued',
    new Date().toISOString()
  );

  // Delete from active medicines
  db.prepare('DELETE FROM medicines WHERE user_id = ? AND id = ?').run(userId, id);
  return true;
};

export const updateStock = (userId, id, newQuantity) => {
  const qty = Math.max(0, parseInt(newQuantity, 10) || 0);
  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE medicines SET quantity_remaining = ?, updated_at = ?
    WHERE user_id = ? AND id = ?
  `).run(qty, nowIso, userId, id);
  return getMedicineById(userId, id);
};

// -----------------------------------------------------------------------------
// DOSE OCCURRENCES (Active Daily Schedule)
// -----------------------------------------------------------------------------

export const getDoseOccurrencesForDate = (userId, dateStr) => {
  const rows = db.prepare(`
    SELECT * FROM dose_occurrences
    WHERE user_id = ? AND date = ?
    ORDER BY scheduled_time ASC
  `).all(userId, dateStr);

  return rows.map((r) => ({
    id: r.dose_occurrence_id,
    doseOccurrenceId: r.dose_occurrence_id,
    medicineId: r.medicine_id,
    medicineName: r.medicine_name,
    date: r.date,
    scheduledTime: r.scheduled_time,
    status: r.status,
    snoozeCount: r.snooze_count,
    snoozeDeadline: r.snooze_deadline,
    initialAlertTime: r.initial_alert_time,
    recordedTime: r.recorded_time,
    skipReason: r.skip_reason,
    notes: r.notes,
    dosage: r.dosage,
    foodInstruction: r.food_instruction,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
};

export const saveDoseOccurrences = (userId, doses) => {
  if (!Array.isArray(doses) || doses.length === 0) return [];
  const nowIso = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO dose_occurrences (
      id, user_id, dose_occurrence_id, medicine_id, medicine_name, date,
      scheduled_time, status, snooze_count, snooze_deadline, initial_alert_time,
      recorded_time, skip_reason, notes, dosage, food_instruction, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(user_id, dose_occurrence_id) DO UPDATE SET
      status = excluded.status,
      snooze_count = excluded.snooze_count,
      snooze_deadline = excluded.snooze_deadline,
      initial_alert_time = excluded.initial_alert_time,
      recorded_time = excluded.recorded_time,
      skip_reason = excluded.skip_reason,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);

  doses.forEach((d) => {
    const occId = d.doseOccurrenceId || d.id || `occ-${Date.now()}`;
    stmt.run(
      d.id ? (String(d.id).startsWith('occ-') ? d.id : `occ-${d.id}`) : `occ-${occId}`,
      userId,
      occId,
      d.medicineId || '',
      d.medicineName || 'Medicine',
      d.date || nowIso.slice(0, 10),
      d.scheduledTime || d.time || '00:00',
      d.status || 'upcoming',
      d.snoozeCount || 0,
      d.snoozeDeadline || null,
      d.initialAlertTime || null,
      d.recordedTime || d.actionTime || null,
      d.skipReason || null,
      d.notes || null,
      d.dosage || '',
      d.foodInstruction || '',
      nowIso,
      nowIso
    );
  });

  return doses;
};

// -----------------------------------------------------------------------------
// DOSE HISTORY (Taken, Missed, Skipped records)
// -----------------------------------------------------------------------------

export const getDoseHistory = (userId, { status = 'all', startDate, endDate, medicineName } = {}) => {
  let query = 'SELECT * FROM dose_history WHERE user_id = ?';
  const params = [userId];

  if (status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  if (medicineName && medicineName !== 'all') {
    query += ' AND medicine_name = ?';
    params.push(medicineName);
  }

  query += ' ORDER BY date DESC, scheduled_time DESC';
  const rows = db.prepare(query).all(...params);

  return rows.map((r) => ({
    id: r.dose_occurrence_id,
    doseOccurrenceId: r.dose_occurrence_id,
    medicineId: r.medicine_id,
    medicineName: r.medicine_name,
    date: r.date,
    scheduledTime: r.scheduled_time,
    status: r.status,
    recordedTime: r.recorded_time,
    snoozeCount: r.snooze_count,
    skipReason: r.skip_reason,
    notes: r.notes,
    dosage: r.dosage,
    createdAt: r.created_at
  }));
};

export const recordDoseHistory = (userId, dose) => {
  const occId = dose.doseOccurrenceId || dose.id || `occ-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const dateStr = dose.date || dose.scheduledDate || nowIso.slice(0, 10);
  const schedTime = dose.scheduledTime || dose.time || '00:00';
  const histId = dose.id ? (String(dose.id).startsWith('hist-') ? dose.id : `hist-${dose.id}`) : `hist-${occId}`;

  const stmt = db.prepare(`
    INSERT INTO dose_history (
      id, user_id, dose_occurrence_id, medicine_id, medicine_name, date,
      scheduled_time, status, recorded_time, snooze_count, skip_reason, notes, dosage, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, dose_occurrence_id) DO UPDATE SET
      status = excluded.status,
      recorded_time = excluded.recorded_time,
      snooze_count = excluded.snooze_count,
      skip_reason = excluded.skip_reason,
      notes = excluded.notes
  `);

  stmt.run(
    histId,
    userId,
    occId,
    dose.medicineId || dose.medId || 'med-local',
    dose.medicineName || 'Medicine',
    dateStr,
    schedTime,
    dose.status || 'taken',
    dose.recordedTime || dose.actionTime || nowIso,
    dose.snoozeCount || 0,
    dose.skipReason || null,
    dose.notes || null,
    dose.dosage || '',
    nowIso
  );

  return dose;
};

// -----------------------------------------------------------------------------
// MEDICINE HISTORY (Archived Prescriptions)
// -----------------------------------------------------------------------------

export const getMedicineHistory = (userId) => {
  const rows = db.prepare('SELECT * FROM medicine_history WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return rows.map((r) => ({
    id: r.id,
    medicineId: r.medicine_id,
    name: r.name,
    dosage: r.dosage,
    category: r.category,
    startDate: r.start_date,
    endDate: r.end_date,
    isOngoing: Boolean(r.is_ongoing),
    duration: r.duration,
    reason: r.reason,
    doctorName: r.doctor_name,
    imageUrl: r.image_url,
    status: r.status,
    createdAt: r.created_at
  }));
};

export const addMedicineHistory = (userId, record) => {
  const id = record.id || `med-hist-${Date.now()}`;
  db.prepare(`
    INSERT INTO medicine_history (
      id, user_id, medicine_id, name, dosage, category, start_date, end_date,
      is_ongoing, duration, reason, doctor_name, image_url, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    record.medicineId || null,
    record.name,
    record.dosage || '',
    record.category || 'tablet',
    record.startDate || '',
    record.endDate || '',
    record.isOngoing ? 1 : 0,
    record.duration || '',
    record.reason || '',
    record.doctorName || '',
    record.imageUrl || '',
    record.status || 'completed',
    new Date().toISOString()
  );
  return { id, ...record };
};

// -----------------------------------------------------------------------------
// CARETAKER PROFILE
// -----------------------------------------------------------------------------

export const getCaretakerProfile = (userId) => {
  const r = db.prepare('SELECT * FROM caretaker_profiles WHERE user_id = ?').get(userId);
  if (!r) {
    return {
      name: '',
      relationship: '',
      phone: '',
      email: '',
      preferredChannel: 'email',
      preferredLanguage: 'en',
      alertsEnabled: true,
      notifyMissed: true,
      notifyLowStock: true,
      notifyDailySummary: false,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      emergencyNotes: ''
    };
  }

  return {
    name: r.name || '',
    relationship: r.relationship || '',
    phone: r.phone || '',
    email: r.email || '',
    preferredChannel: r.preferred_channel || 'email',
    preferredLanguage: r.preferred_language || 'en',
    alertsEnabled: r.alerts_enabled !== 0,
    notifyMissed: r.notify_missed !== 0,
    notifyLowStock: r.notify_low_stock !== 0,
    notifyDailySummary: Boolean(r.notify_daily_summary),
    quietHoursEnabled: Boolean(r.quiet_hours_enabled),
    quietHoursStart: r.quiet_hours_start || '22:00',
    quietHoursEnd: r.quiet_hours_end || '07:00',
    emergencyNotes: r.emergency_notes || '',
    updatedAt: r.updated_at
  };
};

export const saveCaretakerProfile = (userId, data) => {
  const nowIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO caretaker_profiles (
      user_id, name, relationship, phone, email, preferred_channel, preferred_language,
      alerts_enabled, notify_missed, notify_low_stock, notify_daily_summary,
      quiet_hours_enabled, quiet_hours_start, quiet_hours_end, emergency_notes, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
    ON CONFLICT(user_id) DO UPDATE SET
      name = excluded.name,
      relationship = excluded.relationship,
      phone = excluded.phone,
      email = excluded.email,
      preferred_channel = excluded.preferred_channel,
      preferred_language = excluded.preferred_language,
      alerts_enabled = excluded.alerts_enabled,
      notify_missed = excluded.notify_missed,
      notify_low_stock = excluded.notify_low_stock,
      notify_daily_summary = excluded.notify_daily_summary,
      quiet_hours_enabled = excluded.quiet_hours_enabled,
      quiet_hours_start = excluded.quiet_hours_start,
      quiet_hours_end = excluded.quiet_hours_end,
      emergency_notes = excluded.emergency_notes,
      updated_at = excluded.updated_at
  `).run(
    userId,
    data.name || '',
    data.relationship || '',
    data.phone || '',
    data.email || '',
    data.preferredChannel || 'email',
    data.preferredLanguage || 'en',
    data.alertsEnabled !== false ? 1 : 0,
    data.notifyMissed !== false ? 1 : 0,
    data.notifyLowStock !== false ? 1 : 0,
    data.notifyDailySummary ? 1 : 0,
    data.quietHoursEnabled ? 1 : 0,
    data.quietHoursStart || '22:00',
    data.quietHoursEnd || '07:00',
    data.emergencyNotes || '',
    nowIso
  );

  return getCaretakerProfile(userId);
};

// -----------------------------------------------------------------------------
// USER PREFERENCES
// -----------------------------------------------------------------------------

export const getUserPreferences = (userId) => {
  const r = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  if (!r) {
    return { largeTextMode: false, soundEnabled: true, isTestMode: false, alarmSound: 'gentle-chime' };
  }
  return {
    largeTextMode: Boolean(r.large_text_mode),
    soundEnabled: r.sound_enabled !== 0,
    isTestMode: Boolean(r.is_test_mode),
    alarmSound: r.alarm_sound || 'gentle-chime'
  };
};

export const saveUserPreferences = (userId, prefs) => {
  const nowIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_preferences (user_id, large_text_mode, sound_enabled, is_test_mode, alarm_sound, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      large_text_mode = excluded.large_text_mode,
      sound_enabled = excluded.sound_enabled,
      is_test_mode = excluded.is_test_mode,
      alarm_sound = excluded.alarm_sound,
      updated_at = excluded.updated_at
  `).run(
    userId,
    prefs.largeTextMode ? 1 : 0,
    prefs.soundEnabled !== false ? 1 : 0,
    prefs.isTestMode ? 1 : 0,
    prefs.alarmSound || 'gentle-chime',
    nowIso
  );
  return getUserPreferences(userId);
};

// -----------------------------------------------------------------------------
// CARETAKER ALERTS (User-specific)
// -----------------------------------------------------------------------------

export const getCaretakerAlerts = (userId) => {
  const rows = db.prepare('SELECT * FROM caretaker_alerts WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    idempotencyKey: r.idempotency_key,
    alertType: r.alert_type,
    medicineName: r.medicine_name,
    dosage: r.dosage,
    scheduledDate: r.scheduled_date,
    scheduledTime: r.scheduled_time,
    doseOccurrenceId: r.dose_occurrence_id,
    channel: r.channel,
    recipient: r.recipient_json ? JSON.parse(r.recipient_json) : null,
    status: r.status,
    providerMessageId: r.provider_message_id,
    errorMessage: r.error_message,
    reason: r.reason,
    retryCount: r.retry_count,
    lastAttemptAt: r.last_attempt_at,
    createdAt: r.created_at
  }));
};

export const saveCaretakerAlert = (userId, alert) => {
  const id = alert.id || `alt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const nowIso = new Date().toISOString();

  // Deduplication check
  if (alert.idempotencyKey) {
    const existing = db.prepare('SELECT * FROM caretaker_alerts WHERE user_id = ? AND idempotency_key = ?').get(userId, alert.idempotencyKey);
    if (existing) {
      return {
        isDuplicate: true,
        alert: {
          id: existing.id,
          userId: existing.user_id,
          idempotencyKey: existing.idempotency_key,
          alertType: existing.alert_type,
          medicineName: existing.medicine_name,
          dosage: existing.dosage,
          scheduledDate: existing.scheduled_date,
          scheduledTime: existing.scheduled_time,
          doseOccurrenceId: existing.dose_occurrence_id,
          channel: existing.channel,
          recipient: existing.recipient_json ? JSON.parse(existing.recipient_json) : null,
          status: existing.status,
          providerMessageId: existing.provider_message_id,
          errorMessage: existing.error_message,
          reason: existing.reason,
          retryCount: existing.retry_count,
          lastAttemptAt: existing.last_attempt_at,
          createdAt: existing.created_at
        }
      };
    }
  }

  db.prepare(`
    INSERT INTO caretaker_alerts (
      id, user_id, idempotency_key, alert_type, medicine_name, dosage,
      scheduled_date, scheduled_time, dose_occurrence_id, channel, recipient_json,
      status, provider_message_id, error_message, reason, retry_count, last_attempt_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    alert.idempotencyKey || null,
    alert.alertType || 'missed_dose',
    alert.medicineName,
    alert.dosage || '',
    alert.scheduledDate || '',
    alert.scheduledTime || '',
    alert.doseOccurrenceId || null,
    alert.channel || 'email',
    alert.recipient ? JSON.stringify(alert.recipient) : null,
    alert.status || 'pending',
    alert.providerMessageId || null,
    alert.errorMessage || null,
    alert.reason || '',
    alert.retryCount || 0,
    alert.lastAttemptAt || nowIso,
    nowIso
  );

  return {
    isDuplicate: false,
    alert: {
      id,
      userId,
      ...alert,
      createdAt: nowIso
    }
  };
};

export const updateCaretakerAlert = (userId, alertId, updates) => {
  const existing = db.prepare('SELECT * FROM caretaker_alerts WHERE user_id = ? AND id = ?').get(userId, alertId);
  if (!existing) return null;

  db.prepare(`
    UPDATE caretaker_alerts SET
      status = ?, provider_message_id = ?, error_message = ?, retry_count = ?, last_attempt_at = ?
    WHERE user_id = ? AND id = ?
  `).run(
    updates.status || existing.status,
    updates.providerMessageId !== undefined ? updates.providerMessageId : existing.provider_message_id,
    updates.errorMessage !== undefined ? updates.errorMessage : existing.error_message,
    updates.retryCount !== undefined ? updates.retryCount : existing.retry_count,
    updates.lastAttemptAt || new Date().toISOString(),
    userId,
    alertId
  );

  return db.prepare('SELECT * FROM caretaker_alerts WHERE user_id = ? AND id = ?').get(userId, alertId);
};

// -----------------------------------------------------------------------------
// LOCAL DATA MIGRATION
// -----------------------------------------------------------------------------

export const migrateLocalData = (userId, payload = {}) => {
  const {
    medicines = [],
    todayDoses = [],
    doseOccurrences = [],
    doseHistory = [],
    medicineHistory = [],
    caretaker = null,
    preferences = null
  } = payload;

  let importedMedicines = 0;
  let importedDoseOccurrences = 0;
  let importedDoseHistory = 0;
  let importedMedicineHistory = 0;

  // 1. Migrate Medicines without overwriting
  if (Array.isArray(medicines)) {
    medicines.forEach((med) => {
      if (!med.name) return;
      const existing = med.id ? getMedicineById(userId, med.id) : null;
      if (!existing) {
        createMedicine(userId, med);
        importedMedicines++;
      }
    });
  }

  // 2. Migrate Dose Occurrences (Active Schedule)
  const allOccurrences = [...(Array.isArray(todayDoses) ? todayDoses : []), ...(Array.isArray(doseOccurrences) ? doseOccurrences : [])];
  if (allOccurrences.length > 0) {
    allOccurrences.forEach((occ) => {
      const occId = occ.doseOccurrenceId || occ.id;
      if (!occId) return;
      const existing = db.prepare('SELECT id FROM dose_occurrences WHERE user_id = ? AND dose_occurrence_id = ?').get(userId, occId);
      if (!existing) {
        saveDoseOccurrences(userId, [occ]);
        importedDoseOccurrences++;
      }
    });
  }

  // 3. Migrate Dose History
  if (Array.isArray(doseHistory)) {
    doseHistory.forEach((dose) => {
      const occId = dose.doseOccurrenceId || dose.id;
      const doseDate = dose.date || dose.scheduledDate;
      if (!dose.medicineName || !doseDate || !occId) return;
      const existing = db.prepare('SELECT id FROM dose_history WHERE user_id = ? AND dose_occurrence_id = ?').get(userId, occId);
      if (!existing) {
        recordDoseHistory(userId, dose);
        importedDoseHistory++;
      }
    });
  }

  // 4. Migrate Medicine History
  if (Array.isArray(medicineHistory)) {
    medicineHistory.forEach((hist) => {
      if (!hist.name) return;
      const existing = hist.id ? db.prepare('SELECT id FROM medicine_history WHERE user_id = ? AND id = ?').get(userId, hist.id) : null;
      if (!existing) {
        addMedicineHistory(userId, hist);
        importedMedicineHistory++;
      }
    });
  }

  // 5. Migrate Caretaker if provided and user caretaker profile is currently empty
  if (caretaker && caretaker.name) {
    const current = getCaretakerProfile(userId);
    if (!current.name) {
      saveCaretakerProfile(userId, caretaker);
    }
  }

  // 6. Migrate Preferences
  if (preferences) {
    saveUserPreferences(userId, preferences);
  }

  return {
    success: true,
    imported: {
      medicines: importedMedicines,
      doseOccurrences: importedDoseOccurrences,
      doseHistory: importedDoseHistory,
      medicineHistory: importedMedicineHistory
    }
  };
};

// -----------------------------------------------------------------------------
// USER UPLOADS METADATA
// -----------------------------------------------------------------------------

export const recordUserUpload = (userId, { originalName, storedFilename, mimeType, fileSize, fileType }) => {
  const id = `upl-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_uploads (id, user_id, original_name, stored_filename, mime_type, file_size, file_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, originalName, storedFilename, mimeType, fileSize, fileType, nowIso);

  return { id, storedFilename, originalName, mimeType, fileSize, fileType, createdAt: nowIso };
};

export const getUserUpload = (userId, storedFilename) => {
  return db.prepare('SELECT * FROM user_uploads WHERE user_id = ? AND stored_filename = ?').get(userId, storedFilename);
};

// -----------------------------------------------------------------------------
// PATIENT-CARETAKER LINKING & INVITATIONS (Phase 10)
// -----------------------------------------------------------------------------

export const createPatientInvitation = (patientId, permissions = {}) => {
  const code = `CARE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const id = `inv-${crypto.randomUUID()}`;
  const nowIso = new Date().toISOString();
  // Expires in 48 hours
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const defaultPerms = {
    viewSchedule: permissions.viewSchedule !== false,
    viewHistory: permissions.viewHistory !== false,
    receiveAlerts: permissions.receiveAlerts !== false
  };

  db.prepare(`
    INSERT INTO patient_invitations (id, patient_id, invitation_code, permissions_json, status, expires_at, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, patientId, code, JSON.stringify(defaultPerms), expiresAt, nowIso);

  return {
    id,
    invitationCode: code,
    permissions: defaultPerms,
    status: 'pending',
    expiresAt,
    createdAt: nowIso
  };
};

export const getPatientInvitations = (patientId) => {
  const rows = db.prepare(`
    SELECT * FROM patient_invitations
    WHERE patient_id = ?
    ORDER BY created_at DESC
  `).all(patientId);

  return rows.map((r) => ({
    id: r.id,
    invitationCode: r.invitation_code,
    permissions: r.permissions_json ? JSON.parse(r.permissions_json) : {},
    status: r.status,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    usedAt: r.used_at
  }));
};

export const revokePatientInvitation = (patientId, invitationId) => {
  const stmt = db.prepare(`
    UPDATE patient_invitations
    SET status = 'revoked'
    WHERE patient_id = ? AND (id = ? OR invitation_code = ?)
  `);
  stmt.run(patientId, invitationId, invitationId);
  return true;
};

export const acceptCaretakerInvitation = (caretakerId, rawCode) => {
  if (!rawCode || !rawCode.trim()) {
    throw new Error('Invitation code is required.');
  }

  const cleanCode = rawCode.trim().toUpperCase();
  const nowIso = new Date().toISOString();

  // Find invitation
  const inv = db.prepare(`
    SELECT * FROM patient_invitations
    WHERE invitation_code = ? AND status = 'pending' AND expires_at > ?
  `).get(cleanCode, nowIso);

  if (!inv) {
    throw new Error('Invalid or expired invitation code.');
  }

  if (inv.patient_id === caretakerId) {
    throw new Error('You cannot link your own account as both patient and caretaker.');
  }

  // Check if link already exists
  const existing = db.prepare(`
    SELECT * FROM patient_caretaker_links
    WHERE patient_id = ? AND caretaker_id = ?
  `).get(inv.patient_id, caretakerId);

  if (existing) {
    if (existing.status === 'active') {
      throw new Error('You are already linked to this patient.');
    } else {
      // Reactivate revoked link
      db.prepare(`
        UPDATE patient_caretaker_links
        SET status = 'active', permissions_json = ?, updated_at = ?
        WHERE id = ?
      `).run(inv.permissions_json, nowIso, existing.id);
    }
  } else {
    // Create new link
    const linkId = `link-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO patient_caretaker_links (id, patient_id, caretaker_id, status, permissions_json, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?)
    `).run(linkId, inv.patient_id, caretakerId, inv.permissions_json, nowIso, nowIso);
  }

  // Mark invitation as accepted
  db.prepare(`
    UPDATE patient_invitations
    SET status = 'accepted', used_by_caretaker_id = ?, used_at = ?
    WHERE id = ?
  `).run(caretakerId, nowIso, inv.id);

  // Return patient profile
  const patient = db.prepare('SELECT id, name, email, language FROM users WHERE id = ?').get(inv.patient_id);
  return {
    success: true,
    patient: {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      permissions: inv.permissions_json ? JSON.parse(inv.permissions_json) : {}
    }
  };
};

export const getLinkedCaretakersForPatient = (patientId) => {
  const rows = db.prepare(`
    SELECT l.id AS link_id, l.status, l.permissions_json, l.created_at AS linked_at,
           u.id AS caretaker_id, u.name, u.email
    FROM patient_caretaker_links l
    JOIN users u ON l.caretaker_id = u.id
    WHERE l.patient_id = ? AND l.status = 'active'
    ORDER BY l.created_at DESC
  `).all(patientId);

  return rows.map((r) => ({
    linkId: r.link_id,
    caretakerId: r.caretaker_id,
    name: r.name,
    email: r.email,
    permissions: r.permissions_json ? JSON.parse(r.permissions_json) : {},
    linkedAt: r.linked_at
  }));
};

export const unlinkCaretakerFromPatient = (patientId, caretakerId) => {
  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE patient_caretaker_links
    SET status = 'revoked', updated_at = ?
    WHERE patient_id = ? AND (caretaker_id = ? OR id = ?)
  `).run(nowIso, patientId, caretakerId, caretakerId);
  return true;
};

export const getLinkedPatientsForCaretaker = (caretakerId) => {
  const rows = db.prepare(`
    SELECT l.id AS link_id, l.status, l.permissions_json, l.created_at AS linked_at,
           u.id AS patient_id, u.name, u.email
    FROM patient_caretaker_links l
    JOIN users u ON l.patient_id = u.id
    WHERE l.caretaker_id = ? AND l.status = 'active'
    ORDER BY l.created_at DESC
  `).all(caretakerId);

  return rows.map((r) => {
    const perms = r.permissions_json ? JSON.parse(r.permissions_json) : {};
    // Get count of unresolved alerts for this patient
    const alertCount = db.prepare(`
      SELECT COUNT(*) AS count FROM caretaker_alerts
      WHERE user_id = ? AND (acknowledged = 0 OR acknowledged IS NULL) AND status != 'resolved'
    `).get(r.patient_id);

    return {
      linkId: r.link_id,
      patientId: r.patient_id,
      name: r.name,
      email: r.email,
      permissions: perms,
      linkedAt: r.linked_at,
      unresolvedAlertsCount: alertCount ? alertCount.count : 0
    };
  });
};

export const unlinkPatientFromCaretaker = (caretakerId, patientId) => {
  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE patient_caretaker_links
    SET status = 'revoked', updated_at = ?
    WHERE caretaker_id = ? AND (patient_id = ? OR id = ?)
  `).run(nowIso, caretakerId, patientId, patientId);
  return true;
};

export const getCaretakerPatientSummary = (caretakerId, patientId) => {
  // 1. Enforce Link Authorization
  const link = db.prepare(`
    SELECT * FROM patient_caretaker_links
    WHERE caretaker_id = ? AND patient_id = ? AND status = 'active'
  `).get(caretakerId, patientId);

  if (!link) {
    const err = new Error('Forbidden: You are not authorized to view this patient\'s records.');
    err.statusCode = 403;
    throw err;
  }

  const permissions = link.permissions_json ? JSON.parse(link.permissions_json) : {};
  const patient = db.prepare('SELECT id, name, email, language FROM users WHERE id = ?').get(patientId);
  if (!patient) throw new Error('Patient not found.');

  const todayStr = new Date().toISOString().slice(0, 10);
  let todayDoses = [];
  let medicines = [];
  let adherence = null;

  if (permissions.viewSchedule) {
    todayDoses = getDoseOccurrencesForDate(patientId, todayStr);
    medicines = getMedicines(patientId);
  }

  if (permissions.viewHistory) {
    const history = getDoseHistory(patientId);
    // Simple adherence calculation: taken / (taken + missed + skipped)
    const taken = history.filter((h) => h.status === 'taken').length;
    const missed = history.filter((h) => h.status === 'missed').length;
    const skipped = history.filter((h) => h.status === 'skipped').length;
    const total = taken + missed + skipped;
    adherence = {
      taken,
      missed,
      skipped,
      adherencePercent: total > 0 ? Math.round((taken / total) * 100) : null
    };
  }

  const alerts = db.prepare(`
    SELECT * FROM caretaker_alerts
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(patientId).map((a) => ({
    id: a.id,
    alertType: a.alert_type,
    medicineName: a.medicine_name,
    dosage: a.dosage,
    scheduledTime: a.scheduled_time,
    scheduledDate: a.scheduled_date,
    status: a.status,
    acknowledged: Boolean(a.acknowledged),
    acknowledgedAt: a.acknowledged_at,
    caretakerNote: a.caretaker_note,
    createdAt: a.created_at
  }));

  return {
    patient: {
      id: patient.id,
      name: patient.name,
      email: patient.email
    },
    permissions,
    todayDoses,
    medicines,
    adherence,
    alerts
  };
};

export const getAlertsForCaretaker = (caretakerId, filter = 'all') => {
  // Find linked patients
  const links = db.prepare(`
    SELECT patient_id FROM patient_caretaker_links
    WHERE caretaker_id = ? AND status = 'active'
  `).all(caretakerId);

  if (links.length === 0) return [];
  const patientIds = links.map((l) => l.patient_id);
  const placeholders = patientIds.map(() => '?').join(',');

  let query = `
    SELECT a.*, u.name AS patient_name, u.email AS patient_email
    FROM caretaker_alerts a
    JOIN users u ON a.user_id = u.id
    WHERE a.user_id IN (${placeholders})
  `;
  const params = [...patientIds];

  if (filter === 'unresolved') {
    query += ' AND (a.acknowledged = 0 OR a.acknowledged IS NULL) AND a.status != \'resolved\'';
  } else if (filter === 'acknowledged') {
    query += ' AND a.acknowledged = 1';
  } else if (filter === 'resolved') {
    query += ' AND a.status = \'resolved\'';
  }

  query += ' ORDER BY a.created_at DESC';

  const rows = db.prepare(query).all(...params);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    patientId: r.user_id,
    patientName: r.patient_name,
    patientEmail: r.patient_email,
    alertType: r.alert_type,
    medicineName: r.medicine_name,
    dosage: r.dosage,
    scheduledDate: r.scheduled_date,
    scheduledTime: r.scheduled_time,
    doseOccurrenceId: r.dose_occurrence_id,
    status: r.status,
    acknowledged: Boolean(r.acknowledged),
    acknowledgedAt: r.acknowledged_at,
    acknowledgedBy: r.acknowledged_by,
    caretakerNote: r.caretaker_note,
    retryCount: r.retry_count,
    lastAttemptAt: r.last_attempt_at,
    createdAt: r.created_at
  }));
};

export const acknowledgeCaretakerAlert = (caretakerId, alertId, note = '') => {
  const alert = db.prepare('SELECT * FROM caretaker_alerts WHERE id = ?').get(alertId);
  if (!alert) {
    const err = new Error('Alert not found.');
    err.statusCode = 404;
    throw err;
  }

  // Verify that the caretaker is actively linked to the patient who owns this alert
  const link = db.prepare(`
    SELECT * FROM patient_caretaker_links
    WHERE caretaker_id = ? AND patient_id = ? AND status = 'active'
  `).get(caretakerId, alert.user_id);

  if (!link) {
    const err = new Error('Forbidden: You are not authorized to acknowledge alerts for this patient.');
    err.statusCode = 403;
    throw err;
  }

  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE caretaker_alerts
    SET acknowledged = 1, acknowledged_at = ?, acknowledged_by = ?, caretaker_note = ?
    WHERE id = ?
  `).run(nowIso, caretakerId, note ? note.trim() : null, alertId);

  // Note: dose status in dose_occurrences / medicines remains untouched (per Requirement 3)
  return {
    success: true,
    alertId,
    acknowledged: true,
    acknowledgedAt: nowIso,
    caretakerNote: note ? note.trim() : null
  };
};
