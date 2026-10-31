// Centralized Storage Service using versioned key namespace

const STORAGE_PREFIX = 'smart-medical-reminder-v1';

export const StorageKeys = {
  LANGUAGE: `${STORAGE_PREFIX}:language`,
  MEDICINES: `${STORAGE_PREFIX}:medicines`,
  TODAY_DOSES: `${STORAGE_PREFIX}:today_doses`,
  DOSE_HISTORY: `${STORAGE_PREFIX}:dose_history`,
  MEDICINE_HISTORY: `${STORAGE_PREFIX}:medicine_history`,
  CARETAKER: `${STORAGE_PREFIX}:caretaker`,
  ACTIVITY: `${STORAGE_PREFIX}:activity`,
  PREFERENCES: `${STORAGE_PREFIX}:preferences`
};

export const getStoredItem = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (error) {
    console.warn(`[StorageService] Failed to read key "${key}":`, error);
    return fallback;
  }
};

export const setStoredItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // Gracefully handle browser storage quota or disabled storage
    if (
      error.name === 'QuotaExceededError' ||
      error.code === 22 ||
      error.code === 1014 ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    ) {
      console.error(`[StorageService] LocalStorage quota exceeded when writing "${key}".`, error);
    } else {
      console.error(`[StorageService] Failed to save key "${key}":`, error);
    }
    return false;
  }
};

export const removeStoredItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[StorageService] Failed to remove key "${key}":`, error);
    return false;
  }
};

export const clearAllAppData = () => {
  try {
    Object.values(StorageKeys).forEach((key) => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('[StorageService] Error clearing app data:', error);
    return false;
  }
};
