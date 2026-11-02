import assert from 'node:assert';
import { startServer, server } from '../server/index.js';

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

async function run() {
  console.log('[TEST] Starting verification of Auth and Login fixes...');
  await startServer(PORT);

  try {
    // 1. Verify Demo Accounts
    console.log('[TEST 1] Testing Demo Patient & Caretaker Logins...');
    const demoPatientRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.patient@smartreminder.org', password: 'DemoPatient123!' })
    });
    assert.strictEqual(demoPatientRes.status, 200, 'Demo patient should log in cleanly');
    const demoPatientData = await demoPatientRes.json();
    assert.strictEqual(demoPatientData.user.role, 'patient');
    assert.ok(demoPatientData.token);

    const demoCaretakerRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.caretaker@smartreminder.org', password: 'DemoCaretaker123!' })
    });
    assert.strictEqual(demoCaretakerRes.status, 200, 'Demo caretaker should log in cleanly');
    const demoCaretakerData = await demoCaretakerRes.json();
    assert.strictEqual(demoCaretakerData.user.role, 'caretaker');
    assert.ok(demoCaretakerData.token);
    console.log('✓ Demo accounts verified successfully.');

    // 2. New Patient Registration & Subsequent Login
    console.log('[TEST 2] Testing New Patient Registration & Login...');
    const patientEmail = `test.patient.${Date.now()}@example.com`;
    const regPatientRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anita Sharma',
        email: patientEmail,
        password: 'Password123!',
        role: 'patient',
        language: 'hi'
      })
    });
    assert.strictEqual(regPatientRes.status, 201, 'Patient registration should succeed with 201');
    const regPatientData = await regPatientRes.json();
    assert.strictEqual(regPatientData.user.role, 'patient');
    assert.strictEqual(regPatientData.user.name, 'Anita Sharma');
    assert.strictEqual(regPatientData.user.email, patientEmail);
    assert.ok(regPatientData.token);

    // Now sign in with new patient
    const loginPatientRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientEmail, password: 'Password123!' })
    });
    assert.strictEqual(loginPatientRes.status, 200, 'New patient should log in successfully');
    const loginPatientData = await loginPatientRes.json();
    assert.strictEqual(loginPatientData.user.role, 'patient');
    console.log('✓ New patient registration and subsequent login verified.');

    // 3. New Caretaker Registration & Subsequent Login
    console.log('[TEST 3] Testing New Caretaker Registration & Login...');
    const caretakerEmail = `test.caretaker.${Date.now()}@example.com`;
    const regCaretakerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vikram Sharma',
        email: caretakerEmail,
        password: 'Password123!',
        role: 'caretaker',
        language: 'en'
      })
    });
    assert.strictEqual(regCaretakerRes.status, 201, 'Caretaker registration should succeed with 201');
    const regCaretakerData = await regCaretakerRes.json();
    assert.strictEqual(regCaretakerData.user.role, 'caretaker');
    assert.strictEqual(regCaretakerData.user.name, 'Vikram Sharma');

    // Sign in with new caretaker
    const loginCaretakerRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: caretakerEmail, password: 'Password123!' })
    });
    assert.strictEqual(loginCaretakerRes.status, 200, 'New caretaker should log in successfully');
    const loginCaretakerData = await loginCaretakerRes.json();
    assert.strictEqual(loginCaretakerData.user.role, 'caretaker');
    console.log('✓ New caretaker registration and subsequent login verified.');

    // 4. Duplicate Email Registration
    console.log('[TEST 4] Testing Duplicate Email Registration Validation...');
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: patientEmail,
        password: 'Password123!',
        role: 'patient'
      })
    });
    assert.strictEqual(dupRes.status, 409, 'Duplicate email must return 409 Conflict');
    const dupData = await dupRes.json();
    assert.ok(dupData.error.toLowerCase().includes('already exists'), 'Error message should explain duplication');
    console.log('✓ Duplicate email handling verified.');

    // 5. Short Password Rejection (< 8 chars)
    console.log('[TEST 5] Testing Short Password Validation...');
    const shortPassRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Short Pass User',
        email: `short.${Date.now()}@example.com`,
        password: '12345',
        role: 'patient'
      })
    });
    assert.strictEqual(shortPassRes.status, 400, 'Short password must return 400 Bad Request');
    const shortPassData = await shortPassRes.json();
    assert.ok(shortPassData.error.includes('8 characters'), 'Error message should mention minimum 8 characters');
    console.log('✓ Password length validation verified.');

    // 6. Invalid Credentials Login Rejection
    console.log('[TEST 6] Testing Invalid Login Rejection...');
    const invalidLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientEmail, password: 'WrongPassword999!' })
    });
    assert.strictEqual(invalidLoginRes.status, 401, 'Wrong password must return 401 Unauthorized');
    console.log('✓ Invalid credentials rejection verified.');

    console.log('\n======================================================');
    console.log('ALL AUTHENTICATION & LOGIN FIX TESTS PASSED 100%!');
    console.log('======================================================');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('[TEST FAILURE]:', err);
  if (server) server.close();
  process.exit(1);
});
