import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  IconXCircle,
  IconCalendar,
  IconClock,
  IconAlertCircle,
  IconSkip,
  IconCheckCircle,
  IconDownload,
  IconPill,
  IconSnooze
} from '../components/Icons';
import {
  formatShortDate,
  formatTime12h,
  getTodayDateString,
  isDateInFilterRange
} from '../utils/dateUtils';
import { downloadCsvFile } from '../utils/csvUtils';

export const MedicineMissed = () => {
  const { t, language, doseHistory, todayDoses, medicines, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'missed', 'skipped'
  const [filterRange, setFilterRange] = useState('all'); // today, 7days, 30days, thisMonth, custom, all
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState('all');

  const todayStr = getTodayDateString();

  // Combine doseHistory and todayDoses for missed and skipped occurrences without duplicates
  const allIncompleteDoses = useMemo(() => {
    const map = new Map();

    // From doseHistory
    doseHistory.forEach((item) => {
      if (item && (item.status === 'missed' || item.status === 'skipped')) {
        const key = item.id || `${item.medicineName}_${item.date}_${item.scheduledTime}`;
        map.set(key, item);
      }
    });

    // From todayDoses (real-time engine updates)
    todayDoses.forEach((d) => {
      if (d && (d.status === 'missed' || d.status === 'skipped')) {
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
            status: d.status,
            snoozeCount: d.snoozeCount || 0,
            skipReason: d.skipReason || '',
            reminderInfo: d.foodInstruction ? `Food: ${d.foodInstruction}` : '',
            missedTimestamp: d.missedTimestamp || d.updatedAt,
            recordedTime: d.confirmationTime || d.recordedAt
          });
        }
      }
    });

    return Array.from(map.values());
  }, [doseHistory, todayDoses, todayStr]);

  // Unique medicine names for filter dropdown
  const uniqueMedicines = useMemo(() => {
    const set = new Set();
    allIncompleteDoses.forEach((d) => {
      if (d.medicineName) set.add(d.medicineName);
    });
    medicines.forEach((m) => {
      if (m.name) set.add(m.name);
    });
    return Array.from(set).sort();
  }, [allIncompleteDoses, medicines]);

  // Per-medicine totals calculation (Total skipped, missed, taken)
  const perMedicineStats = useMemo(() => {
    const statsMap = new Map();

    // Seed all known medicines
    medicines.forEach((m) => {
      statsMap.set(m.name, {
        medicineName: m.name,
        dosage: `${m.dosageAmount || ''} ${m.dosageUnit || ''}`.trim() || m.dosage || '',
        taken: 0,
        missed: 0,
        skipped: 0
      });
    });

    // Count in doseHistory & todayDoses
    const countedKeys = new Set();
    const countDose = (d) => {
      if (!d || !d.medicineName) return;
      const key = d.id || `${d.medicineName}_${d.date}_${d.scheduledTime}`;
      if (countedKeys.has(key)) return;
      countedKeys.add(key);

      if (!statsMap.has(d.medicineName)) {
        statsMap.set(d.medicineName, {
          medicineName: d.medicineName,
          dosage: d.dosage || '',
          taken: 0,
          missed: 0,
          skipped: 0
        });
      }

      const entry = statsMap.get(d.medicineName);
      if (d.status === 'taken') entry.taken++;
      else if (d.status === 'missed') entry.missed++;
      else if (d.status === 'skipped') entry.skipped++;
    };

    doseHistory.forEach(countDose);
    todayDoses.forEach(countDose);

    return Array.from(statsMap.values()).filter(
      (s) => s.missed > 0 || s.skipped > 0 || s.taken > 0
    );
  }, [medicines, doseHistory, todayDoses]);

  // Filtered doses based on active tab and filters
  const filteredDoses = useMemo(() => {
    return allIncompleteDoses
      .filter((item) => {
        // Tab filter (missed vs skipped vs all)
        if (activeTab === 'missed' && item.status !== 'missed') return false;
        if (activeTab === 'skipped' && item.status !== 'skipped') return false;

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
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return (b.scheduledTime || '').localeCompare(a.scheduledTime || '');
      });
  }, [allIncompleteDoses, activeTab, filterRange, customStart, customEnd, selectedMedicine]);

  const missedCount = allIncompleteDoses.filter((d) => d.status === 'missed').length;
  const skippedCount = allIncompleteDoses.filter((d) => d.status === 'skipped').length;

  const getMedicineImage = (item) => {
    if (item.imageUrl) return item.imageUrl;
    const med = medicines.find(
      (m) => m.name === item.medicineName || m.id === item.medicineId
    );
    return med?.imageUrl || '';
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    try {
      const headers = [
        t.missedPage?.columns?.medicine || 'Medicine Name',
        t.missedPage?.columns?.dosage || 'Dosage',
        t.missedPage?.columns?.scheduledDate || 'Scheduled Date',
        t.missedPage?.columns?.scheduledTime || 'Scheduled Time',
        t.missedPage?.columns?.snoozeCount || 'Snooze Count',
        t.missedPage?.outcomeType || 'Outcome Type',
        t.missedPage?.reasonNotes || 'Reason / Notes'
      ];

      const rows = filteredDoses.map((d) => [
        d.medicineName,
        d.dosage || '',
        d.date,
        d.scheduledTime,
        d.snoozeCount || 0,
        d.status === 'skipped' ? (t.missedPage?.skippedByUser || 'Skipped by User') : (t.missedPage?.missedGraceExpired || 'Missed (Grace period expired)'),
        d.status === 'skipped' ? (d.skipReason || t.missedPage?.skippedByUser || 'Skipped by user') : (t.missedPage?.missedGraceExpired || 'Grace period expired without user confirmation')
      ]);

      const medSlug = selectedMedicine === 'all' ? 'all-medicines' : selectedMedicine.replace(/\s+/g, '-').toLowerCase();
      const filename = `medical-reminder-${activeTab}-doses-${medSlug}-${filterRange}-${todayStr}.csv`;
      downloadCsvFile(filename, headers, rows);
      showToast(t.missedPage.exportSuccess || 'Doses exported successfully to CSV!');
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
          <h2 className="page-title">{t.missedPage.pageTitle}</h2>
          <p className="page-subtitle">{t.missedPage.pageSubtitle}</p>
        </div>

        {/* CSV Export Button */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExportCsv}
          disabled={filteredDoses.length === 0}
          style={{ fontWeight: 700 }}
          title="Download filtered missed or skipped doses as CSV"
        >
          <IconDownload size={18} />
          <span>{t.missedPage.exportCsv || 'Export CSV'}</span>
        </button>
      </div>

      {/* Safety Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          color: '#92400e',
          fontSize: '0.92rem'
        }}
      >
        <IconAlertCircle size={20} color="#b45309" style={{ marginTop: '2px', flexShrink: 0 }} />
        <span>{t.missedPage.alertNote}</span>
      </div>

      {/* Subtab Switcher: All Incomplete vs Missed vs Skipped */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div className="pill-group" style={{ backgroundColor: 'var(--bg-subtle)', padding: '4px', borderRadius: '12px' }}>
          <button
            type="button"
            className={`pill-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
            style={{ fontWeight: 700 }}
          >
            {t.missedPage.viewAll || 'All Incomplete'} ({missedCount + skippedCount})
          </button>
          <button
            type="button"
            className={`pill-btn ${activeTab === 'missed' ? 'active' : ''}`}
            onClick={() => setActiveTab('missed')}
            style={{ fontWeight: 700 }}
          >
            {t.missedPage.viewMissed || 'Missed Doses'} ({missedCount})
          </button>
          <button
            type="button"
            className={`pill-btn ${activeTab === 'skipped' ? 'active' : ''}`}
            onClick={() => setActiveTab('skipped')}
            style={{ fontWeight: 700 }}
          >
            {t.missedPage.viewSkipped || 'Skipped by User'} ({skippedCount})
          </button>
        </div>

        {/* Medicine Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {t.missedPage.filterMedicine || 'Medicine:'}
          </span>
          <select
            className="form-control"
            style={{ minWidth: '180px', padding: '6px 12px', fontSize: '0.88rem' }}
            value={selectedMedicine}
            onChange={(e) => setSelectedMedicine(e.target.value)}
          >
            <option value="all">{t.missedPage.allMedicines || 'All Medicines'}</option>
            {uniqueMedicines.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Filters Card */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div className="pill-group">
          <button
            type="button"
            className={`pill-btn ${filterRange === 'all' ? 'active' : ''}`}
            onClick={() => setFilterRange('all')}
          >
            {t.missedPage.filterAll}
          </button>
          <button
            type="button"
            className={`pill-btn ${filterRange === 'today' ? 'active' : ''}`}
            onClick={() => setFilterRange('today')}
          >
            {t.missedPage.filterToday}
          </button>
          <button
            type="button"
            className={`pill-btn ${filterRange === '7days' ? 'active' : ''}`}
            onClick={() => setFilterRange('7days')}
          >
            {t.missedPage.filter7Days}
          </button>
          <button
            type="button"
            className={`pill-btn ${filterRange === '30days' ? 'active' : ''}`}
            onClick={() => setFilterRange('30days')}
          >
            {t.missedPage.filter30Days || 'Last 30 Days'}
          </button>
          <button
            type="button"
            className={`pill-btn ${filterRange === 'thisMonth' ? 'active' : ''}`}
            onClick={() => setFilterRange('thisMonth')}
          >
            {t.missedPage.filterThisMonth || 'This Month'}
          </button>
          <button
            type="button"
            className={`pill-btn ${filterRange === 'custom' ? 'active' : ''}`}
            onClick={() => setFilterRange('custom')}
          >
            {t.missedPage.filterCustom || 'Custom Range'}
          </button>
        </div>

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

      {/* Main Table: Incomplete Doses */}
      {filteredDoses.length === 0 ? (
        <EmptyState
          icon={<IconCheckCircle size={36} color="#059669" />}
          title={
            activeTab === 'skipped'
              ? 'No Skipped Doses Recorded'
              : t.missedPage.emptyTitle
          }
          description={
            activeTab === 'skipped'
              ? 'You have not recorded any skipped doses in this filter range.'
              : t.missedPage.emptySubtitle
          }
        />
      ) : (
        <div className="card table-responsive" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.missedPage.columns.medicine}</th>
                <th>{t.missedPage.columns.dosage}</th>
                <th>{t.missedPage.columns.scheduledDate}</th>
                <th>{t.missedPage.columns.scheduledTime}</th>
                <th>{t.missedPage.columns.snoozeCount}</th>
                <th>
                  {activeTab === 'skipped'
                    ? 'User-Entered Skip Reason'
                    : 'Outcome / Reason'}
                </th>
                <th>{t.missedPage.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoses.map((dose) => {
                const img = getMedicineImage(dose);
                const isSkipped = dose.status === 'skipped';

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.88rem' }}>
                        <IconSnooze size={14} color="var(--text-muted)" />
                        <span>{dose.snoozeCount || 0} / 3</span>
                      </div>
                    </td>
                    <td>
                      {isSkipped ? (
                        <span style={{ color: '#4b5563', fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 500 }}>
                          "{dose.skipReason || 'Skipped by user'}"
                        </span>
                      ) : (
                        <span style={{ color: '#991b1b', fontSize: '0.88rem', fontWeight: 500 }}>
                          Grace period expired without confirmation.
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={dose.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Requirement 3: Per-Medicine Summary Cards / Table */}
      <section className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
          {t.missedPage.perMedicineSummary || 'Per-Medicine Compliance Summary'}
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Total doses taken, missed, and skipped for each medicine in your record.
        </p>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Dosage</th>
                <th>Doses Taken</th>
                <th>Doses Missed</th>
                <th>Doses Skipped</th>
                <th>Resolved Total</th>
              </tr>
            </thead>
            <tbody>
              {perMedicineStats.map((stat) => {
                const totalResolved = stat.taken + stat.missed + stat.skipped;
                return (
                  <tr key={stat.medicineName}>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{stat.medicineName}</strong>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{stat.dosage}</td>
                    <td>
                      <span style={{ color: '#059669', fontWeight: 700 }}>{stat.taken}</span>
                    </td>
                    <td>
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>{stat.missed}</span>
                    </td>
                    <td>
                      <span style={{ color: '#6b7280', fontWeight: 700 }}>{stat.skipped}</span>
                    </td>
                    <td>
                      <strong>{totalResolved}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
