/**
 * Phase 7 Automated Verification Test Suite
 * Smart Medical Reminder System
 *
 * Verifies all Phase 7 requirements:
 * 1. User registration with valid inputs, email normalization, and rejection of invalid/duplicate inputs.
 * 2. User login, session token issuance (7-day TTL), and rejection of invalid credentials.
 * 3. Protected endpoint access control: 401 when token missing/invalid, 200 when authenticated.
 * 4. Password hashing verification: scrypt + 16-byte random salt, zero plain-text, unique salts for identical passwords.
 * 5. Medicine CRUD operations linked to specific user accounts.
 * 6. Multi-tenant privacy & isolation: User B cannot access, modify, or delete User A's medicines, dose records, alerts, or files.
 * 7. Dose occurrences and dose history saved with correct user references.
 * 8. Caretaker profile and alert persistence partitioned by user.
 * 9. LocalStorage data migration with deduplication and idempotency.
 * 10. User profile update, language preference persistence, and timezone setting.
 * 11. Secure file upload: MIME type validation, 5MB size limit, authenticated access, multi-tenant file privacy.
 * 12. Personal data export bundle verification (complete JSON archive).
 * 13. Cascading account deletion: purge from all tables and file system cleanup.
 * 14. Guest mode backward-compatibility: unauthenticated Phase 5 alerts fallback intact.
 */

import { EventEmitter } from 'node:events';
import { requestHandler } from '../server/index.js';
import { db } from '../server/db.js';

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

async function runPhase7Tests() {
  console.log('================================================================');
  console.log('   SMART MEDICAL REMINDER SYSTEM - PHASE 7 VERIFICATION SUITE   ');
  console.log('================================================================');

  const timestamp = Date.now();
  const testUser1Email = `patient1_${timestamp}@example.com`;
  const testUser2Email = `patient2_${timestamp}@example.com`;
  const testUser3Email = `patient3_migrate_${timestamp}@example.com`;
  const sharedPassword = 'SecurePassword123!';

  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let user3Token = '';

  // -------------------------------------------------------------------------
  // 1. User Registration & Input Validation
  // -------------------------------------------------------------------------
  console.log('\n--- 1. User Registration & Validation ---');

  // Invalid email
  const badEmailRes = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Bad Email', email: 'not-an-email', password: sharedPassword }
  });
  assert(badEmailRes.statusCode === 400, 'Rejects malformed email with HTTP 400');

  // Password too short
  const shortPassRes = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Short Pass', email: `short_${timestamp}@example.com`, password: '123' }
  });
  assert(shortPassRes.statusCode === 400, 'Rejects password shorter than 8 characters with HTTP 400');

  // Missing name
  const noNameRes = await request('/api/auth/register', {
    method: 'POST',
    body: { name: '', email: `noname_${timestamp}@example.com`, password: sharedPassword }
  });
  assert(noNameRes.statusCode === 400, 'Rejects empty name with HTTP 400');

  // Successful User 1 Registration
  const regUser1Res = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Ramesh Patel',
      email: testUser1Email.toUpperCase(), // Test case-insensitivity
      password: sharedPassword,
      phone: '+919876543210',
      preferredLanguage: 'hi',
      timezone: 'Asia/Kolkata'
    }
  });
  assert(regUser1Res.statusCode === 201, 'User 1 registered with HTTP 201');
  assert(Boolean(regUser1Res.body.token), 'Registration returns session token');
  assert(regUser1Res.body.user.email === testUser1Email.toLowerCase(), 'Registration normalizes email to lowercase');
  assert(regUser1Res.body.user.preferredLanguage === 'hi', 'User 1 preferredLanguage set to Hindi');
  user1Token = regUser1Res.body.token;
  user1Id = regUser1Res.body.user.id;

  // Duplicate email registration rejected
  const dupEmailRes = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Imposter', email: testUser1Email, password: sharedPassword }
  });
  assert(dupEmailRes.statusCode === 409, 'Duplicate email registration rejected with HTTP 409 Conflict');

  // Register User 2 with identical password (to test unique salt generation)
  const regUser2Res = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Sita Rao',
      email: testUser2Email,
      password: sharedPassword,
      preferredLanguage: 'te'
    }
  });
  assert(regUser2Res.statusCode === 201, 'User 2 registered with HTTP 201');
  user2Token = regUser2Res.body.token;
  user2Id = regUser2Res.body.user.id;

  // -------------------------------------------------------------------------
  // 2. User Login & Session Token Issuance
  // -------------------------------------------------------------------------
  console.log('\n--- 2. User Login & Session Handling ---');

  // Wrong password
  const wrongPassRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: testUser1Email, password: 'WrongPassword999!' }
  });
  assert(wrongPassRes.statusCode === 401, 'Rejects incorrect password with HTTP 401');

  // Non-existent user
  const unknownUserRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: `ghost_${timestamp}@example.com`, password: sharedPassword }
  });
  assert(unknownUserRes.statusCode === 401, 'Rejects unknown email with HTTP 401');

  // Successful Login
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: testUser1Email, password: sharedPassword }
  });
  assert(loginRes.statusCode === 200, 'Successful login returns HTTP 200');
  assert(Boolean(loginRes.body.token), 'Login response provides new active session token');
  assert(loginRes.body.user.id === user1Id, 'Login returns matching user profile');
  user1Token = loginRes.body.token;

  // -------------------------------------------------------------------------
  // 3. Access Control on Protected Endpoints
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Access Control on Protected Endpoints ---');

  const unauthRes = await request('/api/auth/me');
  assert(unauthRes.statusCode === 401, 'Unauthenticated GET /api/auth/me returns HTTP 401');

  const badTokenRes = await request('/api/auth/me', {
    headers: { authorization: 'Bearer invalid-token-xyz' }
  });
  assert(badTokenRes.statusCode === 401, 'Malformed token returns HTTP 401');

  const authRes = await request('/api/auth/me', {
    headers: { authorization: `Bearer ${user1Token}` }
  });
  assert(authRes.statusCode === 200, 'Authenticated GET /api/auth/me returns HTTP 200');
  assert(authRes.body.user.name === 'Ramesh Patel', 'Returns profile of authenticated user');

  // -------------------------------------------------------------------------
  // 4. Password Hashing & Salt Verification (Zero Plain-Text)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Password Hashing & Salt Verification ---');

  const row1 = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(user1Id);
  const row2 = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(user2Id);

  assert(Boolean(row1 && row1.password_hash && row1.salt), 'User 1 has password_hash and salt in database');
  assert(row1.password_hash !== sharedPassword, 'Password is NOT stored in plain text');
  assert(row1.salt.length === 32, 'Salt is 16 random bytes (32 hex characters)');
  assert(row1.salt !== row2.salt, 'Unique random salt generated per user (salt1 != salt2)');
  assert(row1.password_hash !== row2.password_hash, 'Distinct hashes produced for identical passwords with different salts');

  // Verify plain password does not appear anywhere in users table
  const plainCheck = db.prepare("SELECT COUNT(*) as count FROM users WHERE password_hash LIKE ? OR salt LIKE ?").get(`%${sharedPassword}%`, `%${sharedPassword}%`);
  assert(plainCheck.count === 0, 'Plain-text password string does not appear in users table');

  // -------------------------------------------------------------------------
  // 5. Medicine CRUD (User 1)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Medicine CRUD (User 1) ---');

  const createdMedRes = await request('/api/medicines', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      name: 'Metformin 500mg',
      dosageAmount: '1',
      dosageUnit: 'tablet',
      medicineForm: 'tablet',
      route: 'oral',
      dosesPerDay: '2',
      reminderTimes: ['08:00', '20:00'],
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      isOngoing: false,
      foodInstruction: 'after_food',
      remainingQuantity: 60,
      refillThreshold: 10,
      doctorName: 'Dr. Sharma',
      status: 'active'
    }
  });

  assert(createdMedRes.statusCode === 201, 'Medicine created for User 1 with HTTP 201');
  const user1MedId = createdMedRes.body.medicine.id;
  assert(Boolean(user1MedId), 'Created medicine contains unique ID');

  // Verify in database that user_id is assigned
  const dbMed = db.prepare('SELECT user_id, name, quantity_remaining FROM medicines WHERE id = ?').get(user1MedId);
  assert(dbMed.user_id === user1Id, 'Medicine in SQLite database explicitly belongs to User 1');

  // Update Medicine
  const updateMedRes = await request(`/api/medicines/${user1MedId}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      doctorName: 'Dr. Ananya Sharma'
    }
  });
  assert(updateMedRes.statusCode === 200, 'Medicine updated with HTTP 200');

  // Update Stock
  const stockRes = await request(`/api/medicines/${user1MedId}/stock`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${user1Token}` },
    body: { remainingQuantity: 58 }
  });
  assert(stockRes.statusCode === 200, 'Stock updated with HTTP 200');
  const dbStockCheck = db.prepare('SELECT quantity_remaining FROM medicines WHERE id = ?').get(user1MedId);
  assert(dbStockCheck.quantity_remaining === 58, 'Stock change persisted to database (58 tablets)');

  // -------------------------------------------------------------------------
  // 6. Multi-Tenant Privacy & Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Multi-Tenant Privacy & Isolation ---');

  // User 2 lists medicines
  const user2ListRes = await request('/api/medicines', {
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(user2ListRes.statusCode === 200, 'User 2 can list their medicines');
  const user2MedIds = user2ListRes.body.medicines.map((m) => m.id);
  assert(!user2MedIds.includes(user1MedId), "User 2 cannot see User 1's medicine in list");

  // User 2 tries to GET User 1's medicine
  const user2GetRes = await request(`/api/medicines/${user1MedId}`, {
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(user2GetRes.statusCode === 404, "User 2 GET on User 1's medicine returns 404 Not Found");

  // User 2 tries to PUT User 1's medicine
  const user2PutRes = await request(`/api/medicines/${user1MedId}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${user2Token}` },
    body: { name: 'Hacked Medicine' }
  });
  assert(user2PutRes.statusCode === 404, "User 2 PUT on User 1's medicine is blocked with 404");

  // User 2 tries to DELETE User 1's medicine
  const user2DelRes = await request(`/api/medicines/${user1MedId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(user2DelRes.statusCode === 404, "User 2 DELETE on User 1's medicine is blocked with 404");

  // Confirm User 1's medicine was NOT altered
  const medIntegrity = db.prepare('SELECT name FROM medicines WHERE id = ?').get(user1MedId);
  assert(medIntegrity.name === 'Metformin 500mg', "User 1's medicine remained completely unmutated");

  // -------------------------------------------------------------------------
  // 7. Dose Occurrences & Dose History
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Dose Occurrences & History ---');

  const occId = `${user1MedId}_2026-10-31_08:00`;
  const syncRes = await request('/api/doses/sync', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      doses: [
        {
          id: occId,
          medicineId: user1MedId,
          medicineName: 'Metformin 500mg',
          date: '2026-10-31',
          time: '08:00',
          scheduledTime: '08:00',
          status: 'taken',
          takenAt: '2026-10-31T08:05:00.000Z',
          snoozeCount: 0
        }
      ]
    }
  });
  assert(syncRes.statusCode === 200, 'Dose occurrence synced with HTTP 200');

  const histRes = await request('/api/doses/history', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      record: {
        id: `hist_${timestamp}_1`,
        medicineId: user1MedId,
        medicineName: 'Metformin 500mg',
        scheduledDate: '2026-10-31',
        scheduledTime: '08:00',
        actionTime: '2026-10-31T08:05:00.000Z',
        status: 'taken',
        snoozeCount: 0
      }
    }
  });
  assert(histRes.statusCode === 201, 'Dose history record saved with HTTP 201');

  // Verify User 2 cannot see User 1's doses
  const user2Doses = await request('/api/doses/date/2026-10-31', {
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(user2Doses.body.doses.length === 0, "User 2 cannot see User 1's dose occurrences");

  const user2Hist = await request('/api/doses/history', {
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(user2Hist.body.history.length === 0, "User 2 cannot see User 1's dose history");

  // -------------------------------------------------------------------------
  // 8. Caretaker Profile & Alerts Multi-Tenant Partitioning
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Caretaker & Alerts Persistence ---');

  const saveCaretakerRes = await request('/api/caretaker', {
    method: 'PUT',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      name: 'Sunita Patel',
      phone: '+919123456789',
      email: 'caretaker.sunita@example.com',
      preferredLanguage: 'hi',
      enableMissedDoseAlerts: true
    }
  });
  assert(saveCaretakerRes.statusCode === 200, "User 1's caretaker saved with HTTP 200");

  const createAlertRes = await request('/api/alerts', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      alertType: 'missed_dose',
      medicineName: 'Metformin 500mg',
      scheduledTime: '08:00',
      caretakerName: 'Sunita Patel',
      caretakerPhone: '+919123456789',
      idempotencyKey: `alert_p7_${timestamp}`
    }
  });
  assert(createAlertRes.statusCode === 201, "User 1's alert created with HTTP 201");
  const alertId = createAlertRes.body.alert.id;

  // User 2 checks caretaker & alerts
  const user2Caretaker = await request('/api/caretaker', {
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(user2Caretaker.body.caretaker.name !== 'Sunita Patel', "User 2 does not see User 1's caretaker");

  const user2Alerts = await request('/api/alerts', {
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(!user2Alerts.body.alerts.some((a) => a.id === alertId), "User 2 does not see User 1's caretaker alert");

  // -------------------------------------------------------------------------
  // 9. LocalStorage Migration & Deduplication
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Local Data Migration & Deduplication ---');

  // Register clean User 3
  const regUser3 = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Pooja Reddy', email: testUser3Email, password: sharedPassword }
  });
  user3Token = regUser3.body.token;

  const localPayload = {
    medicines: [
      {
        id: `local_med_1_${timestamp}`,
        name: 'Amlodipine 5mg',
        dosageAmount: '1',
        dosageUnit: 'tablet',
        times: ['09:00'],
        startDate: '2026-10-01',
        status: 'active'
      },
      {
        id: `local_med_2_${timestamp}`,
        name: 'Atorvastatin 10mg',
        dosageAmount: '1',
        dosageUnit: 'tablet',
        times: ['21:00'],
        startDate: '2026-10-01',
        status: 'active'
      }
    ],
    todayDoses: [
      {
        id: `local_occ_1_${timestamp}`,
        medicineName: 'Amlodipine 5mg',
        date: '2026-10-31',
        time: '09:00',
        status: 'taken'
      }
    ],
    doseHistory: [
      {
        id: `local_hist_1_${timestamp}`,
        medicineName: 'Amlodipine 5mg',
        scheduledDate: '2026-10-31',
        scheduledTime: '09:00',
        status: 'taken'
      }
    ]
  };

  // Run migration first time
  const migrate1 = await request('/api/migrate/local', {
    method: 'POST',
    headers: { authorization: `Bearer ${user3Token}` },
    body: localPayload
  });
  assert(migrate1.statusCode === 200, 'Migration completed with HTTP 200');
  assert(migrate1.body.imported.medicines === 2, 'Imported 2 medicines');
  assert(migrate1.body.imported.doseOccurrences === 1, 'Imported 1 dose occurrence');
  assert(migrate1.body.imported.doseHistory === 1, 'Imported 1 dose history record');

  // Run migration second time with identical data (Idempotency test)
  const migrate2 = await request('/api/migrate/local', {
    method: 'POST',
    headers: { authorization: `Bearer ${user3Token}` },
    body: localPayload
  });
  assert(migrate2.statusCode === 200, 'Second migration attempt succeeds with HTTP 200');
  assert(migrate2.body.imported.medicines === 0, 'Deduplication: 0 duplicate medicines created');
  assert(migrate2.body.imported.doseOccurrences === 0, 'Deduplication: 0 duplicate dose occurrences created');
  assert(migrate2.body.imported.doseHistory === 0, 'Deduplication: 0 duplicate dose history entries created');

  // -------------------------------------------------------------------------
  // 10. User Profile & Preferences Persistence
  // -------------------------------------------------------------------------
  console.log('\n--- 10. User Profile & Preferences ---');

  const updateProfileRes = await request('/api/auth/profile', {
    method: 'PUT',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      name: 'Rameshwar Patel',
      phone: '+919999888877',
      preferredLanguage: 'te',
      timezone: 'Asia/Kolkata'
    }
  });
  assert(updateProfileRes.statusCode === 200, 'User profile updated with HTTP 200');
  assert(updateProfileRes.body.user.name === 'Rameshwar Patel', 'Profile name updated');
  assert(updateProfileRes.body.user.preferredLanguage === 'te', 'Profile language updated to Telugu');

  const updatePrefRes = await request('/api/preferences', {
    method: 'PUT',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      largeTextMode: true,
      soundEnabled: true,
      alarmSound: 'digital-beep',
      language: 'te'
    }
  });
  assert(updatePrefRes.statusCode === 200, 'Preferences updated with HTTP 200');

  const fetchPrefRes = await request('/api/preferences', {
    headers: { authorization: `Bearer ${user1Token}` }
  });
  assert(fetchPrefRes.body.preferences.largeTextMode === true, 'largeTextMode persisted as true');
  assert(fetchPrefRes.body.preferences.alarmSound === 'digital-beep', 'alarmSound persisted');

  // -------------------------------------------------------------------------
  // 11. Secure File Upload & Validation
  // -------------------------------------------------------------------------
  console.log('\n--- 11. Secure File Upload & Access Control ---');

  // Valid image upload
  const validBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await request('/api/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      fileName: 'medicine-strip.png',
      fileType: 'image/png',
      category: 'medicine_photo',
      base64Data: validBase64
    }
  });
  assert(uploadRes.statusCode === 200, 'Valid PNG upload accepted with HTTP 200');
  const storedFilename = uploadRes.body.file.filename;
  assert(Boolean(storedFilename), 'Upload returned stored filename');

  // Invalid MIME type rejection
  const badMimeRes = await request('/api/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      fileName: 'malware.exe',
      fileType: 'application/x-dosexec',
      base64Data: validBase64
    }
  });
  assert(badMimeRes.statusCode === 400, 'Dangerous MIME type rejected with HTTP 400');

  // Oversized file (> 5MB) rejection
  const hugeData = 'A'.repeat(5 * 1024 * 1024 + 100);
  const hugeRes = await request('/api/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${user1Token}` },
    body: {
      fileName: 'huge.png',
      fileType: 'image/png',
      base64Data: hugeData
    }
  });
  assert(hugeRes.statusCode === 400, 'File > 5MB rejected with HTTP 400');

  // Owner file access
  const ownerFileRes = await request(`/api/files/${storedFilename}`, {
    headers: { authorization: `Bearer ${user1Token}` }
  });
  assert(ownerFileRes.statusCode === 200, 'Owner can access their uploaded file (HTTP 200)');
  assert(ownerFileRes.headers['content-type'] === 'image/png', 'Correct Content-Type returned');

  // Unauthenticated file access rejection
  const unauthFileRes = await request(`/api/files/${storedFilename}`);
  assert(unauthFileRes.statusCode === 401, 'Unauthenticated file access rejected with HTTP 401');

  // Other user file access rejection (Multi-tenant privacy)
  const otherUserFileRes = await request(`/api/files/${storedFilename}`, {
    headers: { authorization: `Bearer ${user2Token}` }
  });
  assert(otherUserFileRes.statusCode === 403, "User 2 accessing User 1's file is rejected with HTTP 403 Forbidden");

  // -------------------------------------------------------------------------
  // 12. Personal Data Export Archive
  // -------------------------------------------------------------------------
  console.log('\n--- 12. Personal Data Export Archive ---');

  const exportRes = await request('/api/auth/export', {
    headers: { authorization: `Bearer ${user1Token}` }
  });
  assert(exportRes.statusCode === 200, 'Data export returns HTTP 200');
  assert(Boolean(exportRes.body.exportDate), 'Export contains exportDate');
  assert(exportRes.body.user.email === testUser1Email.toLowerCase(), 'Export contains user profile');
  assert(Array.isArray(exportRes.body.medicines) && exportRes.body.medicines.length >= 1, 'Export contains medicines list');
  assert(Array.isArray(exportRes.body.doseOccurrences) && exportRes.body.doseOccurrences.length >= 1, 'Export contains dose occurrences');
  assert(Array.isArray(exportRes.body.doseHistory) && exportRes.body.doseHistory.length >= 1, 'Export contains dose history');
  assert(Boolean(exportRes.body.caretaker), 'Export contains caretaker profile');
  assert(Array.isArray(exportRes.body.alerts) && exportRes.body.alerts.length >= 1, 'Export contains alerts list');
  assert(Array.isArray(exportRes.body.uploads) && exportRes.body.uploads.length >= 1, 'Export contains uploads list');

  // -------------------------------------------------------------------------
  // 13. Cascading Account Deletion
  // -------------------------------------------------------------------------
  console.log('\n--- 13. Cascading Account Deletion ---');

  // Deletion with wrong password rejected
  const badDelRes = await request('/api/auth/account', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${user1Token}` },
    body: { password: 'WrongPassword!' }
  });
  assert(badDelRes.statusCode === 401, 'Account deletion with wrong password rejected with HTTP 401');

  // Deletion with correct password
  const goodDelRes = await request('/api/auth/account', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${user1Token}` },
    body: { password: sharedPassword }
  });
  assert(goodDelRes.statusCode === 200, 'Account successfully deleted with HTTP 200');

  // Verify User 1 token is now invalid
  const revokedRes = await request('/api/auth/me', {
    headers: { authorization: `Bearer ${user1Token}` }
  });
  assert(revokedRes.statusCode === 401, 'Deleted user session token is revoked (HTTP 401)');

  // Verify login fails
  const reLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: testUser1Email, password: sharedPassword }
  });
  assert(reLoginRes.statusCode === 401, 'Deleted user cannot log in anymore');

  // Direct database inspection for cascading purge
  const checkUser = db.prepare('SELECT COUNT(*) as count FROM users WHERE id = ?').get(user1Id);
  const checkMeds = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE user_id = ?').get(user1Id);
  const checkOccs = db.prepare('SELECT COUNT(*) as count FROM dose_occurrences WHERE user_id = ?').get(user1Id);
  const checkHist = db.prepare('SELECT COUNT(*) as count FROM dose_history WHERE user_id = ?').get(user1Id);
  const checkCare = db.prepare('SELECT COUNT(*) as count FROM caretaker_profiles WHERE user_id = ?').get(user1Id);
  const checkAlert = db.prepare('SELECT COUNT(*) as count FROM caretaker_alerts WHERE user_id = ?').get(user1Id);
  const checkUploads = db.prepare('SELECT COUNT(*) as count FROM user_uploads WHERE user_id = ?').get(user1Id);

  assert(checkUser.count === 0, 'User row purged from users table');
  assert(checkMeds.count === 0, 'Medicines cascaded and purged');
  assert(checkOccs.count === 0, 'Dose occurrences cascaded and purged');
  assert(checkHist.count === 0, 'Dose history cascaded and purged');
  assert(checkCare.count === 0, 'Caretaker profile cascaded and purged');
  assert(checkAlert.count === 0, 'Caretaker alerts cascaded and purged');
  assert(checkUploads.count === 0, 'User upload records cascaded and purged');

  // -------------------------------------------------------------------------
  // 14. Phase 5 Guest Mode Backward-Compatibility
  // -------------------------------------------------------------------------
  console.log('\n--- 14. Phase 5 Guest Mode Backward Compatibility ---');

  const guestHealth = await request('/api/health');
  assert(guestHealth.statusCode === 200, 'GET /api/health accessible without authentication');

  const guestCaretaker = await request('/api/caretaker');
  assert(guestCaretaker.statusCode === 200, 'GET /api/caretaker works for unauthenticated guest session');

  const guestAlerts = await request('/api/alerts');
  assert(guestAlerts.statusCode === 200, 'GET /api/alerts works for unauthenticated guest session');

  // Clean up User 2 & User 3
  await request('/api/auth/account', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${user2Token}` },
    body: { password: sharedPassword }
  });

  await request('/api/auth/account', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${user3Token}` },
    body: { password: sharedPassword }
  });

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
