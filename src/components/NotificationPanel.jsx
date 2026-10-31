import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from './StatusBadge';
import {
  IconAlertCircle,
  IconCheckCircle,
  IconClock,
  IconX,
  IconRefresh,
  IconPill,
  IconInfo,
  IconCaretaker
} from './Icons';
import { formatDisplayDate, formatTime12h } from '../utils/dateUtils';
import { caretakerAlertService } from '../services/caretakerAlertService';

export const NotificationPanel = ({ isOpen, onClose }) => {
  const { t, caretakerAlerts, refreshAlerts, showToast, setActivePage } = useApp();
  const [filter, setFilter] = useState('all'); // all, failed, missed, snooze, stock

  const np = t.notificationPanel;

  const filteredAlerts = useMemo(() => {
    return (caretakerAlerts || []).filter((a) => {
      if (filter === 'failed') {
        return ['failed', 'provider_not_configured', 'backend_offline'].includes(a.status);
      }
      if (filter === 'missed') {
        return a.alertType === 'missed_dose';
      }
      if (filter === 'snooze') {
        return a.alertType === 'snooze_limit';
      }
      if (filter === 'stock') {
        return a.alertType === 'low_stock';
      }
      return true;
    });
  }, [caretakerAlerts, filter]);

  if (!isOpen) return null;

  const handleRetry = async (alertId) => {
    showToast(t.common.loading || 'Retrying notification delivery...');
    const result = await caretakerAlertService.retryAlert(alertId);
    if (result && result.success) {
      showToast(t.caretakerPage.testSuccess || 'Notification successfully delivered!');
    } else {
      showToast(result?.error || np.statuses.providerNotConfigured, 'warning');
    }
    refreshAlerts();
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: np.statuses.delivered };
      case 'delivered_in_app':
        return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: np.statuses.deliveredInApp };
      case 'provider_not_configured':
        return { bg: '#fef3c7', color: '#d97706', border: '#fde68a', label: np.statuses.providerNotConfigured };
      case 'quiet_hours_held':
        return { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff', label: np.statuses.quietHoursHeld };
      case 'disabled_by_user':
        return { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: np.statuses.disabledByUser };
      case 'failed':
      case 'backend_offline':
      default:
        return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: np.statuses.deliveryFailed };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.18)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.25s ease-out'
      }}
      role="dialog"
      aria-label="Caretaker Alerts Panel"
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-main)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconAlertCircle size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {np.title}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {np.recordedEvents.replace('{count}', String(caretakerAlerts.length))}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            color: 'var(--text-muted)'
          }}
          aria-label={t.common.close}
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Advisory Callout */}
      <div style={{ padding: '12px 20px', backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: '0.82rem', color: '#1e40af', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <IconInfo size={16} color="#2563eb" style={{ flexShrink: 0 }} />
        <span>{np.advisoryNotice}</span>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '10px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-light)',
          overflowX: 'auto'
        }}
      >
        {[
          { id: 'all', label: np.filterAll.replace('{count}', String(caretakerAlerts.length)) },
          { id: 'failed', label: np.filterFailed },
          { id: 'missed', label: np.filterMissed },
          { id: 'snooze', label: np.filterSnooze },
          { id: 'stock', label: np.filterStock }
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            style={{
              padding: '4px 10px',
              borderRadius: '16px',
              border: filter === f.id ? '1px solid var(--primary-600)' : '1px solid var(--border-light)',
              backgroundColor: filter === f.id ? 'var(--primary-50)' : '#ffffff',
              color: filter === f.id ? 'var(--primary-700)' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: filter === f.id ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredAlerts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <IconCheckCircle size={36} color="#059669" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
              {caretakerAlerts.length === 0 ? np.noAlerts : np.noMatching}
            </h4>
            <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>{np.noAlertsDesc}</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const badge = getStatusBadgeStyle(alert.status);
            const isRetryEligible = ['failed', 'provider_not_configured', 'backend_offline'].includes(alert.status);

            return (
              <div
                key={alert.id}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (alert.alertType === 'missed_dose') {
                          setActivePage('medicineMissed');
                        } else {
                          setActivePage('myMedicines');
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.94rem',
                        fontWeight: 800,
                        color: 'var(--primary-700)',
                        textDecoration: 'underline'
                      }}
                      title="View medicine details"
                    >
                      {alert.medicineName}
                    </button>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      {np.scheduledLabel
                        .replace('{time}', alert.scheduledTime || 'N/A')
                        .replace('{date}', alert.scheduledDate || 'Today')}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {alert.reason}
                </div>

                {alert.errorMessage && (
                  <div style={{ fontSize: '0.78rem', color: '#991b1b', backgroundColor: '#fef2f2', padding: '6px 8px', borderRadius: '6px' }}>
                    {alert.errorMessage}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{np.channelLabel.replace('{channel}', (alert.channel || 'email').toUpperCase())}</span>
                  <span>{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {isRetryEligible && (
                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRetry(alert.id)}
                      style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                    >
                      <IconRefresh size={13} />
                      <span>{np.btnRetry}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Footer with Direct Links */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-main)',
          display: 'flex',
          gap: '12px'
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          style={{ flex: 1, fontSize: '0.88rem', justifyContent: 'center' }}
          onClick={() => {
            onClose();
            setActivePage('myMedicines');
          }}
        >
          <IconPill size={16} />
          <span>{np.btnMedicines}</span>
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1, fontSize: '0.88rem', justifyContent: 'center' }}
          onClick={() => {
            onClose();
            setActivePage('caretaker');
          }}
        >
          <IconCaretaker size={16} />
          <span>{np.btnCaretaker}</span>
        </button>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
