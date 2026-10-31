import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal } from './Modal';
import { IconCheck, IconAlertCircle, IconRefresh, IconShield } from './Icons';
import { migrationApi } from '../services/apiService';
import { StorageKeys, getStoredItem, setStoredItem } from '../services/storageService';

export const DataMigrationModal = ({ isOpen, onClose, onMigrationComplete }) => {
  const { t, showToast, refreshUserData } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Count local records
  const localMeds = getStoredItem(StorageKeys.MEDICINES, []);
  const localDoseHist = getStoredItem(StorageKeys.DOSE_HISTORY, []);
  const localMedHist = getStoredItem(StorageKeys.MEDICINE_HISTORY, []);
  const localCaretaker = getStoredItem(StorageKeys.CARETAKER, null);
  const localPrefs = getStoredItem(StorageKeys.PREFERENCES, null);

  const totalLocalRecords = localMeds.length + localDoseHist.length + localMedHist.length;

  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Keep a recoverable backup snapshot in localStorage
      const backupSnapshot = {
        medicines: localMeds,
        doseHistory: localDoseHist,
        medicineHistory: localMedHist,
        caretaker: localCaretaker,
        preferences: localPrefs,
        backupTimestamp: new Date().toISOString()
      };
      setStoredItem('medical_reminder_backup_pre_migration', backupSnapshot);

      // 2. Dispatch migration request to backend database
      const result = await migrationApi.migrate({
        medicines: localMeds,
        doseHistory: localDoseHist,
        medicineHistory: localMedHist,
        caretaker: localCaretaker,
        preferences: localPrefs
      });

      // 3. Mark migration as completed in local storage
      setStoredItem('medical_reminder_migration_completed', true);

      showToast(t.auth?.importSuccess || 'Records successfully imported to your account!');

      if (refreshUserData) {
        await refreshUserData();
      }

      if (onMigrationComplete) {
        onMigrationComplete(result);
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to import local records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setStoredItem('medical_reminder_migration_dismissed', true);
    onClose();
  };

  if (!isOpen || totalLocalRecords === 0) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkip}
      title={t.auth?.importTitle || 'Import Local Records to Account'}
      maxWidth="500px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0', color: '#065f46' }}>
          <IconShield size={24} color="#059669" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.88rem', lineHeight: 1.45 }}>
            {t.auth?.importDesc || 'We discovered local medicine and reminder records saved in your browser. Would you like to import them into your secure cloud account?'}
          </span>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.86rem' }}>
            {error}
          </div>
        )}

        {/* Found Records Summary */}
        <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
          <strong style={{ color: 'var(--text-main)', marginBottom: '4px' }}>Records Discovered Locally:</strong>
          <div>• <strong>{localMeds.length}</strong> Prescribed Medicines</div>
          <div>• <strong>{localDoseHist.length}</strong> Completed/Skipped Dose Records</div>
          <div>• <strong>{localMedHist.length}</strong> Archived Prescription Records</div>
          {localCaretaker && localCaretaker.name && <div>• Caretaker Profile: <strong>{localCaretaker.name}</strong></div>}
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
          * A safe recovery backup is automatically created. Existing records already in your account will not be duplicated or overwritten.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSkip}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {t.auth?.skipImport || 'Keep Local / Skip'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={loading}
            style={{ flex: 1, fontWeight: 700 }}
          >
            {loading ? (t.common?.loading || 'Importing...') : (t.auth?.importBtn || 'Import Records')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
