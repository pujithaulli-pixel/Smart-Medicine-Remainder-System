/**
 * Frontend API Client for Smart Medical Reminder System (Phase 7)
 * Communicates with the backend SQLite database and auth services.
 * Seamlessly manages authentication tokens, errors, and multi-tenant persistence.
 */

const TOKEN_STORAGE_KEY = 'medical_reminder_auth_token';
const USER_STORAGE_KEY = 'medical_reminder_user_profile';

export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
};

export const setAuthSession = (token, user) => {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to store auth session:', e);
  }
};

export const clearAuthSession = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear auth session:', e);
  }
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const isAuthenticated = () => {
  return Boolean(getAuthToken());
};

/**
 * Core HTTP Request wrapper with Authorization header injection and JSON parsing
 */
const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      // Session expired or invalid
      clearAuthSession();
      window.dispatchEvent(new CustomEvent('auth:session_expired'));
    }
    const errorMsg = data && data.error ? data.error : `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
};

// -----------------------------------------------------------------------------
// AUTHENTICATION & PROFILE APIS
// -----------------------------------------------------------------------------

export const authApi = {
  async register({ name, email, password, language = 'en', timezone = 'Asia/Kolkata' }) {
    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, language, timezone })
    });
    if (res.token && res.user) {
      setAuthSession(res.token, res.user);
    }
    return res;
  },

  async login({ email, password }) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token && res.user) {
      setAuthSession(res.token, res.user);
    }
    return res;
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      clearAuthSession();
    }
  },

  async getMe() {
    const res = await request('/api/auth/me');
    if (res.user) {
      setAuthSession(getAuthToken(), res.user);
    }
    return res.user;
  },

  async updateProfile(updates) {
    const res = await request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    if (res.user) {
      setAuthSession(getAuthToken(), res.user);
    }
    return res.user;
  },

  async deleteAccount() {
    const res = await request('/api/auth/account', { method: 'DELETE' });
    clearAuthSession();
    return res;
  },

  async exportUserData() {
    const res = await request('/api/auth/export');
    return res.data;
  }
};

// -----------------------------------------------------------------------------
// MEDICINES APIS
// -----------------------------------------------------------------------------

export const medicinesApi = {
  async getAll({ status = 'all', search = '' } = {}) {
    const params = new URLSearchParams();
    if (status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request(`/api/medicines${qs}`);
    return res.medicines || [];
  },

  async getById(id) {
    const res = await request(`/api/medicines/${id}`);
    return res.medicine;
  },

  async create(medicineData) {
    const res = await request('/api/medicines', {
      method: 'POST',
      body: JSON.stringify(medicineData)
    });
    return res.medicine;
  },

  async update(id, medicineData) {
    const res = await request(`/api/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medicineData)
    });
    return res.medicine;
  },

  async delete(id) {
    return await request(`/api/medicines/${id}`, { method: 'DELETE' });
  },

  async updateStock(id, quantity) {
    const res = await request(`/api/medicines/${id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ quantity })
    });
    return res.medicine;
  }
};

// -----------------------------------------------------------------------------
// DOSES & SCHEDULE APIS
// -----------------------------------------------------------------------------

export const dosesApi = {
  async getForDate(dateStr) {
    const res = await request(`/api/doses/date/${dateStr}`);
    return res.doses || [];
  },

  async syncOccurrences(doses) {
    const res = await request('/api/doses/sync', {
      method: 'POST',
      body: JSON.stringify({ doses })
    });
    return res.doses || [];
  },

  async getHistory({ status = 'all', startDate, endDate, medicineName } = {}) {
    const params = new URLSearchParams();
    if (status !== 'all') params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (medicineName && medicineName !== 'all') params.append('medicineName', medicineName);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await request(`/api/doses/history${qs}`);
    return res.history || [];
  },

  async recordHistory(dose) {
    const res = await request('/api/doses/history', {
      method: 'POST',
      body: JSON.stringify(dose)
    });
    return res.dose;
  },

  async getMedicineHistory() {
    const res = await request('/api/medicines/history');
    return res.history || [];
  },

  async addMedicineHistory(record) {
    const res = await request('/api/medicines/history', {
      method: 'POST',
      body: JSON.stringify(record)
    });
    return res.record;
  }
};

// -----------------------------------------------------------------------------
// CARETAKER & PREFERENCES APIS
// -----------------------------------------------------------------------------

export const caretakerApi = {
  async getProfile() {
    return await request('/api/caretaker');
  },

  async saveProfile(profile) {
    const res = await request('/api/caretaker', {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
    return res.profile || res.caretaker;
  },

  async getAlerts() {
    const res = await request('/api/alerts');
    return res.alerts || [];
  }
};

export const preferencesApi = {
  async get() {
    const res = await request('/api/preferences');
    return res.preferences;
  },

  async save(prefs) {
    const res = await request('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs)
    });
    return res.preferences;
  }
};

// -----------------------------------------------------------------------------
// LOCAL DATA MIGRATION & FILE UPLOAD APIS
// -----------------------------------------------------------------------------

export const migrationApi = {
  async migrate(payload) {
    return await request('/api/migrate/local', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

export const fileApi = {
  async uploadFile({ filename, mimeType, dataBase64, fileType = 'medicine_image' }) {
    const res = await request('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, mimeType, dataBase64, fileType })
    });
    return res;
  }
};
