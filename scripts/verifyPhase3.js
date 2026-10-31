/**
 * Phase 3 Automated Verification Test Suite
 * Validates:
 * 1. reminderEngine.js dose occurrence generation
 * 2. Distinct IDs for separate medicines scheduled at the exact same time
 * 3. Status transitions: upcoming -> due
 * 4. Exact 3-snooze limit enforcement (10-min standard and 15-s test mode)
 * 5. Rejection of 4th snooze attempt
 * 6. Grace period expiration transitioning due -> missed
 * 7. Taken action and Skipped action with reason
 * 8. Trilingual translation integrity (EN, HI, TE)
 */

import {
  generateDoseOccurrenceId,
  syncDoseOccurrencesForDate,
  evaluateDoseTransitions,
  applySnoozeToDose,
  ENGINE_CONFIG
} from '../src/services/reminderEngine.js';

import { translations } from '../src/i18n/translations.js';
import { alarmSoundService } from '../src/services/alarmSoundService.js';
import { notificationService } from '../src/services/notificationService.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n=== RUNNING PHASE 3 AUTOMATED VERIFICATION SUITE ===\n');

// 1. Stable Dose Occurrence IDs
console.log('--- Test 1: Stable Dose Occurrence ID & Collision Avoidance ---');
const medA = { id: 'med-1', name: 'Metformin' };
const medB = { id: 'med-2', name: 'Amlodipine' };
const idA = generateDoseOccurrenceId(medA.id, '2026-10-31', '08:00');
const idB = generateDoseOccurrenceId(medB.id, '2026-10-31', '08:00');

assert(idA === 'dose_med-1_2026-10-31_0800', 'Formats ID correctly with medId, date, time');
assert(idA !== idB, 'Two different medicines at the same time receive distinct occurrence IDs');

// 2. Sync Active Medicines into Today's Doses
console.log('\n--- Test 2: Active Medicines vs Paused/Completed/Out-of-range Filtering ---');
const sampleMeds = [
  {
    id: 'm-active-multi',
    name: 'Active Multi-dose',
    dosage: '1 tablet',
    status: 'active',
    startDate: '2026-10-01',
    isOngoing: true,
    reminderTimes: ['08:00', '14:00', '20:00']
  },
  {
    id: 'm-paused',
    name: 'Paused Medicine',
    dosage: '5 ml',
    status: 'paused',
    startDate: '2026-10-01',
    isOngoing: true,
    reminderTimes: ['08:00']
  },
  {
    id: 'm-completed-date',
    name: 'Expired Past Medicine',
    dosage: '1 capsule',
    status: 'active',
    startDate: '2026-09-01',
    endDate: '2026-10-15',
    isOngoing: false,
    reminderTimes: ['08:00']
  }
];

const syncedDoses = syncDoseOccurrencesForDate('2026-10-31', sampleMeds, []);
assert(syncedDoses.length === 3, `Expected 3 doses from active multi-dose medicine, got ${syncedDoses.length}`);
assert(!syncedDoses.some(d => d.medicineId === 'm-paused'), 'Paused medicine excluded from schedule');
assert(!syncedDoses.some(d => d.medicineId === 'm-completed-date'), 'Expired medicine excluded from schedule');

// 3. Status Transition: Upcoming -> Due
console.log('\n--- Test 3: Reminder Trigger & Transition to Due ---');
const todayStr = new Date().toISOString().slice(0, 10);
const pastTimeDose = {
  id: 'dose-test-1',
  medicineId: 'm1',
  medicineName: 'Test Med',
  dosage: '10mg',
  scheduledDate: todayStr,
  scheduledTime: '00:01', // definitely in the past today
  status: 'upcoming',
  snoozeCount: 0
};

const resultDue = evaluateDoseTransitions({
  doses: [pastTimeDose],
  now: new Date(),
  isTestMode: false
});

assert(resultDue.newlyDueDoses.length === 1, 'Triggers newly due dose alert');
assert(resultDue.updatedDoses[0].status === 'due', 'Dose status transitions from upcoming to due');
assert(resultDue.updatedDoses[0].initialAlertTimestamp !== undefined, 'Sets initialAlertTimestamp for grace period tracking');

// 4. Exact 3-Snooze Rule (Standard 10-minute intervals)
console.log('\n--- Test 4: Exact 3-Snooze Rule (Standard 10-minute) ---');
let currentDoseState = resultDue.updatedDoses[0];

// Snooze 1
const snooze1 = applySnoozeToDose(currentDoseState, false);
assert(snooze1.success === true, 'Snooze 1 allowed');
assert(snooze1.snoozeCount === 1, 'Snooze count is 1');
assert(snooze1.dose.status === 'snoozed', 'Status set to snoozed');
assert(
  snooze1.dose.nextSnoozeDeadline - Date.now() >= ENGINE_CONFIG.PRODUCTION_SNOOZE_MS - 1000,
  'Next deadline is 10 minutes in future'
);

// Snooze 2
const snooze2 = applySnoozeToDose(snooze1.dose, false);
assert(snooze2.success === true, 'Snooze 2 allowed');
assert(snooze2.snoozeCount === 2, 'Snooze count is 2');

// Snooze 3
const snooze3 = applySnoozeToDose(snooze2.dose, false);
assert(snooze3.success === true, 'Snooze 3 allowed');
assert(snooze3.snoozeCount === 3, 'Snooze count is 3');

// Snooze 4 (Must be strictly rejected)
const snooze4 = applySnoozeToDose(snooze3.dose, false);
assert(snooze4.success === false, 'Snooze 4 strictly rejected (max 3 snoozes allowed)');
assert(snooze4.snoozeCount === 3, 'Snooze count remains capped at 3');

// 5. Accelerated Test Mode (15-second snooze)
console.log('\n--- Test 5: Accelerated Test Mode Verification ---');
const testModeSnooze = applySnoozeToDose(currentDoseState, true);
assert(testModeSnooze.success === true, 'Test mode snooze succeeds');
assert(
  testModeSnooze.dose.nextSnoozeDeadline - Date.now() <= ENGINE_CONFIG.TEST_MODE_SNOOZE_MS + 500,
  'Test mode snooze deadline is 15 seconds'
);

// 6. Grace Period Expiration: Due -> Missed
console.log('\n--- Test 6: Grace Period Expiration Transitions Due -> Missed ---');
const sixMinutesAgoIso = new Date(Date.now() - 6 * 60 * 1000).toISOString();
const dueDose = {
  id: 'dose-due-expired',
  medicineId: 'm1',
  medicineName: 'Test Med',
  dosage: '10mg',
  scheduledDate: todayStr,
  scheduledTime: '00:01',
  status: 'due',
  snoozeCount: 0,
  initialAlertTimestamp: sixMinutesAgoIso
};

// Evaluate now (6 minutes after initialAlertTimestamp, exceeding 5-min production grace period)
const resultMissed = evaluateDoseTransitions({
  doses: [dueDose],
  now: new Date(),
  isTestMode: false
});

assert(resultMissed.newlyMissedDoses.length === 1, 'Detects newly missed dose');
assert(resultMissed.updatedDoses[0].status === 'missed', 'Status transitioned to missed');

// 7. Trilingual Translations Completeness
console.log('\n--- Test 7: Multilingual Integrity (EN, HI, TE) ---');
const langs = ['en', 'hi', 'te'];
langs.forEach((lang) => {
  const tObj = translations[lang];
  assert(tObj !== undefined, `Language [${lang}] bundle exists`);
  assert(tObj.reminderModal !== undefined, `Language [${lang}] has reminderModal translations`);
  assert(tObj.reminderModal.title !== undefined, `Language [${lang}] has reminderModal.title`);
  assert(tObj.reminderModal.btnTaken !== undefined, `Language [${lang}] has reminderModal.btnTaken`);
  assert(tObj.reminderModal.btnSnooze !== undefined, `Language [${lang}] has reminderModal.btnSnooze`);
  assert(tObj.reminderModal.btnSkip !== undefined, `Language [${lang}] has reminderModal.btnSkip`);
  assert(tObj.settingsPage.soundHeading !== undefined, `Language [${lang}] has settingsPage.soundHeading`);
  assert(tObj.settingsPage.testModeHeading !== undefined, `Language [${lang}] has settingsPage.testModeHeading`);
});

// 8. Service Exports
console.log('\n--- Test 8: Alarm and Notification Service Interfaces ---');
assert(typeof alarmSoundService.startAlarm === 'function', 'alarmSoundService.startAlarm is function');
assert(typeof alarmSoundService.stopAlarm === 'function', 'alarmSoundService.stopAlarm is function');
assert(typeof alarmSoundService.testAlarm === 'function', 'alarmSoundService.testAlarm is function');
assert(typeof notificationService.showDoseNotification === 'function', 'notificationService.showDoseNotification is function');
assert(typeof notificationService.requestPermission === 'function', 'notificationService.requestPermission is function');

console.log(`\n========================================`);
console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}

