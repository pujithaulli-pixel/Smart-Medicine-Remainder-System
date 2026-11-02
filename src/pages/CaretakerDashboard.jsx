import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  IconCaretaker,
  IconShield,
  IconCheck,
  IconAlertCircle,
  IconInfo,
  IconClock,
  IconRefresh,
  IconUser,
  IconX,
  IconDownload,
  IconPill,
  IconLogOut
} from '../components/Icons';
import { caretakerPortalApi } from '../services/apiService';

export const CaretakerDashboard = () => {
  const { t, showToast, logout } = useApp();

  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unresolved, acknowledged

  // Link Patient Form State
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [linking, setLinking] = useState(false);

  // Acknowledge Modal State
  const [activeAlertToAcknowledge, setActiveAlertToAcknowledge] = useState(null);
  const [caretakerNote, setCaretakerNote] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);

  // Selected Patient Summary Drawer State
  const [selectedPatientSummary, setSelectedPatientSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pts, alts] = await Promise.all([
        caretakerPortalApi.getLinkedPatients().catch(() => []),
        caretakerPortalApi.getAlerts(filter).catch(() => [])
      ]);
      setPatients(pts || []);
      setAlerts(alts || []);
    } catch (e) {
      console.warn('Failed to load caretaker portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  // Handle linking patient
  const handleLinkPatient = async (e) => {
    e.preventDefault();
    const cleanCode = inviteCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Please enter an invitation code.', 'warning');
      return;
    }

    setLinking(true);
    try {
      const res = await caretakerPortalApi.linkPatient(cleanCode);
      if (res && res.success) {
        showToast('Successfully linked to patient account!', 'success');
        setInviteCodeInput('');
        loadData();
      } else {
        showToast(res?.error || 'Invalid or expired invitation code.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to link patient.', 'error');
    } finally {
      setLinking(false);
    }
  };

  // Handle unlinking patient
  const handleUnlinkPatient = async (patientId, patientName) => {
    const confirmMsg = (t.caretakerDashboard?.unlinkConfirm || 'Are you sure you want to unlink from this patient?');
    if (!window.confirm(`${confirmMsg} (${patientName})`)) return;

    try {
      await caretakerPortalApi.unlinkPatient(patientId);
      showToast(`Unlinked from patient ${patientName}.`);
      loadData();
    } catch (e) {
      showToast('Failed to unlink patient.', 'error');
    }
  };

  // Open Acknowledge Modal
  const openAcknowledgeModal = (alert) => {
    setActiveAlertToAcknowledge(alert);
    setCaretakerNote(alert.caretaker_note || '');
  };

  // Submit Acknowledgement (Notice: does NOT alter patient dose state)
  const handleConfirmAcknowledge = async () => {
    if (!activeAlertToAcknowledge) return;
    setAcknowledging(true);

    try {
      const res = await caretakerPortalApi.acknowledgeAlert(activeAlertToAcknowledge.id, caretakerNote);
      if (res && res.success) {
        showToast('Alert acknowledged. Note saved.');
        setActiveAlertToAcknowledge(null);
        setCaretakerNote('');
        loadData();
      } else {
        showToast('Failed to acknowledge alert.', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Error acknowledging alert.', 'error');
    } finally {
      setAcknowledging(false);
    }
  };

  // View Patient Summary
  const handleViewPatientSummary = async (patientId) => {
    setLoadingSummary(true);
    try {
      const summary = await caretakerPortalApi.getPatientSummary(patientId);
      setSelectedPatientSummary(summary);
    } catch (e) {
      showToast('Failed to load patient summary: ' + (e.message || ''), 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  const unresolvedAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="caretaker-dashboard">
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                backgroundColor: '#f3e8ff',
                color: '#7e22ce',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              Caretaker Portal
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 6px 0' }}>
            {t.caretakerDashboard?.title || 'Caretaker Monitoring Center'}
          </h2>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.95rem', margin: 0 }}>
            {t.caretakerDashboard?.subtitle ||
              'Real-time medication adherence tracking, missed-dose escalations, and patient monitoring.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={loadData}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <IconRefresh size={16} />
            <span>Refresh Data</span>
          </button>
          <button
            type="button"
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            <IconLogOut size={16} color="#dc2626" />
            <span>{t.auth?.signOut || 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconUser size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              {patients.length}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', fontWeight: 600 }}>
              {t.caretakerDashboard?.linkedPatientsTitle || 'Linked Patients'}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              backgroundColor: unresolvedAlertsCount > 0 ? '#ffe4e6' : '#f0fdf4',
              color: unresolvedAlertsCount > 0 ? '#e11d48' : '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconAlertCircle size={26} />
          </div>
          <div>
            <div
              style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                color: unresolvedAlertsCount > 0 ? '#e11d48' : 'var(--text-main, #0f172a)'
              }}
            >
              {unresolvedAlertsCount}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', fontWeight: 600 }}>
              {t.caretakerDashboard?.unresolvedAlertsCount || 'Unresolved Alerts'}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              backgroundColor: '#f3e8ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconPill size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              {patients.reduce((acc, p) => acc + (p.activeMedicinesCount || 0), 0)}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', fontWeight: 600 }}>
              Monitored Medications
            </div>
          </div>
        </div>
      </div>

      {/* Link a New Patient Section */}
      <section className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main, #0f172a)' }}>
          {t.caretakerDashboard?.linkPatientCardTitle || 'Connect a Patient'}
        </h3>
        <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.88rem', margin: '0 0 16px 0' }}>
          {t.caretakerDashboard?.linkPatientDesc ||
            'Enter the 48-hour secure invitation code generated by the patient to link their medication schedule.'}
        </p>

        <form
          onSubmit={handleLinkPatient}
          style={{ display: 'flex', gap: '12px', maxWidth: '520px', flexWrap: 'wrap' }}
        >
          <input
            type="text"
            className="input-field"
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
            placeholder={t.caretakerDashboard?.inviteCodePlaceholder || 'Enter code (e.g. CARE-123456)'}
            style={{ flex: 1, minWidth: '220px', letterSpacing: '0.05em', fontWeight: 700 }}
            maxLength={16}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={linking || !inviteCodeInput.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {linking ? 'Linking...' : t.caretakerDashboard?.linkPatientBtn || 'Link Patient'}
          </button>
        </form>
      </section>

      {/* Linked Patients List */}
      <section className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
            {t.caretakerDashboard?.linkedPatientsTitle || 'Linked Patients'} ({patients.length})
          </h3>
        </div>

        {patients.length === 0 ? (
          <div
            style={{
              padding: '36px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-subtle, #f8fafc)',
              borderRadius: '12px',
              border: '1px dashed var(--border-light, #cbd5e1)'
            }}
          >
            <p style={{ color: 'var(--text-muted, #64748b)', margin: 0 }}>
              {t.caretakerDashboard?.noPatients || 'No patients linked yet. Enter an invitation code above.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {patients.map((p) => (
              <div
                key={p.patientId || p.patient_id}
                style={{
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '14px',
                  padding: '20px',
                  backgroundColor: 'var(--bg-subtle, #f8fafc)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                        {p.name || p.patient_name}
                      </h4>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>{p.email || p.patient_email}</span>
                    </div>

                    {p.unresolvedAlertsCount > 0 ? (
                      <span
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {p.unresolvedAlertsCount} Alert{p.unresolvedAlertsCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#f0fdf4',
                          color: '#16a34a',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        All Good
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', marginBottom: '16px', lineHeight: 1.6 }}>
                    <div>Active Medicines: <strong>{p.activeMedicinesCount || p.medicinesCount || '3'}</strong></div>
                    <div>Linked Since: <strong>{new Date(p.linkedAt || p.linked_at || Date.now()).toLocaleDateString()}</strong></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-light, #e2e8f0)', paddingTop: '14px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewPatientSummary(p.patientId || p.patient_id)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    View Schedule
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleUnlinkPatient(p.patientId || p.patient_id, p.name || p.patient_name)}
                    style={{ justifyContent: 'center' }}
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Missed-Dose Alerts Monitor Section */}
      <section className="card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main, #0f172a)' }}>
              {t.caretakerDashboard?.alertsMonitorTitle || 'Missed-Dose Alerts & Escalations'}
            </h3>
            <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.88rem', margin: 0 }}>
              Audit-safe alert log. Acknowledging an alert records caregiver awareness and does not modify patient dose states.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter('all')}
            >
              {t.caretakerDashboard?.filterAll || 'All Alerts'}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filter === 'unresolved' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter('unresolved')}
            >
              {t.caretakerDashboard?.filterUnresolved || 'Unresolved'}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filter === 'acknowledged' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter('acknowledged')}
            >
              {t.caretakerDashboard?.filterAcknowledged || 'Acknowledged'}
            </button>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div
            style={{
              padding: '36px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-subtle, #f8fafc)',
              borderRadius: '12px'
            }}
          >
            <p style={{ color: 'var(--text-muted, #64748b)', margin: 0 }}>
              No alerts match the selected filter.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.map((alt) => (
              <div
                key={alt.id}
                style={{
                  border: alt.acknowledged ? '1px solid var(--border-light, #e2e8f0)' : '2px solid #fca5a5',
                  backgroundColor: alt.acknowledged ? '#ffffff' : '#fff5f5',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        backgroundColor: alt.acknowledged ? '#f1f5f9' : '#fee2e2',
                        color: alt.acknowledged ? '#475569' : '#dc2626',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      {alt.acknowledged
                        ? (t.caretakerDashboard?.acknowledgedBadge || 'Acknowledged')
                        : (t.caretakerDashboard?.actionRequiredBadge || 'Action Required')}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                      Patient: {alt.patient_name}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                      ({alt.scheduled_date} at {alt.scheduled_time})
                    </span>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main, #0f172a)', marginBottom: '4px' }}>
                    {alt.medicine_name}
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #475569)' }}>
                    {alt.reason}
                  </div>

                  {alt.acknowledged && alt.caretaker_note && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        borderLeft: '3px solid #0d9488',
                        fontSize: '0.82rem',
                        color: '#334155'
                      }}
                    >
                      <strong>Caregiver Note:</strong> {alt.caretaker_note}
                    </div>
                  )}
                </div>

                <div>
                  {!alt.acknowledged ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openAcknowledgeModal(alt)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {t.caretakerDashboard?.acknowledgeAction || 'Acknowledge Alert'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openAcknowledgeModal(alt)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Edit Note
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Acknowledge Alert Modal */}
      {activeAlertToAcknowledge && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                {t.caretakerDashboard?.modalTitle || 'Acknowledge Missed Dose Alert'}
              </h3>
              <button
                type="button"
                className="btn-icon-only"
                onClick={() => setActiveAlertToAcknowledge(null)}
              >
                <IconX size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.5, marginBottom: '16px' }}>
              {t.caretakerDashboard?.modalDesc ||
                "Record your review of this missed dose. Acknowledging verifies caregiver awareness and does NOT alter the patient's dose record."}
            </p>

            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '18px',
                fontSize: '0.85rem'
              }}
            >
              <div><strong>Patient:</strong> {activeAlertToAcknowledge.patient_name}</div>
              <div><strong>Medicine:</strong> {activeAlertToAcknowledge.medicine_name}</div>
              <div><strong>Scheduled:</strong> {activeAlertToAcknowledge.scheduled_date} at {activeAlertToAcknowledge.scheduled_time}</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  marginBottom: '6px',
                  color: 'var(--text-main, #0f172a)'
                }}
              >
                {t.caretakerDashboard?.noteLabel || 'Caregiver Note / Action Taken'}
              </label>
              <textarea
                className="input-field"
                rows={4}
                value={caretakerNote}
                onChange={(e) => setCaretakerNote(e.target.value)}
                placeholder={t.caretakerDashboard?.notePlaceholder || 'e.g. Spoke with patient on phone, confirmed they woke up late and took the dose with breakfast.'}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveAlertToAcknowledge(null)}
              >
                {t.caretakerDashboard?.cancelBtn || 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmAcknowledge}
                disabled={acknowledging}
              >
                {acknowledging ? 'Saving...' : t.caretakerDashboard?.confirmAcknowledgeBtn || 'Save & Acknowledge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Summary Modal */}
      {selectedPatientSummary && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  {selectedPatientSummary.patient?.name}'s Medication Schedule
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                  {selectedPatientSummary.patient?.email}
                </span>
              </div>
              <button
                type="button"
                className="btn-icon-only"
                onClick={() => setSelectedPatientSummary(null)}
              >
                <IconX size={20} />
              </button>
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '16px 0 8px 0' }}>
              Today's Doses
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {selectedPatientSummary.todayDoses?.map((d) => (
                <div
                  key={d.id || d.occurrence_id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: d.status === 'taken' ? '#f0fdf4' : d.status === 'missed' ? '#fff1f2' : '#ffffff'
                  }}
                >
                  <div>
                    <strong>{d.medicine_name || d.medicineName}</strong> ({d.dosage})
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                      Scheduled: {d.scheduled_time || d.scheduledTime}
                    </div>
                  </div>
                  <span
                    style={{
                      textTransform: 'uppercase',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: d.status === 'taken' ? '#dcfce7' : d.status === 'missed' ? '#ffe4e6' : '#e0f2fe',
                      color: d.status === 'taken' ? '#15803d' : d.status === 'missed' ? '#be123c' : '#0369a1'
                    }}
                  >
                    {d.status}
                  </span>
                </div>
              ))}
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '16px 0 8px 0' }}>
              Active Medications ({selectedPatientSummary.medicines?.length || 0})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {selectedPatientSummary.medicines?.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    fontSize: '0.88rem'
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{m.name} ({m.dosage_amount} {m.dosage_unit})</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #475569)' }}>
                    Doctor: {m.doctor_name || 'N/A'} • Notes: {m.notes || 'None'}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedPatientSummary(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
