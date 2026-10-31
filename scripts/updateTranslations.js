/**
 * Translation Dictionary Extension Script for Phase 6
 * Adds complete Phase 5 & 6 keys in English, Hindi, and Telugu,
 * and exports deep fallback utilities.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRANSLATIONS_PATH = path.resolve(__dirname, '../src/i18n/translations.js');

// Load existing translations
const { translations: existing } = await import('../src/i18n/translations.js');

const additions = {
  en: {
    header: {
      openDrawer: 'Open Drawer ({count})',
      alertDrawer: 'Alert Drawer',
      caretakerPage: 'Caretaker Page',
      patientRole: 'Primary Patient',
      dueNowTag: 'Due Now',
      upcomingTag: 'Upcoming'
    },
    dashboard: {
      caretakerSection: {
        bannerDisabledTitle: 'Caretaker Alerts are Currently Disabled',
        bannerDisabledDesc: 'Missed dose notifications are paused and will not be dispatched to {name}.',
        btnManage: 'Manage Caretaker Settings',
        bannerIssuesTitle: '{count} Notification Delivery Issue(s) Pending Review',
        bannerIssuesDesc: 'External delivery credentials unconfigured or delivery failed. All alert records are safely preserved locally.',
        btnOpenDrawer: 'Open Alert Drawer',
        btnResolve: 'Resolve in Caretaker',
        cardTitle: 'Caretaker & Alerts',
        badgeActive: 'Alerts Active',
        badgeDisabled: 'Alerts Disabled',
        cardSubtitle: 'Designated contact for missed dose escalations and compliance alerts.',
        labelCaretaker: 'Caretaker:',
        labelRelationship: 'Relationship:',
        labelChannel: 'Primary Channel:',
        labelQuietHours: 'Quiet Hours:',
        quietHoursOff: 'Off',
        notConfigured: 'Not configured',
        recentHeading: 'Recent Alert Events ({count})',
        noRecentAlerts: 'No recent alert dispatches recorded.',
        btnDrawer: 'Open Alert Drawer',
        btnSettings: 'Caretaker Settings'
      }
    },
    reminderModal: {
      doseIndex: 'Dose {index}: {name}',
      scheduledLabel: 'Scheduled: {time}',
      foodInstructionLabel: 'Food Instruction:',
      unmuteBtn: 'Unmute',
      testModeInterval: '(Test Mode: 15s)',
      prodInterval: '(10 mins each)'
    },
    notificationPanel: {
      title: 'Alerts & Notifications',
      recordedEvents: '{count} recorded events',
      advisoryNotice: 'In-app records track all alert generation events independently from external carrier networks.',
      filterAll: 'All ({count})',
      filterFailed: 'Issues / Failed',
      filterMissed: 'Missed Doses',
      filterSnooze: 'Snooze Limit',
      filterStock: 'Low Stock',
      noAlerts: 'No Alerts Triggered',
      noAlertsDesc: 'All scheduled medicine reminders are currently up to date.',
      noMatching: 'No Alerts Matching Filter',
      scheduledLabel: 'Scheduled: {time} ({date})',
      channelLabel: 'Channel: {channel}',
      btnRetry: 'Retry Delivery',
      btnMedicines: 'Medicines',
      btnCaretaker: 'Caretaker Page',
      statuses: {
        delivered: 'Delivered',
        deliveredInApp: 'Delivered In-App',
        providerNotConfigured: 'Provider Unconfigured',
        quietHoursHeld: 'Quiet Hours Held',
        disabledByUser: 'Alerts Disabled',
        deliveryFailed: 'Delivery Failed'
      }
    },
    caretakerPage: {
      quietHoursHeading: 'Quiet Hours (Do Not Disturb)',
      quietHoursDesc: 'Suppress sound alarms and non-emergency notifications during these hours.',
      quietHoursStart: 'Start Time',
      quietHoursEnd: 'End Time',
      quietHoursToggle: 'Enable Quiet Hours',
      emergencyNotes: 'Emergency Contact Instructions / Notes',
      emergencyNotesPlaceholder: 'e.g., Call neighbor or secondary contact if primary phone does not answer.',
      preferredChannel: 'Preferred Notification Channel',
      channels: {
        email: 'Email Notification',
        sms: 'SMS Text Message',
        inApp: 'In-App Notification Drawer'
      },
      preferredLanguage: 'Preferred Notification Language',
      languages: {
        en: 'English',
        hi: 'हिन्दी (Hindi)',
        te: 'తెలుగు (Telugu)'
      },
      alertsToggle: 'Enable Caretaker Missed Dose Alerts',
      alertsToggleDesc: 'Automatically generates escalation alerts when patient misses a scheduled medication dose.',
      testDeliveryHeading: 'Test Notification Delivery',
      testDeliveryDesc: 'Send a real test notification to verify your selected channel and contact details.',
      btnSendTest: 'Send Test Alert',
      testing: 'Sending Test Alert...',
      testSuccess: 'Test notification dispatched successfully!',
      testProviderUnconfigured: 'Delivery unavailable: External provider credentials not configured in server/.env.',
      testBackendOffline: 'Backend server is offline (http://localhost:3001).',
      serverStatus: 'Notification Server:',
      operational: 'Operational',
      offline: 'Offline',
      emailDriver: 'Email Driver:',
      smsDriver: 'SMS Driver:',
      configured: 'Configured',
      unconfigured: 'Unconfigured',
      historyHeading: 'Notification & Alert History',
      historySubtitle: 'Complete audit trail of all generated caretaker alerts and delivery attempts.',
      filters: {
        all: 'All Events',
        missed: 'Missed Doses',
        snooze: 'Snooze Warnings',
        stock: 'Low Stock',
        email: 'Email',
        sms: 'SMS',
        delivered: 'Delivered',
        failed: 'Failed / Issues'
      },
      columns: {
        timestamp: 'Timestamp',
        medicine: 'Medicine & Dose',
        eventType: 'Event Type',
        channel: 'Channel & Recipient',
        status: 'Delivery Status',
        actions: 'Actions'
      },
      btnRetry: 'Retry Delivery',
      exportCsv: 'Export Alert CSV',
      noAlerts: 'No alert events recorded yet.'
    },
    reportsPage: {
      csvHeaders: {
        daily: ['Medicine Name', 'Dosage', 'Scheduled Time', 'Status', 'Recorded Confirmation', 'Skip Reason'],
        weekly: ['Date', 'Doses Taken', 'Doses Missed', 'Doses Skipped', 'Total Resolved', 'Daily Adherence'],
        monthly: ['Period', 'Total Taken', 'Total Missed', 'Total Skipped', 'Period Adherence'],
        perMedicine: ['Medicine Name', 'Dosage', 'Status', 'Doses Taken', 'Doses Missed', 'Doses Skipped', 'Adherence', 'Recent Outcome']
      }
    },
    missedPage: {
      outcomeType: 'Outcome Type',
      reasonNotes: 'Reason / Notes',
      skippedByUser: 'Skipped by User',
      missedGraceExpired: 'Missed (Grace period expired)'
    }
  },

  hi: {
    header: {
      openDrawer: 'अलर्ट दराज खोलें ({count})',
      alertDrawer: 'अलर्ट दराज',
      caretakerPage: 'देखभालकर्ता पृष्ठ',
      patientRole: 'प्राथमिक मरीज़',
      dueNowTag: 'देय (Due Now)',
      upcomingTag: 'आगामी'
    },
    dashboard: {
      caretakerSection: {
        bannerDisabledTitle: 'देखभालकर्ता अलर्ट वर्तमान में बंद हैं',
        bannerDisabledDesc: 'छूटी हुई खुराक की सूचनाएं रोकी गई हैं और {name} को नहीं भेजी जाएंगी।',
        btnManage: 'देखभालकर्ता सेटिंग्स प्रबंधित करें',
        bannerIssuesTitle: '{count} अधिसूचना वितरण समस्याएँ समीक्षा हेतु लंबित हैं',
        bannerIssuesDesc: 'बाहरी प्रोवाइडर क्रेडेंशियल्स कॉन्फ़िगर नहीं हैं या वितरण विफल रहा। सभी रिकॉर्ड स्थानीय रूप से सुरक्षित हैं।',
        btnOpenDrawer: 'अलर्ट दराज खोलें',
        btnResolve: 'देखभालकर्ता में समाधान करें',
        cardTitle: 'देखभालकर्ता एवं अलर्ट',
        badgeActive: 'अलर्ट सक्रिय',
        badgeDisabled: 'अलर्ट बंद',
        cardSubtitle: 'छूटी खुराक की सूचना और नियम पालन के लिए नामित संपर्क व्यक्ति।',
        labelCaretaker: 'देखभालकर्ता:',
        labelRelationship: 'संबंध:',
        labelChannel: 'प्राथमिक माध्यम:',
        labelQuietHours: 'शांत समय:',
        quietHoursOff: 'बंद',
        notConfigured: 'कॉन्फ़िगर नहीं है',
        recentHeading: 'हाल की अलर्ट घटनाएं ({count})',
        noRecentAlerts: 'हाल ही में कोई अलर्ट नहीं भेजा गया है।',
        btnDrawer: 'अलर्ट दराज खोलें',
        btnSettings: 'देखभालकर्ता सेटिंग्स'
      }
    },
    reminderModal: {
      doseIndex: 'खुराक {index}: {name}',
      scheduledLabel: 'निर्धारित समय: {time}',
      foodInstructionLabel: 'भोजन निर्देश:',
      unmuteBtn: 'ध्वनि चालू करें',
      testModeInterval: '(परीक्षण मोड: 15 सेकंड)',
      prodInterval: '(प्रत्येक 10 मिनट)'
    },
    notificationPanel: {
      title: 'अलर्ट एवं सूचनाएं',
      recordedEvents: '{count} दर्ज घटनाएं',
      advisoryNotice: 'इन-ऐप रिकॉर्ड्स बाहरी मोबाइल नेटवर्क से स्वतंत्र सभी अलर्ट घटनाओं को सुरक्षित ट्रैक करते हैं।',
      filterAll: 'सभी ({count})',
      filterFailed: 'समस्याएं / असफल',
      filterMissed: 'छूटी खुराकें',
      filterSnooze: 'स्नूज़ सीमा',
      filterStock: 'कम स्टॉक',
      noAlerts: 'कोई अलर्ट नहीं',
      noAlertsDesc: 'आज के सभी निर्धारित दवा रिमाइंडर समय पर हैं।',
      noMatching: 'फ़िल्टर के अनुसार कोई अलर्ट नहीं',
      scheduledLabel: 'निर्धारित: {time} ({date})',
      channelLabel: 'माध्यम: {channel}',
      btnRetry: 'पुनः प्रयास करें',
      btnMedicines: 'दवाइयाँ',
      btnCaretaker: 'देखभालकर्ता पृष्ठ',
      statuses: {
        delivered: 'सफलतापूर्वक भेजा गया',
        deliveredInApp: 'ऐप में दर्ज',
        providerNotConfigured: 'प्रोवाइडर अपूर्ण',
        quietHoursHeld: 'शांत समय में स्थगित',
        disabledByUser: 'अलर्ट बंद हैं',
        deliveryFailed: 'भेजना असफल'
      }
    },
    caretakerPage: {
      quietHoursHeading: 'शांत समय (परेशान न करें)',
      quietHoursDesc: 'इन घंटों के दौरान ध्वनि अलार्म और गैर-आपातकालीन सूचनाएं रोकें।',
      quietHoursStart: 'प्रारंभ समय',
      quietHoursEnd: 'समाप्ति समय',
      quietHoursToggle: 'शांत समय सक्रिय करें',
      emergencyNotes: 'आपातकालीन संपर्क निर्देश / नोट्स',
      emergencyNotesPlaceholder: 'उदा. यदि प्राथमिक फोन पर उत्तर न मिले तो पड़ोसी या द्वितीयक संपर्क को फोन करें।',
      preferredChannel: 'पसंदीदा अधिसूचना माध्यम',
      channels: {
        email: 'ईमेल सूचना',
        sms: 'एसएमएस (SMS) संदेश',
        inApp: 'इन-ऐप अधिसूचना दराज'
      },
      preferredLanguage: 'पसंदीदा अधिसूचना भाषा',
      languages: {
        en: 'English (अंग्रेज़ी)',
        hi: 'हिन्दी (Hindi)',
        te: 'తెలుగు (Telugu)'
      },
      alertsToggle: 'देखभालकर्ता छूटी खुराक अलर्ट सक्षम करें',
      alertsToggleDesc: 'मरीज़ द्वारा निर्धारित दवा छूटने पर स्वचालित रूप से चेतावनी अलर्ट उत्पन्न करता है।',
      testDeliveryHeading: 'अधिसूचना वितरण का परीक्षण',
      testDeliveryDesc: 'अपने चयनित माध्यम और संपर्क विवरण को सत्यापित करने के लिए एक वास्तविक परीक्षण अधिसूचना भेजें।',
      btnSendTest: 'परीक्षण अलर्ट भेजें',
      testing: 'परीक्षण अलर्ट भेजा जा रहा है...',
      testSuccess: 'परीक्षण अधिसूचना सफलतापूर्वक भेजी गई!',
      testProviderUnconfigured: 'वितरण अनुपलब्ध: बाहरी प्रदाता क्रेडेंशियल्स server/.env में कॉन्फ़िगर नहीं हैं।',
      testBackendOffline: 'बैकएंड सर्वर ऑफ़लाइन है (http://localhost:3001)।',
      serverStatus: 'अधिसूचना सर्वर:',
      operational: 'सक्रिय (Operational)',
      offline: 'ऑफ़लाइन',
      emailDriver: 'ईमेल ड्राइवर:',
      smsDriver: 'एसएमएस ड्राइवर:',
      configured: 'कॉन्फ़िगर है',
      unconfigured: 'अपूर्ण',
      historyHeading: 'अधिसूचना एवं अलर्ट इतिहास',
      historySubtitle: 'सभी उत्पन्न देखभालकर्ता अलर्ट और वितरण प्रयासों का पूर्ण ऑडिट विवरण।',
      filters: {
        all: 'सभी घटनाएं',
        missed: 'छूटी खुराकें',
        snooze: 'स्नूज़ चेतावनियाँ',
        stock: 'कम स्टॉक',
        email: 'ईमेल',
        sms: 'एसएमएस',
        delivered: 'भेजे गए',
        failed: 'समस्याएं / असफल'
      },
      columns: {
        timestamp: 'समय',
        medicine: 'दवा एवं खुराक',
        eventType: 'घटना का प्रकार',
        channel: 'माध्यम एवं प्राप्तकर्ता',
        status: 'वितरण स्थिति',
        actions: 'कार्रवाई'
      },
      btnRetry: 'पुनः प्रयास करें',
      exportCsv: 'अलर्ट CSV निर्यात करें',
      noAlerts: 'अभी तक कोई अलर्ट घटना दर्ज नहीं हुई है।'
    },
    reportsPage: {
      csvHeaders: {
        daily: ['दवा का नाम', 'खुराक', 'निर्धारित समय', 'स्थिति', 'दर्ज पुष्टि समय', 'छोड़ने का कारण'],
        weekly: ['तारीख', 'ली गई खुराकें', 'छूटी खुराकें', 'छोड़ी गई खुराकें', 'कुल हल खुराकें', 'दैनिक पालन दर'],
        monthly: ['अवधि', 'कुल ली गई', 'कुल छूटी', 'कुल छोड़ी गई', 'अवधि पालन दर'],
        perMedicine: ['दवा का नाम', 'खुराक', 'स्थिति', 'ली गई खुराकें', 'छूटी खुराकें', 'छोड़ी गई खुराकें', 'पालन दर', 'हालिया परिणाम']
      }
    },
    missedPage: {
      outcomeType: 'परिणाम प्रकार',
      reasonNotes: 'कारण / नोट्स',
      skippedByUser: 'उपयोगकर्ता द्वारा छोड़ा गया',
      missedGraceExpired: 'छूट गई (ग्रेस अवधि समाप्त)'
    }
  },

  te: {
    header: {
      openDrawer: 'అలర్ట్ డ్రాయర్ తెరవండి ({count})',
      alertDrawer: 'అలర్ట్ డ్రాయర్',
      caretakerPage: 'సంరక్షకుని పేజీ',
      patientRole: 'ప్రాథమిక రోగి',
      dueNowTag: 'ఇప్పుడే వేసుకోవాలి (Due Now)',
      upcomingTag: 'రాబోయేవి'
    },
    dashboard: {
      caretakerSection: {
        bannerDisabledTitle: 'సంరక్షకుని అలర్ట్‌లు ప్రస్తుతం నిలిపివేయబడ్డాయి',
        bannerDisabledDesc: 'మందులు తప్పిపోయినప్పుడు హెచ్చరికలు నిలిపివేయబడ్డాయి మరియు {name}కు పంపబడవు.',
        btnManage: 'సంరక్షకుని సెట్టింగ్‌లను నిర్వహించండి',
        bannerIssuesTitle: '{count} నోటిఫికేషన్ డెలివరీ సమస్యలు సమీక్ష కోసం ఉన్నాయి',
        bannerIssuesDesc: 'బాహ్య ప్రొవైడర్ ఆధారాలు కాన్ఫిగర్ చేయబడలేదు లేదా డెలివరీ విఫలమైంది. అన్ని రికార్డులు లోకల్ గా సురక్షితంగా ఉన్నాయి.',
        btnOpenDrawer: 'అలర్ట్ డ్రాయర్ తెరవండి',
        btnResolve: 'సంరక్షకుని పేజీలో పరిష్కరించండి',
        cardTitle: 'సంరక్షకుడు & అలర్ట్‌లు',
        badgeActive: 'అలర్ట్‌లు సక్రియం',
        badgeDisabled: 'అలర్ట్‌లు నిలిపివేయబడ్డాయి',
        cardSubtitle: 'మందుల నియమ పాటించక తప్పిపోయినప్పుడు సంప్రదించే నియమిత సంరక్షకుడు.',
        labelCaretaker: 'సంరక్షకుడు:',
        labelRelationship: 'సంబంధం:',
        labelChannel: 'ప్రధాన మాధ్యమం:',
        labelQuietHours: 'నిశ్శబ్ద వేళలు:',
        quietHoursOff: 'ఆఫ్',
        notConfigured: 'కాన్ఫిగర్ చేయలేదు',
        recentHeading: 'ఇటీవలి అలర్ట్ ఘటనలు ({count})',
        noRecentAlerts: 'ఇటీవల ఎలాంటి అలర్ట్ హెచ్చరికలు నమోదు కాలేదు.',
        btnDrawer: 'అలర్ట్ డ్రాయర్ తెరవండి',
        btnSettings: 'సంరక్షకుని సెట్టింగ్‌లు'
      }
    },
    reminderModal: {
      doseIndex: 'మోతాదు {index}: {name}',
      scheduledLabel: 'షెడ్యూల్ సమయం: {time}',
      foodInstructionLabel: 'ఆహార సూచన:',
      unmuteBtn: 'శబ్దం ఆన్ చేయండి',
      testModeInterval: '(పరీక్ష మోడ్: 15 సెకన్లు)',
      prodInterval: '(ప్రతి 10 నిమిషాలు)'
    },
    notificationPanel: {
      title: 'అలర్ట్‌లు & నోటిఫికేషన్‌లు',
      recordedEvents: '{count} నమోదైన ఘటనలు',
      advisoryNotice: 'బాహ్య నెట్‌వర్క్‌లతో సంబంధం లేకుండా యాప్‌లోని రికార్డులు అన్ని అలర్ట్‌లను ఖచ్చితంగా నమోదు చేస్తాయి.',
      filterAll: 'అన్నీ ({count})',
      filterFailed: 'సమస్యలు / విఫలమైనవి',
      filterMissed: 'తప్పిపోయిన మోతాదులు',
      filterSnooze: 'వాయిదా పరిమితి',
      filterStock: 'తక్కువ నిల్వ',
      noAlerts: 'ఎలాంటి అలర్ట్‌లు లేవు',
      noAlertsDesc: 'షెడ్యూల్ చేసిన అన్ని మందుల రిమైండర్‌లు ప్రస్తుతం క్రమంగా ఉన్నాయి.',
      noMatching: 'ఫిల్టర్‌కు సరిపోలే అలర్ట్‌లు లేవు',
      scheduledLabel: 'షెడ్యూల్: {time} ({date})',
      channelLabel: 'మాధ్యమం: {channel}',
      btnRetry: 'మళ్లీ ప్రయత్నించండి',
      btnMedicines: 'మందులు',
      btnCaretaker: 'సంరక్షకుని పేజీ',
      statuses: {
        delivered: 'డెలివరీ అయింది',
        deliveredInApp: 'యాప్‌లో డెలివరీ అయింది',
        providerNotConfigured: 'ప్రొవైడర్ అమర్చలేదు',
        quietHoursHeld: 'నిశ్శబ్ద వేళల్లో ఆపబడింది',
        disabledByUser: 'అలర్ట్‌లు నిలిపివేయబడ్డాయి',
        deliveryFailed: 'డెలివరీ విఫలమైంది'
      }
    },
    caretakerPage: {
      quietHoursHeading: 'నిశ్శబ్ద వేళలు (డిస్టర్బ్ చేయవద్దు)',
      quietHoursDesc: 'ఈ వేళల్లో శబ్ద అలారాలు మరియు అత్యవసరం కాని నోటిఫికేషన్‌లను నిరోధించండి.',
      quietHoursStart: 'ప్రారంభ సమయం',
      quietHoursEnd: 'ముగింపు సమయం',
      quietHoursToggle: 'నిశ్శబ్ద వేళలను సక్రియం చేయండి',
      emergencyNotes: 'అత్యవసర సంప్రదింపు సూచనలు / నోట్స్',
      emergencyNotesPlaceholder: 'ఉదా. ప్రధాన నంబర్ స్పందించకపోతే పొరుగువారికి లేదా ద్వితీయ నంబర్‌కు కాల్ చేయండి.',
      preferredChannel: 'ప్రాధాన్య నోటిఫికేషన్ మాధ్యమం',
      channels: {
        email: 'ఈమెయిల్ నోటిఫికేషన్',
        sms: 'ఎస్ఎంఎస్ (SMS) సందేశం',
        inApp: 'యాప్ లోపలి నోటిఫికేషన్ డ్రాయర్'
      },
      preferredLanguage: 'ప్రాధాన్య నోటిఫికేషన్ భాష',
      languages: {
        en: 'English (ఇంగ్లీష్)',
        hi: 'हिन्दी (హిందీ)',
        te: 'తెలుగు (Telugu)'
      },
      alertsToggle: 'సంరక్షకుని తప్పిపోయిన మందుల అలర్ట్‌లను ఆన్ చేయండి',
      alertsToggleDesc: 'రోగి షెడ్యూల్ చేసిన మందు వేసుకోకపోతే స్వయంచాలకంగా హెచ్చరిక అలర్ట్‌లను పంపుతుంది.',
      testDeliveryHeading: 'నోటిఫికేషన్ డెలివరీ పరీక్ష',
      testDeliveryDesc: 'మీరు ఎంచుకున్న మాధ్యమం మరియు సంప్రదింపు వివరాలను ధృవీకరించడానికి పరీక్ష నోటిఫికేషన్ పంపండి.',
      btnSendTest: 'పరీక్ష అలర్ట్ పంపండి',
      testing: 'పరీక్ష అలర్ట్ పంపబడుతోంది...',
      testSuccess: 'పరీక్ష నోటిఫికేషన్ విజయవంతంగా పంపబడింది!',
      testProviderUnconfigured: 'డెలివరీ అందుబాటులో లేదు: server/.env లో బాహ్య ప్రొవైడర్ ఆధారాలు అమర్చలేదు.',
      testBackendOffline: 'బ్యాకెండ్ సర్వర్ ఆఫ్‌లైన్‌లో ఉంది (http://localhost:3001).',
      serverStatus: 'నోటిఫికేషన్ సర్వర్:',
      operational: 'సక్రియం (Operational)',
      offline: 'ఆఫ్‌లైన్',
      emailDriver: 'ఈమెయిల్ డ్రైవర్:',
      smsDriver: 'ఎస్ఎంఎస్ డ్రైవర్:',
      configured: 'అమర్చబడింది',
      unconfigured: 'అమర్చలేదు',
      historyHeading: 'నోటిఫికేషన్ & అలర్ట్ చరిత్ర',
      historySubtitle: 'సంరక్షకుని అలర్ట్‌లు మరియు డెలివరీ ప్రయత్నాల పూర్తి ఆడిట్ రికార్డు.',
      filters: {
        all: 'అన్ని ఘటనలు',
        missed: 'తప్పిపోయిన మోతాదులు',
        snooze: 'వాయిదా హెచ్చరికలు',
        stock: 'తక్కువ నిల్వ',
        email: 'ఈమెయిల్',
        sms: 'ఎస్ఎంఎస్',
        delivered: 'డెలివరీ అయినవి',
        failed: 'సమస్యలు / విఫలమైనవి'
      },
      columns: {
        timestamp: 'సమయం',
        medicine: 'మందు & మోతాదు',
        eventType: 'ఈవెంట్ రకం',
        channel: 'మాధ్యమం & గ్రహీత',
        status: 'డెలివరీ స్థితి',
        actions: 'చర్యలు'
      },
      btnRetry: 'మళ్లీ ప్రయత్నించండి',
      exportCsv: 'అలర్ట్ CSV డౌన్‌లోడ్ చేయండి',
      noAlerts: 'ఇప్పటివరకు ఎలాంటి అలర్ట్ ఘటనలు నమోదు కాలేదు.'
    },
    reportsPage: {
      csvHeaders: {
        daily: ['మందు పేరు', 'మోతాదు', 'షెడ్యూల్ సమయం', 'స్థితి', 'ధృవీకరణ సమయం', 'వదిలివేయడానికి కారణం'],
        weekly: ['తేదీ', 'తీసుకున్న మోతాదులు', 'తప్పిపోయిన మోతాదులు', 'వదిలివేసిన మోతాదులు', 'మొత్తం పరిష్కరించబడినవి', 'రోజువారీ నిబద్ధత రేటు'],
        monthly: ['వ్యవధి', 'మొత్తం తీసుకున్నవి', 'మొత్తం తప్పినవి', 'మొత్తం వదిలినవి', 'వ్యవధి నిబద్ధత రేటు'],
        perMedicine: ['మందు పేరు', 'మోతాదు', 'స్థితి', 'తీసుకున్నవి', 'తప్పినవి', 'వదిలినవి', 'నిబద్ధత రేటు', 'ఇటీవలి ఫలితం']
      }
    },
    missedPage: {
      outcomeType: 'ఫలితం రకం',
      reasonNotes: 'కారణం / నోట్స్',
      skippedByUser: 'రోగి వదిలివేసినది',
      missedGraceExpired: 'తప్పిపోయినది (గ్రేస్ సమయం ముగిసింది)'
    }
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Deep merge additions into existing translations
for (const lang of ['en', 'hi', 'te']) {
  if (additions[lang] && existing[lang]) {
    deepMerge(existing[lang], additions[lang]);
  }
}

// Write the updated file
const fileContent = `/**
 * Centralized Multilingual Translation Dictionary
 * Smart Medical Reminder System - Phase 6
 *
 * Languages Supported:
 * - English (en) - Primary
 * - Hindi (hi - हिन्दी)
 * - Telugu (te - తెలుగు)
 *
 * Includes deep fallback architecture, dynamic parameter interpolation,
 * and pluralization helpers.
 */

export const translations = ${JSON.stringify(existing, null, 2)};

/**
 * Creates a recursive deep fallback Proxy for translation objects.
 * If any key is missing in target (e.g. Hindi/Telugu), it automatically
 * falls back to English without throwing errors or displaying undefined.
 */
export function createDeepFallback(target, fallback) {
  if (typeof target !== 'object' || target === null) return target;
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj && obj[prop] !== undefined) {
        const val = obj[prop];
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          const fbVal = fallback && typeof fallback === 'object' ? fallback[prop] : undefined;
          return createDeepFallback(val, fbVal);
        }
        return val;
      }
      if (fallback && prop in fallback) {
        const fbVal = fallback[prop];
        if (typeof fbVal === 'object' && fbVal !== null && !Array.isArray(fbVal)) {
          return createDeepFallback({}, fbVal);
        }
        return fbVal;
      }
      return undefined;
    }
  });
}

/**
 * Retrieves the translation dictionary for the selected language,
 * wrapped with automatic English fallback.
 */
export function getTranslation(lang = 'en') {
  const selected = translations[lang] || translations.en;
  return createDeepFallback(selected, translations.en);
}

/**
 * Replaces dynamic placeholders like {count}, {name}, {time} in templates.
 */
export function interpolate(template, params = {}) {
  if (typeof template !== 'string') return String(template || '');
  return template.replace(/\\{([a-zA-Z0-9_]+)\\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Formats pluralization based on count.
 */
export function formatPlural(count, { one, other }) {
  return count === 1 ? one : other;
}
`;

fs.writeFileSync(TRANSLATIONS_PATH, fileContent, 'utf-8');
console.log('[SUCCESS] translations.js updated successfully with Phase 6 multilingual additions!');
