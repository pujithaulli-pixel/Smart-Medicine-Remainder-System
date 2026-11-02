import React, { useState, useRef, useEffect } from 'react';
import {
  IconMenu,
  IconBell,
  IconUser,
  IconGlobe,
  IconCalendar,
  IconCheckCircle,
  IconAlertCircle,
  IconClock,
  IconLogOut
} from './Icons';
import { useApp } from '../context/AppContext';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';

export const Header = () => {
  const {
    activePage,
    setActivePage,
    language,
    setLanguage,
    setMobileMenuOpen,
    t,
    todayDoses,
    activityLog,
    caretakerAlerts,
    setIsNotificationPanelOpen,
    user,
    setAuthModalOpen,
    setAuthMode,
    setProfileModalOpen,
    logout
  } = useApp();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return user?.role === 'caretaker' ? (t.caretakerDashboard?.title || 'Caretaker Center') : t.nav.dashboard;
      case 'addMedicine':
        return t.nav.addMedicine;
      case 'myMedicines':
        return t.nav.myMedicines;
      case 'medicineTaken':
        return t.nav.medicineTaken;
      case 'medicineMissed':
        return t.nav.medicineMissed;
      case 'medicineHistory':
        return t.nav.medicineHistory;
      case 'reports':
        return t.nav.reports;
      case 'caretaker':
        return t.nav.caretaker;
      case 'settings':
        return t.nav.settings;
      default:
        return t.appName;
    }
  };

  const todayStr = getTodayDateString();
  const formattedDate = formatDisplayDate(todayStr, language);

  // Calculate pending / due doses count and total notification alerts
  const pendingCount = todayDoses.filter(
    (d) => d.status === 'due' || d.status === 'upcoming'
  ).length;
  const totalBadgeCount = pendingCount + (caretakerAlerts ? caretakerAlerts.length : 0);

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      {/* Left: Mobile hamburger & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="btn-icon-only mobile-hamburger"
          aria-label="Open navigation menu"
          style={{
            display: 'none',
            color: 'var(--text-main)',
            borderRadius: '8px'
          }}
        >
          <IconMenu size={22} />
        </button>

        <div>
          <h1
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.01em',
              margin: 0
            }}
          >
            {getPageTitle()}
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              marginTop: '1px'
            }}
            className="header-date-badge"
          >
            <IconCalendar size={13} color="var(--primary-600)" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Right Controls: Language Selector, Notifications, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Language Selector Dropdown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '10px',
            padding: '4px 8px',
            border: '1px solid var(--border-light)'
          }}
        >
          <IconGlobe size={18} color="var(--primary-700)" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={t.header.languageLabel}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '4px 6px'
            }}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="te">తెలుగు</option>
          </select>
        </div>

        {/* Notifications Icon & Popover */}
        <div style={{ position: 'relative' }} ref={notificationRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="btn-icon-only"
            aria-label="Notifications"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              position: 'relative',
              borderRadius: '10px'
            }}
          >
            <IconBell size={20} color="var(--text-secondary)" />
            {totalBadgeCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {totalBadgeCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notificationsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '320px',
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                border: '1px solid var(--border-light)',
                padding: '16px',
                zIndex: 1000
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '10px',
                  marginBottom: '10px'
                }}
              >
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                  {t.header.notificationsTitle}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    setIsNotificationPanelOpen(true);
                  }}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--primary-700)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px'
                  }}
                >
                  {(t.header.openDrawer || 'Open Drawer ({count})').replace('{count}', String(caretakerAlerts ? caretakerAlerts.length : 0))}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {todayDoses
                  .filter((d) => d.status === 'due' || d.status === 'upcoming')
                  .slice(0, 4)
                  .map((dose) => (
                    <div
                      key={dose.id}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: dose.status === 'due' ? 'var(--status-due-bg)' : 'var(--bg-main)',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {dose.medicineName} ({dose.dosage})
                      </div>
                      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <IconClock size={12} />
                        <span>{(t.reminderModal.scheduledLabel || 'Scheduled: {time}').replace('{time}', dose.scheduledTime)}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 600, color: dose.status === 'due' ? '#92400e' : '#1e40af' }}>
                          {dose.status === 'due' ? (t.header.dueNowTag || 'Due Now') : (t.header.upcomingTag || 'Upcoming')}
                        </span>
                      </div>
                    </div>
                  ))}

                {pendingCount === 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    {t.header.noNewAlerts}
                  </div>
                )}
              </div>

              {/* Phase 5: Quick Link to Caretaker Alerts Drawer & Management */}
              <div
                style={{
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '10px',
                  marginTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: '0.78rem', justifyContent: 'center' }}
                  onClick={() => {
                    setNotificationsOpen(false);
                    setIsNotificationPanelOpen(true);
                  }}
                >
                  {t.header.alertDrawer || 'Alert Drawer'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, fontSize: '0.78rem', justifyContent: 'center' }}
                  onClick={() => {
                    setNotificationsOpen(false);
                    setActivePage('caretaker');
                  }}
                >
                  {t.header.caretakerPage || 'Caretaker Page'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Auth Area & Direct Logout Button */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              aria-label={t.auth?.myAccount || 'My Account'}
              title="View Profile & Settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 12px 4px 6px',
                borderRadius: '24px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: user.role === 'caretaker' ? '#9333ea' : 'var(--primary-600)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  flexShrink: 0
                }}
              >
                {(user.name ? user.name.charAt(0) : user.email?.charAt(0) || 'U').toUpperCase()}
              </div>
              <div className="header-user-text" style={{ fontSize: '0.88rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{user.name || user.email?.split('@')[0]}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: user.role === 'caretaker' ? '#f3e8ff' : '#e0f2fe',
                      color: user.role === 'caretaker' ? '#7e22ce' : '#0369a1'
                    }}
                  >
                    {user.role === 'caretaker' ? (t.roles?.caretaker || 'Caretaker') : (t.roles?.patient || 'Patient')}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {t.auth?.myAccount || 'My Account'}
                </div>
              </div>
            </button>

            {/* Direct Logout / Sign Out Button */}
            <button
              type="button"
              onClick={logout}
              aria-label={t.auth?.signOut || 'Log Out'}
              title={t.auth?.signOut || 'Log Out'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '10px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <IconLogOut size={16} color="#dc2626" />
              <span>{t.auth?.signOut || 'Sign Out'}</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
              style={{
                borderRadius: '20px',
                padding: '6px 14px',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <IconUser width={16} height={16} />
              <span>{t.auth?.signIn || 'Sign In'}</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .mobile-hamburger {
            display: inline-flex !important;
          }
        }
        @media (max-width: 640px) {
          .header-date-badge {
            display: none !important;
          }
          .header-user-text {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
