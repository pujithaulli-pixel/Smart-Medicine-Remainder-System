/**
 * Multilingual Caretaker Notification Templates
 * Provides templates for English, Hindi (हिन्दी), and Telugu (తెలుగు)
 * Covers: Missed Dose Alert, Snooze Limit Warning, Low Stock Alert, and Test Delivery.
 */

export const NOTIFICATION_TEMPLATES = {
  missedDose: {
    en: {
      subject: 'URGENT: Missed Medicine Dose Alert - Smart Medical Reminder',
      emailBody: (data) => `
Dear Caretaker (${data.caretakerName || 'Family Caregiver'}),

This is an automated alert from the Smart Medical Reminder System.
The patient has missed a scheduled medication dose that has passed the final reminder and grace period:

• Medicine: ${data.medicineName}
• Dosage: ${data.dosage || 'Prescribed dose'}
• Scheduled Time: ${data.scheduledTime} on ${data.scheduledDate}
• Alert Reason: Dose was not confirmed within the grace period.
${data.patientName ? `• Patient: ${data.patientName}\n` : ''}
ACTION REQUIRED:
Please contact the patient to check on their wellbeing and ensure they take the appropriate action as advised by their prescribing healthcare professional. Do not instruct them to take a double dose without physician guidance.

Timestamp: ${new Date().toLocaleString()}
System: Smart Medical Reminder System
      `.trim(),
      smsText: (data) =>
        `URGENT: Missed dose of ${data.medicineName} (${data.dosage || ''}) scheduled at ${data.scheduledTime}. Please check on the patient.`
    },
    hi: {
      subject: 'अति आवश्यक: दवा छूटने का अलर्ट - स्मार्ट मेडिकल रिमाइंडर',
      emailBody: (data) => `
प्रिय देखभालकर्ता (${data.caretakerName || 'परिवार के सदस्य'}),

यह स्मार्ट मेडिकल रिमाइंडर सिस्टम से एक स्वचालित चेतावनी संदेश है।
मरीज ने निर्धारित दवा की खुराक नहीं ली है और ग्रेस पीरियड समाप्त हो चुका है:

• दवा का नाम: ${data.medicineName}
• खुराक: ${data.dosage || 'निर्धारित खुराक'}
• निर्धारित समय: ${data.scheduledDate} को ${data.scheduledTime} बजे
• अलर्ट का कारण: ग्रेस पीरियड में खुराक की पुष्टि नहीं की गई।
${data.patientName ? `• मरीज: ${data.patientName}\n` : ''}
आवश्यक कार्रवाई:
कृपया तुरंत मरीज से संपर्क करें और उनके स्वास्थ्य की जांच करें। चिकित्सक की सलाह के बिना दोहरी खुराक न लेने दें।

समय: ${new Date().toLocaleString('hi-IN')}
सिस्टम: स्मार्ट मेडिकल रिमाइंडर सिस्टम
      `.trim(),
      smsText: (data) =>
        `अति आवश्यक: ${data.medicineName} (${data.dosage || ''}) की ${data.scheduledTime} बजे की खुराक छूट गई है। कृपया मरीज से संपर्क करें।`
    },
    te: {
      subject: 'అత్యవసరం: మందు తప్పిపోయిన అలర్ట్ - స్మార్ట్ మెడికల్ రిమైండర్',
      emailBody: (data) => `
ప్రియమైన సంరక్షకునికి (${data.caretakerName || 'కుటుంబ సంరక్షకుడు'}),

ఇది స్మార్ట్ మెడికల్ రిమైండర్ సిస్టమ్ నుండి స్వయంచాలక హెచ్చరిక.
రోగి నిర్ణీత మందు మోతాదును తీసుకోలేదు మరియు గ్రేస్ పీరియడ్ ముగిసింది:

• మందు పేరు: ${data.medicineName}
• మోతాదు: ${data.dosage || 'నిర్ణీత మోతాదు'}
• షెడ్యూల్ సమయం: ${data.scheduledDate} న ${data.scheduledTime}
• అలర్ట్ కారణం: గ్రేస్ పీరియడ్ లోపు మందు నిర్ధారణ కాలేదు.
${data.patientName ? `• రోగి: ${data.patientName}\n` : ''}
తక్షణ చర్య:
దయచేసి రోగికి కాల్ చేసి లేదా సంప్రదించి క్షేమ సమాచారం తెలుసుకోండి. డాక్టర్ సలహా లేకుండా డబుల్ డోస్ వేసుకోనివ్వకండి.

సమయం: ${new Date().toLocaleString('te-IN')}
సిస్టమ్: స్మార్ట్ మెడికల్ రిమైండర్ సిస్టమ్
      `.trim(),
      smsText: (data) =>
        `అత్యవసరం: ${data.medicineName} (${data.dosage || ''}) ${data.scheduledTime} షెడ్యూల్ మందు తప్పిపోయింది. దయచేసి రోగిని సంప్రదించండి.`
    }
  },

  snoozeWarning: {
    en: {
      subject: 'WARNING: 3-Snooze Limit Reached - Smart Medical Reminder',
      emailBody: (data) => `
Dear Caretaker (${data.caretakerName || 'Caregiver'}),

Notice: The patient has snoozed the reminder for ${data.medicineName} (${data.dosage || ''}) 3 times (the maximum allowed).
Scheduled Time: ${data.scheduledTime} on ${data.scheduledDate}

This is an early warning: The dose is now in its final reminder phase. Please ensure the patient takes the medication before it is recorded as missed.
      `.trim(),
      smsText: (data) =>
        `Notice: Patient reached max 3 snoozes for ${data.medicineName} (${data.scheduledTime}). Final reminder is active.`
    },
    hi: {
      subject: 'चेतावनी: अधिकतम 3 स्नूज़ उपयोग हो चुके हैं - स्मार्ट मेडिकल रिमाइंडर',
      emailBody: (data) => `
प्रिय देखभालकर्ता (${data.caretakerName || 'देखभालकर्ता'}),

सूचना: मरीज ने ${data.medicineName} (${data.dosage || ''}) के रिमाइंडर को 3 बार (अधिकतम सीमा) स्थगित किया है।
निर्धारित समय: ${data.scheduledTime} (${data.scheduledDate})

यह एक पूर्व चेतावनी है: दवा वर्तमान में अंतिम रिमाइंडर चरण में है। कृपया सुनिश्चित करें कि वे दवा ले लें।
      `.trim(),
      smsText: (data) =>
        `सूचना: मरीज ने ${data.medicineName} (${data.scheduledTime}) के 3 स्नूज़ उपयोग कर लिए हैं। अंतिम रिमाइंडर सक्रिय है।`
    },
    te: {
      subject: 'హెచ్చరిక: గరిష్ట 3 వాయిదాలు పూర్తయ్యాయి - స్మార్ట్ మెడికల్ రిమైండర్',
      emailBody: (data) => `
ప్రియమైన సంరక్షకునికి,

సూచన: రోగి ${data.medicineName} (${data.dosage || ''}) కోసం గరిష్ట 3 వాయిదాలను (Snoozes) ఉపయోగించారు.
షెడ్యూల్ సమయం: ${data.scheduledTime} (${data.scheduledDate})

ఇది ముందస్తు హెచ్చరిక: మందు తుది రిమైండర్ దశలో ఉంది. దయచేసి మందు తీసుకునేలా చూడండి.
      `.trim(),
      smsText: (data) =>
        `సూచన: రోగి ${data.medicineName} (${data.scheduledTime}) కోసం 3 వాయిదాలు వాడారు. తుది రిమైండర్ నడుస్తోంది.`
    }
  },

  lowStockWarning: {
    en: {
      subject: 'Medication Refill Alert - Low Stock Warning',
      emailBody: (data) => `
Dear Caretaker,

Notice: Medicine stock for ${data.medicineName} is running low.
Current remaining quantity: ${data.remainingQuantity} ${data.quantityUnit || 'units'} (Warning threshold: ${data.threshold || 5}).
Please arrange for a prescription refill with the patient's pharmacy or prescribing doctor.
      `.trim(),
      smsText: (data) =>
        `Refill Alert: ${data.medicineName} is running low (${data.remainingQuantity} left). Please arrange a refill.`
    },
    hi: {
      subject: 'दवा पुनः प्राप्ति अलर्ट - स्टॉक कम होने की सूचना',
      emailBody: (data) => `
प्रिय देखभालकर्ता,

सूचना: ${data.medicineName} का स्टॉक कम हो रहा है।
वर्तमान शेष मात्रा: ${data.remainingQuantity} ${data.quantityUnit || 'यूनिट'} (सीमा: ${data.threshold || 5})।
कृपया डॉक्टर या मेडिकल स्टोर से समय रहते दवा पुनः प्राप्त कर लें।
      `.trim(),
      smsText: (data) =>
        `स्टॉक अलर्ट: ${data.medicineName} का स्टॉक समाप्त होने वाला है (${data.remainingQuantity} शेष)। कृपया नई दवा लें।`
    },
    te: {
      subject: 'మందుల నిల్వ తగ్గిపోయింది - రీఫిల్ హెచ్చరిక',
      emailBody: (data) => `
ప్రియమైన సంరక్షకునికి,

సూచన: ${data.medicineName} మందుల నిల్వ చాలా తక్కువగా ఉంది.
ప్రస్తుత నిల్వ: ${data.remainingQuantity} ${data.quantityUnit || 'యూనిట్లు'} (హెచ్చరిక పరిమితి: ${data.threshold || 5}).
దయచేసి సకాలంలో డాక్టర్ లేదా ఫార్మసీ నుండి మందులను తెప్పించండి.
      `.trim(),
      smsText: (data) =>
        `నిల్వ హెచ్చరిక: ${data.medicineName} తక్కువగా ఉంది (${data.remainingQuantity} మిగిలింది). దయచేసి రీఫిల్ చేయించండి.`
    }
  },

  testAlert: {
    en: {
      subject: 'Test Notification - Smart Medical Reminder System',
      emailBody: (data) => `
Dear ${data.caretakerName || 'Caretaker'},

This is a verified test notification sent from the Smart Medical Reminder System.
Your contact details are correctly configured to receive missed-dose alerts for the patient.

Preferred Channel: ${data.channel || 'Email'}
Language: English
Timestamp: ${new Date().toLocaleString()}
      `.trim(),
      smsText: (data) =>
        `Smart Medical Reminder: This is a verified test message confirming your contact number is active.`
    },
    hi: {
      subject: 'परीक्षण सूचना - स्मार्ट मेडिकल रिमाइंडर सिस्टम',
      emailBody: (data) => `
प्रिय ${data.caretakerName || 'देखभालकर्ता'},

यह स्मार्ट मेडिकल रिमाइंडर सिस्टम से भेजा गया एक सफल परीक्षण संदेश है।
मरीज की छूटी हुई दवाओं के अलर्ट प्राप्त करने के लिए आपका संपर्क सही ढंग से कॉन्फ़िगर किया गया है।

चैनल: ${data.channel || 'ईमेल'}
भाषा: हिन्दी
समय: ${new Date().toLocaleString('hi-IN')}
      `.trim(),
      smsText: (data) =>
        `स्मार्ट मेडिकल रिमाइंडर: यह एक सफल परीक्षण संदेश है जो पुष्टि करता है कि आपका नंबर सक्रिय है।`
    },
    te: {
      subject: 'పరీక్షా నోటిఫికేషన్ - స్మార్ట్ మెడికల్ రిమైండర్ సిస్టమ్',
      emailBody: (data) => `
ప్రియమైన ${data.caretakerName || 'సంరక్షకుడు'},

ఇది స్మార్ట్ మెడికల్ రిమైండర్ సిస్టమ్ నుండి పంపబడిన ధృవీకరించబడిన పరీక్షా నోటిఫికేషన్.
రోగి మందులు తప్పిపోయినప్పుడు అలర్ట్‌లు పొందడానికి మీ సంప్రదింపు వివరాలు సరిగ్గా కాన్ఫిగర్ చేయబడ్డాయి.

మాధ్యమం: ${data.channel || 'ఈమెయిల్'}
భాష: తెలుగు
సమయం: ${new Date().toLocaleString('te-IN')}
      `.trim(),
      smsText: (data) =>
        `స్మార్ట్ మెడికల్ రిమైండర్: మీ మొబైల్ నంబర్ సక్రియంగా ఉందని నిర్ధారించడానికి ఇది పరీక్షా సందేశం.`
    }
  }
};

/**
 * Helper to retrieve template by alertType and language.
 * Falls back to English if language is not supported.
 */
export const getNotificationTemplate = (alertType, lang = 'en') => {
  const typeKey =
    alertType === 'snooze_limit' || alertType === 'snooze_warning'
      ? 'snoozeWarning'
      : alertType === 'low_stock'
      ? 'lowStockWarning'
      : alertType === 'test'
      ? 'testAlert'
      : 'missedDose';
  const group = NOTIFICATION_TEMPLATES[typeKey] || NOTIFICATION_TEMPLATES.missedDose;
  return group[lang] || group.en;
};

/**
 * Convenience helper to generate notification subject, text body, and html body.
 */
export const generateNotificationContent = (alertType, lang = 'en', data = {}) => {
  const tpl = getNotificationTemplate(alertType, lang);
  const subject = typeof tpl.subject === 'function' ? tpl.subject(data) : tpl.subject;
  const body = tpl.emailBody(data);
  const sms = tpl.smsText(data);
  return { subject, body, sms };
};
