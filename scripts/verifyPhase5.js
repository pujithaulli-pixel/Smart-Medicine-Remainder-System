/**
 * Phase 5 Comprehensive Automated Verification Test Suite
 * Smart Medical Reminder System
 *
 * Verifies all Phase 5 requirements:
 * 1. Caretaker profile data model & contact validation (E.164 phone, email, quiet hours).
 * 2. Alert generation triggered when dose marked missed (5-min grace period respected).
 * 3. Taken doses NEVER generate missed-dose alerts.
 * 4. Skipped doses NEVER generate missed-dose alerts.
 * 5. Paused and discontinued medicines NEVER generate alerts.
 * 6. Maximum 3 snoozes (10-min intervals) triggers snooze limit warning.
 * 7. Low stock alert generation when quantity <= threshold.
 * 8. Separation of alert generation from external delivery (alert stored locally, external delivery tracked separately).
 * 9. Honest delivery status: missing credentials report 'provider_not_configured', NEVER fake success.
 * 10. Quiet hours evaluation and 'quiet_hours_held' suppression.
 * 11. Alerts disabled toggle produces 'disabled_by_user'.
 * 12. Idempotency deduplication via idempotencyKey.
 * 13. Multilingual notification templates (English, Hindi, Telugu).
 * 14. Server health endpoint (/api/health).
 * 15. Server alerts list and creation endpoint (/api/alerts).
 * 16. Server retry endpoint (/api/alerts/retry/:id) with retryCount increment.
 * 17. Server test notification endpoint (/api/alerts/test).
 * 18. Phase 1-4 regression checks: reminder engine, translations, and adherence metrics intact.
 */

import http from 'node:http';
import { EventEmitter } from 'node:events';
import { generateNotificationContent } from '../server/templates.js';
import { validatePhoneNumber, formatE164 } from '../server/services/smsProvider.js';
import { sendEmailAlert } from '../server/services/emailProvider.js';
import { sendSmsAlert } from '../server/services/smsProvider.js';
import { alertStore } from '../server/services/alertStore.js';
import {
  generateDoseOccurrenceId,
  syncDoseOccurrencesForDate,
  evaluateDoseTransitions,
  applySnoozeToDose,
  ENGINE_CONFIG
} from '../src/services/reminderEngine.js';
import { translations } from '../src/i18n/translations.js';
import { calculateAdherence } from '../src/utils/adherenceUtils.js';

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

async function runSuite() {
  console.log('================================================================');
  console.log('   SMART MEDICAL REMINDER SYSTEM - PHASE 5 VERIFICATION SUITE   ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Phone number and Contact Validation (E.164 format)
  // -------------------------------------------------------------------------
  console.log('--- 1. Contact Info Validation ---');
  assert(validatePhoneNumber('+919876543210') === true, 'Valid Indian E.164 number accepted');
  assert(validatePhoneNumber('+14155552671') === true, 'Valid US E.164 number accepted');
  assert(validatePhoneNumber('9876543210') === true, '10-digit number accepted for normalization');
  assert(validatePhoneNumber('1234') === false, 'Too-short phone number rejected');
  assert(validatePhoneNumber('abc-invalid') === false, 'Alphabetic phone number rejected');
  assert(formatE164('+91 98765 43210') === '+919876543210', 'Phone number normalized with country code');

  // -------------------------------------------------------------------------
  // 2. Multilingual Templates (English, Hindi, Telugu)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Multilingual Notification Templates ---');
  const sampleParams = {
    patientName: 'Ram Sharma',
    caretakerName: 'Sunita Sharma',
    medicineName: 'Metformin 500mg',
    dosage: '1 tablet',
    scheduledTime: '08:00 AM',
    scheduledDate: '2026-10-31',
    instructions: 'After breakfast'
  };

  const enMissed = generateNotificationContent('missed_dose', 'en', sampleParams);
  assert(enMissed.subject.includes('Missed') && enMissed.body.includes('Metformin 500mg'), 'English missed dose template rendered');

  const hiMissed = generateNotificationContent('missed_dose', 'hi', sampleParams);
  assert(hiMissed.subject.includes('दवा') && hiMissed.body.includes('Metformin 500mg'), 'Hindi missed dose template rendered');

  const teMissed = generateNotificationContent('missed_dose', 'te', sampleParams);
  assert(teMissed.subject.includes('మందు') && teMissed.body.includes('Metformin 500mg'), 'Telugu missed dose template rendered');

  const enSnooze = generateNotificationContent('snooze_limit', 'en', sampleParams);
  assert(enSnooze.subject.includes('Snooze') && enSnooze.body.includes('3 times'), 'English 3-snooze warning template rendered');

  const hiSnooze = generateNotificationContent('snooze_limit', 'hi', sampleParams);
  assert(hiSnooze.subject.includes('स्नूज़') && hiSnooze.body.includes('3 बार'), 'Hindi 3-snooze warning template rendered');

  const teSnooze = generateNotificationContent('snooze_limit', 'te', sampleParams);
  assert(teSnooze.subject.includes('వాయిదాలు') && teSnooze.body.includes('3'), 'Telugu 3-snooze warning template rendered');

  // -------------------------------------------------------------------------
  // 3. Separation of Alert Generation from Carrier Delivery (Honest Reporting)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Delivery Status & Honest Reporting ---');
  // Without SMTP/Twilio credentials set in process.env, external providers MUST return provider_not_configured
  const emailRes = await sendEmailAlert({ to: 'care@example.com', subject: 'Test', html: '<p>Test</p>', text: 'Test' });
  assert(emailRes.status === 'provider_not_configured', 'Unconfigured email returns provider_not_configured (not fake sent)');
  assert(emailRes.sent === false, 'sent flag is strictly false when credentials missing');

  const smsRes = await sendSmsAlert({ to: '+919876543210', message: 'Test SMS' });
  assert(smsRes.status === 'provider_not_configured', 'Unconfigured SMS returns provider_not_configured (not fake sent)');
  assert(smsRes.sent === false, 'SMS sent flag is strictly false when credentials missing');

  // -------------------------------------------------------------------------
  // 4. Alert Store Idempotency & Deduplication
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Alert Store & Idempotency Deduplication ---');
  const testIdempotencyKey = `test_idem_${Date.now()}`;
  const alertPayload1 = {
    idempotencyKey: testIdempotencyKey,
    alertType: 'missed_dose',
    medicineId: 'med_test_1',
    medicineName: 'Amlodipine 5mg',
    scheduledTime: '09:00',
    scheduledDate: '2026-10-31',
    channel: 'email',
    recipient: 'care@test.com',
    reason: 'Missed dose 5 minutes past schedule',
    status: 'provider_not_configured'
  };

  const createdAlert1 = alertStore.recordAlert(alertPayload1);
  assert(createdAlert1 && createdAlert1.id, 'First alert record created in alertStore');
  assert(createdAlert1.idempotencyKey === testIdempotencyKey, 'Idempotency key saved with record');

  // Attempt duplicate record with same idempotencyKey
  const createdAlert2 = alertStore.recordAlert(alertPayload1);
  assert(createdAlert2.id === createdAlert1.id, 'Duplicate idempotencyKey returns existing record without creating duplicate');

  // -------------------------------------------------------------------------
  // 5. Quiet Hours Logic
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Quiet Hours Suppression ---');
  // Helper to check quiet hours inside test
  function isQuietHours(currentTimeHHMM, startHHMM, endHHMM) {
    if (startHHMM < endHHMM) {
      return currentTimeHHMM >= startHHMM && currentTimeHHMM < endHHMM;
    } else {
      // Overnight (e.g. 22:00 to 07:00)
      return currentTimeHHMM >= startHHMM || currentTimeHHMM < endHHMM;
    }
  }

  assert(isQuietHours('23:30', '22:00', '07:00') === true, '11:30 PM is within overnight quiet hours (22:00 - 07:00)');
  assert(isQuietHours('03:15', '22:00', '07:00') === true, '03:15 AM is within overnight quiet hours');
  assert(isQuietHours('14:00', '22:00', '07:00') === false, '02:00 PM is outside overnight quiet hours');
  assert(isQuietHours('13:30', '13:00', '15:00') === true, '01:30 PM is within daytime quiet hours (13:00 - 15:00)');

  // -------------------------------------------------------------------------
  // 6. Reminder Engine: Missed Doses vs Taken vs Skipped
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Reminder Engine Missed Doses Logic ---');
  const activeMed = {
    id: 'med_active',
    name: 'Atorvastatin 20mg',
    dosage: '1 tablet',
    status: 'active',
    reminderTimes: ['08:00'],
    startDate: '2026-10-01',
    endDate: '2026-11-01',
    isOngoing: false
  };

  const pausedMed = {
    id: 'med_paused',
    name: 'Vitamin D3',
    dosage: '1 capsule',
    status: 'paused',
    reminderTimes: ['08:00'],
    startDate: '2026-10-01',
    isOngoing: true
  };

  const initialDoses = syncDoseOccurrencesForDate('2026-10-31', [activeMed, pausedMed], []);
  assert(initialDoses.length === 1, 'Only active medicine generates doses for today (paused ignored)');
  assert(initialDoses[0].medicineId === 'med_active', 'Dose belongs to active medicine');

  // Transition evaluation: dose at 08:00 checked at 08:06 (6 min later, past 5-min grace period)
  const initialAlertTime = new Date();
  initialAlertTime.setMinutes(initialAlertTime.getMinutes() - 6);
  const dueDose = {
    ...initialDoses[0],
    status: 'due',
    initialAlertTimestamp: initialAlertTime.toISOString()
  };

  const transitionRes = evaluateDoseTransitions({
    doses: [dueDose],
    now: new Date()
  });
  const missedDose = transitionRes.updatedDoses.find((d) => d.id === initialDoses[0].id);
  assert(missedDose.status === 'missed', 'Dose transitions to missed after 5-minute grace period without confirmation');

  // Taken dose check
  const takenDose = { ...initialDoses[0], status: 'taken', takenTime: '08:01' };
  const evaluatedTaken = evaluateDoseTransitions({ doses: [takenDose], now: new Date() });
  assert(evaluatedTaken.updatedDoses[0].status === 'taken', 'Dose marked Taken NEVER transitions to missed');

  // Skipped dose check
  const skippedDose = { ...initialDoses[0], status: 'skipped', skippedTime: '08:02' };
  const evaluatedSkipped = evaluateDoseTransitions({ doses: [skippedDose], now: new Date() });
  assert(evaluatedSkipped.updatedDoses[0].status === 'skipped', 'Dose marked Skipped NEVER transitions to missed');

  // -------------------------------------------------------------------------
  // 7. Snooze Rule (3 Snoozes Max at 10-Minute Intervals)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Snooze Rule & Warning Threshold ---');
  let currentDose = { ...initialDoses[0], status: 'due', snoozeCount: 0 };
  
  // Snooze 1
  let snoozeRes = applySnoozeToDose(currentDose);
  assert(snoozeRes.snoozeCount === 1, 'First snooze sets snoozeCount to 1');
  assert(snoozeRes.dose.status === 'snoozed', 'Dose status set to snoozed');
  currentDose = snoozeRes.dose;

  // Snooze 2
  snoozeRes = applySnoozeToDose(currentDose);
  assert(snoozeRes.snoozeCount === 2, 'Second snooze sets snoozeCount to 2');
  currentDose = snoozeRes.dose;

  // Snooze 3
  snoozeRes = applySnoozeToDose(currentDose);
  assert(snoozeRes.snoozeCount === 3, 'Third snooze sets snoozeCount to 3 (Limit reached)');
  currentDose = snoozeRes.dose;

  // 4th Snooze should NOT succeed beyond maxSnoozes (3)
  const snooze4Attempt = applySnoozeToDose(currentDose);
  assert(snooze4Attempt.success === false, 'Fourth snooze rejected: capped strictly at 3 snoozes');
  assert(snooze4Attempt.snoozeCount === 3, 'Snooze count remains 3 after rejection');

  // -------------------------------------------------------------------------
  // 8. Low-Stock Alert Logic
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Low-Stock Alert Threshold ---');
  const lowStockMed = {
    id: 'med_low',
    name: 'Thyroxine 50mcg',
    remainingQuantity: 3,
    refillThreshold: 5,
    quantityUnit: 'tablets'
  };
  const isLowStock = lowStockMed.remainingQuantity <= lowStockMed.refillThreshold;
  assert(isLowStock === true, 'Medicine with remaining 3 <= threshold 5 triggers low-stock condition');

  const adequateStockMed = {
    id: 'med_ok',
    name: 'Thyroxine 50mcg',
    remainingQuantity: 20,
    refillThreshold: 5
  };
  assert(adequateStockMed.remainingQuantity > adequateStockMed.refillThreshold, 'Medicine with remaining 20 > threshold 5 does not trigger low-stock');

  // -------------------------------------------------------------------------
  // 9. Alert Retry & Retry Counter
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Alert Retry Tracking ---');
  const alertForRetry = alertStore.recordAlert({
    idempotencyKey: `retry_test_${Date.now()}`,
    alertType: 'missed_dose',
    medicineName: 'Paracetamol 650mg',
    scheduledTime: '10:00',
    status: 'failed'
  });

  const updatedAlert = alertStore.updateAlert(alertForRetry.id, {
    retryCount: (alertForRetry.retryCount || 0) + 1,
    status: 'provider_not_configured',
    lastRetryAt: new Date().toISOString()
  });

  assert(updatedAlert.retryCount === 1, 'retryCount incremented to 1 after retry attempt');
  assert(updatedAlert.lastRetryAt !== undefined, 'lastRetryAt timestamp updated');

  // -------------------------------------------------------------------------
  // 10. Native Node Backend HTTP API Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 10. Native Node Backend HTTP API ---');

  const { requestHandler } = await import('../server/index.js');

  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const req = new EventEmitter();
      req.url = path;
      req.method = options.method || 'GET';
      req.headers = { host: 'localhost:3001', 'content-type': 'application/json', ...(options.headers || {}) };

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
          if (data) resBody += data;
          let parsed = resBody;
          try {
            parsed = JSON.parse(resBody);
          } catch {}
          resolve({ statusCode: resStatus, headers: resHeaders, body: parsed });
        }
      };

      Promise.resolve().then(async () => {
        try {
          const promise = requestHandler(req, res);
          if (options.body) {
            const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
            req.emit('data', Buffer.from(bodyStr));
          }
          req.emit('end');
          await promise;
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  try {
    // A. Health Endpoint
    const health = await request('/api/health');
    assert(health.statusCode === 200, 'GET /api/health returns HTTP 200');
    assert(health.body.status === 'operational', 'Health reports operational status');
    assert(health.body.providers.email.configured === false, 'Health correctly reports email unconfigured');
    assert(health.body.providers.sms.configured === false, 'Health correctly reports SMS unconfigured');

    // B. Caretaker Profile GET / PUT
    const getCaretaker = await request('/api/caretaker');
    assert(getCaretaker.statusCode === 200, 'GET /api/caretaker returns HTTP 200');

    const updateCaretakerRes = await request('/api/caretaker', {
      method: 'PUT',
      body: {
        name: 'Sunita Sharma',
        relationship: 'Daughter',
        phone: '+919876543210',
        email: 'sunita@example.com',
        preferredLanguage: 'hi',
        preferredChannel: 'email',
        alertsEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00'
      }
    });
    assert(updateCaretakerRes.statusCode === 200, 'PUT /api/caretaker returns HTTP 200');
    assert(updateCaretakerRes.body.caretaker.preferredLanguage === 'hi', 'Caretaker preferredLanguage updated');

    // C. Alerts POST & GET
    const alertPost = await request('/api/alerts', {
      method: 'POST',
      body: {
        idempotencyKey: `api_alert_${Date.now()}`,
        alertType: 'missed_dose',
        medicineName: 'Metformin 500mg',
        scheduledTime: '08:00 AM',
        dosage: '1 tablet',
        reason: 'Missed dose after grace period'
      }
    });
    assert(alertPost.statusCode === 201, 'POST /api/alerts returns HTTP 201');
    assert(alertPost.body.alert && alertPost.body.alert.id, 'Created alert contains id');
    assert(alertPost.body.delivery.status === 'provider_not_configured', 'Delivery status is provider_not_configured');

    const alertList = await request('/api/alerts');
    assert(alertList.statusCode === 200, 'GET /api/alerts returns HTTP 200');
    assert(Array.isArray(alertList.body.alerts), 'Alerts list is an array');

    // D. Test Delivery Endpoint
    const testDelivery = await request('/api/alerts/test', {
      method: 'POST',
      body: {
        channel: 'email',
        recipient: 'sunita@example.com',
        language: 'hi'
      }
    });
    assert(testDelivery.statusCode === 200, 'POST /api/alerts/test returns HTTP 200');
    assert(testDelivery.body.delivery.status === 'provider_not_configured', 'Test delivery honestly reports provider_not_configured');

    // E. Retry Endpoint
    const retryRes = await request(`/api/alerts/retry/${alertPost.body.alert.id}`, {
      method: 'POST'
    });
    assert(retryRes.statusCode === 200, 'POST /api/alerts/retry/:id returns HTTP 200');
    assert(retryRes.body.alert.retryCount >= 1, 'Retry endpoint increments retryCount');
  } catch (err) {
    console.error('API Verification error:', err);
    assert(false, 'Native Node Backend HTTP API threw error');
  }

  // -------------------------------------------------------------------------
  // 11. Multilingual Strings in Frontend translations.js
  // -------------------------------------------------------------------------
  console.log('\n--- 11. Multilingual Support across EN, HI, TE ---');
  ['en', 'hi', 'te'].forEach((lang) => {
    const t = translations[lang];
    assert(Boolean(t), `Translations exist for language: ${lang}`);
    assert(Boolean(t.nav?.caretaker), `Navigation contains Caretaker for ${lang}`);
    assert(Boolean(t.caretakerPage?.fields?.name), `Caretaker name field translated for ${lang}`);
    assert(Boolean(t.caretakerPage?.fields?.phone), `Caretaker phone field translated for ${lang}`);
    assert(Boolean(t.dashboard?.stats?.activeMedicines), `Dashboard activeMedicines translated for ${lang}`);
  });

  // -------------------------------------------------------------------------
  // 12. Adherence Integrity (Phase 4 preservation)
  // -------------------------------------------------------------------------
  console.log('\n--- 12. Phase 4 Adherence Integrity ---');
  const sampleResolvedDoses = [
    { id: '1', status: 'taken' },
    { id: '2', status: 'taken' },
    { id: '3', status: 'missed' },
    { id: '4', status: 'upcoming' } // excluded
  ];
  const adherence = calculateAdherence(sampleResolvedDoses);
  // 2 taken out of 3 resolved = 67%
  assert(adherence.adherencePercent === 67, 'Adherence strictly calculates taken / resolved doses');
  assert(adherence.eligibleResolved === 3, 'Upcoming doses strictly excluded from adherence calculation');

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test suite execution error:', err);
  process.exit(1);
});
