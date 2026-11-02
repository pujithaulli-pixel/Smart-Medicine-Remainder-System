/**
 * Backend Notification, Database & Authentication Service
 * Smart Medical Reminder System - Phase 7
 * Built with native Node.js HTTP server & SQLite (node:sqlite)
 * Supports user accounts, secure sessions, multi-tenant data persistence, and private file uploads.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { isEmailConfigured, sendEmailNotification } from './services/emailProvider.js';
import { isSmsConfigured, sendSmsNotification } from './services/smsProvider.js';
import { alertStore } from './services/alertStore.js';
import { getNotificationTemplate } from './templates.js';
import * as authService from './services/authService.js';
import * as dataService from './services/dataService.js';
import { seedDemoAccounts } from './services/seedService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Simple .env loader for server directory
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      process.env[key.trim()] = vals.join('=').trim().replace(/(^['"]|['"]$)/g, '');
    }
  });
}

const PORT = parseInt(process.env.PORT || '3001', 10);

/**
 * Checks whether current local time falls between quiet hours start and end.
 */
const isTimeInQuietHours = (startStr, endStr) => {
  if (!startStr || !endStr) return false;
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = startStr.split(':').map(Number);
  const [eH, eM] = endStr.split(':').map(Number);
  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;

  if (startMins <= endMins) {
    return currentMins >= startMins && currentMins < endMins;
  } else {
    return currentMins >= startMins || currentMins < endMins;
  }
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
  });
  res.end(JSON.stringify(data));
};

const parseJsonBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit for base64 uploads
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', (err) => reject(err));
  });
};

/**
 * Extract authenticated user from Authorization header
 */
const getAuthUser = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return authService.validateSession(token);
};

const requireAuth = (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Authentication required. Please sign in.' });
    return null;
  }
  return user;
};

export const requestHandler = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
    });
    res.end();
    return;
  }

  try {
    // -------------------------------------------------------------------------
    // 1. HEALTH CHECK ENDPOINT
    // -------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, {
        status: 'operational',
        version: '1.0.0',
        phase: 7,
        database: 'sqlite',
        timestamp: new Date().toISOString(),
        providers: {
          email: { configured: isEmailConfigured(), channel: 'email' },
          sms: { configured: isSmsConfigured(), channel: 'sms' }
        }
      });
    }

    // -------------------------------------------------------------------------
    // 2. AUTHENTICATION & USER MANAGEMENT ENDPOINTS
    // -------------------------------------------------------------------------
    if (method === 'POST' && pathname === '/api/auth/register') {
      const body = await parseJsonBody(req);
      try {
        const result = authService.registerUser(body);
        return sendJson(res, 201, { success: true, ...result });
      } catch (err) {
        const status = err.code === 'CONFLICT' || err.message.includes('already exists') ? 409 : 400;
        return sendJson(res, status, { error: err.message });
      }
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseJsonBody(req);
      try {
        const result = authService.loginUser(body);
        return sendJson(res, 200, { success: true, ...result });
      } catch (err) {
        return sendJson(res, 401, { error: err.message });
      }
    }

    if (method === 'POST' && pathname === '/api/auth/logout') {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        authService.deleteSession(token);
      }
      return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    if (method === 'GET' && pathname === '/api/auth/me') {
      const user = requireAuth(req, res);
      if (!user) return;
      return sendJson(res, 200, { success: true, user });
    }

    if (method === 'PUT' && pathname === '/api/auth/profile') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await parseJsonBody(req);
      try {
        const updated = authService.updateUserProfile(user.id, body);
        return sendJson(res, 200, { success: true, user: updated });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (method === 'DELETE' && pathname === '/api/auth/account') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await parseJsonBody(req);
      if (!body.password) {
        return sendJson(res, 401, { error: 'Password confirmation is required to delete your account.' });
      }
      try {
        authService.deleteUserAccount(user.id, body.password);
        return sendJson(res, 200, { success: true, message: 'Account and associated records permanently deleted.' });
      } catch (err) {
        return sendJson(res, err.statusCode || 401, { error: err.message });
      }
    }

    if (method === 'GET' && pathname === '/api/auth/export') {
      const user = requireAuth(req, res);
      if (!user) return;
      const exportData = authService.exportUserData(user.id);
      return sendJson(res, 200, { success: true, data: exportData, ...exportData });
    }

    // -------------------------------------------------------------------------
    // 3. MEDICINES ENDPOINTS (Protected per-user)
    // -------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/medicines') {
      const user = requireAuth(req, res);
      if (!user) return;
      const status = url.searchParams.get('status') || 'all';
      const search = url.searchParams.get('search') || '';
      const list = dataService.getMedicines(user.id, { status, search });
      return sendJson(res, 200, { success: true, medicines: list });
    }

    if (method === 'POST' && pathname === '/api/medicines') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await parseJsonBody(req);
      if (!body.name) {
        return sendJson(res, 400, { error: 'Medicine name is required.' });
      }
      const created = dataService.createMedicine(user.id, body);
      return sendJson(res, 201, { success: true, medicine: created });
    }

    if (method === 'GET' && pathname.startsWith('/api/medicines/') && !pathname.includes('/stock') && !pathname.includes('/history')) {
      const user = requireAuth(req, res);
      if (!user) return;
      const medId = pathname.replace('/api/medicines/', '');
      const med = dataService.getMedicineById(user.id, medId);
      if (!med) return sendJson(res, 404, { error: 'Medicine not found.' });
      return sendJson(res, 200, { success: true, medicine: med });
    }

    if (method === 'PUT' && pathname.startsWith('/api/medicines/') && !pathname.includes('/stock')) {
      const user = requireAuth(req, res);
      if (!user) return;
      const medId = pathname.replace('/api/medicines/', '');
      const body = await parseJsonBody(req);
      try {
        const updated = dataService.updateMedicine(user.id, medId, body);
        return sendJson(res, 200, { success: true, medicine: updated });
      } catch (err) {
        return sendJson(res, 404, { error: err.message });
      }
    }

    if (method === 'DELETE' && pathname.startsWith('/api/medicines/')) {
      const user = requireAuth(req, res);
      if (!user) return;
      const medId = pathname.replace('/api/medicines/', '');
      const deleted = dataService.deleteMedicine(user.id, medId);
      if (!deleted) return sendJson(res, 404, { error: 'Medicine not found.' });
      return sendJson(res, 200, { success: true, message: 'Medicine removed and archived to history.' });
    }

    if (method === 'PUT' && pathname.match(/^\/api\/medicines\/[^/]+\/stock$/)) {
      const user = requireAuth(req, res);
      if (!user) return;
      const medId = pathname.split('/')[3];
      const body = await parseJsonBody(req);
      const rawQty = body.remainingQuantity !== undefined ? body.remainingQuantity : (body.quantity !== undefined ? body.quantity : body.newQuantity);
      const updated = dataService.updateStock(user.id, medId, rawQty);
      return sendJson(res, 200, { success: true, medicine: updated });
    }

    // -------------------------------------------------------------------------
    // 4. DOSES & SCHEDULE ENDPOINTS (Protected per-user)
    // -------------------------------------------------------------------------
    if (method === 'GET' && pathname.startsWith('/api/doses/date/')) {
      const user = requireAuth(req, res);
      if (!user) return;
      const dateStr = pathname.replace('/api/doses/date/', '');
      const doses = dataService.getDoseOccurrencesForDate(user.id, dateStr);
      return sendJson(res, 200, { success: true, date: dateStr, doses });
    }

    if (method === 'POST' && pathname === '/api/doses/sync') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await parseJsonBody(req);
      const saved = dataService.saveDoseOccurrences(user.id, body.doses || []);
      return sendJson(res, 200, { success: true, doses: saved });
    }

    if (method === 'GET' && pathname === '/api/doses/history') {
      const user = requireAuth(req, res);
      if (!user) return;
      const status = url.searchParams.get('status') || 'all';
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const medicineName = url.searchParams.get('medicineName');
      const history = dataService.getDoseHistory(user.id, { status, startDate, endDate, medicineName });
      return sendJson(res, 200, { success: true, history });
    }

    if (method === 'POST' && pathname === '/api/doses/history') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await parseJsonBody(req);
      const dosePayload = body.record || body.dose || body;
      const recorded = dataService.recordDoseHistory(user.id, dosePayload);
      return sendJson(res, 201, { success: true, dose: recorded });
    }

    // -------------------------------------------------------------------------
    // 5. MEDICINE HISTORY ARCHIVE
    // -------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/medicines/history') {
      const user = requireAuth(req, res);
      if (!user) return;
      const list = dataService.getMedicineHistory(user.id);
      return sendJson(res, 200, { success: true, history: list });
    }

    if (method === 'POST' && pathname === '/api/medicines/history') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await parseJsonBody(req);
      const created = dataService.addMedicineHistory(user.id, body);
      return sendJson(res, 201, { success: true, record: created });
    }

    // -------------------------------------------------------------------------
    // 6. USER PREFERENCES ENDPOINTS
    // -------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/preferences') {
      const user = requireAuth(req, res);
      if (!user) return;
      const prefs = dataService.getUserPreferences(user.id);
      return sendJson(res, 200, { success: true, preferences: prefs });
    }

    if (method === 'PUT' && pathname === '/api/preferences') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await parseJsonBody(req);
      const saved = dataService.saveUserPreferences(user.id, body);
      return sendJson(res, 200, { success: true, preferences: saved });
    }

    // -------------------------------------------------------------------------
    // 7. LOCAL DATA MIGRATION ENDPOINT
    // -------------------------------------------------------------------------
    if (method === 'POST' && pathname === '/api/migrate/local') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await parseJsonBody(req);
      const result = dataService.migrateLocalData(user.id, body);
      return sendJson(res, 200, result);
    }

    // -------------------------------------------------------------------------
    // 8. FILE UPLOAD & PROTECTED ACCESS
    // -------------------------------------------------------------------------
    if (method === 'POST' && pathname === '/api/upload') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await parseJsonBody(req);
      const filename = body.filename || body.fileName || body.name;
      const mimeType = body.mimeType || body.fileType || body.type;
      const dataBase64 = body.dataBase64 || body.base64Data || body.data;
      const fileType = body.category || body.fileCategory || 'medicine_image';

      if (!filename || !mimeType || !dataBase64) {
        return sendJson(res, 400, { error: 'Missing required file payload fields.' });
      }

      // Validate MIME type
      const ALLOWED_MIMES = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'application/pdf': '.pdf'
      };

      const ext = ALLOWED_MIMES[mimeType.toLowerCase()];
      if (!ext) {
        return sendJson(res, 400, { error: 'Invalid file format. Allowed types: JPEG, PNG, WebP, PDF.' });
      }

      // Validate base64 payload size <= 5MB
      if (dataBase64.length > 5 * 1024 * 1024) {
        return sendJson(res, 400, { error: 'File size exceeds 5MB limit.' });
      }

      // Decode base64 and validate decoded size <= 5MB
      const buffer = Buffer.from(dataBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return sendJson(res, 400, { error: 'File size exceeds 5MB limit.' });
      }

      // Save file with secure unique name
      const storedFilename = `upl-${crypto.randomUUID()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, storedFilename);
      fs.writeFileSync(filePath, buffer);

      // Record metadata in database
      const uploadRecord = dataService.recordUserUpload(user.id, {
        originalName: filename,
        storedFilename,
        mimeType,
        fileSize: buffer.length,
        fileType
      });

      return sendJson(res, 200, {
        success: true,
        file: { ...uploadRecord, filename: storedFilename },
        upload: uploadRecord,
        filename: storedFilename,
        url: `/api/files/${storedFilename}`
      });
    }

    if (method === 'GET' && pathname.startsWith('/api/files/')) {
      const user = requireAuth(req, res);
      if (!user) return;

      const storedFilename = pathname.replace('/api/files/', '').replace(/[^a-zA-Z0-9._-]/g, '');
      const record = dataService.getUserUpload(user.id, storedFilename);

      if (!record) {
        // Return 403 Forbidden for unauthorized or non-existent file of another user
        return sendJson(res, 403, { error: 'Access denied to this file resource.' });
      }

      const filePath = path.join(UPLOADS_DIR, storedFilename);
      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { error: 'File not found on storage server.' });
      }

      const fileBuffer = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': record.mime_type,
        'content-type': record.mime_type,
        'Content-Length': fileBuffer.length,
        'Content-Disposition': `inline; filename="${record.original_name}"`,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(fileBuffer);
      return;
    }

    // -------------------------------------------------------------------------
    // 9. CARETAKER PROFILE & ALERTS (Supports both Authenticated User & Guest Fallback)
    // -------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/caretaker') {
      const authUser = getAuthUser(req);
      if (authUser) {
        const profile = dataService.getCaretakerProfile(authUser.id);
        return sendJson(res, 200, { ...profile, profile, caretaker: profile });
      }
      // Backward-compatible fallback for unauthenticated test scripts
      const profile = alertStore.getCaretakerProfile();
      return sendJson(res, 200, { ...profile, profile, caretaker: profile });
    }

    if ((method === 'POST' || method === 'PUT') && pathname === '/api/caretaker') {
      const body = await parseJsonBody(req);
      if (!body.name || !body.phone) {
        return sendJson(res, 400, { error: 'Caretaker name and phone number are required.' });
      }
      const authUser = getAuthUser(req);
      if (authUser) {
        const updated = dataService.saveCaretakerProfile(authUser.id, body);
        return sendJson(res, 200, { success: true, profile: updated, caretaker: updated });
      }
      const updated = alertStore.saveCaretakerProfile(body);
      return sendJson(res, 200, { success: true, profile: updated, caretaker: updated });
    }

    if (method === 'GET' && pathname === '/api/alerts') {
      const authUser = getAuthUser(req);
      if (authUser) {
        const alerts = dataService.getCaretakerAlerts(authUser.id);
        return sendJson(res, 200, { success: true, alerts });
      }
      const alerts = alertStore.getAllAlerts();
      return sendJson(res, 200, { success: true, alerts });
    }

    if (method === 'POST' && pathname === '/api/alerts') {
      const body = await parseJsonBody(req);
      const authUser = getAuthUser(req);
      const userId = authUser ? authUser.id : 'guest-system';

      const {
        idempotencyKey,
        alertType = 'missed_dose',
        medicineName,
        dosage,
        scheduledDate,
        scheduledTime,
        doseOccurrenceId,
        caretaker = {}
      } = body;

      if (!medicineName) {
        return sendJson(res, 400, { error: 'medicineName is required.' });
      }

      // Check Idempotency
      if (idempotencyKey) {
        if (authUser) {
          const check = dataService.saveCaretakerAlert(authUser.id, { idempotencyKey, alertType, medicineName });
          if (check.isDuplicate) {
            return sendJson(res, 200, { success: true, isDuplicate: true, alert: check.alert });
          }
        } else {
          const existing = alertStore.getAlertByIdempotencyKey(idempotencyKey);
          if (existing) {
            return sendJson(res, 200, { success: true, isDuplicate: true, alert: existing });
          }
        }
      }

      // Caretaker Profile lookup
      const currentCaretaker = authUser
        ? { ...dataService.getCaretakerProfile(authUser.id), ...caretaker }
        : { ...alertStore.getCaretakerProfile(), ...caretaker };

      // Check alerts toggle
      if (currentCaretaker.alertsEnabled === false) {
        const alertPayload = {
          idempotencyKey,
          alertType,
          medicineName,
          dosage,
          scheduledDate,
          scheduledTime,
          doseOccurrenceId,
          channel: currentCaretaker.preferredChannel || 'email',
          status: 'disabled_by_user',
          reason: 'Caretaker alerts are toggled off in settings.'
        };
        const saved = authUser ? dataService.saveCaretakerAlert(authUser.id, alertPayload).alert : alertStore.saveAlert(alertPayload).alert;
        return sendJson(res, 200, { success: true, alert: saved });
      }

      // Quiet hours check
      if (
        currentCaretaker.quietHoursEnabled &&
        isTimeInQuietHours(currentCaretaker.quietHoursStart, currentCaretaker.quietHoursEnd)
      ) {
        const heldPayload = {
          idempotencyKey,
          alertType,
          medicineName,
          dosage,
          scheduledDate,
          scheduledTime,
          doseOccurrenceId,
          channel: currentCaretaker.preferredChannel || 'email',
          status: 'quiet_hours_held',
          reason: `Alert suppressed during quiet hours (${currentCaretaker.quietHoursStart} - ${currentCaretaker.quietHoursEnd}).`
        };
        const saved = authUser ? dataService.saveCaretakerAlert(authUser.id, heldPayload).alert : alertStore.saveAlert(heldPayload).alert;
        return sendJson(res, 200, { success: true, alert: saved });
      }

      // Localized notification template
      const lang = currentCaretaker.preferredLanguage || 'en';
      const template = getNotificationTemplate(alertType, lang);
      const templateData = {
        caretakerName: currentCaretaker.name,
        medicineName,
        dosage,
        scheduledTime,
        scheduledDate,
        channel: currentCaretaker.preferredChannel
      };

      const preferredChannel = currentCaretaker.preferredChannel || 'email';
      let deliveryResult = { success: false, status: 'pending' };

      if (preferredChannel === 'email') {
        const emailBody = template.emailBody(templateData);
        deliveryResult = await sendEmailNotification({
          to: currentCaretaker.email,
          subject: template.subject,
          body: emailBody
        });
      } else if (preferredChannel === 'sms') {
        const smsText = template.smsText(templateData);
        deliveryResult = await sendSmsNotification({
          to: currentCaretaker.phone,
          message: smsText
        });
      } else {
        deliveryResult = {
          success: true,
          status: 'delivered_in_app',
          providerMessageId: `inapp-${Date.now()}`
        };
      }

      const alertToSave = {
        idempotencyKey,
        alertType,
        medicineName,
        dosage,
        scheduledDate,
        scheduledTime,
        doseOccurrenceId,
        channel: preferredChannel,
        recipient: {
          name: currentCaretaker.name,
          phone: currentCaretaker.phone,
          email: currentCaretaker.email,
          language: lang
        },
        status: deliveryResult.status,
        providerMessageId: deliveryResult.providerMessageId || null,
        errorMessage: deliveryResult.error || null,
        lastAttemptAt: deliveryResult.attemptedAt || new Date().toISOString()
      };

      const saved = authUser
        ? dataService.saveCaretakerAlert(authUser.id, alertToSave).alert
        : alertStore.saveAlert(alertToSave).alert;

      return sendJson(res, 201, {
        success: deliveryResult.success,
        alert: saved,
        delivery: deliveryResult
      });
    }

    if (method === 'POST' && pathname.startsWith('/api/alerts/retry/')) {
      const alertId = pathname.replace('/api/alerts/retry/', '');
      const authUser = getAuthUser(req);

      let alert = null;
      let caretaker = null;

      if (authUser) {
        const alerts = dataService.getCaretakerAlerts(authUser.id);
        alert = alerts.find((a) => a.id === alertId);
        caretaker = dataService.getCaretakerProfile(authUser.id);
      } else {
        alert = alertStore.getAlertById(alertId);
        caretaker = alertStore.getCaretakerProfile();
      }

      if (!alert) {
        return sendJson(res, 404, { error: 'Alert not found.' });
      }

      const template = getNotificationTemplate(alert.alertType, caretaker.preferredLanguage || 'en');
      const templateData = {
        caretakerName: caretaker.name,
        medicineName: alert.medicineName,
        dosage: alert.dosage,
        scheduledTime: alert.scheduledTime,
        scheduledDate: alert.scheduledDate
      };

      let result = { success: false, status: 'failed' };
      if (alert.channel === 'email') {
        result = await sendEmailNotification({
          to: alert.recipient?.email || caretaker.email,
          subject: template.subject,
          body: template.emailBody(templateData)
        });
      } else if (alert.channel === 'sms') {
        result = await sendSmsNotification({
          to: alert.recipient?.phone || caretaker.phone,
          message: template.smsText(templateData)
        });
      } else {
        result = { success: true, status: 'delivered_in_app' };
      }

      let updated = null;
      if (authUser) {
        updated = dataService.updateCaretakerAlert(authUser.id, alert.id, {
          status: result.status,
          providerMessageId: result.providerMessageId || alert.providerMessageId,
          errorMessage: result.error || null,
          lastAttemptAt: new Date().toISOString(),
          retryCount: (alert.retryCount || 0) + 1
        });
      } else {
        updated = alertStore.updateAlert(alert.id, {
          status: result.status,
          providerMessageId: result.providerMessageId || alert.providerMessageId,
          errorMessage: result.error || null,
          lastAttemptAt: new Date().toISOString(),
          retryCount: (alert.retryCount || 0) + 1
        });
      }

      return sendJson(res, 200, { success: result.success, alert: updated });
    }

    if (method === 'POST' && pathname === '/api/alerts/test') {
      const body = await parseJsonBody(req);
      const { channel = 'email', to, recipient, language = 'en', caretakerName = 'Caretaker' } = body;
      const destination = to || recipient;

      const template = getNotificationTemplate('test', language);
      const templateData = { caretakerName, channel };

      let result = { success: false, status: 'failed' };
      if (channel === 'email') {
        result = await sendEmailNotification({
          to: destination,
          subject: template.subject,
          body: template.emailBody(templateData)
        });
      } else if (channel === 'sms') {
        result = await sendSmsNotification({
          to: destination,
          message: template.smsText(templateData)
        });
      } else {
        result = { success: true, status: 'delivered_in_app', providerMessageId: `test-inapp-${Date.now()}` };
      }

      const authUser = getAuthUser(req);
      const testAlertPayload = {
        idempotencyKey: `test-${Date.now()}`,
        alertType: 'test',
        medicineName: 'Test Notification (System Diagnostic)',
        dosage: 'N/A',
        scheduledDate: new Date().toISOString().slice(0, 10),
        scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel,
        recipient: { name: caretakerName, to, language },
        status: result.status,
        providerMessageId: result.providerMessageId || null,
        errorMessage: result.error || null,
        reason: 'Manual test delivery requested by user.'
      };

      const testAlert = authUser
        ? dataService.saveCaretakerAlert(authUser.id, testAlertPayload).alert
        : alertStore.saveAlert(testAlertPayload).alert;

      return sendJson(res, 200, {
        success: result.success,
        status: result.status,
        providerMessageId: result.providerMessageId,
        error: result.error,
        delivery: result,
        alert: testAlert
      });
    }

    // =========================================================================
    // PHASE 10: PATIENT & CARETAKER LINKING, PERMISSIONS & DASHBOARDS
    // =========================================================================

    // 1. Patient: Generate Invitation Code
    if (req.method === 'POST' && pathname === '/api/patient/invitations') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'patient') return sendJson(res, 403, { error: 'Only patients can generate caretaker invitations.' });

      const body = await parseJsonBody(req);
      const invitation = dataService.createPatientInvitation(user.id, body.permissions);
      return sendJson(res, 201, { invitation });
    }

    // 2. Patient: List Generated Invitations
    if (req.method === 'GET' && pathname === '/api/patient/invitations') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'patient') return sendJson(res, 403, { error: 'Only patients can view their invitations.' });

      const invitations = dataService.getPatientInvitations(user.id);
      return sendJson(res, 200, { invitations });
    }

    // 3. Patient: Revoke Invitation
    if (req.method === 'DELETE' && pathname.startsWith('/api/patient/invitations/')) {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'patient') return sendJson(res, 403, { error: 'Only patients can revoke their invitations.' });

      const invId = parseInt(pathname.split('/')[4], 10);
      dataService.revokePatientInvitation(user.id, invId);
      return sendJson(res, 200, { success: true });
    }

    // 4. Patient: List Linked Caretakers
    if (req.method === 'GET' && pathname === '/api/patient/linked-caretakers') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'patient') return sendJson(res, 403, { error: 'Only patients can view linked caretakers.' });

      const caretakers = dataService.getLinkedCaretakersForPatient(user.id);
      return sendJson(res, 200, { caretakers });
    }

    // 5. Patient: Unlink Caretaker
    if (req.method === 'DELETE' && pathname.startsWith('/api/patient/linked-caretakers/')) {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'patient') return sendJson(res, 403, { error: 'Only patients can unlink caretakers.' });

      const caretakerId = parseInt(pathname.split('/')[4], 10);
      dataService.unlinkCaretakerFromPatient(user.id, caretakerId);
      return sendJson(res, 200, { success: true });
    }

    // 6. Caretaker: Link Patient via Invitation Code
    if (req.method === 'POST' && pathname === '/api/caretaker/link') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'caretaker') return sendJson(res, 403, { error: 'Only caretakers can link to patient accounts.' });

      const body = await parseJsonBody(req);
      if (!body.invitationCode) return sendJson(res, 400, { error: 'Invitation code is required.' });

      const result = dataService.acceptCaretakerInvitation(user.id, body.invitationCode);
      if (!result.success) {
        return sendJson(res, 400, { error: result.error });
      }
      return sendJson(res, 201, result);
    }

    // 7. Caretaker: List Linked Patients
    if (req.method === 'GET' && pathname === '/api/caretaker/linked-patients') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'caretaker') return sendJson(res, 403, { error: 'Only caretakers can view linked patients.' });

      const patients = dataService.getLinkedPatientsForCaretaker(user.id);
      return sendJson(res, 200, { patients });
    }

    // 8. Caretaker: Unlink from Patient
    if (req.method === 'DELETE' && pathname.startsWith('/api/caretaker/linked-patients/')) {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'caretaker') return sendJson(res, 403, { error: 'Only caretakers can unlink from patients.' });

      const patientId = parseInt(pathname.split('/')[4], 10);
      dataService.unlinkPatientFromCaretaker(user.id, patientId);
      return sendJson(res, 200, { success: true });
    }

    // 9. Caretaker: Get Summary for Specific Patient
    if (req.method === 'GET' && pathname.startsWith('/api/caretaker/patients/') && pathname.endsWith('/summary')) {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'caretaker') return sendJson(res, 403, { error: 'Only caretakers can access patient summary.' });

      const patientId = parseInt(pathname.split('/')[4], 10);
      const summary = dataService.getCaretakerPatientSummary(user.id, patientId);
      return sendJson(res, 200, summary);
    }

    // 10. Caretaker: Get Missed-Dose Alerts for All Linked Patients
    if (req.method === 'GET' && pathname === '/api/caretaker/alerts') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'caretaker') return sendJson(res, 403, { error: 'Only caretakers can view caretaker alerts portal.' });

      const filter = parsedUrl.searchParams.get('filter') || 'all';
      const alerts = dataService.getAlertsForCaretaker(user.id, filter);
      return sendJson(res, 200, { alerts });
    }

    // 11. Caretaker: Acknowledge Alert with Note
    if (req.method === 'POST' && pathname.startsWith('/api/caretaker/alerts/') && pathname.endsWith('/acknowledge')) {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Authentication required.' });
      if (user.role !== 'caretaker') return sendJson(res, 403, { error: 'Only caretakers can acknowledge alerts.' });

      const alertId = parseInt(pathname.split('/')[4], 10);
      const body = await parseJsonBody(req);
      const note = body.note || '';

      const updated = dataService.acknowledgeCaretakerAlert(user.id, alertId, note);
      return sendJson(res, 200, { success: true, alert: updated });
    }

    // 12. Demo Account Seeding Endpoint
    if (req.method === 'POST' && pathname === '/api/demo/seed') {
      const seedResult = await seedDemoAccounts();
      return sendJson(res, 200, seedResult);
    }

    // -------------------------------------------------------------------------
    // 404 FALLBACK
    // -------------------------------------------------------------------------
    return sendJson(res, 404, { error: 'Endpoint not found.' });
  } catch (error) {
    console.error('[API Error]:', error);
    return sendJson(res, 500, { error: error.message || 'Internal server error.' });
  }
};

export const server = http.createServer(requestHandler);

export const startServer = async (port = PORT, maxRetries = 3) => {
  try {
    await seedDemoAccounts();
  } catch (err) {
    console.warn('[Seed Warning]: Could not seed demo accounts:', err.message);
  }

  return new Promise((resolve, reject) => {
    let attempt = 0;

    const tryListen = () => {
      attempt++;

      const onError = async (err) => {
        server.removeListener('error', onError);
        if (err.code === 'EADDRINUSE' && attempt < maxRetries) {
          console.warn(`[Port ${port} busy, waiting 1.5s for socket release... (attempt ${attempt}/${maxRetries})]`);
          await new Promise((r) => setTimeout(r, 1500));
          tryListen();
        } else {
          if (err.code === 'EADDRINUSE') {
            console.error(`\n======================================================================`);
            console.error(`[ERROR] Port ${port} is in use by another running process.`);
            console.error(`To fix this:`);
            console.error(`  1. Close any existing "Medical Reminder" command windows, or`);
            console.error(`  2. Double-click "stop.bat" to terminate lingering processes, then re-run start.bat.`);
            console.error(`======================================================================\n`);
          } else {
            console.error('[Server Error]', err);
          }
          reject(err);
          process.exit(1);
        }
      };

      server.once('error', onError);
      server.listen(port, () => {
        server.removeListener('error', onError);
        console.log(`[Smart Medical Reminder Backend] Server running on http://localhost:${port}`);
        resolve(server);
      });
    };

    tryListen();
  });
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer(PORT);
}
