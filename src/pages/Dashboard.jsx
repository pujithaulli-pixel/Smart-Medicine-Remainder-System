import React from 'react';
import { useApp } from '../context/AppContext';
import { SummaryCard } from '../components/SummaryCard';
import { MedicineCard } from '../components/MedicineCard';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import {
  IconPill,
  IconCalendar,
  IconCheckCircle,
  IconXCircle,
  IconClock,
  IconPlus,
  IconHeartPulse,
  IconAlertCircle,
  IconShield,
  IconVolume,
  IconCheck,
  IconCaretaker
} from '../components/Icons';
import { formatDisplayDate, formatTime12h, getTodayDateString } from '../utils/dateUtils';
import { alarmSoundService } from '../services/alarmSoundService';

export const Dashboard = () => {
  const {
    t,
    language,
    medicines,
    todayDoses,
    dueDoses,
    openReminderModal,
    markDoseTaken,
    markDoseSkipped,
    snoozeDose,
    activityLog,
    setActivePage,
    preferences,
    showToast,
    caretaker,
    caretakerAlerts,
    setIsNotificationPanelOpen
  } = useApp();

  const handleTestChime = () => {
    alarmSoundService.testAlarm();
    showToast('Playing synthesized alarm chime test...');
  };

  const todayStr = getTodayDateString();
  const formattedToday = formatDisplayDate(todayStr, language);

  // Active medicines count (strictly status === 'active', excluding paused, completed, discontinued)
  const activeMedicines = medicines.filter((m) => m.status === 'active');
  const activeMedicinesCount = activeMedicines.length;
  const pausedMedicinesCount = medicines.filter((m) => m.status === 'paused').length;

  // Low stock medicines (active medications whose remaining quantity <= refill threshold)
  const lowStockMedicines = activeMedicines.filter((m) => {
    const remaining = m.remainingQuantity !== undefined ? m.remainingQuantity : (m.quantityRemaining || 0);
    const threshold = m.refillThreshold !== undefined ? m.refillThreshold : 5;
    return remaining <= threshold;
  });

  // Today's scheduled doses
  const totalDosesToday = todayDoses.length;
  const takenDosesToday = todayDoses.filter((d) => d.status === 'taken').length;
  const missedDosesToday = todayDoses.filter((d) => d.status === 'missed').length;
  const skippedDosesToday = todayDoses.filter((d) => d.status === 'skipped').length;
  const upcomingRemindersCount = todayDoses.filter(
    (d) => d.status === 'upcoming' || d.status === 'due' || d.status === 'snoozed'
  ).length;

  // Calculate adherence percentage strictly using eligible resolved doses (Requirement 5 & 9)
  const eligibleResolvedToday = takenDosesToday + missedDosesToday + skippedDosesToday;
  const adherencePercent =
    eligibleResolvedToday > 0 ? Math.round((takenDosesToday / eligibleResolvedToday) * 100) : null;
  const adherenceDisplay = adherencePercent !== null ? `${adherencePercent}%` : 'No data';

  // Upcoming reminders chronologically (filter out already taken or missed)
  const upcomingChronological = [...todayDoses]
    .filter((d) => d.status === 'upcoming' || d.status === 'due' || d.status === 'snoozed')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  // Phase 5: Caretaker & Notification Alert Metrics
  const isCaretakerAlertsActive = Boolean(caretaker?.alertsEnabled);
  const failedAlerts = (caretakerAlerts || []).filter((a) =>
    ['failed', 'provider_not_configured', 'backend_offline'].includes(a.status)
  );
  const recentCaretakerAlerts = (caretakerAlerts || []).slice(0, 3);

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* =========================================================================
          HIGH PRIORITY: DUE MEDICINE DOSES ALERT BANNER (Phase 3 Reminder Engine)
         ========================================================================= */}
      {dueDoses.length > 0 && (
        <section
          className="card"
          style={{
            backgroundColor: '#fff1f2',
            border: '2px solid #f43f5e',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 8px 24px rgba(244, 63, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#ffe4e6',
                border: '2px solid #f43f5e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <IconAlertCircle size={30} color="#e11d48" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#9f1239', margin: 0 }}>
                  {dueDoses.length === 1 ? '1 Medicine Dose is Due Right Now!' : `${dueDoses.length} Medicine Doses are Due Right Now!`}
                </h3>
                <span
                  style={{
                    backgroundColor: '#e11d48',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}
                >
                  ALARM ACTIVE
                </span>
              </div>
              <p style={{ fontSize: '0.92rem', color: '#881337', margin: 0 }}>
                {dueDoses.map((d) => `${d.medicineName} (${d.dosage})`).join(' • ')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => openReminderModal(dueDoses[0]?.id)}
              style={{
                backgroundColor: '#e11d48',
                borderColor: '#be123c',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
              }}
            >
              <IconClock size={18} />
              <span>Open Reminder Alarm</span>
            </button>
          </div>
        </section>
      )}

      {/* =========================================================================
          A. WELCOME SECTION
         ========================================================================= */}
      <section
        className="card welcome-card"
        style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 60%, #115e59 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 8px 20px rgba(13, 148, 136, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '12px'
            }}
          >
            <IconCalendar size={15} color="#ffffff" />
            <span>{formattedToday}</span>
          </div>
          <h2
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
              lineHeight: 1.25
            }}
          >
            {t.dashboard.welcomeTitle}
          </h2>
          <p
            style={{
              fontSize: '1.02rem',
              color: 'rgba(255, 255, 255, 0.92)',
              maxWidth: '680px',
              lineHeight: 1.6
            }}
          >
            {t.dashboard.welcomeMessage}
          </p>
          {preferences?.isTestMode && (
            <div
              style={{
                marginTop: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(254, 240, 138, 0.25)',
                border: '1px solid rgba(254, 240, 138, 0.5)',
                color: '#fef08a',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              ⚡ Accelerated Test Mode Active (15s Snooze / 20s Grace Period)
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
          <button
            type="button"
            className="btn btn-lg"
            onClick={() => setActivePage('addMedicine')}
            style={{
              backgroundColor: '#ffffff',
              color: 'var(--primary-700)',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              border: 'none',
              padding: '14px 24px',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            <IconPlus size={20} color="var(--primary-700)" />
            <span>{t.dashboard.quickAddBtn}</span>
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={handleTestChime}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '20px',
              padding: '6px 14px',
              width: '100%',
              justifyContent: 'center'
            }}
            title="Test synthesized Web Audio chime"
          >
            <IconVolume size={15} color="#ffffff" />
            <span>Test Alarm Sound</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          LOW STOCK ALERT SECTION (Phase 2 Integration)
         ========================================================================= */}
      {lowStockMedicines.length > 0 && (
        <section
          style={{
            backgroundColor: '#fef2f2',
            border: '1.5px solid #fecaca',
            borderRadius: '16px',
            padding: '20px 24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <IconAlertCircle size={22} color="#dc2626" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
              {t.dashboard.lowStockSection} ({lowStockMedicines.length})
            </h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#7f1d1d', marginBottom: '14px' }}>
            {t.dashboard.lowStockSubtitle}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {lowStockMedicines.map((med) => {
              const qty = med.remainingQuantity !== undefined ? med.remainingQuantity : (med.quantityRemaining || 0);
              const thresh = med.refillThreshold !== undefined ? med.refillThreshold : 5;
              return (
                <div
                  key={med.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #fca5a5',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <strong style={{ color: '#991b1b', fontSize: '0.95rem' }}>{med.name}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: 600 }}>
                    {qty} {med.quantityUnit || 'units'} {t.dashboard.remainingText} (Warning threshold: {thresh})
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '4px 10px', minHeight: '30px' }}
                    onClick={() => setActivePage('myMedicines')}
                  >
                    View in My Medicines
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          CARETAKER ALERT STATUS & NOTIFICATION WARNING BANNER (Phase 5 & 6)
         ========================================================================= */}
      {!isCaretakerAlertsActive ? (
        <section
          style={{
            backgroundColor: '#fef3c7',
            border: '1.5px solid #fde68a',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IconAlertCircle size={24} color="#d97706" />
            <div>
              <strong style={{ color: '#92400e', fontSize: '0.96rem' }}>
                {t.dashboard.caretakerSection?.bannerDisabledTitle || 'Caretaker Alerts are Currently Disabled'}
              </strong>
              <div style={{ fontSize: '0.84rem', color: '#b45309' }}>
                {(t.dashboard.caretakerSection?.bannerDisabledDesc || 'Missed dose notifications are paused and will not be dispatched to {name}.')
                  .replace('{name}', caretaker?.name || 'caretaker')}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActivePage('caretaker')}
            style={{ fontWeight: 700 }}
          >
            {t.dashboard.caretakerSection?.btnManage || 'Manage Caretaker Settings'}
          </button>
        </section>
      ) : failedAlerts.length > 0 ? (
        <section
          style={{
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fef08a',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IconAlertCircle size={24} color="#ca8a04" />
            <div>
              <strong style={{ color: '#854d0e', fontSize: '0.96rem' }}>
                {(t.dashboard.caretakerSection?.bannerIssuesTitle || '{count} Notification Delivery Issue(s) Pending Review')
                  .replace('{count}', String(failedAlerts.length))}
              </strong>
              <div style={{ fontSize: '0.84rem', color: '#a16207' }}>
                {t.dashboard.caretakerSection?.bannerIssuesDesc || 'External delivery credentials unconfigured or delivery failed. All alert records are safely preserved locally.'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsNotificationPanelOpen(true)}
              style={{ fontWeight: 700 }}
            >
              {t.dashboard.caretakerSection?.btnOpenDrawer || 'Open Alert Drawer'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActivePage('caretaker')}
              style={{ fontWeight: 700 }}
            >
              {t.dashboard.caretakerSection?.btnResolve || 'Resolve in Caretaker'}
            </button>
          </div>
        </section>
      ) : null}

      {/* =========================================================================
          B. SUMMARY CARDS
         ========================================================================= */}
      <section className="grid-4 summary-grid">
        <SummaryCard
          icon={<IconPill size={26} />}
          value={activeMedicinesCount}
          label={t.dashboard.stats.activeMedicines}
          accentColor="teal"
          subtext={pausedMedicinesCount > 0 ? `${pausedMedicinesCount} paused` : undefined}
          onClick={() => setActivePage('myMedicines')}
        />
        <SummaryCard
          icon={<IconCalendar size={26} />}
          value={totalDosesToday}
          label={t.dashboard.stats.scheduledToday}
          accentColor="purple"
        />
        <SummaryCard
          icon={<IconCheckCircle size={26} />}
          value={takenDosesToday}
          label={t.dashboard.stats.takenToday}
          accentColor="green"
          onClick={() => setActivePage('medicineTaken')}
        />
        <SummaryCard
          icon={<IconXCircle size={26} />}
          value={missedDosesToday}
          label={t.dashboard.stats.missedToday}
          accentColor="red"
          subtext={skippedDosesToday > 0 ? `${skippedDosesToday} skipped` : undefined}
          onClick={() => setActivePage('medicineMissed')}
        />
      </section>

      {/* Main Content Split: Schedule on left, Reminders & Activity on right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.1fr)',
          gap: '24px'
        }}
        className="dashboard-columns"
      >
        {/* =======================================================================
            C. TODAY'S MEDICINE SCHEDULE
           ======================================================================= */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {t.dashboard.scheduleSection}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {t.dashboard.scheduleSubtitle}
              </p>
            </div>
          </div>

          {todayDoses.length === 0 ? (
            <EmptyState
              title={t.dashboard.emptyScheduleTitle}
              description={t.dashboard.emptyScheduleDesc}
              actionLabel={t.dashboard.emptyScheduleBtn}
              onAction={() => setActivePage('addMedicine')}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {todayDoses.map((dose) => (
                <MedicineCard
                  key={dose.id}
                  dose={dose}
                  onTake={() => markDoseTaken(dose.id)}
                  onSkip={() => markDoseSkipped(dose.id)}
                  onSnooze={() => snoozeDose(dose.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Upcoming Reminders, Adherence, Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* =====================================================================
              F. ADHERENCE OVERVIEW
             ===================================================================== */}
          <section className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {t.dashboard.adherenceSection}
              </h4>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid #a7f3d0'
                }}
              >
                Today's Metrics
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {t.dashboard.adherenceSubtitle}
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                {adherenceDisplay}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {t.dashboard.adherenceRate}
              </span>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '12px',
                backgroundColor: 'var(--bg-muted)',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}
            >
              <div
                style={{
                  width: `${adherencePercent || 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary-500), var(--primary-700))',
                  borderRadius: '6px',
                  transition: 'width 0.4s ease-in-out'
                }}
              />
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {eligibleResolvedToday > 0
                  ? `${takenDosesToday} / ${eligibleResolvedToday} resolved doses completed`
                  : 'No resolved doses recorded today'}
              </span>
              <span>Goal: 100%</span>
            </div>
          </section>

          {/* =====================================================================
              D. UPCOMING REMINDERS
             ===================================================================== */}
          <section className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {t.dashboard.upcomingSection}
              </h4>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-700)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}
              >
                {upcomingRemindersCount} remaining
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {t.dashboard.upcomingSubtitle}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingChronological.length === 0 ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                  All scheduled reminders for today are completed!
                </div>
              ) : (
                upcomingChronological.map((dose) => (
                  <div
                    key={dose.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: 'var(--bg-main)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-strong)',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        color: 'var(--primary-700)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formatTime12h(dose.scheduledTime)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dose.medicineName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {dose.dosage}
                      </div>
                    </div>

                    <StatusBadge status={dose.status} />
                  </div>
                ))
              )}
            </div>
          </section>

          {/* =====================================================================
              E. RECENT ACTIVITY LOG
             ===================================================================== */}
          <section className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {t.dashboard.activitySection}
              </h4>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {t.dashboard.activitySubtitle}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activityLog.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '0.88rem'
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-600)',
                      marginTop: '6px',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {act.actionText}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {act.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =====================================================================
              G. CARETAKER & MISSED-DOSE ALERT SUMMARY (Phase 5 & 6)
             ===================================================================== */}
          <section className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconCaretaker size={20} color="var(--primary-700)" />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  {t.dashboard.caretakerSection?.cardTitle || 'Caretaker & Alerts'}
                </h4>
              </div>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: isCaretakerAlertsActive ? '#ecfdf5' : '#fef2f2',
                  color: isCaretakerAlertsActive ? '#059669' : '#dc2626',
                  border: `1px solid ${isCaretakerAlertsActive ? '#a7f3d0' : '#fecaca'}`
                }}
              >
                {isCaretakerAlertsActive
                  ? (t.dashboard.caretakerSection?.badgeActive || 'Alerts Active')
                  : (t.dashboard.caretakerSection?.badgeDisabled || 'Alerts Disabled')}
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {t.dashboard.caretakerSection?.cardSubtitle || 'Designated contact for missed dose escalations and compliance alerts.'}
            </p>

            {/* Caretaker details summary card */}
            <div
              style={{
                backgroundColor: 'var(--bg-main)',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginBottom: '14px',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.dashboard.caretakerSection?.labelCaretaker || 'Caretaker:'}</span>
                <strong style={{ color: 'var(--text-main)' }}>{caretaker?.name || (t.dashboard.caretakerSection?.notConfigured || 'Not configured')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.dashboard.caretakerSection?.labelRelationship || 'Relationship:'}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{caretaker?.relationship || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.dashboard.caretakerSection?.labelChannel || 'Primary Channel:'}</span>
                <span style={{ fontWeight: 700, color: 'var(--primary-700)' }}>
                  {(caretaker?.preferredChannel || 'email').toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.dashboard.caretakerSection?.labelQuietHours || 'Quiet Hours:'}</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {caretaker?.quietHoursEnabled
                    ? `${caretaker.quietHoursStart} – ${caretaker.quietHoursEnd}`
                    : (t.dashboard.caretakerSection?.quietHoursOff || 'Off')}
                </span>
              </div>
            </div>

            {/* Recent Caretaker Alerts */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {(t.dashboard.caretakerSection?.recentHeading || 'Recent Alert Events ({count})').replace('{count}', String(recentCaretakerAlerts.length))}
              </div>
              {recentCaretakerAlerts.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>
                  {t.dashboard.caretakerSection?.noRecentAlerts || 'No recent alert dispatches recorded.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentCaretakerAlerts.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.medicineName}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {a.scheduledTime || 'N/A'} • {(a.channel || 'email').toUpperCase()}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          backgroundColor: ['sent', 'delivered', 'delivered_in_app'].includes(a.status) ? '#ecfdf5' : '#fef3c7',
                          color: ['sent', 'delivered', 'delivered_in_app'].includes(a.status) ? '#059669' : '#d97706',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {a.status === 'delivered_in_app'
                          ? (t.notificationPanel?.statuses?.deliveredInApp || 'In-App')
                          : a.status === 'provider_not_configured'
                          ? (t.notificationPanel?.statuses?.providerNotConfigured || 'Unconfigured')
                          : a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.8rem', justifyContent: 'center' }}
                onClick={() => setIsNotificationPanelOpen(true)}
              >
                {t.dashboard.caretakerSection?.btnDrawer || 'Open Alert Drawer'}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1, fontSize: '0.8rem', justifyContent: 'center' }}
                onClick={() => setActivePage('caretaker')}
              >
                {t.dashboard.caretakerSection?.btnSettings || 'Caretaker Settings'}
              </button>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .dashboard-columns {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
