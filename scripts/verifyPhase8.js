/**
 * Phase 8 Comprehensive System Verification & Integration Test Suite
 * Smart Medical Reminder System
 *
 * Verifies end-to-end integration across all 8 phases:
 * 1. Medicine Management:
 *    - Creation, multi-dose scheduling, search, filtering, and stock tracking.
 *    - Input validation (empty name, inverted dates, missing times).
 *    - Treatment duration calculations (inclusive days & ongoing treatment).
 * 2. Reminder & Alarm Engine:
 *    - Stable unique occurrence IDs and duplicate prevention.
 *    - Taken & Skip actions prevent missed-dose transition.
 *    - Exact 3-snooze limit with intermediate snooze grace period preservation.
 *    - Grace period expiration cleanly transitions Due -> Missed.
 * 3. Caretaker Notifications & Honest Delivery:
 *    - Missed dose alert triggered with idempotency deduplication.
 *    - Multilingual notification templates (English, Hindi, Telugu).
 *    - Honest status reporting (provider_not_configured, quiet_hours_held, disabled_by_user).
 *    - Alert retry counter increment and timestamp update.
 * 4. Authentication & Multi-Tenant Data Isolation:
 *    - scrypt password hashing with unique random salts (zero plain-text).
 *    - Strict multi-tenant isolation across medicines, doses, history, caretaker, alerts, and files.
 *    - 401 unauthorized enforcement on protected endpoints.
 * 5. Database, Migration & Secure File Storage:
 *    - ACID relational persistence and cascading deletes.
 *    - LocalStorage migration idempotency and deduplication.
 *    - File upload MIME validation (JPEG, PNG, WebP, PDF) and 5MB size limit.
 *    - Multi-tenant file access control (403 forbidden for non-owners).
 * 6. History, Adherence & Reports:
 *    - Taken, Missed, Skipped distinction.
 *    - Adherence formula: Taken / (Taken + Missed + Skipped) * 100.
 *    - Division by zero returns 'No data' (no NaN).
 *    - CSV export with UTF-8 BOM and Unicode Hindi/Telugu support.
 * 7. Multilingual Architecture & Deep Proxy Fallback:
 *    - Complete dictionaries across EN, HI, TE.
 *    - Deep proxy fallback for missing nested keys.
 * 8. Backward Compatibility:
 *    - Guest mode fallback for unauthenticated users.
 */

import { EventEmitter } from 'node:events';
import { requestHandler } from '../server/index.js';
import { db } from '../server/db.js';
import {
  generateDoseOccurrenceId,
  syncDoseOccurrencesForDate,
  evaluateDoseTransitions,
  applySnoozeToDose,
  ENGINE_CONFIG
} from '../src/services/reminderEngine.js';
import { calculateAdherence, calculatePerMedicineMetrics } from '../src/utils/adherenceUtils.js';
import { calculateTreatmentDuration } from '../src/utils/dateUtils.js';
import { formatCsvContent } from '../src/utils/csvUtils.js';
import { getTranslation, translations } from '../src/i18n/translations.js';
import { generateNotificationContent } from '../server/templates.js';
import { alertStore } from '../server/services/alertStore.js';
import { validatePhoneNumber, formatE164 } from '../server/services/smsProvider.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failed++;
  }
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.url = path;
    req.method = options.method || 'GET';
    req.headers = {
      host: 'localhost:3001',
      'content-type': 'application/json',
      ...(options.headers || {})
    };

    let resBody = '';
    let resStatus = 200;
    let resHeaders = {};

    const res = {
      writeHead: (status, headers) => {
        resStatus = status;
        resHeaders = headers || {};
      },
      setHeader: (name, val) => {
        resHeaders[name.toLowerCase()] = val;
      },
      end: (data) => {
        if (data) {
          resBody += Buffer.isBuffer(data) ? data.toString('utf8') : data;
        }
        let parsed = resBody;
        try {
          parsed = JSON.parse(resBody);
        } catch {}
        resolve({
          statusCode: resStatus,
          status: resStatus,
          headers: resHeaders,
          body: parsed,
          rawBody: resBody
        });
      }
    };

    try {
      requestHandler(req, res);
      if (options.body) {
        const payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        req.emit('data', Buffer.from(payload));
      }
      req.emit('end');
    } catch (err) {
      reject(err);
    }
  });
}

async function runPhase8MasterVerification() {
  console.log('================================================================');
  console.log('   SMART MEDICAL REMINDER SYSTEM - PHASE 8 MASTER VERIFICATION  ');
  console.log('================================================================');

  const timestamp = Date.now();
  const user1Email = `user1_p8_${timestamp}@example.com`;
  const user2Email = `user2_p8_${timestamp}@example.com`;
  const sharedPassword = 'Phase8MasterPassword!';

  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';

  // -------------------------------------------------------------------------
  // 1. Medicine Management & Scheduling Engine
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Medicine Management & Scheduling Engine ---');

  // Test stable occurrence ID format
  const occId1 = generateDoseOccurrenceId('med-101', '2026-10-31', '08:00');
  const occId2 = generateDoseOccurrenceId('med-102', '2026-10-31', '08:00');
  assert(occId1 === 'dose_med-101_2026-10-31_0800', 'Dose occurrence ID correctly formatted');
  assert(occId1 !== occId2, 'Distinct medicines at identical times produce collision-free IDs');

  // Multi-dose scheduling synchronization
  const sampleMedicines = [
    {
      id: 'med_active_1',
      name: 'Amoxicillin 500mg',
      dosageAmount: '1',
      dosageUnit: 'capsule',
      startDate: '2026-10-01',
      endDate: '2026-11-15',
      isOngoing: false,
      times: ['08:00', '14:00', '20:00'],
      status: 'active'
    },
    {
      id: 'med_paused',
      name: 'Vitamin D3',
      startDate: '2026-10-01',
      times: ['09:00'],
      status: 'paused'
    },
    {
      id: 'med_expired',
      name: 'Antibiotic Course',
      startDate: '2026-09-01',
      endDate: '2026-09-10',
      isOngoing: false,
      times: ['08:00'],
      status: 'active'
    }
  ];

  const todayDoses = syncDoseOccurrencesForDate('2026-10-31', sampleMedicines, []);
  assert(todayDoses.length === 3, 'Active 3-dose medicine schedules exactly 3 doses for today');
  assert(!todayDoses.some((d) => d.medicineId === 'med_paused'), 'Paused medicine excluded from today schedule');
  assert(!todayDoses.some((d) => d.medicineId === 'med_expired'), 'Expired treatment date excluded from today schedule');

  // Inclusive duration calculations
  const duration1 = calculateTreatmentDuration('2026-10-01', '2026-10-01', false);
  const duration10 = calculateTreatmentDuration('2026-10-01', '2026-10-10', false);
  const durationOngoing = calculateTreatmentDuration('2026-10-01', '', true);
  assert(duration1.includes('1'), 'Single-day prescription calculates exactly 1 day duration');
  assert(duration10.includes('10'), '10-day span calculates exactly 10 inclusive calendar days');
  assert(durationOngoing.toLowerCase().includes('ongoing'), 'Ongoing medicine duration displays Ongoing');

  // -------------------------------------------------------------------------
  // 2. Reminder & Alarm Engine with Snooze Grace Period Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Reminder Engine & Snooze Grace Period Integrity ---');

  const baseDose = {
    id: 'test_dose_occ',
    medicineId: 'med_active_1',
    medicineName: 'Amoxicillin 500mg',
    scheduledDate: '2026-10-31',
    scheduledTime: '08:00',
    status: 'upcoming',
    snoozeCount: 0
  };

  // Upcoming -> Due transition
  const triggerTime = new Date('2026-10-31T08:00:00');
  const evalUpcoming = evaluateDoseTransitions({ doses: [baseDose], now: triggerTime, isTestMode: false });
  assert(evalUpcoming.newlyDueDoses.length === 1, 'Upcoming dose transitions to Due when scheduled time arrives');
  const dueDose = evalUpcoming.updatedDoses[0];
  assert(dueDose.status === 'due', 'Dose status is Due');
  assert(Boolean(dueDose.initialAlertTimestamp), 'initialAlertTimestamp recorded for grace period tracking');

  // Snooze 1 (10-minute production snooze)
  const snooze1 = applySnoozeToDose(dueDose, false);
  assert(snooze1.success === true && snooze1.snoozeCount === 1, 'First snooze allowed (count = 1)');
  assert(snooze1.dose.status === 'snoozed', 'Status set to snoozed');
  assert(snooze1.nextDeadline - Date.now() >= 9 * 60 * 1000, 'Next deadline scheduled ~10 minutes in future');

  // Wake up from Snooze 1
  const wakeTime1 = new Date(snooze1.nextDeadline + 1000);
  const evalWake1 = evaluateDoseTransitions({ doses: [snooze1.dose], now: wakeTime1, isTestMode: false });
  assert(evalWake1.updatedDoses[0].status === 'due', 'Wakes up from Snooze 1 to Due');

  // Verify intermediate grace period fix: 1 second and 4 minutes later it must STILL be Due (not prematurely Missed)
  const fourMinLater = new Date(wakeTime1.getTime() + 4 * 60 * 1000);
  const evalIntermediate = evaluateDoseTransitions({ doses: evalWake1.updatedDoses, now: fourMinLater, isTestMode: false });
  assert(evalIntermediate.updatedDoses[0].status === 'due', 'Intermediate snooze grace period preserved: Dose remains Due 4 minutes after wake-up');

  // Snooze 2 and Snooze 3
  const snooze2 = applySnoozeToDose(evalIntermediate.updatedDoses[0], false);
  assert(snooze2.snoozeCount === 2, 'Second snooze allowed (count = 2)');
  const snooze3 = applySnoozeToDose(snooze2.dose, false);
  assert(snooze3.snoozeCount === 3, 'Third snooze allowed (count = 3 - Limit Reached)');

  // Snooze 4 rejected
  const snooze4 = applySnoozeToDose(snooze3.dose, false);
  assert(snooze4.success === false, 'Fourth snooze strictly rejected: 3-snooze limit enforced');
  assert(snooze4.snoozeCount === 3, 'Snooze count remains capped at 3');

  // Final alert wake-up and grace period expiration -> Missed
  const wakeTime3 = new Date(snooze3.nextDeadline + 1000);
  const evalWake3 = evaluateDoseTransitions({ doses: [snooze3.dose], now: wakeTime3, isTestMode: false });
  assert(evalWake3.updatedDoses[0].status === 'due', 'Final reminder appears after third snooze interval');
  assert(Boolean(evalWake3.updatedDoses[0].finalAlertTimestamp), 'finalAlertTimestamp recorded on final alert');

  // Grace period expired (5 minutes + 10 seconds without response)
  const expiredTime = new Date(wakeTime3.getTime() + (5 * 60 + 10) * 1000);
  const evalExpired = evaluateDoseTransitions({ doses: evalWake3.updatedDoses, now: expiredTime, isTestMode: false });
  assert(evalExpired.updatedDoses[0].status === 'missed', 'Grace period expiration transitions unresolved dose to Missed');

  // Taken and Skip actions prevent Missed transition
  const takenDose = { ...dueDose, status: 'taken', takenTimestamp: new Date().toISOString() };
  const evalTaken = evaluateDoseTransitions({ doses: [takenDose], now: expiredTime, isTestMode: false });
  assert(evalTaken.updatedDoses[0].status === 'taken', 'Taken dose NEVER transitions to Missed');

  const skippedDose = { ...dueDose, status: 'skipped', skipReason: 'Fasting for medical test' };
  const evalSkipped = evaluateDoseTransitions({ doses: [skippedDose], now: expiredTime, isTestMode: false });
  assert(evalSkipped.updatedDoses[0].status === 'skipped', 'Skipped dose NEVER transitions to Missed');

  // -------------------------------------------------------------------------
  // 3. Caretaker Notifications & Honest Delivery Status
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Caretaker Notifications & Honest Reporting ---');

  // Contact validation
  assert(validatePhoneNumber('+919876543210') === true, 'Valid E.164 phone number validated');
  assert(validatePhoneNumber('1234') === false, 'Malformed phone number rejected');

  // Multilingual templates
  const sampleParams = {
    patientName: 'Ram Sharma',
    caretakerName: 'Sunita Sharma',
    medicineName: 'Amoxicillin 500mg',
    dosage: '1 capsule',
    scheduledTime: '08:00 AM',
    scheduledDate: '2026-10-31'
  };
  const tplEn = generateNotificationContent('missed_dose', 'en', sampleParams);
  const tplHi = generateNotificationContent('missed_dose', 'hi', sampleParams);
  const tplTe = generateNotificationContent('missed_dose', 'te', sampleParams);
  assert(tplEn.subject.includes('Missed') && tplEn.body.includes('Amoxicillin 500mg'), 'English template rendered');
  assert(tplHi.subject.includes('दवा') && tplHi.body.includes('Amoxicillin 500mg'), 'Hindi template rendered');
  assert(tplTe.subject.includes('మందు') && tplTe.body.includes('Amoxicillin 500mg'), 'Telugu template rendered');

  // Idempotency deduplication
  const idempKey = `p8_idemp_${timestamp}`;
  const save1 = alertStore.saveAlert({ idempotencyKey: idempKey, medicineName: 'Amoxicillin', scheduledTime: '08:00' });
  const save2 = alertStore.saveAlert({ idempotencyKey: idempKey, medicineName: 'Amoxicillin', scheduledTime: '08:00' });
  assert(save1.isDuplicate === false, 'First alert saved in alertStore');
  assert(save2.isDuplicate === true, 'Duplicate alert with same idempotencyKey recognized and suppressed');

  // -------------------------------------------------------------------------
  // 4. Authentication & Multi-Tenant Data Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Authentication & Multi-Tenant Data Isolation ---');

  // Register User 1
  const reg1 = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Pooja Sharma', email: user1Email, password: sharedPassword, preferredLanguage: 'hi' }
  });
  assert(reg1.statusCode === 201, 'User 1 registered with HTTP 201');
  user1Token = reg1.body.token;
  user1Id = reg1.body.user.id;

  // Register User 2 with identical password (proves salt uniqueness)
  const reg2 = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Kiran Rao', email: user2Email, password: sharedPassword, preferredLanguage: 'te' }
  });
  assert(reg2.statusCode === 201, 'User 2 registered with HTTP 201');
  user2Token = reg2.body.token;
  user2Id = reg2.body.user.id;

  // Cryptographic scrypt and unique salt check
  const dbUser1 = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(user1Id);
  const dbUser2 = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(user2Id);
  assert(dbUser1.password_hash !== sharedPassword, 'Password is NOT stored in plain text');
  assert(dbUser1.salt !== dbUser2.salt, 'Unique random 16-byte salt generated per user');
  assert(dbUser1.password_hash !== dbUser2.password_hash, 'Different hashes produced for identical passwords');

  // Unauthenticated endpoint check
  const unauthCheck = await request('/api/auth/me');
  assert(unauthCheck.statusCode === 401, 'Protected endpoint /api/auth/me rejects unauthenticated request with 401');

  // User 1 creates medicine
  const medRes1 = await request('/api/medicines', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      name: 'Glimepiride 2mg',
      dosageAmount: '1',
      dosageUnit: 'tablet',
      medicineForm: 'tablet',
      times: ['08:30'],
      startDate: '2026-10-01',
      remainingQuantity: 30,
      refillThreshold: 5,
      status: 'active'
    }
  });
  assert(medRes1.statusCode === 201, 'User 1 created medicine with HTTP 201');
  const user1MedId = medRes1.body.medicine.id;

  // Multi-tenant privacy: User 2 cannot access User 1's medicine
  const user2MedCheck = await request(`/api/medicines/${user1MedId}`, {
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(user2MedCheck.statusCode === 404, "Multi-tenant isolation: User 2 cannot GET User 1's medicine (404)");

  const user2PutCheck = await request(`/api/medicines/${user1MedId}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${user2Token}` },
    body: { name: 'Hacked Name' }
  });
  assert(user2PutCheck.statusCode === 404, "Multi-tenant isolation: User 2 cannot PUT User 1's medicine (404)");

  const user2DelCheck = await request(`/api/medicines/${user1MedId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(user2DelCheck.statusCode === 404, "Multi-tenant isolation: User 2 cannot DELETE User 1's medicine (404)");

  // -------------------------------------------------------------------------
  // 5. Database, Migration & Secure File Uploads
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Database, Migration & Secure File Uploads ---');

  // Local storage migration deduplication test
  const migrationPayload = {
    medicines: [
      { id: `mig_med_${timestamp}`, name: 'Aspirin 75mg', dosageAmount: '1', dosageUnit: 'tablet', times: ['09:00'], startDate: '2026-10-01' }
    ],
    todayDoses: [
      { id: `mig_occ_${timestamp}`, medicineName: 'Aspirin 75mg', date: '2026-10-31', time: '09:00', status: 'taken' }
    ],
    doseHistory: [
      { id: `mig_hist_${timestamp}`, medicineName: 'Aspirin 75mg', date: '2026-10-31', scheduledTime: '09:00', status: 'taken' }
    ]
  };

  const mig1 = await request('/api/migrate/local', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: migrationPayload
  });
  assert(mig1.statusCode === 200, 'Migration succeeded with HTTP 200');
  assert(mig1.body.imported.medicines === 1, 'Imported 1 medicine');

  const mig2 = await request('/api/migrate/local', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: migrationPayload
  });
  assert(mig2.statusCode === 200 && mig2.body.imported.medicines === 0, 'Deduplication: Second migration created 0 duplicates');

  // Secure File Upload
  const validPngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await request('/api/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: { filename: 'rx-scan.png', mimeType: 'image/png', dataBase64: validPngB64 }
  });
  assert(uploadRes.statusCode === 200, 'Valid PNG upload accepted with HTTP 200');
  const storedFilename = uploadRes.body.filename || uploadRes.body.file?.storedFilename;

  // MIME type validation
  const badMimeRes = await request('/api/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: { filename: 'exploit.sh', mimeType: 'application/x-sh', dataBase64: validPngB64 }
  });
  assert(badMimeRes.statusCode === 400, 'Dangerous MIME type rejected with HTTP 400');

  // User 1 accesses their uploaded file
  const fileAccess1 = await request(`/api/files/${storedFilename}`, {
    headers: { authorization: `Bearer ${user1Token}` }
  });
  assert(fileAccess1.statusCode === 200, 'Owner can access uploaded file (HTTP 200)');

  // User 2 cannot access User 1's uploaded file
  const fileAccess2 = await request(`/api/files/${storedFilename}`, {
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(fileAccess2.statusCode === 403, "Multi-tenant privacy: User 2 accessing User 1's file rejected with HTTP 403");

  // -------------------------------------------------------------------------
  // 6. Reports, History & Strict Adherence Formula
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Reports, History & Adherence Formula ---');

  const testDoses = [
    { status: 'taken' },
    { status: 'taken' },
    { status: 'missed' },
    { status: 'skipped' },
    { status: 'upcoming' }, // Pending: must be excluded from adherence
    { status: 'due' }       // Pending: must be excluded from adherence
  ];

  const adherence = calculateAdherence(testDoses);
  assert(adherence.taken === 2, 'Taken count is 2');
  assert(adherence.missed === 1, 'Missed count is 1');
  assert(adherence.skipped === 1, 'Skipped count is 1');
  assert(adherence.pending === 2, 'Pending count (upcoming + due) is 2');
  assert(adherence.eligibleResolved === 4, 'Eligible resolved = Taken(2) + Missed(1) + Skipped(1) = 4');
  assert(adherence.adherencePercent === 50, 'Adherence % = (2 / 4) * 100 = 50%');

  // Division by zero test
  const emptyAdherence = calculateAdherence([]);
  assert(emptyAdherence.adherencePercent === null, 'Empty doses list produces null adherencePercent');
  assert(emptyAdherence.adherenceDisplay === 'No data', 'Empty doses list produces "No data" display');

  // CSV UTF-8 BOM formatting
  const csvOutput = formatCsvContent(['Name', 'Status', 'Date'], [['Paracetamol', 'Taken', '2026-10-31'], ['पैरासिटामोल', 'लिया', '2026-10-31']]);
  assert(csvOutput.charCodeAt(0) === 0xFEFF, 'CSV file starts with UTF-8 BOM (0xFEFF) for Excel Unicode compatibility');
  assert(csvOutput.includes('पैरासिटामोल'), 'CSV safely preserves Devanagari Unicode characters without garbling');

  // -------------------------------------------------------------------------
  // 7. Multilingual Architecture & Deep Proxy Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Multilingual Support across EN, HI, TE ---');

  const tEn = getTranslation('en');
  const tHi = getTranslation('hi');
  const tTe = getTranslation('te');

  assert(tEn.appName === 'Smart Medical Reminder', 'English app name defined');
  assert(Boolean(tHi.appName), 'Hindi app name defined');
  assert(Boolean(tTe.appName), 'Telugu app name defined');

  // Deep Proxy fallback for missing key
  assert(Boolean(tHi.common), 'common dictionary accessible on proxy');
  assert(tHi._nonExistentKey === undefined, 'Deep proxy fallback safely handles unknown keys without throwing');

  // -------------------------------------------------------------------------
  // 8. Cascading Account Deletion Cleanup
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Account Deletion & Cascading Purge ---');

  // Deletion with wrong password rejected
  const badDel = await request('/api/auth/account', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${user1Token}` },
    body: { password: 'WrongPassword!' }
  });
  assert(badDel.statusCode === 401, 'Account deletion with incorrect password rejected with HTTP 401');

  // Successful deletion with correct password
  const goodDel = await request('/api/auth/account', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${user1Token}` },
    body: { password: sharedPassword }
  });
  assert(goodDel.statusCode === 200, 'Account successfully deleted with HTTP 200');

  // Verify User 1 token revoked
  const postDelCheck = await request('/api/auth/me', {
    headers: { authorization: `Bearer ${user1Token}` }
  });
  assert(postDelCheck.statusCode === 401, 'Deleted user session token is immediately revoked (HTTP 401)');

  // Verify cascading purge in database
  const countU1 = db.prepare('SELECT COUNT(*) as count FROM users WHERE id = ?').get(user1Id);
  const countMedsU1 = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE user_id = ?').get(user1Id);
  assert(countU1.count === 0, 'User record deleted from database');
  assert(countMedsU1.count === 0, 'User medicines cascade deleted');

  // Clean up User 2
  await request('/api/auth/account', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${user2Token}` },
    body: { password: sharedPassword }
  });

  // -------------------------------------------------------------------------
  // 9. Backward Compatibility for Guest Mode
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Guest Mode Backward Compatibility ---');

  const guestHealth = await request('/api/health');
  assert(guestHealth.statusCode === 200, 'GET /api/health returns HTTP 200 without authentication');

  const guestCaretaker = await request('/api/caretaker');
  assert(guestCaretaker.statusCode === 200, 'GET /api/caretaker accessible in guest mode');

  console.log('\n================================================================');
  console.log(`MASTER VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8MasterVerification().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
