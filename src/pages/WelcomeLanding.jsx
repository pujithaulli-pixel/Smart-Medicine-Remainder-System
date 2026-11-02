import React from 'react';
import { useApp } from '../context/AppContext';
import {
  IconHeartPulse,
  IconClock,
  IconShield,
  IconCheckCircle,
  IconAlertCircle,
  IconCaretaker,
  IconUser,
  IconPill,
  IconGlobe
} from '../components/Icons';

export const WelcomeLanding = () => {
  const { t, language, setLanguage, setAuthModalOpen, setAuthMode, loginWithCredentials, showToast } = useApp();

  const handleDemoPatient = async () => {
    showToast('Signing in as Demo Patient (Ramesh Patel)...', 'info');
    try {
      const res = await loginWithCredentials('demo.patient@smartreminder.org', 'DemoPatient123!');
      if (res && res.success) {
        showToast('Signed in as Demo Patient! Welcome back.', 'success');
      } else {
        showToast(res?.error || 'Failed to sign in as Demo Patient.', 'error');
      }
    } catch (e) {
      showToast('Error signing in to demo account.', 'error');
    }
  };

  const handleDemoCaretaker = async () => {
    showToast('Signing in as Demo Caretaker (Sunita Patel)...', 'info');
    try {
      const res = await loginWithCredentials('demo.caretaker@smartreminder.org', 'DemoCaretaker123!');
      if (res && res.success) {
        showToast('Signed in as Demo Caretaker! Accessing Caretaker Center.', 'success');
      } else {
        showToast(res?.error || 'Failed to sign in as Demo Caretaker.', 'error');
      }
    } catch (e) {
      showToast('Error signing in to demo account.', 'error');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main, #f8fafc)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit'
      }}
    >
      {/* Public Navigation Header */}
      <header
        style={{
          height: '70px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-light, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary-600, #0d9488), var(--primary-800, #115e59))',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)'
            }}
          >
            <IconHeartPulse size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              {t.appName}
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: 0, fontWeight: 500 }}>
              {t.appSubtitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Language Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-subtle, #f1f5f9)',
              borderRadius: '10px',
              padding: '4px 10px',
              border: '1px solid var(--border-light, #e2e8f0)'
            }}
          >
            <IconGlobe size={18} color="var(--primary-700, #0f766e)" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Language"
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--text-main, #0f172a)',
                cursor: 'pointer'
              }}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setAuthMode('login');
              setAuthModalOpen(true);
            }}
            style={{ padding: '8px 20px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            {t.welcome?.openSignInModal || 'Sign In / Register'}
          </button>
        </div>
      </header>

      {/* Main Welcome Hero Content */}
      <main style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--primary-50, #f0fdfa)',
              border: '1px solid var(--primary-200, #99f6e4)',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--primary-800, #115e59)',
              marginBottom: '18px'
            }}
          >
            <IconShield size={16} />
            <span>{t.welcome?.privacyNotice || 'Secure & Private Medical Care Platform'}</span>
          </div>

          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: 'var(--text-main, #0f172a)',
              lineHeight: 1.25,
              marginBottom: '16px',
              letterSpacing: '-0.02em'
            }}
          >
            {t.welcome?.headline || 'Never Miss a Dose, Stay Connected with Family'}
          </h2>

          <p
            style={{
              fontSize: '1.15rem',
              color: 'var(--text-secondary, #475569)',
              maxWidth: '740px',
              margin: '0 auto 32px auto',
              lineHeight: 1.6
            }}
          >
            {t.welcome?.subheadline ||
              'Simple, reliable medication reminders with separate, dedicated patient and caretaker experiences.'}
          </p>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => {
              setAuthMode('login');
              setAuthModalOpen(true);
            }}
            style={{
              padding: '14px 36px',
              fontSize: '1.1rem',
              fontWeight: 800,
              boxShadow: '0 8px 20px rgba(13, 148, 136, 0.35)',
              borderRadius: '12px'
            }}
          >
            {t.welcome?.signInPrompt || 'Sign In to Access Your Dashboard'}
          </button>
        </div>

        {/* Phase 10: Instant Demo Accounts Evaluation Card */}
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '2px solid var(--primary-200, #99f6e4)',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            padding: '36px',
            marginBottom: '48px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span
              style={{
                textTransform: 'uppercase',
                fontSize: '0.8rem',
                fontWeight: 800,
                color: 'var(--primary-700, #0f766e)',
                letterSpacing: '0.08em'
              }}
            >
              Instant Access
            </span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '6px 0' }}>
              {t.welcome?.demoSectionTitle || 'Explore with Instant Demo Accounts'}
            </h3>
            <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.95rem', margin: 0 }}>
              Select a role below to immediately evaluate the system with realistic pre-configured data.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Demo Patient Card */}
            <div
              style={{
                border: '1px solid var(--border-light, #e2e8f0)',
                borderRadius: '16px',
                padding: '28px',
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <IconUser size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {t.welcome?.demoPatientBtn || 'Demo Patient'}
                    </h4>
                    <span style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: 600 }}>
                      Ramesh Patel (demo.patient@smartreminder.org)
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.5, marginBottom: '20px' }}>
                  {t.welcome?.demoPatientSubtitle ||
                    'Today schedule, 3 snooze alarms, Taken/Skip actions, and caretaker invite code generation.'}
                </p>

                <ul style={{ paddingLeft: '20px', margin: '0 0 24px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.7 }}>
                  <li>Pre-configured medicines (Metformin, Amlodipine, Atorvastatin)</li>
                  <li>Real-time audio alarms and snooze state machine</li>
                  <li>Adherence reports and caretaker invitation codes</li>
                </ul>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDemoPatient}
                style={{ width: '100%', padding: '12px', fontWeight: 800, fontSize: '1rem', justifyContent: 'center' }}
              >
                Log In as Patient
              </button>
            </div>

            {/* Demo Caretaker Card */}
            <div
              style={{
                border: '1px solid var(--border-light, #e2e8f0)',
                borderRadius: '16px',
                padding: '28px',
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: '#f3e8ff',
                      color: '#9333ea',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <IconCaretaker size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {t.welcome?.demoCaretakerBtn || 'Demo Caretaker'}
                    </h4>
                    <span style={{ fontSize: '0.82rem', color: '#7e22ce', fontWeight: 600 }}>
                      Sunita Patel (demo.caretaker@smartreminder.org)
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.5, marginBottom: '20px' }}>
                  {t.welcome?.demoCaretakerSubtitle ||
                    'Linked patient adherence monitor, missed-dose escalation portal, and alert notes.'}
                </p>

                <ul style={{ paddingLeft: '20px', margin: '0 0 24px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.7 }}>
                  <li>Linked to Patient Ramesh Patel</li>
                  <li>Real-time Missed-Dose Alerts monitoring with filter options</li>
                  <li>Alert acknowledgement without modifying medical records</li>
                </ul>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDemoCaretaker}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  justifyContent: 'center',
                  borderColor: '#9333ea',
                  color: '#7e22ce',
                  backgroundColor: '#faf5ff'
                }}
              >
                Log In as Caretaker
              </button>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light, #e2e8f0)' }}>
            <div style={{ color: 'var(--primary-600, #0d9488)', marginBottom: '12px' }}>
              <IconPill size={30} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main, #0f172a)' }}>
              Precise Medicine Tracking
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #475569)', margin: 0, lineHeight: 1.5 }}>
              Track tablets, syrups, drops, and injections with customizable schedules, meal timings, and dosage guidelines.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light, #e2e8f0)' }}>
            <div style={{ color: '#f59e0b', marginBottom: '12px' }}>
              <IconClock size={30} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main, #0f172a)' }}>
              Smart Alarms & 3 Snoozes
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #475569)', margin: 0, lineHeight: 1.5 }}>
              Audible chimes and 10-minute snoozes ensure doses are never forgotten, with 5-minute grace period enforcement.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light, #e2e8f0)' }}>
            <div style={{ color: '#0284c7', marginBottom: '12px' }}>
              <IconCaretaker size={30} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main, #0f172a)' }}>
              Family & Caretaker Safety
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #475569)', margin: 0, lineHeight: 1.5 }}>
              Immediate alerts dispatched to family members or caregivers when doses are missed or medication stocks run low.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-light, #e2e8f0)',
          padding: '24px 32px',
          backgroundColor: '#ffffff',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted, #64748b)'
        }}
      >
        <span>Smart Medical Reminder System — Phase 10 | English • हिन्दी • తెలుగు</span>
      </footer>
    </div>
  );
};
