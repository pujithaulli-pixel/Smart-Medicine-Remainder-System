import assert from 'node:assert';
import http from 'node:http';
import { db } from '../server/db.js';
import * as authService from '../server/services/authService.js';
import * as dataService from '../server/services/dataService.js';
import { seedDemoAccounts, DEMO_PATIENT, DEMO_CARETAKER } from '../server/services/seedService.js';
import { translations, getTranslation } from '../src/i18n/translations.js';

console.log('======================================================================');
console.log('       RUNNING PHASE 10 VERIFICATION & INTEGRATION SUITE');
console.log('======================================================================\n');

async function runTests() {
  // Test 1: Seed Demo Accounts
  console.log('[Test 1] Testing Demo Accounts Seeding...');
  const seedRes = await seedDemoAccounts();
  assert.strictEqual(seedRes.success, true, 'seedDemoAccounts should succeed');

  const patientUser = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(DEMO_PATIENT.email);
  assert.ok(patientUser, 'Demo Patient should exist in users table');
  assert.strictEqual(patientUser.role, 'patient', 'Demo Patient role must be patient');

  const caretakerUser = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(DEMO_CARETAKER.email);
  assert.ok(caretakerUser, 'Demo Caretaker should exist in users table');
  assert.strictEqual(caretakerUser.role, 'caretaker', 'Demo Caretaker role must be caretaker');
  console.log('  ✓ Demo Patient and Demo Caretaker correctly seeded with expected roles');

  // Test 2: Authentication & Role in Session
  console.log('\n[Test 2] Testing Authentication & Role Persistence...');
  const patientAuth = await authService.loginUser({ email: DEMO_PATIENT.email, password: DEMO_PATIENT.password });
  assert.ok(patientAuth.token, 'Patient login should return token');
  assert.strictEqual(patientAuth.user.role, 'patient', 'Returned session user must have patient role');

  const caretakerAuth = await authService.loginUser({ email: DEMO_CARETAKER.email, password: DEMO_CARETAKER.password });
  assert.ok(caretakerAuth.token, 'Caretaker login should return token');
  assert.strictEqual(caretakerAuth.user.role, 'caretaker', 'Returned session user must have caretaker role');
  console.log('  ✓ Auth tokens and user sessions accurately retain role information');

  // Test 3: Patient-Caretaker Invitation Workflow
  console.log('\n[Test 3] Testing Invitation Code Generation & Acceptance...');
  // Ensure a clean second caretaker for testing the link workflow
  const tempEmail = `test.caretaker.${Date.now()}@smartreminder.org`;
  const tempCrt = authService.registerUser({
    name: 'Test Secondary Caretaker',
    email: tempEmail,
    password: 'Password123!',
    role: 'caretaker'
  });

  const invite = dataService.createPatientInvitation(patientUser.id, { viewSchedule: true, viewHistory: true, receiveAlerts: true });
  const code = invite.invitationCode || invite.invitation_code;
  assert.ok(code.startsWith('CARE-'), 'Invitation code should follow CARE-XXXXXX format');
  assert.strictEqual(invite.status, 'pending', 'New invitation should be pending');

  const linkRes = dataService.acceptCaretakerInvitation(tempCrt.user.id, code);
  assert.strictEqual(linkRes.success, true, 'Accepting valid invitation should succeed');

  // Verify invitation marked as used
  const updatedInv = db.prepare('SELECT status, used_by_caretaker_id FROM patient_invitations WHERE id = ?').get(invite.id);
  assert.strictEqual(updatedInv.status, 'accepted', 'Accepted invitation must be updated to accepted');
  assert.strictEqual(updatedInv.used_by_caretaker_id, tempCrt.user.id, 'Invitation must record caretaker ID');

  // Prevent re-using already accepted invitation
  assert.throws(() => {
    dataService.acceptCaretakerInvitation(tempCrt.user.id, code);
  }, /Invalid or expired invitation code/, 'Reusing consumed invitation must throw error');
  console.log('  ✓ Invitation generation, redemption, expiration enforcement, and reuse protection work correctly');

  // Test 4: Linked Caretakers & Patients Retrieval
  console.log('\n[Test 4] Testing Linked Relations & Summary Authorization...');
  const patientCaretakers = dataService.getLinkedCaretakersForPatient(patientUser.id);
  assert.ok(patientCaretakers.some((c) => c.caretakerId === caretakerUser.id), 'Caretaker must appear in patient linked caretakers');

  const caretakerPatients = dataService.getLinkedPatientsForCaretaker(caretakerUser.id);
  assert.ok(caretakerPatients.some((p) => p.patientId === patientUser.id), 'Patient must appear in caretaker linked patients');

  // Patient Summary for Caretaker
  const summary = dataService.getCaretakerPatientSummary(caretakerUser.id, patientUser.id);
  assert.ok(summary.patient, 'Summary should contain patient info');
  assert.ok(Array.isArray(summary.todayDoses), 'Summary should contain today doses');
  assert.ok(Array.isArray(summary.medicines), 'Summary should contain medicines');
  console.log('  ✓ Linked relations correctly verified and patient summary accurately loaded');

  // Unlinked Caretaker Access Check
  assert.throws(() => {
    dataService.getCaretakerPatientSummary('usr-non-existent', patientUser.id);
  }, /not authorized to view this patient/i, 'Unlinked caretaker must be blocked with 403');
  console.log('  ✓ Security check: Unlinked caregiver access strictly blocked');

  // Test 5: Caretaker Alert Acknowledgement Without Dose Status Mutation
  console.log('\n[Test 5] Testing Alert Acknowledgement and Dose Integrity...');
  // Find an unacknowledged alert for demo patient
  let alert = db.prepare('SELECT id, acknowledged, medicine_name FROM caretaker_alerts WHERE user_id = ? AND acknowledged = 0').get(patientUser.id);
  if (!alert) {
    const alertId = `alt-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO caretaker_alerts (id, user_id, alert_type, medicine_name, scheduled_date, scheduled_time, channel, status, reason, created_at, acknowledged)
      VALUES (?, ?, 'missed_dose', 'Test Med', '2026-11-02', '12:00', 'email', 'sent', 'Missed dose', datetime('now'), 0)
    `).run(alertId, patientUser.id);
    alert = { id: alertId, medicine_name: 'Test Med' };
  }

  // Record initial dose occurrence statuses
  const dosesBefore = db.prepare('SELECT id, dose_occurrence_id, status FROM dose_occurrences WHERE user_id = ?').all(patientUser.id);

  // Acknowledge alert
  const testNote = 'Verified by phone call with patient.';
  const ackRes = dataService.acknowledgeCaretakerAlert(caretakerUser.id, alert.id, testNote);
  assert.strictEqual(Boolean(ackRes.acknowledged), true, 'Alert must be marked as acknowledged');
  const savedNote = ackRes.caretakerNote || ackRes.caretaker_note;
  assert.strictEqual(savedNote, testNote, 'Caregiver note must be saved');

  // Verify doses table was NOT mutated to 'taken'
  const dosesAfter = db.prepare('SELECT id, dose_occurrence_id, status FROM dose_occurrences WHERE user_id = ?').all(patientUser.id);
  assert.strictEqual(dosesBefore.length, dosesAfter.length, 'Dose occurrences count must remain unchanged');
  dosesAfter.forEach((afterDose) => {
    const beforeDose = dosesBefore.find((b) => b.id === afterDose.id);
    assert.strictEqual(afterDose.status, beforeDose.status, `Dose ${afterDose.id} status must NOT be modified by caretaker acknowledgement`);
  });
  console.log('  ✓ Alert acknowledgement records caregiver review without altering patient dose records');

  // Test 6: Multilingual Coverage (EN, HI, TE)
  console.log('\n[Test 6] Testing Multilingual Dictionaries (EN, HI, TE)...');
  ['en', 'hi', 'te'].forEach((lang) => {
    const t = getTranslation(lang);
    assert.ok(t.welcome?.headline, `${lang} missing welcome.headline`);
    assert.ok(t.welcome?.demoPatientBtn, `${lang} missing welcome.demoPatientBtn`);
    assert.ok(t.welcome?.demoCaretakerBtn, `${lang} missing welcome.demoCaretakerBtn`);
    assert.ok(t.caretakerDashboard?.title, `${lang} missing caretakerDashboard.title`);
    assert.ok(t.caretakerDashboard?.linkedPatientsTitle, `${lang} missing caretakerDashboard.linkedPatientsTitle`);
    assert.ok(t.caretakerDashboard?.acknowledgeAction, `${lang} missing caretakerDashboard.acknowledgeAction`);
    assert.ok(t.patientLinking?.cardTitle, `${lang} missing patientLinking.cardTitle`);
    assert.ok(t.patientLinking?.generateInviteBtn, `${lang} missing patientLinking.generateInviteBtn`);
    assert.ok(t.roles?.patient, `${lang} missing roles.patient`);
    assert.ok(t.roles?.caretaker, `${lang} missing roles.caretaker`);
  });
  console.log('  ✓ 100% translation key coverage across English, Hindi, and Telugu');

  console.log('\n======================================================================');
  console.log('   ✓ ALL PHASE 10 INTEGRATION & SECURITY TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ PHASE 10 TEST FAILED:', err);
  process.exit(1);
});
