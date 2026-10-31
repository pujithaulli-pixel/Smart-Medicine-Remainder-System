import React from 'react';
import { StatusBadge } from './StatusBadge';
import {
  IconCheck,
  IconSkip,
  IconSnooze,
  IconUtensils,
  IconClock,
  IconAlertCircle
} from './Icons';
import { useApp } from '../context/AppContext';
import { formatTime12h } from '../utils/dateUtils';

export const MedicineCard = ({ dose, onTake, onSkip, onSnooze }) => {
  const { t } = useApp();

  const getFoodInstructionText = (type) => {
    switch (type) {
      case 'beforeFood':
        return t.medicine.foodOptions.beforeFood;
      case 'afterFood':
        return t.medicine.foodOptions.afterFood;
      case 'withFood':
        return t.medicine.foodOptions.withFood;
      case 'noFoodInstruction':
      default:
        return t.medicine.foodOptions.noFoodInstruction;
    }
  };

  const isTaken = dose.status === 'taken';
  const isMissed = dose.status === 'missed';
  const isSkipped = dose.status === 'skipped';
  const isSnoozed = dose.status === 'snoozed';
  const isDue = dose.status === 'due';
  const snoozeCount = dose.snoozeCount || 0;
  const isMaxSnooze = snoozeCount >= 3;

  return (
    <div
      className="card medicine-schedule-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
        borderLeft: isTaken
          ? '5px solid #059669'
          : isMissed
          ? '5px solid #dc2626'
          : isSkipped
          ? '5px solid #6b7280'
          : isDue
          ? '5px solid #e11d48'
          : isSnoozed
          ? '5px solid #7c3aed'
          : '5px solid var(--primary-600)',
        backgroundColor: isDue ? '#fff5f5' : '#ffffff',
        boxShadow: isDue ? '0 4px 18px rgba(225, 29, 72, 0.15)' : undefined,
        transition: 'var(--transition)'
      }}
    >
      <div>
        {/* Top Header: Scheduled Time & Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: isDue ? '#be123c' : 'var(--primary-700)',
                background: isDue ? '#ffe4e6' : 'var(--primary-50)',
                padding: '4px 12px',
                borderRadius: '8px'
              }}
            >
              <IconClock size={18} />
              <span>{formatTime12h(dose.scheduledTime)}</span>
            </div>

            {snoozeCount > 0 && (
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: isMaxSnooze ? '#fee2e2' : '#f3e8ff',
                  color: isMaxSnooze ? '#991b1b' : '#6b21a8',
                  border: isMaxSnooze ? '1px solid #fca5a5' : '1px solid #d8b4fe'
                }}
              >
                {t.reminderModal?.snoozesUsed ? t.reminderModal.snoozesUsed.replace('{count}', snoozeCount) : `Snoozed ${snoozeCount}/3`}
              </span>
            )}
          </div>
          <StatusBadge status={dose.status} />
        </div>

        {/* Medicine Details: Image, Name, Dosage */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={dose.imageUrl}
              alt={dose.medicineName}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              loading="lazy"
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                lineHeight: 1.3
              }}
            >
              {dose.medicineName}
            </h4>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginTop: '3px'
              }}
            >
              {dose.dosage}
            </div>
          </div>
        </div>

        {/* Food Instruction */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-subtle)',
            padding: '8px 12px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          <IconUtensils size={16} color="var(--primary-600)" />
          <span>{getFoodInstructionText(dose.foodInstruction)}</span>
        </div>

        {dose.recordedAt && (
          <div
            style={{
              fontSize: '0.82rem',
              color: '#059669',
              fontWeight: 600,
              marginBottom: '12px'
            }}
          >
            ✓ Recorded at {dose.recordedAt}
          </div>
        )}
      </div>

      {/* Action Buttons: Mark as Taken, Skip Dose, Snooze */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isTaken ? '1fr' : '2fr 1fr 1fr',
          gap: '8px',
          marginTop: '8px'
        }}
      >
        {isTaken ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onSkip('upcoming')}
            title="Undo dose taken mark"
          >
            Undo / Reset Dose
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={onTake}
              style={{ fontWeight: 700 }}
            >
              <IconCheck size={16} />
              <span>{t.medicine.actions.markTaken}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onSkip}
              title="Skip this dose"
            >
              <IconSkip size={15} />
              <span>{t.medicine.actions.skipDose}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onSnooze}
              disabled={isMaxSnooze}
              style={{
                opacity: isMaxSnooze ? 0.55 : 1,
                cursor: isMaxSnooze ? 'not-allowed' : 'pointer',
                borderColor: isMaxSnooze ? '#cbd5e1' : undefined
              }}
              title={
                isMaxSnooze
                  ? 'Maximum 3 snoozes reached for this dose'
                  : 'Snooze reminder'
              }
            >
              <IconSnooze size={15} />
              <span>
                {isMaxSnooze
                  ? 'Max Snoozed'
                  : t.medicine.actions.snooze}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
