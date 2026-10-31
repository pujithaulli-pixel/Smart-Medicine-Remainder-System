import { getTodayDateString } from '../utils/dateUtils';

// SVG Data URLs for realistic medicine previews that work 100% offline
export const SAMPLE_MEDICINE_IMAGES = {
  whiteTablet: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='20' fill='%23f1f5f9'/%3E%3Cellipse cx='60' cy='60' rx='42' ry='28' fill='%23ffffff' stroke='%23cbd5e1' stroke-width='4'/%3E%3Cline x1='60' y1='34' x2='60' y2='86' stroke='%23e2e8f0' stroke-width='3' stroke-linecap='round'/%3E%3Ctext x='60' y='64' font-family='sans-serif' font-size='10' font-weight='bold' fill='%2394a3b8' text-anchor='middle'%3E500%3C/text%3E%3C/svg%3E",
  yellowTablet: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='20' fill='%23fef9c3'/%3E%3Ccircle cx='60' cy='60' r='36' fill='%23fde047' stroke='%23eab308' stroke-width='4'/%3E%3Cline x1='32' y1='60' x2='88' y2='60' stroke='%23ca8a04' stroke-width='3' stroke-linecap='round'/%3E%3Ctext x='60' y='52' font-family='sans-serif' font-size='11' font-weight='bold' fill='%23854d0e' text-anchor='middle'%3E5 mg%3C/text%3E%3C/svg%3E",
  blueCapsule: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='20' fill='%23e0f2fe'/%3E%3Cg transform='rotate(-30 60 60)'%3E%3Crect x='34' y='42' width='26' height='36' rx='13' fill='%230284c7' stroke='%230369a1' stroke-width='3'/%3E%3Crect x='60' y='42' width='26' height='36' rx='13' fill='%23ffffff' stroke='%2394a3b8' stroke-width='3'/%3E%3C/g%3E%3C/svg%3E",
  redCapsule: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='20' fill='%23fee2e2'/%3E%3Cg transform='rotate(45 60 60)'%3E%3Crect x='34' y='42' width='26' height='36' rx='13' fill='%23ef4444' stroke='%23b91c1c' stroke-width='3'/%3E%3Crect x='60' y='42' width='26' height='36' rx='13' fill='%23fef08a' stroke='%23eab308' stroke-width='3'/%3E%3C/g%3E%3C/svg%3E",
  syrupBottle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='20' fill='%23f3e8ff'/%3E%3Crect x='42' y='44' width='36' height='52' rx='6' fill='%23c084fc' stroke='%239333ea' stroke-width='3'/%3E%3Crect x='48' y='28' width='24' height='16' rx='3' fill='%237e22ce'/%3E%3Crect x='52' y='58' width='16' height='24' rx='2' fill='%23ffffff' opacity='0.8'/%3E%3C/svg%3E"
};

export const INITIAL_SAMPLE_MEDICINES = [
  {
    id: 'med-101',
    name: 'Metformin Hydrochloride',
    category: 'tablet',
    medicineForm: 'tablet',
    route: 'oral',
    dosageAmount: '500',
    dosageUnit: 'mg',
    dosesPerDay: 2,
    times: ['08:00', '20:00'],
    reminderTimes: ['08:00', '20:00'],
    startDate: '2026-10-01',
    endDate: '',
    isOngoing: true,
    ongoing: true,
    foodInstruction: 'afterFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.whiteTablet,
    status: 'active', // active, paused, completed, discontinued
    doctorName: 'Dr. Anand Verma (Endocrinologist)',
    prescriptionReference: 'RX-2026-7812',
    reason: 'Type 2 Diabetes glycemic control',
    reminderLabel: 'Morning & Evening post meals',
    instructions: 'Take with a full glass of water. Swallow whole.',
    quantityRemaining: 42,
    quantityUnit: 'tablets',
    refillThreshold: 10,
    notes: 'Take with food or breakfast to avoid stomach upset. Do not skip.',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z'
  },
  {
    id: 'med-102',
    name: 'Amlodipine Besylate',
    category: 'tablet',
    medicineForm: 'tablet',
    route: 'oral',
    dosageAmount: '5',
    dosageUnit: 'mg',
    dosesPerDay: 1,
    times: ['09:00'],
    reminderTimes: ['09:00'],
    startDate: '2026-09-15',
    endDate: '',
    isOngoing: true,
    ongoing: true,
    foodInstruction: 'beforeFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.yellowTablet,
    status: 'active',
    doctorName: 'Dr. Kavita Rao (Cardiologist)',
    prescriptionReference: 'RX-2026-9041',
    reason: 'Hypertension (Blood Pressure)',
    reminderLabel: 'Morning blood pressure dose',
    instructions: 'Take 30 minutes before breakfast.',
    quantityRemaining: 6, // Low stock demo!
    quantityUnit: 'tablets',
    refillThreshold: 7,
    notes: 'Blood pressure control. Take consistently every morning.',
    createdAt: '2026-09-15T09:00:00.000Z',
    updatedAt: '2026-09-15T09:00:00.000Z'
  },
  {
    id: 'med-103',
    name: 'Atorvastatin Calcium',
    category: 'capsule',
    medicineForm: 'capsule',
    route: 'oral',
    dosageAmount: '20',
    dosageUnit: 'mg',
    dosesPerDay: 1,
    times: ['21:30'],
    reminderTimes: ['21:30'],
    startDate: '2026-10-10',
    endDate: '',
    isOngoing: true,
    ongoing: true,
    foodInstruction: 'afterFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.blueCapsule,
    status: 'active',
    doctorName: 'Dr. Kavita Rao (Cardiologist)',
    prescriptionReference: 'RX-2026-9042',
    reason: 'Cholesterol & cardiovascular risk reduction',
    reminderLabel: 'Night bedtime dose',
    instructions: 'Take before sleep.',
    quantityRemaining: 25,
    quantityUnit: 'capsules',
    refillThreshold: 5,
    notes: 'Lipid lowering medication. Best taken at bedtime.',
    createdAt: '2026-10-10T21:30:00.000Z',
    updatedAt: '2026-10-10T21:30:00.000Z'
  },
  {
    id: 'med-104',
    name: 'Vitamin D3 & Calcium Syrup',
    category: 'syrup',
    medicineForm: 'syrup',
    route: 'oral',
    dosageAmount: '10',
    dosageUnit: 'ml',
    dosesPerDay: 1,
    times: ['13:00'],
    reminderTimes: ['13:00'],
    startDate: '2026-10-20',
    endDate: '2026-11-20',
    isOngoing: false,
    ongoing: false,
    foodInstruction: 'withFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.syrupBottle,
    status: 'active',
    doctorName: 'Dr. Ramesh Gupta',
    prescriptionReference: 'RX-2026-4410',
    reason: 'Vitamin D deficiency & bone strength',
    reminderLabel: 'Afternoon lunch dose',
    instructions: 'Shake well before use.',
    quantityRemaining: 120,
    quantityUnit: 'ml',
    refillThreshold: 30,
    notes: 'Shake well before use. Measure with provided dosage cup.',
    createdAt: '2026-10-20T13:00:00.000Z',
    updatedAt: '2026-10-20T13:00:00.000Z'
  }
];

export const INITIAL_TODAY_DOSES = [
  {
    id: 'dose-01',
    medicineId: 'med-101',
    medicineName: 'Metformin Hydrochloride',
    dosage: '500 mg',
    scheduledTime: '08:00',
    foodInstruction: 'afterFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.whiteTablet,
    status: 'taken', // taken, missed, due, upcoming, snoozed
    recordedAt: '08:15 AM'
  },
  {
    id: 'dose-02',
    medicineId: 'med-102',
    medicineName: 'Amlodipine Besylate',
    dosage: '5 mg',
    scheduledTime: '09:00',
    foodInstruction: 'beforeFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.yellowTablet,
    status: 'taken',
    recordedAt: '09:05 AM'
  },
  {
    id: 'dose-03',
    medicineId: 'med-104',
    medicineName: 'Vitamin D3 & Calcium Syrup',
    dosage: '10 ml',
    scheduledTime: '13:00',
    foodInstruction: 'withFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.syrupBottle,
    status: 'due',
    recordedAt: null
  },
  {
    id: 'dose-04',
    medicineId: 'med-101',
    medicineName: 'Metformin Hydrochloride',
    dosage: '500 mg',
    scheduledTime: '20:00',
    foodInstruction: 'afterFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.whiteTablet,
    status: 'upcoming',
    recordedAt: null
  },
  {
    id: 'dose-05',
    medicineId: 'med-103',
    medicineName: 'Atorvastatin Calcium',
    dosage: '20 mg',
    scheduledTime: '21:30',
    foodInstruction: 'afterFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.blueCapsule,
    status: 'upcoming',
    recordedAt: null
  }
];

export const INITIAL_DOSE_HISTORY = [
  {
    id: 'hist-1',
    medicineName: 'Metformin Hydrochloride',
    dosage: '500 mg',
    date: '2026-10-31',
    scheduledTime: '08:00',
    status: 'taken',
    recordedTime: '08:15 AM'
  },
  {
    id: 'hist-2',
    medicineName: 'Amlodipine Besylate',
    dosage: '5 mg',
    date: '2026-10-31',
    scheduledTime: '09:00',
    status: 'taken',
    recordedTime: '09:05 AM'
  },
  {
    id: 'hist-3',
    medicineName: 'Metformin Hydrochloride',
    dosage: '500 mg',
    date: '2026-10-30',
    scheduledTime: '20:00',
    status: 'taken',
    recordedTime: '20:20 PM'
  },
  {
    id: 'hist-4',
    medicineName: 'Atorvastatin Calcium',
    dosage: '20 mg',
    date: '2026-10-30',
    scheduledTime: '21:30',
    status: 'missed',
    recordedTime: null
  },
  {
    id: 'hist-5',
    medicineName: 'Metformin Hydrochloride',
    dosage: '500 mg',
    date: '2026-10-30',
    scheduledTime: '08:00',
    status: 'taken',
    recordedTime: '08:05 AM'
  },
  {
    id: 'hist-6',
    medicineName: 'Vitamin D3 & Calcium Syrup',
    dosage: '10 ml',
    date: '2026-10-29',
    scheduledTime: '13:00',
    status: 'missed',
    recordedTime: null
  },
  {
    id: 'hist-7',
    medicineName: 'Amlodipine Besylate',
    dosage: '5 mg',
    date: '2026-10-29',
    scheduledTime: '09:00',
    status: 'taken',
    recordedTime: '09:10 AM'
  }
];

export const INITIAL_MEDICINE_HISTORY = [
  {
    id: 'med-hist-1',
    name: 'Amoxicillin Trihydrate',
    dosage: '500 mg capsule',
    category: 'capsule',
    startDate: '2026-09-01',
    endDate: '2026-09-10',
    duration: '10 days',
    reason: 'Full 10-day antibiotic course completed successfully for chest congestion.',
    doctorName: 'Dr. Ramesh Gupta',
    imageUrl: SAMPLE_MEDICINE_IMAGES.redCapsule
  },
  {
    id: 'med-hist-2',
    name: 'Pantoprazole Gastro-Resistant',
    dosage: '40 mg tablet',
    category: 'tablet',
    startDate: '2026-08-15',
    endDate: '2026-09-15',
    duration: '31 days',
    reason: 'Discontinued per physician recommendation after acidity symptoms resolved.',
    doctorName: 'Dr. Anand Verma',
    imageUrl: SAMPLE_MEDICINE_IMAGES.yellowTablet
  }
];

export const INITIAL_CARETAKER = {
  name: 'Sunita Sharma',
  relationship: 'Daughter / Primary Caregiver',
  phone: '+91 98765 43210',
  email: 'sunita.sharma@example.com',
  alertMethod: 'sms', // sms, whatsapp, email, phoneCall
  notifyMissed: true,
  notifyLowStock: true,
  notifyDailySummary: false,
  updatedAt: '2026-10-25'
};

export const INITIAL_ACTIVITY_LOG = [
  {
    id: 'act-1',
    timestamp: 'Today at 09:05 AM',
    actionText: 'Amlodipine Besylate (5 mg) marked as taken.'
  },
  {
    id: 'act-2',
    timestamp: 'Today at 08:15 AM',
    actionText: 'Metformin Hydrochloride (500 mg) marked as taken.'
  },
  {
    id: 'act-3',
    timestamp: 'Yesterday at 09:30 PM',
    actionText: 'Atorvastatin Calcium (20 mg) dose was recorded as missed.'
  },
  {
    id: 'act-4',
    timestamp: 'Oct 20, 2026',
    actionText: 'New medicine added: Vitamin D3 & Calcium Syrup.'
  }
];
