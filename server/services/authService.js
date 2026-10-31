/**
 * Authentication and User Account Service (Phase 7)
 * Cryptographically secure password hashing (scrypt + random salts)
 * Session tokens with expiration, multi-tenant isolation, and complete data privacy.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hash a password using scrypt with a unique random salt
 */
export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
};

/**
 * Constant-time password verification to prevent timing attacks
 */
export const verifyPassword = (password, storedHash, salt) => {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(derivedKey, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
};

/**
 * Create a secure session token
 */
export const createSession = (userId) => {
  const sessionId = `sess-${crypto.randomUUID()}`;
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(sessionId, userId, token, expiresAt, now.toISOString());

  return { token, expiresAt };
};

/**
 * Validate a session token and retrieve authenticated user
 */
export const validateSession = (token) => {
  if (!token) return null;

  const nowIso = new Date().toISOString();
  const stmt = db.prepare(`
    SELECT s.id AS session_id, s.token, s.expires_at,
           u.id AS user_id, u.email, u.name, u.language, u.timezone, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `);

  const row = stmt.get(token, nowIso);
  if (!row) return null;

  return {
    id: row.user_id,
    email: row.email,
    name: row.name,
    language: row.language || 'en',
    preferredLanguage: row.language || 'en',
    timezone: row.timezone || 'Asia/Kolkata',
    createdAt: row.created_at,
    sessionId: row.session_id
  };
};

/**
 * Invalidate a session on logout
 */
export const deleteSession = (token) => {
  if (!token) return false;
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
  stmt.run(token);
  return true;
};

/**
 * Register a new user
 */
export const registerUser = ({ name, email, password, language, preferredLanguage, timezone = 'Asia/Kolkata', phone = '' }) => {
  if (!name || !name.trim()) {
    throw new Error('Name is required.');
  }
  if (!email || !email.trim() || !email.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const userLang = preferredLanguage || language || 'en';

  // Check uniqueness
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    const conflictErr = new Error('An account with this email address already exists.');
    conflictErr.code = 'CONFLICT';
    throw conflictErr;
  }

  const userId = `usr-${crypto.randomUUID()}`;
  const { hash, salt } = hashPassword(password);
  const nowIso = new Date().toISOString();

  // Insert user
  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, salt, language, timezone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, cleanEmail, name.trim(), hash, salt, userLang, timezone, nowIso, nowIso);

  // Initialize default caretaker profile
  db.prepare(`
    INSERT INTO caretaker_profiles (user_id, name, relationship, phone, email, preferred_channel, preferred_language, updated_at)
    VALUES (?, '', '', '', '', 'email', ?, ?)
  `).run(userId, userLang, nowIso);

  // Initialize default user preferences
  db.prepare(`
    INSERT INTO user_preferences (user_id, large_text_mode, sound_enabled, is_test_mode, updated_at)
    VALUES (?, 0, 1, 0, ?)
  `).run(userId, nowIso);

  // Create session
  const { token, expiresAt } = createSession(userId);

  return {
    user: {
      id: userId,
      email: cleanEmail,
      name: name.trim(),
      language: userLang,
      preferredLanguage: userLang,
      timezone,
      createdAt: nowIso
    },
    token,
    expiresAt
  };
};

/**
 * Authenticate existing user
 */
export const loginUser = ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

  if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
    throw new Error('Invalid email or password.');
  }

  const { token, expiresAt } = createSession(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      language: user.language || 'en',
      timezone: user.timezone || 'Asia/Kolkata',
      createdAt: user.created_at
    },
    token,
    expiresAt
  };
};

/**
 * Get profile details
 */
export const getUserProfile = (userId) => {
  const row = db.prepare('SELECT id, email, name, language, timezone, created_at FROM users WHERE id = ?').get(userId);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    language: row.language,
    preferredLanguage: row.language,
    timezone: row.timezone,
    createdAt: row.created_at
  };
};

/**
 * Update user profile
 */
export const updateUserProfile = (userId, updates) => {
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!current) throw new Error('User not found.');

  const nowIso = new Date().toISOString();
  let name = updates.name !== undefined ? updates.name.trim() : current.name;
  let language = updates.preferredLanguage !== undefined ? updates.preferredLanguage : (updates.language !== undefined ? updates.language : current.language);
  let timezone = updates.timezone !== undefined ? updates.timezone : current.timezone;
  let email = current.email;

  if (updates.email && updates.email.trim().toLowerCase() !== current.email) {
    const cleanEmail = updates.email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(cleanEmail, userId);
    if (existing) {
      throw new Error('That email address is already in use by another account.');
    }
    email = cleanEmail;
  }

  // Handle password change if requested
  if (updates.newPassword) {
    if (!updates.currentPassword) {
      throw new Error('Current password is required to set a new password.');
    }
    if (!verifyPassword(updates.currentPassword, current.password_hash, current.salt)) {
      throw new Error('Incorrect current password.');
    }
    if (updates.newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const { hash, salt } = hashPassword(updates.newPassword);
    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, language = ?, timezone = ?, password_hash = ?, salt = ?, updated_at = ?
      WHERE id = ?
    `).run(name, email, language, timezone, hash, salt, nowIso, userId);
  } else {
    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, language = ?, timezone = ?, updated_at = ?
      WHERE id = ?
    `).run(name, email, language, timezone, nowIso, userId);
  }

  return {
    id: userId,
    email,
    name,
    language,
    preferredLanguage: language,
    timezone,
    updatedAt: nowIso
  };
};

/**
 * Permanently delete user account and all associated data
 */
export const deleteUserAccount = (userId, password) => {
  if (password !== undefined) {
    const userRow = db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').get(userId);
    if (!userRow || !verifyPassword(password, userRow.password_hash, userRow.salt)) {
      const authErr = new Error('Incorrect password. Account deletion aborted.');
      authErr.statusCode = 401;
      throw authErr;
    }
  }

  // 1. Delete associated uploaded files from disk
  const uploads = db.prepare('SELECT stored_filename FROM user_uploads WHERE user_id = ?').all(userId);
  uploads.forEach((up) => {
    try {
      const uploadPath = path.resolve('server', 'uploads', up.stored_filename);
      if (fs.existsSync(uploadPath)) {
        fs.unlinkSync(uploadPath);
      }
    } catch (e) {
      console.warn('Failed to delete user file:', up.stored_filename, e);
    }
  });

  // 2. Cascade delete from database
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(userId);
  return true;
};

/**
 * Export complete personal data of the authenticated user
 */
export const exportUserData = (userId) => {
  const user = getUserProfile(userId);
  if (!user) throw new Error('User not found.');

  const medicines = db.prepare('SELECT * FROM medicines WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const doseOccurrences = db.prepare('SELECT * FROM dose_occurrences WHERE user_id = ? ORDER BY date DESC, scheduled_time DESC').all(userId);
  const doseHistory = db.prepare('SELECT * FROM dose_history WHERE user_id = ? ORDER BY date DESC, scheduled_time DESC').all(userId);
  const medicineHistory = db.prepare('SELECT * FROM medicine_history WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const caretaker = db.prepare('SELECT * FROM caretaker_profiles WHERE user_id = ?').get(userId);
  const alerts = db.prepare('SELECT * FROM caretaker_alerts WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const preferences = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);

  const uploads = db.prepare('SELECT id, original_name, stored_filename, mime_type, file_size, file_type, created_at FROM user_uploads WHERE user_id = ?').all(userId);

  const nowIso = new Date().toISOString();
  return {
    exportDate: nowIso,
    exportedAt: nowIso,
    user,
    preferences: preferences ? {
      largeTextMode: Boolean(preferences.large_text_mode),
      soundEnabled: Boolean(preferences.sound_enabled),
      isTestMode: Boolean(preferences.is_test_mode)
    } : null,
    caretaker: caretaker ? {
      name: caretaker.name,
      relationship: caretaker.relationship,
      phone: caretaker.phone,
      email: caretaker.email,
      preferredChannel: caretaker.preferred_channel,
      preferredLanguage: caretaker.preferred_language,
      alertsEnabled: Boolean(caretaker.alerts_enabled),
      notifyMissed: Boolean(caretaker.notify_missed),
      notifyLowStock: Boolean(caretaker.notify_low_stock),
      notifyDailySummary: Boolean(caretaker.notify_daily_summary),
      quietHoursEnabled: Boolean(caretaker.quiet_hours_enabled),
      quietHoursStart: caretaker.quiet_hours_start,
      quietHoursEnd: caretaker.quiet_hours_end,
      emergencyNotes: caretaker.emergency_notes
    } : null,
    medicines: medicines.map((m) => ({
      ...m,
      times: m.times_json ? JSON.parse(m.times_json) : [],
      isOngoing: Boolean(m.is_ongoing)
    })),
    doseOccurrences,
    doseHistory,
    medicineHistory,
    alerts,
    caretakerAlerts: alerts,
    uploads
  };
};
