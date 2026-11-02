import React from 'react';
import {
  IconDashboard,
  IconPlus,
  IconPill,
  IconCheckCircle,
  IconXCircle,
  IconHistory,
  IconReports,
  IconCaretaker,
  IconSettings,
  IconHeartPulse,
  IconX,
  IconLogOut
} from './Icons';
import { useApp } from '../context/AppContext';

export const Sidebar = () => {
  const { user, activePage, setActivePage, mobileMenuOpen, setMobileMenuOpen, t, logout } = useApp();

  const isCaretaker = user?.role === 'caretaker';

  const navItems = isCaretaker
    ? [
        { id: 'dashboard', label: t.caretakerDashboard?.title || 'Caretaker Center', icon: <IconDashboard size={20} /> },
        { id: 'caretaker', label: t.nav.caretaker, icon: <IconCaretaker size={20} /> },
        { id: 'settings', label: t.nav.settings, icon: <IconSettings size={20} /> }
      ]
    : [
        { id: 'dashboard', label: t.nav.dashboard, icon: <IconDashboard size={20} /> },
        { id: 'addMedicine', label: t.nav.addMedicine, icon: <IconPlus size={20} /> },
        { id: 'myMedicines', label: t.nav.myMedicines, icon: <IconPill size={20} /> },
        { id: 'medicineTaken', label: t.nav.medicineTaken, icon: <IconCheckCircle size={20} /> },
        { id: 'medicineMissed', label: t.nav.medicineMissed, icon: <IconXCircle size={20} /> },
        { id: 'medicineHistory', label: t.nav.medicineHistory, icon: <IconHistory size={20} /> },
        { id: 'reports', label: t.nav.reports, icon: <IconReports size={20} /> },
        { id: 'caretaker', label: t.nav.caretaker, icon: <IconCaretaker size={20} /> },
        { id: 'settings', label: t.nav.settings, icon: <IconSettings size={20} /> }
      ];

  const handleNavClick = (id) => {
    setActivePage(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 998,
            transition: 'opacity 0.2s'
          }}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 999,
          backgroundColor: '#ffffff',
          borderRight: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: mobileMenuOpen
            ? 'translateX(0)'
            : 'translateX(0)' /* Handled by media query below */
        }}
        className={`sidebar ${mobileMenuOpen ? 'open-mobile' : ''}`}
      >
        {/* Brand / Logo Area */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 8px rgba(13, 148, 136, 0.3)'
              }}
            >
              <IconHeartPulse size={24} color="#ffffff" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em'
                }}
              >
                {t.appName}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--primary-700)',
                  fontWeight: 600,
                  letterSpacing: '0.02em'
                }}
              >
                {t.appSubtitle}
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            style={{
              display: 'none',
              padding: '6px',
              color: 'var(--text-muted)'
            }}
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  backgroundColor: isActive
                    ? 'var(--primary-600)'
                    : 'transparent',
                  boxShadow: isActive
                    ? '0 2px 6px rgba(13, 148, 136, 0.35)'
                    : 'none',
                  transition: 'var(--transition)',
                  textAlign: 'left'
                }}
                className={`nav-item-btn ${isActive ? 'active' : ''}`}
              >
                <span
                  style={{
                    color: isActive ? '#ffffff' : 'var(--primary-600)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* User Account & Direct Logout Section (Phase 10) */}
        {user && (
          <div
            style={{
              padding: '14px 16px',
              borderTop: '1px solid var(--border-light)',
              backgroundColor: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: isCaretaker ? '#9333ea' : 'var(--primary-600)',
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
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                >
                  {user.name || user.email?.split('@')[0]}
                </div>
                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: isCaretaker ? '#7e22ce' : '#0369a1'
                  }}
                >
                  {isCaretaker ? (t.roles?.caretaker || 'Caretaker') : (t.roles?.patient || 'Patient')}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="sidebar-logout-btn"
            >
              <IconLogOut size={16} color="#dc2626" />
              <span>{t.auth?.signOut || 'Sign Out'}</span>
            </button>
          </div>
        )}

        {/* Footer info tag */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-main)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>
            Smart Medical Reminder
          </div>
          <div>v1.0 • Multilingual Patient Care</div>
        </div>
      </aside>

      {/* Responsive Sidebar CSS helper */}
      <style>{`
        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%) !important;
          }
          .sidebar.open-mobile {
            transform: translateX(0) !important;
          }
          .mobile-close-btn {
            display: inline-flex !important;
          }
        }
        .nav-item-btn:hover:not(.active) {
          background-color: var(--primary-50) !important;
          color: var(--primary-700) !important;
        }
      `}</style>
    </>
  );
};
