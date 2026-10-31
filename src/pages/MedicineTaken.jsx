import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  IconCheckCircle,
  IconCalendar,
  IconClock,
  IconFilter,
  IconDownload,
  IconPill
} from '../components/Icons';
import {
  formatShortDate,
  formatTime12h,
  getTodayDateString,
  isDateInFilterRange
} from '../utils/dateUtils';
import { downloadCsvFile } from '../utils/csvUtils';

export const MedicineTaken = () => {
  const { t, language, doseHistory, todayDoses, medicines, showToast } = useApp();
  const [filterRange, setFilterRange] = useState('all'); // today, 7days, 30days, thisMonth, custom, all
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState('all');

  const todayStr = getTodayDateString();

  // Combine doseHistory with any taken doses in todayDoses without duplicating
  const allTakenDoses = useMemo(() => {
    const map = new Map();

    // From doseHistory
    doseHistory.forEach((item) => {
      if (item && item.status === 'taken') {
        const key = item.id || `${item.medicineName}_${item.date}_${item.scheduledTime}`;
        map.set(key, item);
      }
    });

    // From todayDoses
    todayDoses.forEach((d) => {
      if (d && d.status === 'taken') {
        const key = `hist-${d.id}`;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            medicineId: d.medicineId,
            medicineName: d.medicineName,
            dosage: d.dosage,
            imageUrl: d.imageUrl,
            date: d.scheduledDate || todayStr,
            scheduledTime: d.scheduledTime,
            status: 'taken',
            recordedTime: d.confirmationTime || d.recordedAt,
            confirmationTime: d.confirmationTime || d.recordedAt,
            takenTimestamp: d.takenTimestamp || new Date().toISOString(),
            userInstructions: d.userInstructions || d.instructions || '',
            notes: d.notes || ''
          });
        }
      }
    });

    return Array.from(map.values());
  }, [doseHistory, todayDoses, todayStr]);

  // Unique medicine names for filter dropdown
  const uniqueMedicines = useMemo(() => {
    const set = new Set();
    allTakenDoses.forEach((d) => {
      if (d.medicineName) set.add(d.medicineName);
    });
    medicines.forEach((m) => {
      if (m.name) set.add(m.name);
    });
    return Array.from(set).sort();
  }, [allTakenDoses, medicines]);

  // Apply filters and sort most recent confirmation first
  const filteredTakenDoses = useMemo(() => {
    return allTakenDoses
      .filter((item) => {
        // Date range filter
        const inDate = isDateInFilterRange(item.date, filterRange, customStart, customEnd);
        if (!inDate) return false;

        // Medicine filter
        if (selectedMedicine !== 'all' && item.medicineName !== selectedMedicine) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort most recent confirmation first
        if (a.takenTimestamp && b.takenTimestamp) {
          return b.takenTimestamp.localeCompare(a.takenTimestamp);
        }
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return (b.scheduledTime || '').localeCompare(a.scheduledTime || '');
      });
  }, [allTakenDoses, filterRange, customStart, customEnd, selectedMedicine]);

  // Helper to resolve medicine image
  const getMedicineImage = (item) => {
    if (item.imageUrl) return item.imageUrl;
    const med = medicines.find(
      (m) => m.name === item.medicineName || m.id === item.medicineId
    );
    return med?.imageUrl || '';
  };

  // Helper to resolve instructions/notes
  const getMedicineNotes = (item) => {
    if (item.notes) return item.notes;
    if (item.userInstructions) return item.userInstructions;
    const med = medicines.find(
      (m) => m.name === item.medicineName || m.id === item.medicineId
    );
    return med?.instructions || med?.notes || '—';
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    try {
      const headers = [
        t.takenPage.columns.medicine,
        t.takenPage.columns.dosage,
        t.takenPage.columns.scheduledDate,
        t.takenPage.columns.scheduledTime,
        t.takenPage.columns.confirmationTime,
        t.takenPage.columns.status,
        t.takenPage.columns.notes
      ];

      const rows = filteredTakenDoses.map((d) => [
        d.medicineName,
        d.dosage || '',
        d.date,
        d.scheduledTime,
        d.recordedTime || d.confirmationTime || 'Confirmed',
        'Taken',
        getMedicineNotes(d)
      ]);

      const medSlug = selectedMedicine === 'all' ? 'all-medicines' : selectedMedicine.replace(/\s+/g, '-').toLowerCase();
      const filename = `medical-reminder-taken-${medSlug}-${filterRange}-${todayStr}.csv`;
      downloadCsvFile(filename, headers, rows);
      showToast(t.takenPage.exportSuccess || 'Taken doses exported successfully to CSV!');
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
          <h2 className="page-title">{t.takenPage.pageTitle}</h2>
          <p className="page-subtitle">{t.takenPage.pageSubtitle}</p>
        </div>

        {/* Export CSV Button */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExportCsv}
          disabled={filteredTakenDoses.length === 0}
          style={{ fontWeight: 700 }}
          title="Download filtered taken doses as CSV file"
        >
          <IconDownload size={18} />
          <span>{t.takenPage.exportCsv || 'Export CSV'}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          {/* Quick Date Range Pills */}
          <div className="pill-group">
            <button
              type="button"
              className={`pill-btn ${filterRange === 'all' ? 'active' : ''}`}
              onClick={() => setFilterRange('all')}
            >
              {t.takenPage.filterAll}
            </button>
            <button
              type="button"
              className={`pill-btn ${filterRange === 'today' ? 'active' : ''}`}
              onClick={() => setFilterRange('today')}
            >
              {t.takenPage.filterToday}
            </button>
            <button
              type="button"
              className={`pill-btn ${filterRange === '7days' ? 'active' : ''}`}
              onClick={() => setFilterRange('7days')}
            >
              {t.takenPage.filter7Days}
            </button>
            <button
              type="button"
              className={`pill-btn ${filterRange === '30days' ? 'active' : ''}`}
              onClick={() => setFilterRange('30days')}
            >
              {t.takenPage.filter30Days || 'Last 30 Days'}
            </button>
            <button
              type="button"
              className={`pill-btn ${filterRange === 'thisMonth' ? 'active' : ''}`}
              onClick={() => setFilterRange('thisMonth')}
            >
              {t.takenPage.filterThisMonth || 'This Month'}
            </button>
            <button
              type="button"
              className={`pill-btn ${filterRange === 'custom' ? 'active' : ''}`}
              onClick={() => setFilterRange('custom')}
            >
              {t.takenPage.filterCustom || 'Custom Range'}
            </button>
          </div>

          {/* Medicine Dropdown Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t.takenPage.filterMedicine || 'Medicine:'}
            </span>
            <select
              className="form-control"
              style={{ minWidth: '180px', padding: '6px 12px', fontSize: '0.88rem' }}
              value={selectedMedicine}
              onChange={(e) => setSelectedMedicine(e.target.value)}
            >
              <option value="all">{t.takenPage.allMedicines || 'All Medicines'}</option>
              {uniqueMedicines.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {filterRange === 'custom' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>From:</span>
            <input
              type="date"
              className="form-control"
              style={{ width: '150px', minHeight: '38px', padding: '6px 10px', fontSize: '0.85rem' }}
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>To:</span>
            <input
              type="date"
              className="form-control"
              style={{ width: '150px', minHeight: '38px', padding: '6px 10px', fontSize: '0.85rem' }}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
            {(customStart || customEnd) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setCustomStart('');
                  setCustomEnd('');
                }}
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        <span>
          Showing <strong>{filteredTakenDoses.length}</strong> confirmed taken {filteredTakenDoses.length === 1 ? 'dose' : 'doses'}
        </span>
        <span style={{ fontSize: '0.82rem' }}>
          Sorted by most recent confirmation first
        </span>
      </div>

      {/* Table of Taken Records */}
      {filteredTakenDoses.length === 0 ? (
        <EmptyState
          icon={<IconCheckCircle size={36} color="#059669" />}
          title={t.takenPage.emptyTitle}
          description={
            selectedMedicine !== 'all'
              ? `No taken dose records found for "${selectedMedicine}" in the selected date range.`
              : t.takenPage.emptySubtitle
          }
        />
      ) : (
        <div className="card table-responsive" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.takenPage.columns.medicine}</th>
                <th>{t.takenPage.columns.dosage}</th>
                <th>{t.takenPage.columns.scheduledDate}</th>
                <th>{t.takenPage.columns.scheduledTime}</th>
                <th>{t.takenPage.columns.confirmationTime}</th>
                <th>{t.takenPage.columns.notes}</th>
                <th>{t.takenPage.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTakenDoses.map((dose) => {
                const img = getMedicineImage(dose);
                const notes = getMedicineNotes(dose);

                return (
                  <tr key={dose.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-subtle)',
                            border: '1px solid var(--border-light)',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={dose.medicineName}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              loading="lazy"
                            />
                          ) : (
                            <IconPill size={20} color="var(--primary-600)" />
                          )}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.96rem' }}>
                            {dose.medicineName}
                          </strong>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {dose.dosage}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconCalendar size={14} color="var(--primary-600)" />
                        <span>{formatShortDate(dose.date, language)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconClock size={14} color="var(--primary-600)" />
                        <span>{formatTime12h(dose.scheduledTime, language)}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          backgroundColor: '#ecfdf5',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #a7f3d0'
                        }}
                      >
                        ✓ {dose.recordedTime || dose.confirmationTime || 'Confirmed'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '200px' }}>
                      {notes}
                    </td>
                    <td>
                      <StatusBadge status="taken" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
