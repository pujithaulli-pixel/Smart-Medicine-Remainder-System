// Utility functions for dates and time operations

export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN'
};

export const getLocaleId = (lang = 'en') => {
  return LOCALE_MAP[lang] || 'en-IN';
};

export const formatDisplayDate = (dateString, lang = 'en') => {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const locale = getLocaleId(lang);
    
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

export const formatShortDate = (dateString, lang = 'en') => {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const locale = getLocaleId(lang);
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

export const formatTime12h = (time24, lang = 'en') => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  let h = parseInt(hours, 10);
  const m = minutes || '00';
  const ampmEn = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12

  if (lang === 'hi') {
    const ampmHi = parseInt(hours, 10) >= 12 ? 'अपराह्न (PM)' : 'पूर्वाह्न (AM)';
    return `${h}:${m} ${ampmHi}`;
  }
  if (lang === 'te') {
    const ampmTe = parseInt(hours, 10) >= 12 ? 'సాయంత్రం (PM)' : 'ఉదయం (AM)';
    return `${h}:${m} ${ampmTe}`;
  }
  return `${h}:${m} ${ampmEn}`;
};

export const formatDateTime = (isoOrDate, lang = 'en') => {
  if (!isoOrDate) return '';
  try {
    const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(date.getTime())) return String(isoOrDate);
    const locale = getLocaleId(lang);
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return String(isoOrDate);
  }
};

export const calculateDaysBetween = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return null;
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);
  const start = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of both start and end date
  return Math.max(1, diffDays);
};

export const getDateDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate: startStr, endDate: endStr };
};

export const isDateInFilterRange = (dateStr, filterRange, customStart = '', customEnd = '') => {
  if (!dateStr) return false;
  const todayStr = getTodayDateString();

  if (filterRange === 'today') {
    return dateStr === todayStr;
  }
  if (filterRange === '7days') {
    const sevenDaysAgo = getDateDaysAgo(6);
    return dateStr >= sevenDaysAgo && dateStr <= todayStr;
  }
  if (filterRange === '30days') {
    const thirtyDaysAgo = getDateDaysAgo(29);
    return dateStr >= thirtyDaysAgo && dateStr <= todayStr;
  }
  if (filterRange === 'thisMonth') {
    const { startDate, endDate } = getCurrentMonthRange();
    return dateStr >= startDate && dateStr <= endDate;
  }
  if (filterRange === 'custom') {
    if (customStart && dateStr < customStart) return false;
    if (customEnd && dateStr > customEnd) return false;
    return true;
  }
  return true; // 'all'
};

/**
 * Returns formatted treatment duration.
 * If ongoing, calculates days elapsed from start date to today and labels as ongoing.
 * Counts calendar dates INCLUSIVELY (e.g. Oct 1 to Oct 1 = 1 day; Oct 1 to Oct 10 = 10 days).
 */
export const calculateTreatmentDuration = (startDateStr, endDateStr, isOngoing = false, lang = 'en') => {
  if (!startDateStr) return '—';
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const start = new Date(sY, sM - 1, sD);
  const todayStr = getTodayDateString();
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const today = new Date(tY, tM - 1, tD);

  if (isOngoing || !endDateStr) {
    if (start > today) {
      if (lang === 'hi') return 'शुरू होना निर्धारित';
      if (lang === 'te') return 'ప్రారంభం కావాల్సి ఉంది';
      return 'Scheduled to start';
    }
    const elapsedDays = Math.max(1, Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    if (lang === 'hi') return `जारी (अब तक ${elapsedDays} दिन, दोनों तिथियों सहित)`;
    if (lang === 'te') return `కొనసాగుతోంది (ఇప్పటివరకు ${elapsedDays} రోజులు, కలుపుకొని)`;
    return `Ongoing (${elapsedDays} ${elapsedDays === 1 ? 'day' : 'days'} so far, inclusive)`;
  }

  const [eY, eM, eD] = endDateStr.split('-').map(Number);
  const end = new Date(eY, eM - 1, eD);
  if (end < start) {
    if (lang === 'hi') return 'अमान्य तिथि सीमा';
    if (lang === 'te') return 'చెల్లని తేదీ పరిధి';
    return 'Invalid date range';
  }

  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  if (lang === 'hi') return `${totalDays} दिन (दोनों तिथियों सहित)`;
  if (lang === 'te') return `${totalDays} రోజులు (కలుపుకొని)`;
  if (totalDays === 1) return '1 day (inclusive)';
  if (totalDays < 30) return `${totalDays} days (inclusive)`;
  const months = Math.floor(totalDays / 30);
  const remDays = totalDays % 30;
  return remDays > 0
    ? `${months} mo ${remDays} days (${totalDays} days inclusive)`
    : `${months} months (${totalDays} days inclusive)`;
};

/**
 * Checks whether today's date is within the medicine's schedule.
 */
export const isDateCoveringToday = (startDateStr, endDateStr, isOngoing = false) => {
  if (!startDateStr) return false;
  const today = getTodayDateString();
  if (today < startDateStr) return false;
  if (!isOngoing && endDateStr && today > endDateStr) return false;
  return true;
};
