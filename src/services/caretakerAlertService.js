/**
 * Caretaker Alert Service (Frontend Client)
 * Connects the Reminder Engine and Dose History to the Backend Notification API.
 * Ensures idempotent alert dispatching and offline fallbacks.
 * Never misrepresents delivery status.
 */

import { StorageKeys, getStoredItem, setStoredItem } from './storageService.js';
import { getTodayDateString } from '../utils/dateUtils.js';

const LOCAL_ALERTS_KEY = 'smart-medical-reminder-v1:caretaker_alerts';

const getAuthHeaders = () => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('medical_reminder_auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    return {};
  }
};

export const caretakerAlertService = {
  // Check backend server health
  checkHealth: async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch (e) {
      return {
        status: 'offline',
        providers: {
          email: { configured: false },
          sms: { configured: false }
        }
      };
    }
  },

  // Retrieve alerts from backend with local fallback
  getAlerts: async () => {
    try {
      const res = await fetch('/api/alerts', {
        headers: {
          ...getAuthHeaders()
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.alerts || []);
        setStoredItem(LOCAL_ALERTS_KEY, list);
        return list;
      }
    } catch (e) {
      // Offline fallback
    }
    return getStoredItem(LOCAL_ALERTS_KEY, []);
  },

  // Save caretaker profile to backend & localStorage
  saveProfile: async (profileData) => {
    setStoredItem(StorageKeys.CARETAKER, profileData);
    try {
      const res = await fetch('/api/caretaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const data = await res.json();
        return data.profile || data.caretaker || data;
      }
    } catch (e) {
      console.warn('[CaretakerService] Backend unreachable, saved profile locally.');
    }
    return profileData;
  },

  // Send a test notification
  sendTestAlert: async (testData) => {
    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(testData)
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return {
        success: false,
        status: 'backend_offline',
        error: 'Backend server is offline (http://localhost:3001). Test delivery could not be performed.'
      };
    }
  },

  // Dispatch Missed-Dose Alert (Idempotent)
  dispatchMissedDoseAlert: async (dose, caretakerProfile) => {
    if (!dose) return null;
    const idempotencyKey = `alert_${dose.id}_missed_dose`;

    const payload = {
      idempotencyKey,
      alertType: 'missed_dose',
      medicineName: dose.medicineName,
      dosage: dose.dosage,
      scheduledDate: dose.scheduledDate || dose.date || getTodayDateString(),
      scheduledTime: dose.scheduledTime,
      doseOccurrenceId: dose.id,
      caretaker: caretakerProfile
    };

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        const alertObj = result.alert || result;
        // Update local alerts cache
        const local = getStoredItem(LOCAL_ALERTS_KEY, []);
        const exists = local.some((a) => a.id === alertObj.id);
        if (!exists) {
          setStoredItem(LOCAL_ALERTS_KEY, [alertObj, ...local]);
        }
        return alertObj;
      }
    } catch (e) {
      // Backend offline: record locally with explicit offline status
      const localAlert = {
        id: `alert-local-${Date.now()}`,
        idempotencyKey,
        alertType: 'missed_dose',
        medicineName: dose.medicineName,
        dosage: dose.dosage,
        scheduledDate: dose.scheduledDate || dose.date || getTodayDateString(),
        scheduledTime: dose.scheduledTime,
        doseOccurrenceId: dose.id,
        channel: caretakerProfile?.preferredChannel || 'email',
        status: 'backend_offline',
        errorMessage: 'Backend server offline. Alert recorded locally; external delivery was not performed.',
        createdAt: new Date().toISOString()
      };

      const local = getStoredItem(LOCAL_ALERTS_KEY, []);
      if (!local.some((a) => a.idempotencyKey === idempotencyKey)) {
        setStoredItem(LOCAL_ALERTS_KEY, [localAlert, ...local]);
      }
      return localAlert;
    }
  },

  // Dispatch Snooze Limit Warning Alert (Optional)
  dispatchSnoozeWarningAlert: async (dose, caretakerProfile) => {
    if (!dose || caretakerProfile?.notifySnoozeLimit === false) return null;
    const idempotencyKey = `alert_${dose.id}_snooze_limit`;

    const payload = {
      idempotencyKey,
      alertType: 'snooze_warning',
      medicineName: dose.medicineName,
      dosage: dose.dosage,
      scheduledDate: dose.scheduledDate || dose.date || getTodayDateString(),
      scheduledTime: dose.scheduledTime,
      doseOccurrenceId: dose.id,
      caretaker: caretakerProfile
    };

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        return result.alert || result;
      }
    } catch (e) {
      // Offline fallback
    }
    return null;
  },

  // Dispatch Low-Stock Alert (Optional)
  dispatchLowStockAlert: async (medicine, caretakerProfile) => {
    if (!medicine || caretakerProfile?.notifyLowStock === false) return null;
    const todayStr = getTodayDateString();
    const idempotencyKey = `alert_${medicine.id}_low_stock_${todayStr}`;

    const payload = {
      idempotencyKey,
      alertType: 'low_stock',
      medicineName: medicine.name,
      dosage: `${medicine.dosageAmount || ''} ${medicine.dosageUnit || ''}`,
      scheduledDate: todayStr,
      scheduledTime: 'Now',
      doseOccurrenceId: `stock_${medicine.id}`,
      caretaker: caretakerProfile
    };

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        return result.alert || result;
      }
    } catch (e) {
      // Offline fallback
    }
    return null;
  },

  // Retry an Alert Delivery
  retryAlert: async (alertId) => {
    try {
      const res = await fetch(`/api/alerts/retry/${alertId}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      return {
        success: false,
        error: 'Backend offline. Unable to retry delivery.'
      };
    }
  }
};
