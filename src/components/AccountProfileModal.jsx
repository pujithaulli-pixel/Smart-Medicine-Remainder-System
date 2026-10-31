import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Modal } from './Modal';
import { IconShield, IconDownload, IconTrash, IconAlertCircle, IconCheck, IconSettings } from './Icons';
import { authApi } from '../services/apiService';

export const AccountProfileModal = ({ isOpen, onClose, onLogout }) => {
  const { t, language, setLanguage, user, refreshUserData, showToast } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setTimezone(user.timezone || 'Asia/Kolkata');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const updates = {
        name: name.trim(),
        email: email.trim(),
        timezone,
        language
      };

      if (newPassword) {
        if (!currentPassword) {
          setMessage({ text: 'Current password is required to change password.', type: 'error' });
          setLoading(false);
          return;
        }
        updates.currentPassword = currentPassword;
        updates.newPassword = newPassword;
      }

      await authApi.updateProfile(updates);
      setCurrentPassword('');
      setNewPassword('');
      setMessage({ text: 'Profile successfully updated!', type: 'success' });
      showToast('Profile updated.');
      if (refreshUserData) {
        await refreshUserData();
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      showToast('Exporting personal data bundle...');
      const data = await authApi.exportUserData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medical-records-${user?.name?.replace(/\s+/g, '-').toLowerCase() || 'user'}-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(t.auth?.exportSuccess || 'Personal data bundle downloaded successfully.');
    } catch (err) {
      showToast(err.message || 'Export failed.', 'warning');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      setConfirmDeleteOpen(false);
      onClose();
      showToast('Account and personal records permanently deleted.');
      if (onLogout) onLogout();
    } catch (err) {
      showToast(err.message || 'Failed to delete account.', 'warning');
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t.auth?.profileTitle || 'My Account & Privacy'}
        maxWidth="560px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {message.text && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                backgroundColor: message.type === 'error' ? '#fef2f2' : '#ecfdf5',
                border: message.type === 'error' ? '1px solid #fecaca' : '1px solid #a7f3d0',
                color: message.type === 'error' ? '#b91c1c' : '#065f46'
              }}
            >
              {message.text}
            </div>
          )}

          {/* Account Profile Details Form */}
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                {t.auth?.name || 'Full Name'}
              </label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                {t.auth?.email || 'Email Address'}
              </label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {t.settingsPage?.languageHeading || 'Preferred Language'}
                </label>
                <select
                  className="form-control"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {t.auth?.timezone || 'Time Zone'}
                </label>
                <select
                  className="form-control"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC (Universal)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
            </div>

            {/* Change Password Sub-Section */}
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '14px', borderRadius: '12px', marginTop: '4px' }}>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                Change Password (Optional)
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder={t.auth?.currentPassword || 'Current Password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                <input
                  type="password"
                  className="form-control"
                  placeholder={t.auth?.newPassword || 'New Password (min 6 chars)'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ fontWeight: 700, width: '100%', marginTop: '4px' }}
            >
              {loading ? (t.common?.loading || 'Saving...') : (t.auth?.btnSaveProfile || 'Save Changes')}
            </button>
          </form>

          {/* Privacy & Account Management Section */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>Data Privacy & Actions</strong>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportData}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}
            >
              <IconDownload size={16} />
              <span>{t.auth?.exportDataBtn || 'Export Personal Data (JSON)'}</span>
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmDeleteOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                backgroundColor: '#fff1f2',
                color: '#be123c',
                border: '1px solid #fecdd3'
              }}
            >
              <IconTrash size={16} color="#be123c" />
              <span>{t.auth?.deleteAccountBtn || 'Delete Account Permanently'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog for Permanent Deletion */}
      {confirmDeleteOpen && (
        <Modal
          isOpen={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          title="Confirm Permanent Account Deletion"
          maxWidth="440px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '10px', color: '#991b1b' }}>
              <IconAlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>
                {t.auth?.deleteConfirm || 'Are you sure you want to permanently delete your account? All medicines, scheduled doses, dose history, and caretaker alerts will be erased forever. This action cannot be undone.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                {t.common?.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{ flex: 1, fontWeight: 700 }}
              >
                {deleting ? (t.common?.loading || 'Deleting...') : 'Yes, Delete Forever'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
