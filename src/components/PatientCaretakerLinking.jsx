import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  IconCaretaker,
  IconCheck,
  IconClock,
  IconShield,
  IconX,
  IconCopy,
  IconPlus,
  IconAlertCircle
} from './Icons';
import { patientPortalApi } from '../services/apiService';

export const PatientCaretakerLinking = () => {
  const { t, showToast } = useApp();

  const [invitations, setInvitations] = useState([]);
  const [caretakers, setCaretakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invs, crts] = await Promise.all([
        patientPortalApi.getInvitations().catch(() => []),
        patientPortalApi.getLinkedCaretakers().catch(() => [])
      ]);
      setInvitations(invs || []);
      setCaretakers(crts || []);
    } catch (e) {
      console.warn('Failed to load patient-caretaker connection data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const inv = await patientPortalApi.createInvitation({
        viewSchedule: true,
        viewHistory: true,
        receiveAlerts: true
      });
      showToast('New invitation code generated! Valid for 48 hours.', 'success');
      loadData();
    } catch (e) {
      showToast(e.message || 'Failed to generate invitation code.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = (code, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedId(id);
      showToast(t.patientLinking?.copiedNotice || 'Code copied to clipboard!');
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const handleRevokeInvitation = async (id) => {
    try {
      await patientPortalApi.revokeInvitation(id);
      showToast('Invitation code cancelled.');
      loadData();
    } catch (e) {
      showToast('Failed to cancel invitation code.', 'error');
    }
  };

  const handleRevokeCaretaker = async (caretakerId, caretakerName) => {
    const confirmMsg = t.patientLinking?.revokeConfirm || 'Are you sure you want to revoke this caretaker\'s access?';
    if (!window.confirm(`${confirmMsg} (${caretakerName})`)) return;

    try {
      await patientPortalApi.unlinkCaretaker(caretakerId);
      showToast(`Revoked access for ${caretakerName}.`);
      loadData();
    } catch (e) {
      showToast('Failed to revoke caretaker access.', 'error');
    }
  };

  const activeInvitations = invitations.filter((inv) => inv.status === 'pending');

  return (
    <section className="card" style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <IconCaretaker size={20} color="var(--primary-700, #0f766e)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>
              {t.patientLinking?.cardTitle || 'Caretaker Connection & Family Sharing'}
            </h3>
          </div>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.88rem', margin: 0 }}>
            {t.patientLinking?.cardSubtitle ||
              'Grant trusted caregivers visibility into your medication schedule and missed-dose alerts.'}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerateCode}
          disabled={generating}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <IconPlus size={16} />
          <span>{generating ? 'Generating...' : t.patientLinking?.generateInviteBtn || 'Generate Invitation Code'}</span>
        </button>
      </div>

      {/* Active Invitation Codes List */}
      {activeInvitations.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-main, #0f172a)' }}>
            {t.patientLinking?.activeCodeLabel || 'Active Invitation Code (Valid for 48 Hours)'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeInvitations.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: '10px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.08em', color: '#0f766e' }}>
                    {inv.invitation_code}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#115e59' }}>
                    Expires: {new Date(inv.expires_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopyCode(inv.invitation_code, inv.id)}
                  >
                    {copiedId === inv.id ? (t.patientLinking?.copiedNotice || 'Copied!') : (t.patientLinking?.copyCodeBtn || 'Copy Code')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleRevokeInvitation(inv.id)}
                  >
                    {t.patientLinking?.revokeInviteBtn || 'Cancel'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Linked Caretakers */}
      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-main, #0f172a)' }}>
          {t.patientLinking?.activeCaretakersTitle || 'Connected Caretakers'} ({caretakers.length})
        </h4>

        {caretakers.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-subtle, #f8fafc)',
              borderRadius: '10px',
              border: '1px dashed var(--border-light, #cbd5e1)',
              fontSize: '0.88rem',
              color: 'var(--text-muted, #64748b)'
            }}
          >
            {t.patientLinking?.noCaretakersConnected || 'No caretakers connected yet. Share an invitation code above.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {caretakers.map((crt) => (
              <div
                key={crt.caretakerId || crt.caretaker_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '10px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main, #0f172a)' }}>
                    {crt.name || crt.caretaker_name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #475569)' }}>
                    {crt.email || crt.caretaker_email} • Connected since {new Date(crt.linkedAt || crt.linked_at || Date.now()).toLocaleDateString()}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleRevokeCaretaker(crt.caretakerId || crt.caretaker_id, crt.name || crt.caretaker_name)}
                >
                  {t.patientLinking?.revokeConnectionBtn || 'Revoke Access'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
