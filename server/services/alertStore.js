/**
 * Durable Alert and Caretaker Storage Service
 * Persists alert events and caretaker profiles to server/data/*.json
 * Prevents duplicate alerts via idempotency key indexing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');
const CARETAKER_FILE = path.join(DATA_DIR, 'caretaker.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const readJsonSafe = (filePath, fallback = []) => {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`[AlertStore] Error reading ${filePath}:`, err.message);
    return fallback;
  }
};

const writeJsonSafe = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[AlertStore] Error writing ${filePath}:`, err.message);
    return false;
  }
};

export const alertStore = {
  // --- Alerts Collection ---
  getAllAlerts: () => {
    return readJsonSafe(ALERTS_FILE, []);
  },

  getAlertById: (id) => {
    const alerts = readJsonSafe(ALERTS_FILE, []);
    return alerts.find((a) => a.id === id) || null;
  },

  getAlertByIdempotencyKey: (key) => {
    if (!key) return null;
    const alerts = readJsonSafe(ALERTS_FILE, []);
    return alerts.find((a) => a.idempotencyKey === key) || null;
  },

  saveAlert: (alertData) => {
    const alerts = readJsonSafe(ALERTS_FILE, []);

    // Check idempotency key first
    if (alertData.idempotencyKey) {
      const existing = alerts.find((a) => a.idempotencyKey === alertData.idempotencyKey);
      if (existing) {
        return { isDuplicate: true, alert: existing };
      }
    }

    const newAlert = {
      id: alertData.id || `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      idempotencyKey: alertData.idempotencyKey || null,
      alertType: alertData.alertType || 'missed_dose',
      medicineName: alertData.medicineName || 'Unknown Medicine',
      dosage: alertData.dosage || '',
      scheduledDate: alertData.scheduledDate || '',
      scheduledTime: alertData.scheduledTime || '',
      doseOccurrenceId: alertData.doseOccurrenceId || null,
      reason: alertData.reason || 'Dose unconfirmed after grace period.',
      channel: alertData.channel || 'email',
      recipient: alertData.recipient || {},
      status: alertData.status || 'queued',
      createdAt: alertData.createdAt || new Date().toISOString(),
      lastAttemptAt: alertData.lastAttemptAt || new Date().toISOString(),
      retryCount: alertData.retryCount || 0,
      providerMessageId: alertData.providerMessageId || null,
      errorMessage: alertData.errorMessage || null
    };

    alerts.unshift(newAlert);
    writeJsonSafe(ALERTS_FILE, alerts);
    return { isDuplicate: false, alert: newAlert };
  },

  recordAlert: (alertData) => {
    return alertStore.saveAlert(alertData).alert;
  },

  updateAlert: (id, updates) => {
    const alerts = readJsonSafe(ALERTS_FILE, []);
    const idx = alerts.findIndex((a) => a.id === id);
    if (idx === -1) return null;

    alerts[idx] = {
      ...alerts[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    writeJsonSafe(ALERTS_FILE, alerts);
    return alerts[idx];
  },

  // --- Caretaker Profile ---
  getCaretakerProfile: () => {
    return readJsonSafe(CARETAKER_FILE, {
      name: 'Sunita Sharma',
      relationship: 'Daughter / Primary Caregiver',
      phone: '+91 98765 43210',
      email: 'sunita.sharma@example.com',
      preferredLanguage: 'en',
      preferredChannel: 'email',
      alertsEnabled: true,
      notifyMissed: true,
      notifySnoozeLimit: true,
      notifyLowStock: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      emergencyNotes: 'Call secondary contact if no answer.',
      updatedAt: '2026-10-31T09:00:00.000Z'
    });
  },

  saveCaretakerProfile: (profileData) => {
    const current = alertStore.getCaretakerProfile();
    const updated = {
      ...current,
      ...profileData,
      updatedAt: new Date().toISOString()
    };
    writeJsonSafe(CARETAKER_FILE, updated);
    return updated;
  }
};
