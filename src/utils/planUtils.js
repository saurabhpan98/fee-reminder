// src/utils/planUtils.js

export const PLANS = {
  STARTER: 'starter',
  PRO: 'pro'
};

export const PLAN_CONFIG = {
  [PLANS.STARTER]: {
    id: PLANS.STARTER,
    name: 'Starter Teacher',
    price: 0,
    priceLabel: 'Free',
    maxCoachings: 1,
    maxStudents: 50,
    allowRangeReceipts: false,
    allowWhatsapp: false,
    allowDirectChat: false,
    allowCsvExport: false,
    features: [
      'Up to 50 Active Students',
      '1 Coaching Center',
      'Single Month PDF Receipts',
      'Basic Monthly Fee Ledgers'
    ],
    restrictedFeatures: [
      'Range Date PDF Receipts',
      'Direct WhatsApp Fee Messages',
      'Encrypted Admin Direct Chat',
      'CSV/PDF Export Reports',
      'Multiple Coaching Institutes'
    ]
  },
  [PLANS.PRO]: {
    id: PLANS.PRO,
    name: 'Pro Academy',
    price: 1200,
    priceLabel: '₹ 1,200 / month',
    maxCoachings: 5,
    maxStudents: Infinity,
    allowRangeReceipts: true,
    allowWhatsapp: true,
    allowDirectChat: true,
    allowCsvExport: true,
    features: [
      'Unlimited Enrolled Students',
      'Up to 5 Coaching Centers',
      'Single & Range Date PDF Receipts',
      '1-Click WhatsApp Fee Payloads',
      'Encrypted Admin Direct Chat',
      'Full CSV & PDF Summary Exports'
    ],
    restrictedFeatures: []
  }
};

export const getUserPlanConfig = (userData) => {
  const planId = userData?.plan || PLANS.STARTER;
  return PLAN_CONFIG[planId] || PLAN_CONFIG[PLANS.STARTER];
};

export const canCreateCoaching = (userData, currentCoachingCount) => {
  const plan = getUserPlanConfig(userData);
  return currentCoachingCount < plan.maxCoachings;
};

export const canAddStudent = (userData, currentStudentCount) => {
  const plan = getUserPlanConfig(userData);
  return currentStudentCount < plan.maxStudents;
};