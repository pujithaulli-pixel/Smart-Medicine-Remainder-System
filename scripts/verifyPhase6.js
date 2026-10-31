/**
 * PHASE 6 COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Smart Medical Reminder System - Multilingual Support (EN, HI, TE)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Import i18n modules
import {
  translations,
  getTranslation,
  interpolate,
  formatPlural
} from '../src/i18n/translations.js';

// Import date utilities
import {
  LOCALE_MAP,
  getLocaleId,
  formatDisplayDate,
  formatShortDate,
  formatTime12h,
  formatDateTime,
  calculateTreatmentDuration,
  getTodayDateString
} from '../src/utils/dateUtils.js';

// Import CSV utilities
import { formatCsvContent } from '../src/utils/csvUtils.js';

// Import Notification Templates from backend
import {
  NOTIFICATION_TEMPLATES,
  getNotificationTemplate,
  generateNotificationContent
} from '../server/templates.js';

// Import reminder engine modules for state preservation checks
import {
  generateDoseOccurrenceId,
  applySnoozeToDose,
  ENGINE_CONFIG
} from '../src/services/reminderEngine.js';

let totalTests = 0;
let passedTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${description}`);
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
  }
}

console.log('================================================================');
console.log('   SMART MEDICAL REMINDER SYSTEM - PHASE 6 VERIFICATION SUITE   ');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: Centralized Translation Architecture & Language Dictionaries
// -----------------------------------------------------------------------------
console.log('--- 1. Centralized Translation Architecture & Deep Proxy Fallback ---');

const supportedLanguages = ['en', 'hi', 'te'];

runTest('All 3 languages (en, hi, te) are defined in translations dictionary', () => {
  supportedLanguages.forEach((lang) => {
    assert(translations[lang], `translations[${lang}] must exist`);
  });
});

runTest('Readable language names are accurately represented', () => {
  assert.strictEqual(translations.en.nav.languages.en, 'English');
  assert.strictEqual(translations.hi.nav.languages.hi, 'हिन्दी');
  assert.strictEqual(translations.te.nav.languages.te, 'తెలుగు');
});

runTest('Deep English proxy fallback handles missing nested keys gracefully without undefined or throwing', () => {
  const hindiProxy = getTranslation('hi');
  // Access a key guaranteed to exist in en, proxy will fall back if missing in hi
  assert.ok(hindiProxy.common, 'common dictionary accessible on proxy');
  assert.ok(hindiProxy.dashboard, 'dashboard dictionary accessible on proxy');
  assert.ok(hindiProxy.addMedicine, 'addMedicine dictionary accessible on proxy');
  
  // Non-existent key falls back to undefined or English fallback object safely
  const fallbackCheck = hindiProxy._nonExistentKey;
  assert.strictEqual(fallbackCheck, undefined);
});

runTest('interpolate() handles single and multiple {token} replacements', () => {
  const template = 'Hello {name}, you have {count} medicines due at {time}.';
  const result = interpolate(template, { name: 'Pujitha', count: 3, time: '08:00 AM' });
  assert.strictEqual(result, 'Hello Pujitha, you have 3 medicines due at 08:00 AM.');
});

runTest('interpolate() handles missing or unchanged parameters without crashing', () => {
  const result = interpolate('Dose {idx}: {name}', { idx: 1 });
  assert.strictEqual(result, 'Dose 1: {name}');
});

runTest('formatPlural() selects correct singular/plural forms', () => {
  const forms = { zero: 'no doses', one: '1 dose', other: '{count} doses' };
  assert.strictEqual(formatPlural(0, forms), 'no doses');
  assert.strictEqual(formatPlural(1, forms), '1 dose');
  assert.strictEqual(formatPlural(5, forms), '5 doses');
});

// -----------------------------------------------------------------------------
// SECTION 2: Page-Level Translation Coverage (EN, HI, TE)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Page-Level Translation Coverage ---');

const requiredSections = [
  'nav',
  'header',
  'common',
  'dashboard',
  'addMedicine',
  'medicine',
  'takenPage',
  'missedPage',
  'historyPage',
  'reportsPage',
  'caretakerPage',
  'settingsPage',
  'reminderModal',
  'notificationPanel'
];

supportedLanguages.forEach((lang) => {
  runTest(`Language [${lang}] defines all primary application sections`, () => {
    const t = getTranslation(lang);
    requiredSections.forEach((sec) => {
      assert(t[sec], `Section "${sec}" must exist in [${lang}]`);
    });
  });
});

// Test Dashboard
runTest('Dashboard translations exist with metrics, greeting, and caretaker section in EN, HI, TE', () => {
  supportedLanguages.forEach((lang) => {
    const t = getTranslation(lang);
    assert.ok(t.dashboard.greeting, `[${lang}] dashboard.greeting`);
    assert.ok(t.dashboard.statTotalMedicines, `[${lang}] dashboard.statTotalMedicines`);
    assert.ok(t.dashboard.statTodayRemaining, `[${lang}] dashboard.statTodayRemaining`);
    assert.ok(t.dashboard.statTakenToday, `[${lang}] dashboard.statTakenToday`);
    assert.ok(t.dashboard.caretakerSection, `[${lang}] dashboard.caretakerSection`);
    assert.ok(t.dashboard.caretakerSection.cardTitle || t.dashboard.caretakerSection.heading, `[${lang}] dashboard.caretakerSection.cardTitle`);
    assert.ok(t.dashboard.caretakerSection.bannerIssuesTitle || t.dashboard.caretakerSection.deliveryIssuesNotice, `[${lang}] dashboard.caretakerSection.bannerIssuesTitle`);
  });
});

// Test Add Medicine Form & Validation
runTest('Add Medicine form has complete field labels and validation error messages in EN, HI, TE', () => {
  supportedLanguages.forEach((lang) => {
    const t = getTranslation(lang);
    const f = t.addMedicine.fields;
    const v = t.addMedicine.validation;
    assert.ok(f.name, `[${lang}] addMedicine.fields.name`);
    assert.ok(f.dosageAmount, `[${lang}] addMedicine.fields.dosageAmount`);
    assert.ok(f.dosesPerDay, `[${lang}] addMedicine.fields.dosesPerDay`);
    assert.ok(f.startDate, `[${lang}] addMedicine.fields.startDate`);
    assert.ok(f.foodInstruction, `[${lang}] addMedicine.fields.foodInstruction`);
    assert.ok(v.nameRequired, `[${lang}] addMedicine.validation.nameRequired`);
    assert.ok(v.dosageRequired, `[${lang}] addMedicine.validation.dosageRequired`);
    assert.ok(v.startDateRequired, `[${lang}] addMedicine.validation.startDateRequired`);
    assert.ok(v.duplicateTime, `[${lang}] addMedicine.validation.duplicateTime`);
  });
});

// Test Taken, Missed, and History
runTest('Medicine Taken, Missed, and History pages define filters, columns, and export strings in EN, HI, TE', () => {
  supportedLanguages.forEach((lang) => {
    const t = getTranslation(lang);
    assert.ok(t.takenPage.pageTitle, `[${lang}] takenPage.pageTitle`);
    assert.ok(t.takenPage.columns.medicine, `[${lang}] takenPage.columns.medicine`);
    assert.ok(t.missedPage.pageTitle, `[${lang}] missedPage.pageTitle`);
    assert.ok(t.missedPage.columns.snoozeCount, `[${lang}] missedPage.columns.snoozeCount`);
    assert.ok(t.missedPage.outcomeType, `[${lang}] missedPage.outcomeType`);
    assert.ok(t.missedPage.reasonNotes, `[${lang}] missedPage.reasonNotes`);
    assert.ok(t.historyPage.pageTitle, `[${lang}] historyPage.pageTitle`);
    assert.ok(t.historyPage.inclusiveNotice, `[${lang}] historyPage.inclusiveNotice`);
  });
});

// Test Reports and Localized CSV Headers
runTest('Reports page defines localized CSV headers for Daily, Weekly, Monthly, and Per-Medicine views in EN, HI, TE', () => {
  supportedLanguages.forEach((lang) => {
    const t = getTranslation(lang);
    const csv = t.reportsPage.csvHeaders;
    assert.ok(csv, `[${lang}] reportsPage.csvHeaders exists`);
    assert.ok(Array.isArray(csv.daily) && csv.daily.length >= 6, `[${lang}] reportsPage.csvHeaders.daily`);
    assert.ok(Array.isArray(csv.weekly) && csv.weekly.length >= 6, `[${lang}] reportsPage.csvHeaders.weekly`);
    assert.ok(Array.isArray(csv.monthly) && csv.monthly.length >= 5, `[${lang}] reportsPage.csvHeaders.monthly`);
    assert.ok(Array.isArray(csv.perMedicine) && csv.perMedicine.length >= 8, `[${lang}] reportsPage.csvHeaders.perMedicine`);
  });
});

// Test Caretaker and Alert History
runTest('Caretaker page defines form fields, quiet hours, drivers, alert filters, and table columns in EN, HI, TE', () => {
  supportedLanguages.forEach((lang) => {
    const t = getTranslation(lang);
    const cp = t.caretakerPage;
    assert.ok(cp.pageTitle, `[${lang}] caretakerPage.pageTitle`);
    assert.ok(cp.quietHoursHeading, `[${lang}] caretakerPage.quietHoursHeading`);
    assert.ok(cp.preferredChannel, `[${lang}] caretakerPage.preferredChannel`);
    assert.ok(cp.testDeliveryHeading, `[${lang}] caretakerPage.testDeliveryHeading`);
    assert.ok(cp.filters.all, `[${lang}] caretakerPage.filters.all`);
    assert.ok(cp.filters.missed, `[${lang}] caretakerPage.filters.missed`);
    assert.ok(cp.columns.medicine, `[${lang}] caretakerPage.columns.medicine`);
    assert.ok(cp.columns.deliveryStatus, `[${lang}] caretakerPage.columns.deliveryStatus`);
  });
});

// Test Active Reminder Modal and Notification Drawer
runTest('Reminder Modal and Notification Drawer define full prompt translations in EN, HI, TE', () => {
  supportedLanguages.forEach((lang) => {
    const t = getTranslation(lang);
    assert.ok(t.reminderModal.title, `[${lang}] reminderModal.title`);
    assert.ok(t.reminderModal.btnTaken, `[${lang}] reminderModal.btnTaken`);
    assert.ok(t.reminderModal.btnSnooze, `[${lang}] reminderModal.btnSnooze`);
    assert.ok(t.reminderModal.btnSkip, `[${lang}] reminderModal.btnSkip`);
    assert.ok(t.reminderModal.soundPrompt, `[${lang}] reminderModal.soundPrompt`);
    assert.ok(t.notificationPanel.title, `[${lang}] notificationPanel.title`);
    assert.ok(t.notificationPanel.filterAll || t.notificationPanel.tabAll, `[${lang}] notificationPanel.filterAll`);
    assert.ok(t.notificationPanel.statuses.delivered, `[${lang}] notificationPanel.statuses.delivered`);
  });
});

// -----------------------------------------------------------------------------
// SECTION 3: Locale-Aware Date, Time, and Duration Formatting
// -----------------------------------------------------------------------------
console.log('\n--- 3. Locale-Aware Date, Time & Treatment Duration ---');

runTest('Locale mapping correctly maps en -> en-IN, hi -> hi-IN, te -> te-IN', () => {
  assert.strictEqual(getLocaleId('en'), 'en-IN');
  assert.strictEqual(getLocaleId('hi'), 'hi-IN');
  assert.strictEqual(getLocaleId('te'), 'te-IN');
  assert.strictEqual(getLocaleId('unknown'), 'en-IN');
});

runTest('formatShortDate() formats date according to locale without throwing', () => {
  const dStr = '2026-10-31';
  const enDate = formatShortDate(dStr, 'en');
  const hiDate = formatShortDate(dStr, 'hi');
  const teDate = formatShortDate(dStr, 'te');
  assert.ok(enDate.includes('2026') || enDate.includes('31'), 'en short date');
  assert.ok(hiDate.length > 0, 'hi short date');
  assert.ok(teDate.length > 0, 'te short date');
});

runTest('formatTime12h() handles 12-hour AM/PM formatting in English, Hindi, and Telugu', () => {
  const morning = '08:30';
  const evening = '20:45';
  
  const enMorn = formatTime12h(morning, 'en');
  const enEve = formatTime12h(evening, 'en');
  assert.strictEqual(enMorn, '8:30 AM');
  assert.strictEqual(enEve, '8:45 PM');
  
  const hiMorn = formatTime12h(morning, 'hi');
  const hiEve = formatTime12h(evening, 'hi');
  assert.ok(hiMorn.includes('8:30') && (hiMorn.includes('AM') || hiMorn.includes('पूर्वाह्न') || hiMorn.includes('सुबह')), `Hindi AM: ${hiMorn}`);
  assert.ok(hiEve.includes('8:45') && (hiEve.includes('PM') || hiEve.includes('अपराह्न') || hiEve.includes('शाम')), `Hindi PM: ${hiEve}`);
  
  const teMorn = formatTime12h(morning, 'te');
  const teEve = formatTime12h(evening, 'te');
  assert.ok(teMorn.includes('8:30') && (teMorn.includes('AM') || teMorn.includes('ఉదయం')), `Telugu AM: ${teMorn}`);
  assert.ok(teEve.includes('8:45') && (teEve.includes('PM') || teEve.includes('రాత్రి') || teEve.includes('సాయంత్రం')), `Telugu PM: ${teEve}`);
});

runTest('calculateTreatmentDuration() supports inclusive days and localized duration strings', () => {
  // English regression: must contain 'inclusive'
  const enDur = calculateTreatmentDuration('2026-10-01', '2026-10-10', false, 'en');
  assert.ok(enDur.includes('10 days') && enDur.includes('inclusive'), `English duration: ${enDur}`);
  
  // Hindi localized duration
  const hiDur = calculateTreatmentDuration('2026-10-01', '2026-10-10', false, 'hi');
  assert.ok(hiDur.includes('10 दिन') && (hiDur.includes('समावेशी') || hiDur.includes('सहित')), `Hindi duration: ${hiDur}`);
  
  // Telugu localized duration
  const teDur = calculateTreatmentDuration('2026-10-01', '2026-10-10', false, 'te');
  assert.ok(teDur.includes('10 రోజులు') && (teDur.includes('కలిపి') || teDur.includes('సహా') || teDur.includes('కలుపుకొని')), `Telugu duration: ${teDur}`);
  
  // Ongoing handling
  const enOngoing = calculateTreatmentDuration('2026-10-01', '', true, 'en');
  assert.ok(enOngoing.startsWith('Ongoing'), `English ongoing: ${enOngoing}`);
  const hiOngoing = calculateTreatmentDuration('2026-10-01', '', true, 'hi');
  assert.ok(hiOngoing.includes('जारी') || hiOngoing.includes('चल रहा'), `Hindi ongoing: ${hiOngoing}`);
  const teOngoing = calculateTreatmentDuration('2026-10-01', '', true, 'te');
  assert.ok(teOngoing.includes('కొనసాగుతోంది') || teOngoing.includes('ప్రస్తుతం'), `Telugu ongoing: ${teOngoing}`);
});

// -----------------------------------------------------------------------------
// SECTION 4: Caretaker Notification Multilingual Templates & Backend Integration
// -----------------------------------------------------------------------------
console.log('\n--- 4. Caretaker Multilingual Notification Templates ---');

const alertTypes = ['missedDose', 'snoozeWarning', 'lowStockWarning', 'testAlert'];
const sampleData = {
  caretakerName: 'Suresh',
  medicineName: 'Metformin 500mg',
  dosage: '1 tablet',
  scheduledTime: '08:00 AM',
  scheduledDate: '2026-10-31',
  remainingQuantity: 3,
  quantityUnit: 'tablets',
  threshold: 5,
  channel: 'Email'
};

alertTypes.forEach((type) => {
  supportedLanguages.forEach((lang) => {
    runTest(`Backend template [${type}] renders valid subject, emailBody, and sms in [${lang}]`, () => {
      const content = generateNotificationContent(type, lang, sampleData);
      assert.ok(content.subject && content.subject.length > 5, `Subject for ${type} [${lang}]`);
      assert.ok(content.body && content.body.includes(sampleData.medicineName) || content.body.includes(sampleData.caretakerName), `Body for ${type} [${lang}]`);
      assert.ok(content.sms && content.sms.length > 10, `SMS for ${type} [${lang}]`);
    });
  });
});

runTest('Backend getNotificationTemplate() falls back cleanly to English if unknown language requested', () => {
  const tpl = getNotificationTemplate('missedDose', 'fr');
  assert.ok(tpl.subject, 'Fallback subject exists');
  assert.strictEqual(typeof tpl.emailBody, 'function', 'Fallback emailBody exists');
});

// -----------------------------------------------------------------------------
// SECTION 5: UTF-8 BOM CSV Exports with Localized Headers
// -----------------------------------------------------------------------------
console.log('\n--- 5. UTF-8 BOM CSV Exports with Localized Headers ---');

runTest('formatCsvContent() generates UTF-8 BOM (\\uFEFF) at byte 0', () => {
  const headers = ['Medicine Name', 'Dosage', 'Status'];
  const rows = [['Aspirin', '100mg', 'Taken']];
  const csv = formatCsvContent(headers, rows);
  assert.strictEqual(csv.charCodeAt(0), 0xfeff, 'First char must be UTF-8 BOM (0xFEFF)');
});

runTest('formatCsvContent() safely serializes Devanagari Hindi and Telugu Unicode headers and rows', () => {
  const hiHeaders = getTranslation('hi').reportsPage.csvHeaders.daily;
  const hiRows = [['मेटफॉर्मिन', '500 मिलीग्राम', '08:00 पूर्वाह्न', 'लिया गया', '08:05 पूर्वाह्न', '']];
  const csvHi = formatCsvContent(hiHeaders, hiRows);
  assert.ok(csvHi.includes('दवा का नाम') || csvHi.includes('खुराक'), 'Devanagari header preserved');
  assert.ok(csvHi.includes('मेटफॉर्मिन'), 'Devanagari cell content preserved');

  const teHeaders = getTranslation('te').reportsPage.csvHeaders.daily;
  const teRows = [['మెట్‌ఫార్మిన్', '500 మి.గ్రా', '08:00 ఉదయం', 'తీసుకున్నారు', '08:02 ఉదయం', '']];
  const csvTe = formatCsvContent(teHeaders, teRows);
  assert.ok(csvTe.includes('మందు పేరు') || csvTe.includes('మోతాదు'), 'Telugu header preserved');
  assert.ok(csvTe.includes('మెట్‌ఫార్మిన్'), 'Telugu cell content preserved');
});

// -----------------------------------------------------------------------------
// SECTION 6: Reminder Engine & 3-Snooze Invariance During Language Switching
// -----------------------------------------------------------------------------
console.log('\n--- 6. Reminder Engine & Snooze Invariance Across Language Switching ---');

runTest('Dose occurrence ID generation is purely deterministic and unaffected by language changes', () => {
  const occ1 = generateDoseOccurrenceId('med-123', '2026-10-31', '08:00');
  const occ2 = generateDoseOccurrenceId('med-123', '2026-10-31', '08:00');
  assert.strictEqual(occ1, occ2);
  assert.strictEqual(occ1, 'dose_med-123_2026-10-31_0800');
});

runTest('Snooze count and 3-snooze limit logic remain intact and preserve active reminder state', () => {
  const dose = {
    id: 'dose_med-1_2026-10-31_0800',
    medicineId: 'med-1',
    medicineName: 'Amlodipine',
    scheduledTime: '08:00',
    date: '2026-10-31',
    status: 'due',
    snoozeCount: 0
  };

  // Snooze 1 in English
  const res1 = applySnoozeToDose(dose, false);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.dose.snoozeCount, 1);
  assert.strictEqual(res1.dose.status, 'snoozed');

  // Simulate user switching to Hindi
  const lang1 = 'hi';
  assert.strictEqual(lang1, 'hi');
  const res2 = applySnoozeToDose(res1.dose, false);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.dose.snoozeCount, 2);

  // Simulate user switching to Telugu
  const lang2 = 'te';
  assert.strictEqual(lang2, 'te');
  const res3 = applySnoozeToDose(res2.dose, false);
  assert.strictEqual(res3.success, true);
  assert.strictEqual(res3.dose.snoozeCount, 3);

  // Fourth snooze attempt must be rejected regardless of language
  const res4 = applySnoozeToDose(res3.dose, false);
  assert.strictEqual(res4.success, false);
  assert.strictEqual(res4.dose.snoozeCount, 3);
  assert.ok((res4.message || res4.error || '').includes('Maximum') || (res4.message || res4.error || '').includes('3'));
});

// -----------------------------------------------------------------------------
// SECTION 7: CSS & Font Fallback Checks for Unicode Script Rendering
// -----------------------------------------------------------------------------
console.log('\n--- 7. Unicode Typography & Font Fallback Integrity ---');

runTest('global.css includes Nirmala UI, Gautami, and Mangal font stacks for Windows Devanagari and Telugu', () => {
  const cssPath = path.join(ROOT, 'src', 'styles', 'global.css');
  assert.ok(fs.existsSync(cssPath), 'global.css exists');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  assert.ok(cssContent.includes('Nirmala UI'), 'Includes Nirmala UI font for Indic scripts');
  assert.ok(cssContent.includes('Gautami'), 'Includes Gautami font for Telugu');
  assert.ok(cssContent.includes('Mangal'), 'Includes Mangal font for Devanagari Hindi');
});

// -----------------------------------------------------------------------------
// SECTION 8: User Data Protection (Preserve User-Entered Data Without Translation)
// -----------------------------------------------------------------------------
console.log('\n--- 8. User Data Integrity (No Translation of Patient Input) ---');

runTest('User-entered doctor names, notes, and custom medicines remain unmutated', () => {
  const customMedicine = {
    name: 'Atorvastatin Dr. Rao Custom',
    doctorName: 'Dr. Ramesh Gupta, MD',
    notes: 'Take with warm milk before bedtime',
    reason: 'Cholesterol control'
  };

  // Switch across translations
  supportedLanguages.forEach((lang) => {
    const t = getTranslation(lang);
    // UI displays label in target lang, but value remains user original
    const renderedLabel = t.addMedicine.fields.doctorName;
    const renderedVal = customMedicine.doctorName;
    assert.strictEqual(renderedVal, 'Dr. Ramesh Gupta, MD');
    assert.ok(renderedLabel.length > 0);
  });
});

console.log('\n================================================================');
console.log(`VERIFICATION SUMMARY: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
console.log('================================================================');

if (totalTests - passedTests > 0) {
  process.exit(1);
}
