import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  IconSettings,
  IconGlobe,
  IconCheck,
  IconRefresh,
  IconHeartPulse,
  IconShield,
  IconVolume,
  IconAlertCircle,
  IconClock
} from '../components/Icons';
import { alarmSoundService } from '../services/alarmSoundService';
import { notificationService } from '../services/notificationService';

export const Settings = () => {
  const {
    t,
    language,
    setLanguage,
    preferences,
    setPreferences,
    resetToSampleData,
    showToast
  } = useApp();

  const [notificationStatus, setNotificationStatus] = useState(
    notificationService.getPermissionStatus()
  );

  const handleLargeTextToggle = (e) => {
    setPreferences({
      ...preferences,
      largeTextMode: e.target.checked
    });
  };

  const handleSoundToggle = (e) => {
    setPreferences({
      ...preferences,
      soundEnabled: e.target.checked
    });
  };

  const handleTestModeToggle = (e) => {
    const isEnabled = e.target.checked;
    setPreferences({
      ...preferences,
      isTestMode: isEnabled
    });
    showToast(
      isEnabled
        ? 'Accelerated Test Mode enabled: 15s Snooze / 20s Grace Period.'
        : 'Production Mode restored: 10m Snooze / 5m Grace Period.'
    );
  };

  const handleTestChime = () => {
    alarmSoundService.testAlarm();
    showToast('Playing synthesized alarm chime test...');
  };

  const handleRequestNotifications = async () => {
    const perm = await notificationService.requestPermission();
    setNotificationStatus(perm);
    if (perm === 'granted') {
      showToast(t.settingsPage.notificationsGranted);
      notificationService.showLocalNotification('Notifications Active', {
        body: 'You will receive desktop alerts when your medicine doses are due.'
      });
    } else if (perm === 'denied') {
      showToast(t.settingsPage.notificationsDenied, 'warning');
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 className="page-title">{t.settingsPage.pageTitle}</h2>
        <p className="page-subtitle">{t.settingsPage.pageSubtitle}</p>
      </div>

      {/* 1. Language Preference */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)' }}>
          {t.settingsPage.languageHeading}
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t.settingsPage.languageDesc}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { code: 'en', label: 'English', desc: 'Default' },
            { code: 'hi', label: 'हिन्दी', desc: 'Hindi' },
            { code: 'te', label: 'తెలుగు', desc: 'Telugu' }
          ].map((langItem) => {
            const isSelected = language === langItem.code;
            return (
              <button
                key={langItem.code}
                type="button"
                onClick={() => setLanguage(langItem.code)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: isSelected
                    ? '2px solid var(--primary-600)'
                    : '1.5px solid var(--border-strong)',
                  backgroundColor: isSelected ? 'var(--primary-50)' : '#ffffff',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'var(--transition)'
                }}
              >
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {langItem.label}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {langItem.desc}
                  </div>
                </div>
                {isSelected && <IconCheck size={20} color="var(--primary-600)" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Elderly & High Readability Mode */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)' }}>
          {t.settingsPage.elderlyFontHeading}
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t.settingsPage.elderlyFontDesc}
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: 'var(--bg-main)',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {t.settingsPage.elderlyFontToggle}
          </span>
          <input
            type="checkbox"
            checked={preferences.largeTextMode}
            onChange={handleLargeTextToggle}
            style={{ width: '22px', height: '22px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
          />
        </label>
      </div>

      {/* 3. Audio & Reminders Preview */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)' }}>
          {t.settingsPage.soundHeading}
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t.settingsPage.soundDesc}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: 'var(--bg-main)',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t.settingsPage.soundToggle}
            </span>
            <input
              type="checkbox"
              checked={preferences.soundEnabled}
              onChange={handleSoundToggle}
              style={{ width: '22px', height: '22px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
            />
          </label>

          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestChime}
              style={{ fontWeight: 700 }}
            >
              <IconVolume size={18} />
              <span>{t.settingsPage.testSoundBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Desktop Notifications */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)' }}>
          {t.settingsPage.notificationsHeading}
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t.settingsPage.notificationsDesc}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '12px' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Permission Status:
              <span
                style={{
                  marginLeft: '8px',
                  fontWeight: 800,
                  color:
                    notificationStatus === 'granted'
                      ? '#059669'
                      : notificationStatus === 'denied'
                      ? '#dc2626'
                      : '#d97706'
                }}
              >
                {notificationStatus.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {notificationStatus === 'granted'
                ? t.settingsPage.notificationsGranted
                : notificationStatus === 'denied'
                ? t.settingsPage.notificationsDenied
                : 'Grant permission so your browser displays notifications when medicines are due.'}
            </div>
          </div>

          {notificationStatus !== 'granted' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRequestNotifications}
              style={{ fontWeight: 700 }}
            >
              {t.settingsPage.notificationsBtn}
            </button>
          )}
        </div>
      </div>

      {/* 5. Phase 3 Test / Demonstration Mode */}
      <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b45309', margin: 0 }}>
            {t.settingsPage.testModeHeading}
          </h3>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t.settingsPage.testModeDesc}
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: '#fffbeb',
            borderRadius: '12px',
            cursor: 'pointer',
            border: '1px solid #fde68a'
          }}
        >
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>
              {t.settingsPage.testModeToggle}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '2px' }}>
              When enabled: Snooze interval is 15 seconds; Grace period before Missed is 20 seconds.
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(preferences.isTestMode)}
            onChange={handleTestModeToggle}
            style={{ width: '22px', height: '22px', accentColor: '#d97706', cursor: 'pointer' }}
          />
        </label>
      </div>

      {/* 6. Browser Limitations & Reliability Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          padding: '18px 22px',
          backgroundColor: '#eff6ff',
          borderRadius: '14px',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '0.92rem',
          lineHeight: 1.55
        }}
      >
        <IconAlertCircle size={24} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.98rem' }}>
            {t.settingsPage.browserNoticeHeading}
          </strong>
          <span>{t.settingsPage.browserNoticeText}</span>
        </div>
      </div>

      {/* 7. Reset Data */}
      <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: '#991b1b' }}>
          {t.settingsPage.resetHeading}
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t.settingsPage.resetDesc}
        </p>

        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={resetToSampleData}
        >
          <IconRefresh size={18} />
          <span>{t.settingsPage.resetBtn}</span>
        </button>
      </div>

      {/* Safety Notice Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid var(--border-light)',
          color: 'var(--text-muted)',
          fontSize: '0.85rem'
        }}
      >
        <IconShield size={20} color="var(--primary-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>{t.common.safetyNotice}</span>
      </div>
    </div>
  );
};
