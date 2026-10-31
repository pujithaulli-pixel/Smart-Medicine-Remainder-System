import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  IconReports,
  IconCalendar,
  IconCheckCircle,
  IconXCircle,
  IconSkip,
  IconHeartPulse,
  IconInfo,
  IconDownload,
  IconClock,
  IconPill
} from '../components/Icons';
import {
  formatShortDate,
  formatDisplayDate,
  formatTime12h,
  getTodayDateString,
  getDateDaysAgo,
  getCurrentMonthRange,
  isDateInFilterRange,
  calculateTreatmentDuration
} from '../utils/dateUtils';
import {
  calculateAdherence,
  calculatePerMedicineMetrics,
  calculateDailyTimeline,
  ADHERENCE_DISCLAIMER
} from '../utils/adherenceUtils';
import { downloadCsvFile } from '../utils/csvUtils';

export const Reports = () => {
  const { t, language, doseHistory, todayDoses, medicines, medicineHistory, showToast } = useApp();
  const [reportView, setReportView] = useState('weekly'); // 'daily', 'weekly', 'monthly', 'perMedicine'
  const [selectedMedicine, setSelectedMedicine] = useState('all');
  
  // Date range state
  const todayStr = getTodayDateString();
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [filterRange, setFilterRange] = useState('7days'); // today, 7days, 30days, thisMonth, custom
  const [customStart, setCustomStart] = useState(getDateDaysAgo(6));
  const [customEnd, setCustomEnd] = useState(todayStr);

  // Combine doseHistory & todayDoses into a deduplicated list
  const allResolvedDoses = useMemo(() => {
    const map = new Map();

    doseHistory.forEach((item) => {
      if (item && item.date) {
        const key = item.id || `${item.medicineName}_${item.date}_${item.scheduledTime}`;
        map.set(key, item);
      }
    });

    todayDoses.forEach((d) => {
      if (d) {
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
            recordedTime: d.confirmationTime || d.recordedAt,
            skipReason: d.skipReason,
            notes: d.notes || d.userInstructions
          });
        }
      }
    });

    return Array.from(map.values());
  }, [doseHistory, todayDoses, todayStr]);

  // Unique medicines for filter dropdown
  const uniqueMedicines = useMemo(() => {
    const set = new Set();
    allResolvedDoses.forEach((d) => {
      if (d.medicineName) set.add(d.medicineName);
    });
    medicines.forEach((m) => {
      if (m.name) set.add(m.name);
    });
    return Array.from(set).sort();
  }, [allResolvedDoses, medicines]);

  // Filter doses by selected medicine
  const dosesByMedicine = useMemo(() => {
    if (selectedMedicine === 'all') return allResolvedDoses;
    return allResolvedDoses.filter((d) => d.medicineName === selectedMedicine);
  }, [allResolvedDoses, selectedMedicine]);

  // 1. Daily Report Data
  const dailyReportData = useMemo(() => {
    const dayDoses = dosesByMedicine.filter((d) => d.date === selectedDay);
    const metrics = calculateAdherence(dayDoses);
    return {
      date: selectedDay,
      doses: dayDoses,
      metrics
    };
  }, [dosesByMedicine, selectedDay]);

  // 2. Weekly Report Data (Selected 7-day span)
  const weeklyReportData = useMemo(() => {
    // Generate array of 7 consecutive dates ending at customEnd or todayStr
    const endDate = filterRange === 'custom' && customEnd ? customEnd : todayStr;
    const dateList = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateList.push(`${y}-${m}-${day}`);
    }

    const startDate = dateList[0];
    const rangeDoses = dosesByMedicine.filter((d) => d.date >= startDate && d.date <= endDate);
    const metrics = calculateAdherence(rangeDoses);
    const dailyTimeline = calculateDailyTimeline(rangeDoses, dateList);

    return {
      startDate,
      endDate,
      dateList,
      doses: rangeDoses,
      metrics,
      dailyTimeline
    };
  }, [dosesByMedicine, filterRange, customEnd, todayStr]);

  // 3. Monthly Report Data (Last 30 days or current month)
  const monthlyReportData = useMemo(() => {
    let startDate = getDateDaysAgo(29);
    let endDate = todayStr;

    if (filterRange === 'thisMonth') {
      const monthRange = getCurrentMonthRange();
      startDate = monthRange.startDate;
      endDate = monthRange.endDate;
    } else if (filterRange === 'custom' && customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    }

    const rangeDoses = dosesByMedicine.filter((d) => d.date >= startDate && d.date <= endDate);
    const metrics = calculateAdherence(rangeDoses);

    // Group into 4 weekly chunks for chart
    const chunkMap = new Map();
    chunkMap.set('Week 1', { label: 'Days 1-7', taken: 0, missed: 0, skipped: 0, total: 0 });
    chunkMap.set('Week 2', { label: 'Days 8-14', taken: 0, missed: 0, skipped: 0, total: 0 });
    chunkMap.set('Week 3', { label: 'Days 15-21', taken: 0, missed: 0, skipped: 0, total: 0 });
    chunkMap.set('Week 4', { label: 'Days 22+', taken: 0, missed: 0, skipped: 0, total: 0 });

    rangeDoses.forEach((d) => {
      const dayNum = parseInt(d.date.split('-')[2], 10);
      let chunkKey = 'Week 4';
      if (dayNum <= 7) chunkKey = 'Week 1';
      else if (dayNum <= 14) chunkKey = 'Week 2';
      else if (dayNum <= 21) chunkKey = 'Week 3';

      const entry = chunkMap.get(chunkKey);
      if (entry) {
        if (d.status === 'taken') entry.taken++;
        else if (d.status === 'missed') entry.missed++;
        else if (d.status === 'skipped') entry.skipped++;
        entry.total++;
      }
    });

    return {
      startDate,
      endDate,
      doses: rangeDoses,
      metrics,
      chartChunks: Array.from(chunkMap.entries()).map(([k, v]) => ({ key: k, ...v }))
    };
  }, [dosesByMedicine, filterRange, customStart, customEnd, todayStr]);

  // 4. Per-Medicine Report Data
  const perMedicineReportData = useMemo(() => {
    return calculatePerMedicineMetrics(allResolvedDoses, medicines, medicineHistory);
  }, [allResolvedDoses, medicines, medicineHistory]);

  // Current active metrics for KPI cards
  const activeMetrics = useMemo(() => {
    if (reportView === 'daily') return dailyReportData.metrics;
    if (reportView === 'weekly') return weeklyReportData.metrics;
    if (reportView === 'monthly') return monthlyReportData.metrics;
    return calculateAdherence(allResolvedDoses);
  }, [reportView, dailyReportData, weeklyReportData, monthlyReportData, allResolvedDoses]);

  // CSV Export Handler
  const handleExportCsv = () => {
    try {
      let headers = [];
      let rows = [];
      let filename = '';

      if (reportView === 'daily') {
        filename = `medical-report-daily-${selectedDay}.csv`;
        headers = t.reportsPage?.csvHeaders?.daily || ['Medicine Name', 'Dosage', 'Scheduled Time', 'Status', 'Recorded Confirmation', 'Skip Reason'];
        rows = dailyReportData.doses.map((d) => [
          d.medicineName,
          d.dosage || '',
          d.scheduledTime,
          d.status,
          d.recordedTime || '',
          d.skipReason || ''
        ]);
      } else if (reportView === 'weekly') {
        filename = `medical-report-weekly-${weeklyReportData.startDate}-to-${weeklyReportData.endDate}.csv`;
        headers = t.reportsPage?.csvHeaders?.weekly || ['Date', 'Doses Taken', 'Doses Missed', 'Doses Skipped', 'Total Resolved', 'Daily Adherence'];
        rows = weeklyReportData.dailyTimeline.map((item) => {
          const res = item.taken + item.missed + item.skipped;
          const adh = res > 0 ? `${Math.round((item.taken / res) * 100)}%` : (t.reportsPage?.noData || 'No data');
          return [item.date, item.taken, item.missed, item.skipped, res, adh];
        });
      } else if (reportView === 'monthly') {
        filename = `medical-report-monthly-${monthlyReportData.startDate}-to-${monthlyReportData.endDate}.csv`;
        headers = t.reportsPage?.csvHeaders?.monthly || ['Period', 'Total Taken', 'Total Missed', 'Total Skipped', 'Period Adherence'];
        rows = monthlyReportData.chartChunks.map((c) => {
          const res = c.taken + c.missed + c.skipped;
          const adh = res > 0 ? `${Math.round((c.taken / res) * 100)}%` : (t.reportsPage?.noData || 'No data');
          return [`${c.key} (${c.label})`, c.taken, c.missed, c.skipped, adh];
        });
      } else {
        filename = `medical-report-per-medicine-${todayStr}.csv`;
        headers = t.reportsPage?.csvHeaders?.perMedicine || ['Medicine Name', 'Dosage', 'Status', 'Doses Taken', 'Doses Missed', 'Doses Skipped', 'Adherence', 'Recent Outcome'];
        rows = perMedicineReportData.map((m) => [
          m.medicineName,
          m.dosage,
          m.status,
          m.taken,
          m.missed,
          m.skipped,
          m.adherenceDisplay,
          m.mostRecentOutcome ? `${m.mostRecentOutcome.status} on ${m.mostRecentOutcome.date}` : (t.reportsPage?.noData || 'None recorded')
        ]);
      }

      downloadCsvFile(filename, headers, rows);
      showToast(t.reportsPage.exportSuccess || 'Report exported successfully to CSV!');
    } catch (error) {
      console.error(error);
      showToast('Export failed. Please check browser permissions.', 'warning');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="page-title">{t.reportsPage.pageTitle}</h2>
          <p className="page-subtitle">{t.reportsPage.pageSubtitle}</p>
        </div>

        {/* Action Controls: Export CSV */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            style={{ fontWeight: 700 }}
            title="Export the active report view and metrics to CSV"
          >
            <IconDownload size={18} />
            <span>{t.reportsPage.exportCsv || 'Export Report CSV'}</span>
          </button>
        </div>
      </div>

      {/* Primary View Switcher Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
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
            className={`pill-btn ${reportView === 'daily' ? 'active' : ''}`}
            onClick={() => setReportView('daily')}
            style={{ fontWeight: 700 }}
          >
            {t.reportsPage.timeRanges.daily}
          </button>
          <button
            type="button"
            className={`pill-btn ${reportView === 'weekly' ? 'active' : ''}`}
            onClick={() => setReportView('weekly')}
            style={{ fontWeight: 700 }}
          >
            {t.reportsPage.timeRanges.weekly}
          </button>
          <button
            type="button"
            className={`pill-btn ${reportView === 'monthly' ? 'active' : ''}`}
            onClick={() => setReportView('monthly')}
            style={{ fontWeight: 700 }}
          >
            {t.reportsPage.timeRanges.monthly}
          </button>
          <button
            type="button"
            className={`pill-btn ${reportView === 'perMedicine' ? 'active' : ''}`}
            onClick={() => setReportView('perMedicine')}
            style={{ fontWeight: 700 }}
          >
            {t.reportsPage.timeRanges.perMedicine || 'Per-Medicine View'}
          </button>
        </div>

        {/* Global Medicine Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {t.reportsPage.filterMedicine || 'Medicine:'}
          </span>
          <select
            className="form-control"
            style={{ minWidth: '180px', padding: '6px 12px', fontSize: '0.88rem' }}
            value={selectedMedicine}
            onChange={(e) => setSelectedMedicine(e.target.value)}
          >
            <option value="all">{t.reportsPage.allMedicines || 'All Medicines'}</option>
            {uniqueMedicines.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View-Specific Date Range Selectors */}
      {reportView === 'daily' && (
        <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Select Report Date:
          </span>
          <input
            type="date"
            className="form-control"
            style={{ width: '170px', padding: '6px 12px', fontSize: '0.9rem' }}
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          />
          {selectedDay !== todayStr && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedDay(todayStr)}
            >
              Today
            </button>
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Viewing schedule and adherence for <strong>{formatDisplayDate(selectedDay, language)}</strong>
          </span>
        </div>
      )}

      {/* Adherence Methodology Disclaimer (Requirement 5) */}
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
        <span>{t.reportsPage.adherenceDisclaimer || ADHERENCE_DISCLAIMER}</span>
      </div>

      {/* KPI Summary Cards */}
      <section className="grid-4">
        <SummaryCard
          icon={<IconCheckCircle size={24} />}
          value={activeMetrics.taken}
          label={t.reportsPage.stats.totalTaken}
          accentColor="green"
        />
        <SummaryCard
          icon={<IconXCircle size={24} />}
          value={activeMetrics.missed}
          label={t.reportsPage.stats.totalMissed}
          accentColor="red"
        />
        <SummaryCard
          icon={<IconSkip size={24} />}
          value={activeMetrics.skipped}
          label={t.reportsPage.stats.totalSkipped}
          accentColor="purple"
        />
        <SummaryCard
          icon={<IconHeartPulse size={24} />}
          value={activeMetrics.adherenceDisplay}
          label={t.reportsPage.stats.adherenceRate}
          accentColor="teal"
          subtext={
            activeMetrics.eligibleResolved > 0
              ? `${activeMetrics.taken} of ${activeMetrics.eligibleResolved} resolved doses`
              : 'No resolved doses recorded'
          }
        />
      </section>

      {/* =========================================================================
          VIEW 1: DAILY REPORT
         ========================================================================= */}
      {reportView === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {t.reportsPage.dailyReportTitle || 'Daily Dose Breakdown'} — {formatShortDate(selectedDay, language)}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {dailyReportData.doses.length} total doses recorded for this date.
                </p>
              </div>

              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--primary-700)',
                  backgroundColor: 'var(--primary-50)',
                  padding: '6px 14px',
                  borderRadius: '10px'
                }}
              >
                Adherence: {dailyReportData.metrics.adherenceDisplay}
              </div>
            </div>

            {dailyReportData.doses.length === 0 ? (
              <EmptyState
                icon={<IconCalendar size={32} color="var(--primary-600)" />}
                title="No doses recorded for this date"
                description="There are no scheduled, taken, or missed dose records for the selected day."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Dosage</th>
                      <th>Scheduled Time</th>
                      <th>Outcome / Confirmation</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReportData.doses.map((dose) => (
                      <tr key={dose.id}>
                        <td>
                          <strong>{dose.medicineName}</strong>
                        </td>
                        <td>{dose.dosage}</td>
                        <td>{formatTime12h(dose.scheduledTime, language)}</td>
                        <td>
                          {dose.status === 'taken' ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>
                              ✓ Confirmed at {dose.recordedTime || 'Time recorded'}
                            </span>
                          ) : dose.status === 'skipped' ? (
                            <span style={{ color: '#4b5563', fontStyle: 'italic' }}>
                              Skipped: "{dose.skipReason || 'User choice'}"
                            </span>
                          ) : dose.status === 'missed' ? (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>
                              Missed (Grace period expired)
                            </span>
                          ) : (
                            <span style={{ color: '#d97706', fontWeight: 600 }}>
                              Pending / Due
                            </span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={dose.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: WEEKLY REPORT & CHART
         ========================================================================= */}
      {reportView === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Accessible CSS Bar Chart */}
          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {t.reportsPage.weeklyReportTitle || '7-Day Dose Compliance Breakdown'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {formatShortDate(weeklyReportData.startDate, language)} → {formatShortDate(weeklyReportData.endDate, language)}
                </p>
              </div>

              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                7-Day Adherence: {weeklyReportData.metrics.adherenceDisplay}
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                gap: '12px',
                minHeight: '220px',
                paddingTop: '20px',
                paddingBottom: '16px',
                borderBottom: '2px solid var(--border-light)'
              }}
            >
              {weeklyReportData.dailyTimeline.map((item) => {
                const maxDose = Math.max(1, item.total);
                const takenHeight = Math.round((item.taken / maxDose) * 140);
                const missedHeight = Math.round((item.missed / maxDose) * 140);
                const skippedHeight = Math.round((item.skipped / maxDose) * 140);

                return (
                  <div
                    key={item.date}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                      maxWidth: '70px'
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-700)' }}>
                      {item.taken}/{item.total}
                    </span>

                    {/* Stacked outcome column */}
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        overflow: 'hidden',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      {item.taken > 0 && (
                        <div
                          style={{
                            height: `${takenHeight}px`,
                            backgroundColor: '#059669',
                            width: '100%',
                            transition: 'height 0.3s ease'
                          }}
                          title={`Taken: ${item.taken}`}
                        />
                      )}
                      {item.missed > 0 && (
                        <div
                          style={{
                            height: `${missedHeight}px`,
                            backgroundColor: '#dc2626',
                            width: '100%',
                            transition: 'height 0.3s ease'
                          }}
                          title={`Missed: ${item.missed}`}
                        />
                      )}
                      {item.skipped > 0 && (
                        <div
                          style={{
                            height: `${skippedHeight}px`,
                            backgroundColor: '#9ca3af',
                            width: '100%',
                            transition: 'height 0.3s ease'
                          }}
                          title={`Skipped: ${item.skipped}`}
                        />
                      )}
                    </div>

                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chart Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#059669' }} />
                <span>Taken</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dc2626' }} />
                <span>Missed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#9ca3af' }} />
                <span>Skipped</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: MONTHLY REPORT & CHART
         ========================================================================= */}
      {reportView === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {t.reportsPage.monthlyReportTitle || 'Monthly Compliance Overview'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {formatShortDate(monthlyReportData.startDate, language)} → {formatShortDate(monthlyReportData.endDate, language)}
                </p>
              </div>

              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                Monthly Adherence: {monthlyReportData.metrics.adherenceDisplay}
              </div>
            </div>

            {/* 4-Week Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {monthlyReportData.chartChunks.map((chunk) => {
                const total = chunk.taken + chunk.missed + chunk.skipped;
                const adh = total > 0 ? `${Math.round((chunk.taken / total) * 100)}%` : 'No data';

                return (
                  <div
                    key={chunk.key}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>
                      {chunk.key}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {chunk.label}
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                      {adh}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Taken: <strong>{chunk.taken}</strong> | Missed: <strong>{chunk.missed}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: PER-MEDICINE ADHERENCE REPORT
         ========================================================================= */}
      {reportView === 'perMedicine' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
            {t.reportsPage.perMedicineTitle || 'Per-Medicine Adherence & Duration'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Adherence calculation is based on Taken / (Taken + Missed + Skipped) for each medicine.
          </p>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Status</th>
                  <th>Treatment Duration</th>
                  <th>Taken</th>
                  <th>Missed</th>
                  <th>Skipped</th>
                  <th>Adherence Rate</th>
                  <th>Recent Outcome</th>
                </tr>
              </thead>
              <tbody>
                {perMedicineReportData.map((item) => (
                  <tr key={item.medicineName}>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{item.medicineName}</strong>
                    </td>
                    <td>{item.dosage}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {calculateTreatmentDuration(item.startDate, item.endDate, item.isOngoing)}
                    </td>
                    <td>
                      <span style={{ color: '#059669', fontWeight: 700 }}>{item.taken}</span>
                    </td>
                    <td>
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>{item.missed}</span>
                    </td>
                    <td>
                      <span style={{ color: '#6b7280', fontWeight: 700 }}>{item.skipped}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          color:
                            item.adherencePercent === null
                              ? 'var(--text-muted)'
                              : item.adherencePercent >= 80
                              ? '#059669'
                              : item.adherencePercent >= 50
                              ? '#d97706'
                              : '#dc2626'
                        }}
                      >
                        {item.adherenceDisplay}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {item.mostRecentOutcome ? (
                        <span>
                          <strong style={{ textTransform: 'capitalize' }}>{item.mostRecentOutcome.status}</strong> ({formatShortDate(item.mostRecentOutcome.date, language)})
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Doctor Consultation Tip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid var(--border-light)',
          color: 'var(--text-secondary)',
          fontSize: '0.92rem'
        }}
      >
        <IconHeartPulse size={22} color="var(--primary-600)" />
        <span>{t.reportsPage.doctorTip}</span>
      </div>
    </div>
  );
};
