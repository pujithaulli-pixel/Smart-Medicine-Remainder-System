/**
 * Adherence and Statistics Engine for Smart Medical Reminder System
 * Implements strict, clinically-grounded compliance calculations based on user-confirmed records.
 *
 * Rules:
 * 1. Confirmed taken doses = status === 'taken'
 * 2. Missed doses = status === 'missed'
 * 3. Skipped doses = status === 'skipped'
 * 4. Eligible resolved doses = Taken + Missed + Skipped
 * 5. Adherence % = (Taken / Eligible resolved doses) * 100
 * 6. If eligible resolved doses === 0, returns adherence: null, display: 'No data'
 * 7. Snoozed and Due doses are tracked as pending, never counted as missed before rules are met.
 * 8. Future scheduled doses are excluded from compliance percentages.
 */

import { getTodayDateString } from './dateUtils.js';

export const ADHERENCE_DISCLAIMER =
  'Note: Adherence percentages represent estimated compliance based on user-confirmed records in this application, and do not constitute physical verification of dose consumption.';

/**
 * Calculates adherence metrics for a list of dose records.
 */
export const calculateAdherence = (doses = []) => {
  let taken = 0;
  let missed = 0;
  let skipped = 0;
  let due = 0;
  let snoozed = 0;
  let upcoming = 0;

  const todayStr = getTodayDateString();

  doses.forEach((d) => {
    if (!d || !d.status) return;
    const status = d.status.toLowerCase();

    if (status === 'taken') {
      taken++;
    } else if (status === 'missed') {
      missed++;
    } else if (status === 'skipped') {
      skipped++;
    } else if (status === 'due') {
      due++;
    } else if (status === 'snoozed') {
      snoozed++;
    } else if (status === 'upcoming') {
      upcoming++;
    }
  });

  const eligibleResolved = taken + missed + skipped;
  const adherencePercent =
    eligibleResolved > 0 ? Math.round((taken / eligibleResolved) * 100) : null;
  const adherenceDisplay =
    adherencePercent !== null ? `${adherencePercent}%` : 'No data';

  return {
    totalRecorded: doses.length,
    taken,
    missed,
    skipped,
    due,
    snoozed,
    upcoming,
    pending: due + snoozed + upcoming,
    eligibleResolved,
    adherencePercent,
    adherenceDisplay
  };
};

/**
 * Groups and calculates metrics per medicine across the provided doses.
 */
export const calculatePerMedicineMetrics = (doses = [], medicines = [], medicineHistory = []) => {
  const medMap = new Map();

  // Populate known active, paused, completed, and discontinued medicines
  [...medicines, ...medicineHistory].forEach((med) => {
    const medId = med.id || med.medicineId;
    const medName = med.name || med.medicineName;
    if (!medName) return;

    if (!medMap.has(medName)) {
      medMap.set(medName, {
        medicineId: medId,
        medicineName: medName,
        dosage: med.dosage || (med.dosageAmount ? `${med.dosageAmount} ${med.dosageUnit || ''}`.trim() : ''),
        imageUrl: med.imageUrl || med.medicineImage,
        status: med.status || 'active',
        startDate: med.startDate || '',
        endDate: med.endDate || '',
        isOngoing: med.isOngoing || med.ongoing,
        doses: [],
        taken: 0,
        missed: 0,
        skipped: 0,
        pending: 0,
        mostRecentOutcome: null
      });
    }
  });

  // Distribute dose records
  doses.forEach((dose) => {
    if (!dose || !dose.medicineName) return;
    const medName = dose.medicineName;

    if (!medMap.has(medName)) {
      medMap.set(medName, {
        medicineId: dose.medicineId || `med-${medName}`,
        medicineName: medName,
        dosage: dose.dosage || '',
        imageUrl: dose.imageUrl,
        status: 'active',
        startDate: dose.date || '',
        endDate: '',
        isOngoing: true,
        doses: [],
        taken: 0,
        missed: 0,
        skipped: 0,
        pending: 0,
        mostRecentOutcome: null
      });
    }

    const entry = medMap.get(medName);
    entry.doses.push(dose);

    const status = (dose.status || '').toLowerCase();
    if (status === 'taken') entry.taken++;
    else if (status === 'missed') entry.missed++;
    else if (status === 'skipped') entry.skipped++;
    else entry.pending++;

    // Track most recent resolved outcome
    if (['taken', 'missed', 'skipped'].includes(status)) {
      if (
        !entry.mostRecentOutcome ||
        (dose.date > entry.mostRecentOutcome.date) ||
        (dose.date === entry.mostRecentOutcome.date && (dose.scheduledTime || '') > (entry.mostRecentOutcome.scheduledTime || ''))
      ) {
        entry.mostRecentOutcome = {
          status,
          date: dose.date,
          scheduledTime: dose.scheduledTime,
          recordedTime: dose.recordedTime || dose.confirmationTime,
          skipReason: dose.skipReason
        };
      }
    }
  });

  // Calculate adherence for each medicine
  return Array.from(medMap.values()).map((item) => {
    const eligible = item.taken + item.missed + item.skipped;
    const adherencePercent =
      eligible > 0 ? Math.round((item.taken / eligible) * 100) : null;
    return {
      ...item,
      eligibleResolved: eligible,
      adherencePercent,
      adherenceDisplay: adherencePercent !== null ? `${adherencePercent}%` : 'No data'
    };
  });
};

/**
 * Builds chronological daily breakdown for charts across a date array.
 */
export const calculateDailyTimeline = (doses = [], dateList = []) => {
  const dailyMap = new Map();

  dateList.forEach((dateStr) => {
    dailyMap.set(dateStr, {
      date: dateStr,
      taken: 0,
      missed: 0,
      skipped: 0,
      total: 0
    });
  });

  doses.forEach((dose) => {
    if (!dose || !dose.date || !dailyMap.has(dose.date)) return;
    const dayEntry = dailyMap.get(dose.date);
    const status = (dose.status || '').toLowerCase();

    if (status === 'taken') {
      dayEntry.taken++;
      dayEntry.total++;
    } else if (status === 'missed') {
      dayEntry.missed++;
      dayEntry.total++;
    } else if (status === 'skipped') {
      dayEntry.skipped++;
      dayEntry.total++;
    }
  });

  return Array.from(dailyMap.values());
};
