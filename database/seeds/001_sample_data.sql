-- ============================================================================
-- RedBrick — Seed Data (3 test users with transaction history)
-- Run: psql -d redbrick -f seeds/001_sample_data.sql
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- USERS
-- --------------------------------------------------------------------------

INSERT INTO users (id, phone_number, full_name, kyc_status, created_at) VALUES
    (1, '+260971234567', 'Mrs. J. Banda',   'verified', '2025-11-01 08:00:00+02'),
    (2, '+260962345678', 'Mr. K. Mwanza',   'verified', '2025-12-15 10:30:00+02'),
    (3, '+260953456789', 'Ms. C. Phiri',    'pending',  '2026-02-20 14:00:00+02');

SELECT setval('users_id_seq', 3);

-- --------------------------------------------------------------------------
-- METERS
-- --------------------------------------------------------------------------

INSERT INTO meters (id, user_id, meter_number, zesco_verified, added_at) VALUES
    -- Mrs. Banda: 2 meters
    (1, 1, '12345678', true,  '2025-11-01 08:05:00+02'),
    (2, 1, '87654321', true,  '2025-11-10 09:00:00+02'),
    -- Mr. Mwanza: 1 meter
    (3, 2, '22334455', true,  '2025-12-15 10:35:00+02'),
    -- Ms. Phiri: 1 meter (not yet verified)
    (4, 3, '99887766', false, '2026-02-20 14:05:00+02');

SELECT setval('meters_id_seq', 4);

-- --------------------------------------------------------------------------
-- CREDIT LIMITS
-- --------------------------------------------------------------------------

INSERT INTO credit_limits (id, meter_id, limit_amount, calculated_at, model_version) VALUES
    (1, 1, 250.00, '2025-11-02 06:00:00+02', 'v0.1.0'),
    (2, 2, 150.00, '2025-11-11 06:00:00+02', 'v0.1.0'),
    (3, 3, 200.00, '2025-12-16 06:00:00+02', 'v0.1.0');
    -- Ms. Phiri has no credit limit yet (meter unverified)

SELECT setval('credit_limits_id_seq', 3);

-- --------------------------------------------------------------------------
-- TRANSACTIONS — ZESCO purchase history (imported)
-- --------------------------------------------------------------------------

INSERT INTO transactions (id, meter_id, amount_zmw, units_purchased, purchased_at, source) VALUES
    -- Mrs. Banda — meter 12345678
    ( 1, 1,  150.00,  85.2, '2026-01-10 09:15:00+02', 'zesco_history'),
    ( 2, 1,  200.00, 114.5, '2026-01-25 14:30:00+02', 'zesco_history'),
    ( 3, 1,  100.00,  56.8, '2026-02-12 11:00:00+02', 'zesco_history'),
    ( 4, 1,  250.00, 142.9, '2026-02-27 16:45:00+02', 'zesco_history'),
    ( 5, 1,  175.00,  99.7, '2026-03-15 08:20:00+02', 'zesco_history'),
    -- Mrs. Banda — meter 87654321
    ( 6, 2,  120.00,  68.4, '2026-02-05 10:00:00+02', 'zesco_history'),
    ( 7, 2,   80.00,  45.6, '2026-03-01 13:30:00+02', 'zesco_history'),
    -- Mr. Mwanza — meter 22334455
    ( 8, 3,  300.00, 171.4, '2026-01-05 07:00:00+02', 'zesco_history'),
    ( 9, 3,  200.00, 114.5, '2026-02-02 09:45:00+02', 'zesco_history'),
    (10, 3,  150.00,  85.7, '2026-03-10 15:00:00+02', 'zesco_history'),
    (11, 3,  180.00, 102.8, '2026-03-28 11:20:00+02', 'zesco_history'),
    -- Ms. Phiri — meter 99887766
    (12, 4,   50.00,  28.5, '2026-03-01 08:00:00+02', 'zesco_history'),
    (13, 4,   75.00,  42.8, '2026-03-20 12:00:00+02', 'zesco_history');

SELECT setval('transactions_id_seq', 13);

-- --------------------------------------------------------------------------
-- LOANS — RedBrick pay-later
-- --------------------------------------------------------------------------

INSERT INTO loans (id, meter_id, amount_borrowed, token_delivered, status, created_at, due_date, repaid_at) VALUES
    -- Mrs. Banda: 1 repaid loan, 1 active loan
    (1, 1, 150.00, '5738 2041 9637 1084 2956', 'repaid',  '2026-03-01 10:00:00+02', '2026-03-31 10:00:00+02', '2026-03-28 16:30:00+02'),
    (2, 1, 125.00, '4821 7390 5612 8043 1967', 'active',  '2026-04-01 09:00:00+02', '2026-05-01 09:00:00+02', NULL),
    -- Mr. Mwanza: 1 repaid loan, 1 defaulted loan
    (3, 3, 200.00, '3914 6027 8451 2390 7564', 'repaid',  '2026-01-20 08:00:00+02', '2026-02-19 08:00:00+02', '2026-02-15 11:00:00+02'),
    (4, 3, 180.00, '6205 1738 4092 5816 3471', 'defaulted','2026-03-05 14:00:00+02', '2026-04-04 14:00:00+02', NULL);

SELECT setval('loans_id_seq', 4);

-- RedBrick loan transactions (corresponding to loans above)
INSERT INTO transactions (id, meter_id, amount_zmw, units_purchased, purchased_at, source) VALUES
    (14, 1, 150.00,  85.7, '2026-03-01 10:00:00+02', 'redbrick'),
    (15, 1, 125.00,  71.4, '2026-04-01 09:00:00+02', 'redbrick'),
    (16, 3, 200.00, 114.3, '2026-01-20 08:00:00+02', 'redbrick'),
    (17, 3, 180.00, 102.8, '2026-03-05 14:00:00+02', 'redbrick');

SELECT setval('transactions_id_seq', 17);

-- --------------------------------------------------------------------------
-- REPAYMENTS
-- --------------------------------------------------------------------------

INSERT INTO repayments (id, loan_id, amount_paid, payment_method, paid_at) VALUES
    -- Mrs. Banda repaid loan 1 in full via MTN MoMo
    (1, 1, 150.00, 'mtn',    '2026-03-28 16:30:00+02'),
    -- Mr. Mwanza repaid loan 3 in two instalments
    (2, 3, 100.00, 'airtel',  '2026-02-05 09:00:00+02'),
    (3, 3, 100.00, 'airtel',  '2026-02-15 11:00:00+02');
    -- Loan 2 (Mrs. Banda) and Loan 4 (Mr. Mwanza) have no repayments yet

SELECT setval('repayments_id_seq', 3);

COMMIT;
