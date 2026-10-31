import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  IconCheck,
  IconSnooze,
  IconSkip,
  IconClock,
  IconUtensils,
  IconAlertCircle,
  IconX,
  IconHeartPulse
} from './Icons';
import { formatTime12h } from '../utils/dateUtils';
import { alarmSoundService } from '../services/alarmSoundService';
import { ENGINE_CONFIG } from '../services/reminderEngine';

export const ReminderModal = () => {
  const {
    t,
    language,
    dueDoses,
    activeDueDoseId,
    setActiveDueDoseId,
    markDoseTaken,
    markDoseSkipped,
    snoozeDose,
    dismissReminderModal,
    preferences
  } = useApp();

  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(!alarmSoundService.canPlayAudio());
  const [secondsRemainingInGrace, setSecondsRemainingInGrace] = useState(null);

  // If there are no due doses, do not render
  if (!dueDoses || dueDoses.length === 0) {
    return null;
  }

  // Find currently focused due dose
  const currentDose = dueDoses.find((d) => d.id === activeDueDoseId) || dueDoses[0];
  if (!currentDose) return null;

  const isTestMode = Boolean(preferences.isTestMode);
  const snoozeLimitReached = currentDose.snoozeCount >= ENGINE_CONFIG.MAX_SNOOZES;
  const isFinalAlert = snoozeLimitReached;

  const getFoodInstructionText = (type) => {
    return t.medicine.foodOptions[type] || t.medicine.foodOptions.noFoodInstruction;
  };

  // Grace period countdown indicator
  useEffect(() => {
    const updateGraceTimer = () => {
      let refTimestamp = null;
      if (currentDose.finalAlertTimestamp) {
        refTimestamp = new Date(currentDose.finalAlertTimestamp).getTime();
      } else if (currentDose.initialAlertTimestamp) {
        refTimestamp = new Date(currentDose.initialAlertTimestamp).getTime();
      }

      if (refTimestamp) {
        const graceMs = isTestMode
          ? ENGINE_CONFIG.TEST_MODE_GRACE_PERIOD_MS
          : ENGINE_CONFIG.PRODUCTION_GRACE_PERIOD_MS;
        const elapsed = Date.now() - refTimestamp;
        const rem = Math.max(0, Math.ceil((graceMs - elapsed) / 1000));
        setSecondsRemainingInGrace(rem);
      } else {
        setSecondsRemainingInGrace(null);
      }
    };

    updateGraceTimer();
    const interval = setInterval(updateGraceTimer, 1000);
    return () => clearInterval(interval);
  }, [currentDose, isTestMode]);

  // Handle user interaction to unlock audio
  const handleUnlockAudio = () => {
    alarmSoundService.initAudioContext();
    alarmSoundService.playChimeTone();
    setAudioBlocked(false);
  };

  const handleTaken = () => {
    alarmSoundService.stopAlarm();
    markDoseTaken(currentDose.id);
  };

  const handleSnooze = () => {
    if (snoozeLimitReached) return;
    alarmSoundService.stopAlarm();
    snoozeDose(currentDose.id);
  };

  const handleOpenSkip = () => {
    setSkipReason('');
    setSkipDialogOpen(true);
  };

  const handleConfirmSkip = () => {
    alarmSoundService.stopAlarm();
    setSkipDialogOpen(false);
    markDoseSkipped(currentDose.id, skipReason);
  };

  const handleDismiss = () => {
    alarmSoundService.stopAlarm();
    dismissReminderModal();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)'
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: isFinalAlert ? '3px solid #dc2626' : '3px solid var(--primary-600)',
          animation: 'popIn 0.25s ease-out'
        }}
      >
        {/* Top Alert Header Banner */}
        <div
          style={{
            background: isFinalAlert
              ? 'linear-gradient(135deg, #b91c1c, #dc2626)'
              : 'linear-gradient(135deg, var(--primary-700), var(--primary-800))',
            color: '#ffffff',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <IconHeartPulse size={24} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                {isFinalAlert ? t.reminderModal.finalReminder : t.reminderModal.dueNow}
              </h2>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px' }}>
                {t.reminderModal.title}
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            style={{ color: '#ffffff', opacity: 0.85, padding: '6px' }}
            title={t.reminderModal.btnDismiss}
          >
            <IconX size={22} />
          </button>
        </div>

        {/* Multi-dose selector tabs if multiple simultaneous doses are due */}
        {dueDoses.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-light)',
              overflowX: 'auto'
            }}
          >
            {dueDoses.map((dose, idx) => {
              const isSelected = dose.id === currentDose.id;
              return (
                <button
                  key={dose.id}
                  type="button"
                  onClick={() => setActiveDueDoseId(dose.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    backgroundColor: isSelected ? 'var(--primary-600)' : '#ffffff',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-strong)'
                  }}
                >
                  {(t.reminderModal.doseIndex || 'Dose {index}: {name}')
                    .replace('{index}', String(idx + 1))
                    .replace('{name}', dose.medicineName)}
                </button>
              );
            })}
          </div>
        )}

        {/* Audio Unblock Notice if browser restricted autoplay */}
        {audioBlocked && (
          <div
            onClick={handleUnlockAudio}
            style={{
              padding: '10px 24px',
              backgroundColor: '#fffbeb',
              borderBottom: '1px solid #fde68a',
              color: '#92400e',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconAlertCircle size={16} color="#b45309" />
              <span>{t.reminderModal.enableAudioPrompt}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '2px 8px', minHeight: '26px' }}
            >
              {t.reminderModal.unmuteBtn || 'Unmute'}
            </button>
          </div>
        )}

        {/* Main Body: Medicine Details */}
        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Image + Title */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-main)',
                border: '2px solid var(--border-light)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <img
                src={currentDose.imageUrl}
                alt={currentDose.medicineName}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.25 }}>
                {currentDose.medicineName}
              </h3>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-700)', marginTop: '4px' }}>
                {currentDose.dosage}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--primary-800)',
                    backgroundColor: 'var(--primary-50)',
                    padding: '3px 10px',
                    borderRadius: '8px'
                  }}
                >
                  <IconClock size={15} />
                  <span>
                    {(t.reminderModal.scheduledLabel || 'Scheduled: {time}').replace(
                      '{time}',
                      formatTime12h(currentDose.scheduledTime, language)
                    )}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Food Instructions Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-main)',
              borderRadius: '12px',
              fontSize: '0.92rem',
              color: 'var(--text-secondary)'
            }}
          >
            <IconUtensils size={18} color="var(--primary-600)" />
            <span>
              <strong>{t.reminderModal.foodInstructionLabel || 'Food Instruction:'}</strong>{' '}
              {getFoodInstructionText(currentDose.foodInstruction)}
            </span>
          </div>

          {/* Snooze Status & Limit Indicator */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: snoozeLimitReached ? '#fef2f2' : 'var(--accent-50)',
              border: snoozeLimitReached ? '1px solid #fecaca' : '1px solid var(--accent-100)',
              fontSize: '0.88rem',
              color: snoozeLimitReached ? '#991b1b' : 'var(--accent-700)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
              <span>
                {t.reminderModal.snoozesUsed.replace('{count}', String(currentDose.snoozeCount || 0))}
              </span>
              <span>
                {isTestMode
                  ? t.reminderModal.testModeInterval || '(Test Mode: 15s)'
                  : t.reminderModal.prodInterval || '(10 mins each)'}
              </span>
            </div>

            {snoozeLimitReached && (
              <div style={{ marginTop: '6px', fontWeight: 600 }}>
                {t.reminderModal.snoozeLimitReached}
              </div>
            )}

            {secondsRemainingInGrace !== null && secondsRemainingInGrace > 0 && (
              <div style={{ marginTop: '6px', fontSize: '0.82rem', opacity: 0.9 }}>
                {t.reminderModal.gracePeriodNotice.replace('{seconds}', String(secondsRemainingInGrace))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions: Taken, Snooze, Skip */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: 'var(--bg-main)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Primary Action: MARK AS TAKEN */}
          <button
            type="button"
            className="btn btn-success btn-lg"
            onClick={handleTaken}
            style={{ width: '100%', fontWeight: 800, fontSize: '1.15rem' }}
          >
            <IconCheck size={22} />
            <span>{t.reminderModal.btnTaken}</span>
          </button>

          {/* Secondary Actions: Snooze & Skip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-purple"
              disabled={snoozeLimitReached}
              onClick={handleSnooze}
              style={{
                opacity: snoozeLimitReached ? 0.5 : 1,
                cursor: snoozeLimitReached ? 'not-allowed' : 'pointer',
                fontWeight: 700
              }}
            >
              <IconSnooze size={18} />
              <span>{isTestMode ? t.reminderModal.btnSnoozeTest : t.reminderModal.btnSnooze}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenSkip}
            >
              <IconSkip size={18} />
              <span>{t.reminderModal.btnSkip}</span>
            </button>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '6px',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            {t.reminderModal.btnDismiss}
          </button>
        </div>
      </div>

      {/* =====================================================================
          SKIP DOSE CONFIRMATION MODAL
         ===================================================================== */}
      {skipDialogOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)'
          }}
          onClick={() => setSkipDialogOpen(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '440px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
              {t.reminderModal.skipModalTitle}
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              {t.reminderModal.skipModalDesc}
            </p>

            <div className="form-group">
              <label className="form-label">{t.reminderModal.skipReasonLabel}</label>
              <input
                type="text"
                className="form-control"
                placeholder={t.reminderModal.skipReasonPlaceholder}
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSkipDialogOpen(false)}
              >
                {t.reminderModal.cancelSkipBtn}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmSkip}
              >
                {t.reminderModal.confirmSkipBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from {
            transform: scale(0.92);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
