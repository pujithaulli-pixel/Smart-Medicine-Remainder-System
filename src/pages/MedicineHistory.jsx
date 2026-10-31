import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import {
  IconHistory,
  IconCalendar,
  IconClock,
  IconInfo,
  IconDownload,
  IconPill,
  IconCheckCircle,
  IconXCircle,
  IconSkip
} from '../components/Icons';
import {
  formatShortDate,
  calculateTreatmentDuration,
  getTodayDateString
} from '../utils/dateUtils';
import { downloadCsvFile } from '../utils/csvUtils';

export const MedicineHistory = () => {
  const { t, language, medicineHistory, medicines, doseHistory, todayDoses, showToast } = useApp();
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, completed, discontinued, paused

  const todayStr = getTodayDateString();

  // Unified list of all medicines across active, paused, completed, and archived history
  const combinedHistory = useMemo(() => {
    const list = [];
    const seenIds = new Set();

    // 1. Current medicines (active, paused, completed, discontinued)
    medicines.forEach((med) => {
      seenIds.add(med.id);
      seenIds.add(med.name);

      list.push({
        id: med.id,
        medicineId: med.id,
        name: med.name,
        dosage: `${med.dosageAmount || ''} ${med.dosageUnit || ''}`.trim() || med.dosage || '',
        category: med.medicineForm || med.category || 'tablet',
        startDate: med.startDate,
        endDate: med.endDate || '',
        isOngoing: Boolean(med.isOngoing || med.ongoing),
        duration: calculateTreatmentDuration(med.startDate, med.endDate, Boolean(med.isOngoing || med.ongoing), language),
        reason: med.reason || (med.status === 'completed' ? 'Prescription course completed.' : med.status === 'discontinued' ? 'Discontinued.' : ''),
        doctorName: med.doctorName || 'Not specified',
        imageUrl: med.imageUrl || med.medicineImage,
        status: med.status || 'active'
      });
    });

    // 2. Archived history (including deleted/discontinued snapshots)
    medicineHistory.forEach((hist) => {
      const matchKey = hist.medicineId || hist.name;
      if (!seenIds.has(matchKey)) {
        seenIds.add(matchKey);
        list.push({
          id: hist.id || `med-hist-${hist.name}`,
          medicineId: hist.medicineId || hist.id,
          name: hist.name,
          dosage: hist.dosage || '',
          category: hist.category || 'tablet',
          startDate: hist.startDate,
          endDate: hist.endDate || '',
          isOngoing: Boolean(hist.isOngoing),
          duration: hist.duration || calculateTreatmentDuration(hist.startDate, hist.endDate, Boolean(hist.isOngoing), language),
          reason: hist.reason || 'Archived prescription.',
          doctorName: hist.doctorName || 'Not specified',
          imageUrl: hist.imageUrl,
          status: hist.status || 'completed'
        });
      }
    });

    return list;
  }, [medicines, medicineHistory, language]);

  // Aggregate dose counts per medicine name
  const doseCountsByMedicine = useMemo(() => {
    const countsMap = new Map();

    const processDose = (d) => {
      if (!d || !d.medicineName) return;
      if (!countsMap.has(d.medicineName)) {
        countsMap.set(d.medicineName, { taken: 0, missed: 0, skipped: 0 });
      }
      const entry = countsMap.get(d.medicineName);
      if (d.status === 'taken') entry.taken++;
      else if (d.status === 'missed') entry.missed++;
      else if (d.status === 'skipped') entry.skipped++;
    };

    const seenDoseKeys = new Set();
    const addDoseSafe = (d) => {
      const key = d.id || `${d.medicineName}_${d.date}_${d.scheduledTime}`;
      if (!seenDoseKeys.has(key)) {
        seenDoseKeys.add(key);
        processDose(d);
      }
    };

    doseHistory.forEach(addDoseSafe);
    todayDoses.forEach(addDoseSafe);

    return countsMap;
  }, [doseHistory, todayDoses]);

  // Filter history records
  const filteredHistory = useMemo(() => {
    if (statusFilter === 'all') return combinedHistory;
    return combinedHistory.filter((item) => item.status === statusFilter);
  }, [combinedHistory, statusFilter]);

  // CSV Export Handler
  const handleExportCsv = () => {
    try {
      const headers = [
        t.historyPage.columns.medicine,
        t.historyPage.columns.dosage,
        t.historyPage.columns.startDate,
        t.historyPage.columns.endDate,
        t.historyPage.columns.duration,
        t.historyPage.columns.status,
        t.historyPage.stats.taken,
        t.historyPage.stats.missed,
        t.historyPage.stats.skipped,
        t.historyPage.columns.reason
      ];

      const rows = filteredHistory.map((item) => {
        const counts = doseCountsByMedicine.get(item.name) || { taken: 0, missed: 0, skipped: 0 };
        return [
          item.name,
          item.dosage,
          item.startDate,
          item.endDate || (item.isOngoing ? 'Ongoing' : 'Present'),
          item.duration,
          item.status,
          counts.taken,
          counts.missed,
          counts.skipped,
          item.reason || ''
        ];
      });

      const filename = `medical-reminder-history-${statusFilter}-${todayStr}.csv`;
      downloadCsvFile(filename, headers, rows);
      showToast(t.historyPage.exportSuccess || 'Medicine history exported successfully to CSV!');
    } catch (error) {
      console.error(error);
      showToast('Export failed. Please check browser download permissions.', 'warning');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="page-title">{t.historyPage.pageTitle}</h2>
          <p className="page-subtitle">{t.historyPage.pageSubtitle}</p>
        </div>

        {/* CSV Export Button */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExportCsv}
          disabled={filteredHistory.length === 0}
          style={{ fontWeight: 700 }}
          title="Download treatment history as CSV"
        >
          <IconDownload size={18} />
          <span>{t.historyPage.exportCsv || 'Export History CSV'}</span>
        </button>
      </div>

      {/* Inclusive Calculation Methodology Callout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          color: '#1e40af',
          fontSize: '0.88rem'
        }}
      >
        <IconInfo size={18} color="#2563eb" style={{ flexShrink: 0 }} />
        <span>{t.historyPage.inclusiveNotice}</span>
      </div>

      {/* Filter Tabs */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div className="pill-group">
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            {t.historyPage.filterAll || 'All Prescriptions'} ({combinedHistory.length})
          </button>
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            {t.historyPage.filterActive || 'Active'} ({combinedHistory.filter((m) => m.status === 'active').length})
          </button>
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            {t.historyPage.filterCompleted || 'Completed'} ({combinedHistory.filter((m) => m.status === 'completed').length})
          </button>
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'discontinued' ? 'active' : ''}`}
            onClick={() => setStatusFilter('discontinued')}
          >
            {t.historyPage.filterDiscontinued || 'Discontinued'} ({combinedHistory.filter((m) => m.status === 'discontinued').length})
          </button>
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'paused' ? 'active' : ''}`}
            onClick={() => setStatusFilter('paused')}
          >
            {t.historyPage.filterPaused || 'Paused'} ({combinedHistory.filter((m) => m.status === 'paused').length})
          </button>
        </div>
      </div>

      {/* History Cards */}
      {filteredHistory.length === 0 ? (
        <EmptyState
          icon={<IconHistory size={36} color="var(--primary-600)" />}
          title={t.historyPage.emptyTitle}
          description={t.historyPage.emptySubtitle}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredHistory.map((item) => {
            const counts = doseCountsByMedicine.get(item.name) || { taken: 0, missed: 0, skipped: 0 };
            const resolvedTotal = counts.taken + counts.missed + counts.skipped;

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '24px',
                  flexWrap: 'wrap'
                }}
              >
                {/* Medicine Image */}
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-light)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      loading="lazy"
                    />
                  ) : (
                    <IconPill size={32} color="var(--primary-600)" />
                  )}
                </div>

                {/* Medicine Details */}
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      {item.name}
                    </h3>
                    <StatusBadge status={item.status} />
                  </div>

                  <div style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--primary-700)', marginBottom: '8px' }}>
                    {item.dosage}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <IconCalendar size={15} color="var(--primary-600)" />
                      <span>
                        {formatShortDate(item.startDate, language)} → {item.endDate ? formatShortDate(item.endDate, language) : (item.isOngoing ? t.historyPage.ongoing : (t.historyPage?.present || 'Present'))}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <IconClock size={15} color="var(--primary-600)" />
                      <span>{t.medicine?.duration || 'Duration'}: <strong>{item.duration}</strong></span>
                    </div>

                    {item.doctorName && item.doctorName !== 'Not specified' && (
                      <div>
                        Prescribed by: <strong>{item.doctorName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Dose Outcome Badges for this Medicine */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        backgroundColor: '#ecfdf5',
                        color: '#059669',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid #a7f3d0'
                      }}
                    >
                      <IconCheckCircle size={14} />
                      {counts.taken} {t.historyPage.stats.taken}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid #fecaca'
                      }}
                    >
                      <IconXCircle size={14} />
                      {counts.missed} {t.historyPage.stats.missed}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        backgroundColor: '#f3f4f6',
                        color: '#4b5563',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <IconSkip size={14} />
                      {counts.skipped} {t.historyPage.stats.skipped}
                    </span>

                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      ({resolvedTotal} total recorded doses)
                    </span>
                  </div>
                </div>

                {/* Stopping Reason Box */}
                <div
                  style={{
                    minWidth: '240px',
                    maxWidth: '360px',
                    backgroundColor: 'var(--bg-main)',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.88rem'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconInfo size={14} color="var(--primary-600)" />
                    <span>{t.historyPage.columns.reason}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {item.reason || (item.status === 'active' ? 'Active daily treatment.' : 'No notes entered.')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
