-- Sample seed data for development

BEGIN;

INSERT INTO users (phone, name) VALUES
    ('+260971234567', 'Mrs. J. Banda');

INSERT INTO meters (user_id, meter_number, label) VALUES
    (1, '12345678', 'Primary'),
    (1, '87654321', 'Secondary');

INSERT INTO credit_scores (user_id, risk_score, credit_limit, approved) VALUES
    (1, 0.1500, 250.00, true);

INSERT INTO loans (user_id, meter_id, amount, units_kwh, token_code, status, due_at) VALUES
    (1, 1, 150.00, 85.2, '5738 2041 9637 1084 2956', 'repaid', now() + interval '30 days');

INSERT INTO repayments (loan_id, user_id, amount, method, reference) VALUES
    (1, 1, 150.00, 'mtn_momo', 'MP240328001');

INSERT INTO transactions (user_id, meter_id, type, amount, units_kwh, description) VALUES
    (1, 1, 'borrow',    150.00, 85.2,  'Electricity top-up'),
    (1, 1, 'repayment', 150.00, NULL,  'Loan repayment via MTN MoMo'),
    (1, 1, 'topup',     200.00, 114.5, 'Electricity top-up'),
    (1, 1, 'topup',     100.00, 56.8,  'Electricity top-up'),
    (1, 2, 'topup',     250.00, 142.9, 'Electricity top-up');

COMMIT;
