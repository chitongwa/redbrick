// ── Mock data for the admin dashboard ──

export const stats = {
  totalUsers: 1247,
  activeLoans: 389,
  repaymentRate: 87.3,
  totalDisbursed: 482650.0,
};

export const users = [
  { id: 1, full_name: 'Mrs. J. Banda',   phone_number: '+260971234567', kyc_status: 'verified', meters: 2, created_at: '2025-11-01' },
  { id: 2, full_name: 'Mr. K. Mwanza',   phone_number: '+260962345678', kyc_status: 'verified', meters: 1, created_at: '2025-12-15' },
  { id: 3, full_name: 'Ms. C. Phiri',    phone_number: '+260953456789', kyc_status: 'pending',  meters: 1, created_at: '2026-02-20' },
  { id: 4, full_name: 'Mr. D. Tembo',    phone_number: '+260974567890', kyc_status: 'verified', meters: 1, created_at: '2026-01-05' },
  { id: 5, full_name: 'Mrs. E. Mulenga', phone_number: '+260965678901', kyc_status: 'rejected', meters: 0, created_at: '2026-03-01' },
  { id: 6, full_name: 'Mr. F. Chanda',   phone_number: '+260956789012', kyc_status: 'verified', meters: 2, created_at: '2025-10-18' },
  { id: 7, full_name: 'Ms. G. Zulu',     phone_number: '+260977890123', kyc_status: 'verified', meters: 1, created_at: '2026-01-22' },
  { id: 8, full_name: 'Mr. H. Bwalya',   phone_number: '+260968901234', kyc_status: 'pending',  meters: 1, created_at: '2026-03-10' },
  { id: 9, full_name: 'Mrs. I. Sakala',  phone_number: '+260959012345', kyc_status: 'verified', meters: 3, created_at: '2025-09-05' },
  { id: 10, full_name: 'Mr. J. Mumba',   phone_number: '+260970123456', kyc_status: 'verified', meters: 1, created_at: '2026-02-14' },
];

export const loans = [
  { id: 1, user_name: 'Mrs. J. Banda',   meter: '12345678', amount: 150, status: 'repaid',    created_at: '2026-03-01', due_date: '2026-03-31', repaid_at: '2026-03-28' },
  { id: 2, user_name: 'Mrs. J. Banda',   meter: '12345678', amount: 125, status: 'active',    created_at: '2026-04-01', due_date: '2026-05-01', repaid_at: null },
  { id: 3, user_name: 'Mr. K. Mwanza',   meter: '22334455', amount: 200, status: 'repaid',    created_at: '2026-01-20', due_date: '2026-02-19', repaid_at: '2026-02-15' },
  { id: 4, user_name: 'Mr. K. Mwanza',   meter: '22334455', amount: 180, status: 'defaulted', created_at: '2026-03-05', due_date: '2026-04-04', repaid_at: null },
  { id: 5, user_name: 'Mr. D. Tembo',    meter: '55667788', amount: 100, status: 'active',    created_at: '2026-03-20', due_date: '2026-04-19', repaid_at: null },
  { id: 6, user_name: 'Mr. F. Chanda',   meter: '11223344', amount: 250, status: 'repaid',    created_at: '2026-02-10', due_date: '2026-03-12', repaid_at: '2026-03-10' },
  { id: 7, user_name: 'Ms. G. Zulu',     meter: '33445566', amount:  75, status: 'active',    created_at: '2026-04-02', due_date: '2026-05-02', repaid_at: null },
  { id: 8, user_name: 'Mrs. I. Sakala',  meter: '99001122', amount: 200, status: 'repaid',    created_at: '2025-12-15', due_date: '2026-01-14', repaid_at: '2026-01-10' },
  { id: 9, user_name: 'Mrs. I. Sakala',  meter: '99001122', amount: 150, status: 'active',    created_at: '2026-03-28', due_date: '2026-04-27', repaid_at: null },
  { id: 10,user_name: 'Mr. J. Mumba',    meter: '44556677', amount: 200, status: 'defaulted', created_at: '2026-02-01', due_date: '2026-03-03', repaid_at: null },
];

export const scoringData = {
  avgCreditLimit: 187.5,
  totalScored: 1089,
  modelVersion: 'v0.1.0',
  distribution: [
    { range: '0–50',    count: 124 },
    { range: '51–100',  count: 198 },
    { range: '101–150', count: 267 },
    { range: '151–200', count: 231 },
    { range: '201–250', count: 156 },
    { range: '251–350', count: 78 },
    { range: '351–500', count: 35 },
  ],
};
