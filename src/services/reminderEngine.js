// Core Scheduled Reminder Engine for Smart Medical Reminder System
import { isDateCoveringToday, getTodayDateString } from '../utils/dateUtils.js';

export const ENGINE_CONFIG = {
  MAX_SNOOZES: 3,
  PRODUCTION_SNOOZE_MS: 10 * 60 * 1000, // 10 minutes
  PRODUCTION_GRACE_PERIOD_MS: 5 * 60 * 1000, // 5 minutes grace period after final snooze
  TEST_MODE_SNOOZE_MS: 15 * 1000, // 15 seconds for testing
  TEST_MODE_GRACE_PERIOD_MS: 20 * 1000 // 20 seconds for testing
};

/**
 * Generates a stable, canonical dose occurrence ID.
 * Example: dose_med-101_2026-10-31_0800
 */
export const generateDoseOccurrenceId = (medicineId, dateStr, scheduledTime) => {
  const cleanTime = (scheduledTime || '00:00').replace(':', '');
  return `dose_${medicineId}_${dateStr}_${cleanTime}`;
};

/**
 * Creates or synchronizes today's dose occurrences for active medicines.
 * Preserves existing dose state, confirmation timestamps, and snooze deadlines.
 */
export const syncDoseOccurrencesForDate = (dateStr, medicines, existingDoses = []) => {
  const dosesMap = new Map();

  // Index existing doses by ID
  existingDoses.forEach((dose) => {
    if (dose && dose.id) {
      dosesMap.set(dose.id, dose);
    }
  });

  const activeMedicines = medicines.filter((m) => m.status === 'active');

  activeMedicines.forEach((med) => {
    const isCovering = isDateCoveringToday(med.startDate, med.endDate, med.isOngoing || med.ongoing);
    if (!isCovering) return;

    const times = (med.reminderTimes || med.times || []).slice().sort();

    times.forEach((time) => {
      const occurrenceId = generateDoseOccurrenceId(med.id, dateStr, time);

      if (!dosesMap.has(occurrenceId)) {
        // Create new upcoming dose occurrence
        const newDose = {
          id: occurrenceId,
          medicineId: med.id,
          medicineName: med.name,
          dosage: `${med.dosageAmount} ${med.dosageUnit}`,
          medicineForm: med.medicineForm || med.category || 'tablet',
          scheduledDate: dateStr,
          scheduledTime: time,
          foodInstruction: med.foodInstruction || 'noFoodInstruction',
          imageUrl: med.imageUrl || med.medicineImage,
          status: 'upcoming', // upcoming, due, snoozed, taken, skipped, missed
          snoozeCount: 0,
          nextSnoozeDeadline: null,
          initialAlertTimestamp: null,
          finalAlertTimestamp: null,
          confirmationTime: null,
          takenTimestamp: null,
          skippedTimestamp: null,
          skipReason: null,
          missedTimestamp: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        dosesMap.set(occurrenceId, newDose);
      } else {
        // Existing dose: refresh display metadata in case medicine name/dosage was edited
        const existing = dosesMap.get(occurrenceId);
        dosesMap.set(occurrenceId, {
          ...existing,
          medicineName: med.name,
          dosage: `${med.dosageAmount} ${med.dosageUnit}`,
          foodInstruction: med.foodInstruction || existing.foodInstruction,
          imageUrl: med.imageUrl || med.medicineImage || existing.imageUrl
        });
      }
    });
  });

  return Array.from(dosesMap.values());
};

/**
 * Periodically checks time and evaluates dose state transitions:
 * - upcoming -> due (when scheduled time arrives)
 * - snoozed -> due (when snooze deadline arrives)
 * - due -> missed (when grace period expires after 3rd snooze or initial unhandled alert)
 */
export const evaluateDoseTransitions = ({
  doses,
  now = new Date(),
  isTestMode = false
}) => {
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  const nowMs = now.getTime();
  const todayStr = getTodayDateString();

  const gracePeriodMs = isTestMode
    ? ENGINE_CONFIG.TEST_MODE_GRACE_PERIOD_MS
    : ENGINE_CONFIG.PRODUCTION_GRACE_PERIOD_MS;

  let hasChanges = false;
  const newlyDueDoses = [];
  const newlyMissedDoses = [];

  const updatedDoses = doses.map((dose) => {
    // Only evaluate doses belonging to today
    if (dose.scheduledDate !== todayStr) return dose;

    // 1. Upcoming -> Due
    if (dose.status === 'upcoming') {
      if (currentTimeStr >= dose.scheduledTime) {
        hasChanges = true;
        const dueDose = {
          ...dose,
          status: 'due',
          initialAlertTimestamp: dose.initialAlertTimestamp || now.toISOString(),
          updatedAt: now.toISOString()
        };
        newlyDueDoses.push(dueDose);
        return dueDose;
      }
    }

    // 2. Snoozed -> Due
    if (dose.status === 'snoozed') {
      if (dose.nextSnoozeDeadline && nowMs >= dose.nextSnoozeDeadline) {
        hasChanges = true;
        const isFinalAlert = dose.snoozeCount >= ENGINE_CONFIG.MAX_SNOOZES;
        const alertTimestamp = now.toISOString();
        const dueDose = {
          ...dose,
          status: 'due',
          nextSnoozeDeadline: null,
          lastAlertTimestamp: alertTimestamp,
          finalAlertTimestamp: isFinalAlert ? alertTimestamp : (dose.finalAlertTimestamp || null),
          updatedAt: alertTimestamp
        };
        newlyDueDoses.push(dueDose);
        return dueDose;
      }
    }

    // 3. Due -> Missed (after grace period expires without confirmation)
    if (dose.status === 'due') {
      let referenceTimeMs = null;

      if (dose.finalAlertTimestamp) {
        referenceTimeMs = new Date(dose.finalAlertTimestamp).getTime();
      } else if (dose.lastAlertTimestamp) {
        referenceTimeMs = new Date(dose.lastAlertTimestamp).getTime();
      } else if (dose.initialAlertTimestamp) {
        referenceTimeMs = new Date(dose.initialAlertTimestamp).getTime();
      }

      if (referenceTimeMs && nowMs - referenceTimeMs > gracePeriodMs) {
        hasChanges = true;
        const missedDose = {
          ...dose,
          status: 'missed',
          missedTimestamp: now.toISOString(),
          updatedAt: now.toISOString()
        };
        newlyMissedDoses.push(missedDose);
        return missedDose;
      }
    }

    return dose;
  });

  return {
    hasChanges,
    updatedDoses,
    newlyDueDoses,
    newlyMissedDoses
  };
};

/**
 * Snoozes a dose occurrence (up to 3 times).
 * Calculates the exact next alert deadline (10 mins in production, 15 secs in test mode).
 */
export const applySnoozeToDose = (dose, isTestMode = false) => {
  if (dose.snoozeCount >= ENGINE_CONFIG.MAX_SNOOZES) {
    return {
      success: false,
      dose,
      snoozeCount: dose.snoozeCount,
      message: 'Maximum 3 snoozes reached.'
    };
  }

  const intervalMs = isTestMode
    ? ENGINE_CONFIG.TEST_MODE_SNOOZE_MS
    : ENGINE_CONFIG.PRODUCTION_SNOOZE_MS;

  const nowMs = Date.now();
  const nextDeadline = nowMs + intervalMs;
  const newCount = dose.snoozeCount + 1;

  const updatedDose = {
    ...dose,
    status: 'snoozed',
    snoozeCount: newCount,
    nextSnoozeDeadline: nextDeadline,
    lastAlertTimestamp: null,
    finalAlertTimestamp: null,
    updatedAt: new Date().toISOString()
  };

  return {
    success: true,
    dose: updatedDose,
    snoozeCount: newCount,
    nextDeadline
  };
};
