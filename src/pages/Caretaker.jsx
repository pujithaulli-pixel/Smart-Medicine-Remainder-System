import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  IconCaretaker,
  IconShield,
  IconCheck,
  IconAlertCircle,
  IconInfo,
  IconClock,
  IconRefresh,
  IconDownload,
  IconVolume
} from '../components/Icons';
import { caretakerAlertService } from '../services/caretakerAlertService';
import { downloadCsvFile } from '../utils/csvUtils';
import { getTodayDateString } from '../utils/dateUtils';

export const Caretaker = () => {
  const { t, caretaker, updateCaretaker, caretakerAlerts, refreshAlerts, showToast } = useApp();

  // Form state
  const [formData, setFormData] = useState({
    name: caretaker.name || '',
    relationship: caretaker.relationship || '',
    phone: caretaker.phone || '',
    email: caretaker.email || '',
    preferredLanguage: caretaker.preferredLanguage || 'en',
    preferredChannel: caretaker.preferredChannel || 'email',
    alertsEnabled: caretaker.alertsEnabled !== false,
    notifyMissed: caretaker.notifyMissed !== false,
    notifySnoozeLimit: caretaker.notifySnoozeLimit !== false,
    notifyLowStock: caretaker.notifyLowStock !== false,
    quietHoursEnabled: Boolean(caretaker.quietHoursEnabled),
    quietHoursStart: caretaker.quietHoursStart || '22:00',
    quietHoursEnd: caretaker.quietHoursEnd || '07:00',
    emergencyNotes: caretaker.emergencyNotes || ''
  });

  const [errors, setErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testingDelivery, setTestingDelivery] = useState(false);
  const [backendHealth, setBackendHealth] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all'); // all, missed, snooze, stock, email, sms, failed, delivered

  // Check backend server status on mount
  useEffect(() => {
    caretakerAlertService.checkHealth().then((h) => setBackendHealth(h));
  }, []);

  // Validation
  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = t.caretakerPage.validation.nameRequired;
    }
    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      errs.phone = t.caretakerPage.validation.phoneRequired;
    } else if (!/^\+?[1-9]\d{7,14}$/.test(cleanPhone.replace(/[\s-]/g, ''))) {
      errs.phone = 'Please enter a valid phone number with country code (e.g. +91 9876543210 or +1 5551234567).';
    }

    if (formData.email && !formData.email.includes('@')) {
      errs.email = 'Please enter a valid email address.';
    }

    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    updateCaretaker(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  // Test Notification Delivery (Requirement 1 & 12)
  const handleTestDelivery = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast('Please fix contact details before testing delivery.', 'warning');
      return;
    }

    setTestingDelivery(true);
    setTestResult(null);

    const targetRecipient = formData.preferredChannel === 'email' ? formData.email : formData.phone;
    if (!targetRecipient) {
      setTestingDelivery(false);
      showToast(`Missing destination ${formData.preferredChannel} address.`, 'warning');
      return;
    }

    const res = await caretakerAlertService.sendTestAlert({
      channel: formData.preferredChannel,
      to: targetRecipient,
      language: formData.preferredLanguage,
      caretakerName: formData.name
    });

    setTestingDelivery(false);
    setTestResult(res);

    if (res.success) {
      showToast('Test notification dispatched successfully!');
    } else if (res.status === 'provider_not_configured') {
      showToast('Delivery unavailable: External provider credentials not configured in server/.env.', 'warning');
    } else if (res.status === 'backend_offline') {
      showToast('Backend server is offline (http://localhost:3001).', 'warning');
    } else {
      showToast(`Test delivery failed: ${res.error || 'Unknown error'}`, 'warning');
    }

    refreshAlerts();
  };

  // Manual Retry for an Alert (Requirement 7)
  const handleRetryAlert = async (alertId) => {
    showToast('Retrying notification delivery...');
    const res = await caretakerAlertService.retryAlert(alertId);
    if (res && res.success) {
      showToast('Alert notification successfully delivered!');
    } else {
      showToast(res?.error || 'Retry attempt was recorded, but provider is not configured.', 'warning');
    }
    refreshAlerts();
  };

  // Export Alert History CSV
  const handleExportAlertsCsv = () => {
    try {
      const cols = t.caretakerPage?.columns || {};
      const headers = [
        cols.alertId || 'Alert ID',
        cols.medicine || 'Medicine Name',
        cols.scheduledTime || 'Dose Time',
        cols.reason || 'Reason',
        cols.channel || 'Channel',
        cols.deliveryStatus || 'Delivery Status',
        cols.createdAt || 'Created At',
        cols.providerMessageId || 'Provider Message ID',
        cols.errorDetails || 'Error Details'
      ];
      const rows = filteredAlerts.map((a) => [
        a.id,
        a.medicineName,
        `${a.scheduledDate} ${a.scheduledTime}`,
        a.reason,
        (a.channel || 'email').toUpperCase(),
        a.status,
        a.createdAt,
        a.providerMessageId || '',
        a.errorMessage || ''
      ]);
      downloadCsvFile(`caretaker-alert-history-${getTodayDateString()}.csv`, headers, rows);
      showToast(t.common?.exported || 'Alert history exported to CSV!');
    } catch (e) {
      showToast('Failed to export alert history.', 'warning');
    }
  };

  // Filtered Alert History
  const filteredAlerts = useMemo(() => {
    return caretakerAlerts.filter((a) => {
      if (historyFilter === 'missed') return a.alertType === 'missed_dose';
      if (historyFilter === 'snooze') return a.alertType === 'snooze_warning';
      if (historyFilter === 'stock') return a.alertType === 'low_stock';
      if (historyFilter === 'email') return a.channel === 'email';
      if (historyFilter === 'sms') return a.channel === 'sms';
      if (historyFilter === 'delivered') return ['sent', 'delivered', 'delivered_in_app'].includes(a.status);
      if (historyFilter === 'failed') return ['failed', 'provider_not_configured', 'backend_offline'].includes(a.status);
      return true;
    });
  }, [caretakerAlerts, historyFilter]);

  const getStatusBadge = (status) => {
    const st = t.notificationPanel?.statuses || {};
    switch (status) {
      case 'sent':
      case 'delivered':
        return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: st.delivered || 'Delivered' };
      case 'delivered_in_app':
        return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: st.deliveredInApp || 'Delivered In-App' };
      case 'provider_not_configured':
        return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: st.providerNotConfigured || 'Provider Unconfigured' };
      case 'quiet_hours_held':
        return { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff', label: st.quietHoursHeld || 'Quiet Hours Held' };
      case 'disabled_by_user':
        return { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: st.disabledByUser || 'Alerts Disabled' };
      case 'simulated_sandbox':
        return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Sandbox' };
      case 'backend_offline':
        return { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', label: t.caretakerPage?.offline || 'Backend Offline' };
      case 'failed':
      default:
        return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: st.deliveryFailed || 'Delivery Failed' };
    }
  };

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h2 className="page-title">{t.caretakerPage.pageTitle}</h2>
        <p className="page-subtitle">{t.caretakerPage.pageSubtitle}</p>
      </div>

      {/* Backend & Delivery Health Bar */}
      <section
        className="card"
        style={{
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          backgroundColor: backendHealth?.status === 'operational' || backendHealth?.status === 'ok' ? '#f0fdf4' : '#fffbeb',
          border: backendHealth?.status === 'operational' || backendHealth?.status === 'ok' ? '1px solid #bbf7d0' : '1px solid #fde68a'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: backendHealth?.status === 'operational' || backendHealth?.status === 'ok' ? '#16a34a' : '#d97706'
            }}
          />
          <div>
            <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>
              {t.caretakerPage.serverStatus || 'Notification Server:'}{' '}
              {backendHealth?.status === 'operational' || backendHealth?.status === 'ok'
                ? t.caretakerPage.operational || 'Operational'
                : t.caretakerPage.offline || 'Offline'}
            </strong>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t.caretakerPage.emailDriver || 'Email Driver:'}{' '}
              {backendHealth?.providers?.email?.configured
                ? t.caretakerPage.configured || 'Configured'
                : t.caretakerPage.unconfigured || 'Unconfigured'}{' '}
              • {t.caretakerPage.smsDriver || 'SMS Driver:'}{' '}
              {backendHealth?.providers?.sms?.configured
                ? t.caretakerPage.configured || 'Configured'
                : t.caretakerPage.unconfigured || 'Unconfigured'}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            caretakerAlertService.checkHealth().then((h) => {
              setBackendHealth(h);
              showToast(t.common.loading || 'Checked status.');
            });
          }}
        >
          <IconRefresh size={14} />
          <span>{t.common.loading ? t.common.loading.replace('...', '') : 'Status'}</span>
        </button>
      </section>

      {/* Main Two-Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gap: '24px'
        }}
        className="caretaker-columns"
      >
        {/* Caretaker Configuration Form */}
        <form onSubmit={handleSubmit} className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-main)' }}>
            {t.caretakerPage.formTitle}
          </h3>

          {/* Master Alerts Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              backgroundColor: 'var(--bg-main)',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              marginBottom: '20px'
            }}
          >
            <div>
              <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)', display: 'block' }}>
                {t.caretakerPage.alertsToggle || 'Enable Caretaker Missed Dose Alerts'}
              </strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {t.caretakerPage.alertsToggleDesc || 'Automatically generates escalation alerts when patient misses a scheduled medication dose.'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.alertsEnabled}
              onChange={(e) => setFormData({ ...formData, alertsEnabled: e.target.checked })}
              style={{ width: '22px', height: '22px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
            />
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="ctName">
              {t.caretakerPage.fields.name} <span className="required-star">*</span>
            </label>
            <input
              id="ctName"
              type="text"
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              placeholder={t.caretakerPage.fields.namePlaceholder}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && (
              <div className="form-error">
                <IconAlertCircle size={14} />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          {/* Relationship */}
          <div className="form-group">
            <label className="form-label" htmlFor="ctRelation">
              {t.caretakerPage.fields.relationship}
            </label>
            <input
              id="ctRelation"
              type="text"
              className="form-control"
              placeholder={t.caretakerPage.fields.relationPlaceholder}
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
            />
          </div>

          {/* Phone with Country Code */}
          <div className="form-group">
            <label className="form-label" htmlFor="ctPhone">
              {t.caretakerPage.fields.phone} <span className="required-star">*</span>
            </label>
            <input
              id="ctPhone"
              type="tel"
              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
              placeholder="+91 98765 43210 or +1 555 123 4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Must include leading '+' and country code for international SMS routing.
            </span>
            {errors.phone && (
              <div className="form-error">
                <IconAlertCircle size={14} />
                <span>{errors.phone}</span>
              </div>
            )}
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="ctEmail">
              {t.caretakerPage.fields.email}
            </label>
            <input
              id="ctEmail"
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder={t.caretakerPage.fields.emailPlaceholder}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            {errors.email && (
              <div className="form-error">
                <IconAlertCircle size={14} />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          {/* Preferred Channel & Language */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="ctChannel">
                {t.caretakerPage.preferredChannel || 'Preferred Notification Channel'}
              </label>
              <select
                id="ctChannel"
                className="form-control"
                value={formData.preferredChannel}
                onChange={(e) => setFormData({ ...formData, preferredChannel: e.target.value })}
              >
                <option value="email">{t.caretakerPage.channels?.email || 'Email'}</option>
                <option value="sms">{t.caretakerPage.channels?.sms || 'SMS'}</option>
                <option value="inApp">{t.caretakerPage.channels?.inApp || 'In-App Only'}</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="ctLang">
                {t.caretakerPage.preferredLanguage || 'Preferred Notification Language'}
              </label>
              <select
                id="ctLang"
                className="form-control"
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
              >
                <option value="en">{t.caretakerPage.languages?.en || 'English'}</option>
                <option value="hi">{t.caretakerPage.languages?.hi || 'हिन्दी (Hindi)'}</option>
                <option value="te">{t.caretakerPage.languages?.te || 'తెలుగు (Telugu)'}</option>
              </select>
            </div>
          </div>

          {/* Optional Quiet Hours (Requirement 1) */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-main)',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              marginBottom: '20px'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: formData.quietHoursEnabled ? '12px' : 0 }}>
              <div>
                <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>
                  {t.caretakerPage.quietHoursHeading || 'Quiet Hours (Do Not Disturb)'}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                  {t.caretakerPage.quietHoursDesc || 'Hold non-emergency notifications during sleeping hours'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.quietHoursEnabled}
                onChange={(e) => setFormData({ ...formData, quietHoursEnabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
              />
            </label>

            {formData.quietHoursEnabled && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                    {t.caretakerPage.quietHoursStart || 'Start Time'}:
                  </span>
                  <input
                    type="time"
                    className="form-control"
                    value={formData.quietHoursStart}
                    onChange={(e) => setFormData({ ...formData, quietHoursStart: e.target.value })}
                    style={{ width: '120px', padding: '4px 8px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                    {t.caretakerPage.quietHoursEnd || 'End Time'}:
                  </span>
                  <input
                    type="time"
                    className="form-control"
                    value={formData.quietHoursEnd}
                    onChange={(e) => setFormData({ ...formData, quietHoursEnd: e.target.value })}
                    style={{ width: '120px', padding: '4px 8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Emergency Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="ctNotes">
              {t.caretakerPage.emergencyNotes || 'Emergency Contact Notes'}
            </label>
            <textarea
              id="ctNotes"
              className="form-control"
              rows={2}
              placeholder={t.caretakerPage.emergencyNotesPlaceholder || 'e.g. Call neighbor or secondary contact if no answer.'}
              value={formData.emergencyNotes}
              onChange={(e) => setFormData({ ...formData, emergencyNotes: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            <IconCheck size={18} />
            <span>{t.caretakerPage.buttons.save}</span>
          </button>
        </form>

        {/* Saved Profile & Live Test Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Configuration Summary */}
          <div className="card" style={{ borderLeft: '4px solid var(--primary-600)', padding: '24px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)' }}>
              {t.caretakerPage.savedConfigTitle}
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.3rem'
                }}
              >
                {caretaker.name ? caretaker.name.charAt(0).toUpperCase() : 'C'}
              </div>

              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {caretaker.name || 'Not configured'}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                  {caretaker.relationship || 'Primary Caregiver'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{t.caretakerPage?.cardStatus || 'Status:'} </span>
                <strong style={{ color: caretaker.alertsEnabled !== false ? '#059669' : '#dc2626' }}>
                  {caretaker.alertsEnabled !== false ? (t.caretakerPage?.cardActiveAlerts || '● Active Alerts') : (t.caretakerPage?.cardAlertsDisabled || '○ Alerts Disabled')}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{t.caretakerPage?.fields?.phone || 'Phone'}: </span>
                <strong style={{ color: 'var(--text-main)' }}>{caretaker.phone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{t.caretakerPage?.fields?.email || 'Email'}: </span>
                <strong style={{ color: 'var(--text-main)' }}>{caretaker.email || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{t.caretakerPage?.cardPrimaryChannel || 'Primary Channel:'} </span>
                <strong style={{ color: 'var(--primary-700)', textTransform: 'uppercase' }}>
                  {caretaker.preferredChannel || 'EMAIL'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{t.caretakerPage?.cardLanguage || 'Language:'} </span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {caretaker.preferredLanguage === 'hi' ? 'हिन्दी (Hindi)' : caretaker.preferredLanguage === 'te' ? 'తెలుగు (Telugu)' : 'English'}
                </strong>
              </div>
            </div>

            {/* Test Delivery Action (Requirement 1 & 12) */}
            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestDelivery}
                disabled={testingDelivery}
                style={{ width: '100%', fontWeight: 700 }}
              >
                <IconVolume size={18} />
                <span>{testingDelivery ? (t.caretakerPage?.testing || 'Testing Delivery...') : (t.caretakerPage?.btnSendTest || 'Test Notification Delivery')}</span>
              </button>
            </div>

            {/* Test Delivery Feedback Banner */}
            {testResult && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  lineHeight: 1.45,
                  backgroundColor: testResult.success ? '#ecfdf5' : '#fffbeb',
                  border: testResult.success ? '1px solid #a7f3d0' : '1px solid #fde68a',
                  color: testResult.success ? '#065f46' : '#92400e'
                }}
              >
                <strong>{testResult.success ? (t.caretakerPage?.testDeliveryConfirmed || '✓ Delivery Confirmed:') : (t.caretakerPage?.testDeliveryNotice || 'Notice on Delivery:')}</strong>
                <div style={{ marginTop: '4px' }}>
                  {testResult.success
                    ? `${t.caretakerPage?.testSuccess || 'Message confirmed by provider'} (ID: ${testResult.providerMessageId || 'Confirmed'}).`
                    : testResult.error || (t.caretakerPage?.testProviderUnconfigured || 'Provider not configured in server/.env. Never fakes delivery.')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          CARETAKER ALERT HISTORY & DELIVERY TRACKING (Requirement 7 & 8)
         ========================================================================= */}
      <section className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {t.caretakerPage?.alertHistoryTitle || 'Caretaker Alert History & Delivery Tracking'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {t.caretakerPage?.alertHistorySubtitle || 'Persistent log of all missed-dose events, snooze limit warnings, and external delivery statuses.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={refreshAlerts}
              title={t.caretakerPage?.btnRefresh || 'Refresh alerts from backend'}
            >
              <IconRefresh size={14} />
              <span>{t.caretakerPage?.btnRefresh || 'Refresh'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportAlertsCsv}
              disabled={filteredAlerts.length === 0}
              title={t.caretakerPage?.btnExportCsv || 'Download alert history to CSV'}
            >
              <IconDownload size={14} />
              <span>{t.caretakerPage?.btnExportCsv || 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="pill-group" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={`pill-btn ${historyFilter === 'all' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('all')}
          >
            {t.caretakerPage?.filters?.all || 'All Alerts'} ({caretakerAlerts.length})
          </button>
          <button
            type="button"
            className={`pill-btn ${historyFilter === 'missed' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('missed')}
          >
            {t.caretakerPage?.filters?.missed || 'Missed-Dose Alerts'}
          </button>
          <button
            type="button"
            className={`pill-btn ${historyFilter === 'snooze' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('snooze')}
          >
            {t.caretakerPage?.filters?.snooze || 'Snooze Warnings'}
          </button>
          <button
            type="button"
            className={`pill-btn ${historyFilter === 'stock' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('stock')}
          >
            {t.caretakerPage?.filters?.stock || 'Low-Stock'}
          </button>
          <button
            type="button"
            className={`pill-btn ${historyFilter === 'email' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('email')}
          >
            {t.caretakerPage?.filters?.email || 'Email'}
          </button>
          <button
            type="button"
            className={`pill-btn ${historyFilter === 'sms' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('sms')}
          >
            {t.caretakerPage?.filters?.sms || 'SMS'}
          </button>
          <button
            type="button"
            className={`pill-btn ${historyFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('delivered')}
          >
            {t.caretakerPage?.filters?.delivered || 'Delivered'}
          </button>
          <button
            type="button"
            className={`pill-btn ${historyFilter === 'failed' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('failed')}
          >
            {t.caretakerPage?.filters?.failed || 'Failed / Unconfigured'}
          </button>
        </div>

        {/* Alert History Table */}
        {filteredAlerts.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <IconCheckCircle size={32} color="#059669" style={{ margin: '0 auto 10px' }} />
            <strong style={{ color: 'var(--text-main)', display: 'block' }}>{t.caretakerPage?.noAlertsMatchTitle || 'No alert events match filter'}</strong>
            <span style={{ fontSize: '0.85rem' }}>{t.caretakerPage?.noAlertsMatchText || 'No caretaker notifications have been recorded in this category.'}</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.caretakerPage?.columns?.medicine || 'Medicine & Dose'}</th>
                  <th>{t.caretakerPage?.columns?.scheduledTime || 'Scheduled Time'}</th>
                  <th>{t.caretakerPage?.columns?.reason || 'Reason for Alert'}</th>
                  <th>{t.caretakerPage?.columns?.channel || 'Channel'}</th>
                  <th>{t.caretakerPage?.columns?.deliveryStatus || 'Delivery Status'}</th>
                  <th>{t.caretakerPage?.columns?.providerMessageId || 'Provider Message ID / Note'}</th>
                  <th>{t.caretakerPage?.columns?.actions || 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const badge = getStatusBadge(alert.status);
                  const isEligibleRetry = ['failed', 'provider_not_configured', 'backend_offline'].includes(alert.status);

                  return (
                    <tr key={alert.id}>
                      <td>
                        <strong style={{ color: 'var(--text-main)' }}>{alert.medicineName}</strong>
                        {alert.dosage && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{alert.dosage}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.88rem' }}>{alert.scheduledTime || 'N/A'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{alert.scheduledDate || t.common?.today || 'Today'}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '220px' }}>
                        {alert.reason}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase' }}>
                          {alert.channel || 'EMAIL'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                        {alert.providerMessageId ? (
                          <span style={{ fontFamily: 'monospace' }}>{alert.providerMessageId}</span>
                        ) : alert.errorMessage ? (
                          <span style={{ color: '#991b1b' }}>{alert.errorMessage}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {isEligibleRetry ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRetryAlert(alert.id)}
                            style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                            title={t.caretakerPage?.btnRetry || 'Retry dispatching notification to provider'}
                          >
                            <IconRefresh size={12} />
                            <span>{t.caretakerPage?.btnRetry || 'Retry'}</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        @media (max-width: 860px) {
          .caretaker-columns {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
