/*
  # Seed Sample Data

  Creates sample clients, guarantors, loans, repayments, accounting entries,
  repayment schedules, documents, and audit logs for demonstration purposes.
*/

-- Sample Clients
INSERT INTO clients (id, client_number, first_name, last_name, id_number, id_type, date_of_birth, gender, phone, email, address, city, province, employment_status, employer, monthly_income, client_type, kyc_verified, assigned_officer_id, status, created_by)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'CLI-1001', 'Memory', 'Chisango', '63-123456A67', 'national_id', '1985-03-15', 'female', '+263772001001', 'memory@example.com', '12 Samora Machel Ave', 'Harare', 'Harare', 'employed', 'Delta Corporation', 1200, 'individual', true, 'a0000000-0000-0000-0000-000000000003', 'active', 'a0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000002', 'CLI-1002', 'Tapiwa', 'Mukombe', '63-234567B89', 'national_id', '1990-07-22', 'male', '+263772001002', 'tapiwa@example.com', '45 Julius Nyerere Way', 'Harare', 'Harare', 'self_employed', '', 800, 'individual', true, 'a0000000-0000-0000-0000-000000000003', 'active', 'a0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000003', 'CLI-1003', 'Nyasha', 'Matarise', '63-345678C90', 'national_id', '1978-11-08', 'female', '+263772001003', 'nyasha@example.com', '78 Robert Mugabe Rd', 'Bulawayo', 'Bulawayo', 'employed', 'Econet Wireless', 2500, 'individual', true, 'a0000000-0000-0000-0000-000000000003', 'active', 'a0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000004', 'CLI-1004', 'Kudakwashe', 'Shumba', '63-456789D01', 'national_id', '1995-01-30', 'male', '+263772001004', '', '23 Leopold Takawira St', 'Gweru', 'Midlands', 'self_employed', '', 600, 'individual', false, 'a0000000-0000-0000-0000-000000000003', 'active', 'a0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000005', 'CLI-1005', 'Chenai', 'Gumbo', 'AE1234567', 'passport', '1982-05-14', 'female', '+263772001005', 'chenai@example.com', '56 Josiah Tongogara Ave', 'Mutare', 'Manicaland', 'employed', 'Old Mutual', 3000, 'business', true, 'a0000000-0000-0000-0000-000000000003', 'active', 'a0000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

UPDATE clients SET business_name = 'Chenai Enterprises', business_reg_number = 'BR-2023-00456' WHERE id = 'b0000000-0000-0000-0000-000000000005';

-- Sample Guarantors
INSERT INTO guarantors (id, client_id, first_name, last_name, id_number, id_type, phone, email, address, relationship, employment_status, employer, monthly_income, kyc_verified)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Tendai', 'Chisango', '63-987654A32', 'national_id', '+263772002001', 'tendai.c@example.com', '12 Samora Machel Ave', 'Brother', 'employed', 'FBC Bank', 1500, true),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Rumbidzai', 'Mukombe', '63-876543B21', 'national_id', '+263772002002', '', '45 Julius Nyerere Way', 'Wife', 'self_employed', '', 500, true),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Dzimbabwe', 'Matarise', '63-765432C10', 'national_id', '+263772002003', 'dzimbabwe@example.com', '78 Robert Mugabe Rd', 'Sister', 'employed', 'TelOne', 1800, true)
ON CONFLICT (id) DO NOTHING;

-- Sample Loans
INSERT INTO loans (id, loan_number, client_id, principal, interest_rate, term_months, repayment_frequency, total_payable, installment_amount, purpose, status, created_by, approved_by, approved_at, disbursed_by, disbursed_at, outstanding_balance, total_paid, start_date, maturity_date, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'LN-5001', 'b0000000-0000-0000-0000-000000000001', 2000, 10, 12, 'monthly', 2200, 183.33, 'Business expansion', 'active', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '2025-01-15T10:00:00Z', 'a0000000-0000-0000-0000-000000000004', '2025-01-16T09:00:00Z', 1650, 550, '2025-01-16', '2026-01-16', '2025-01-14T08:00:00Z'),
  ('d0000000-0000-0000-0000-000000000002', 'LN-5002', 'b0000000-0000-0000-0000-000000000002', 1000, 12, 6, 'monthly', 1060, 176.67, 'School fees', 'active', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '2025-02-01T10:00:00Z', 'a0000000-0000-0000-0000-000000000004', '2025-02-02T09:00:00Z', 706.67, 353.33, '2025-02-02', '2025-08-02', '2025-01-30T08:00:00Z'),
  ('d0000000-0000-0000-0000-000000000003', 'LN-5003', 'b0000000-0000-0000-0000-000000000003', 5000, 8, 24, 'monthly', 5800, 241.67, 'Vehicle purchase', 'pending', 'a0000000-0000-0000-0000-000000000003', NULL, NULL, NULL, NULL, 5800, 0, NULL, NULL, '2025-03-01T08:00:00Z'),
  ('d0000000-0000-0000-0000-000000000004', 'LN-5004', 'b0000000-0000-0000-0000-000000000004', 500, 15, 3, 'monthly', 518.75, 172.92, 'Emergency medical', 'rejected', 'a0000000-0000-0000-0000-000000000003', NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, '2025-03-05T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

UPDATE loans SET rejected_by = 'a0000000-0000-0000-0000-000000000002', rejected_at = '2025-03-06T10:00:00Z', rejection_reason = 'Incomplete KYC documentation - proof of residence missing' WHERE id = 'd0000000-0000-0000-0000-000000000004';

-- Sample Repayments
INSERT INTO repayments (id, loan_id, receipt_number, amount, principal_amount, interest_amount, payment_date, payment_method, received_by, notes, created_at)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'RCP-8001', 183.33, 166.67, 16.67, '2025-02-16', 'cash', 'a0000000-0000-0000-0000-000000000004', 'First installment', '2025-02-16T09:00:00Z'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'RCP-8002', 183.33, 166.67, 16.67, '2025-03-16', 'mobile_money', 'a0000000-0000-0000-0000-000000000004', 'Second installment', '2025-03-16T09:00:00Z'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'RCP-8003', 183.33, 166.67, 16.67, '2025-04-16', 'cash', 'a0000000-0000-0000-0000-000000000004', 'Third installment', '2025-04-16T09:00:00Z'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'RCP-8004', 176.67, 166.67, 10, '2025-03-02', 'cash', 'a0000000-0000-0000-0000-000000000004', 'First installment', '2025-03-02T09:00:00Z'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'RCP-8005', 176.67, 166.67, 10, '2025-04-02', 'bank_transfer', 'a0000000-0000-0000-0000-000000000004', 'Second installment', '2025-04-02T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Sample Accounting Entries
INSERT INTO accounting_entries (transaction_type, reference_id, reference_type, amount, description, created_by, created_at)
VALUES
  ('disbursement', 'd0000000-0000-0000-0000-000000000001', 'loan', 2000, 'Loan disbursement - LN-5001', 'a0000000-0000-0000-0000-000000000004', '2025-01-16T09:00:00Z'),
  ('disbursement', 'd0000000-0000-0000-0000-000000000002', 'loan', 1000, 'Loan disbursement - LN-5002', 'a0000000-0000-0000-0000-000000000004', '2025-02-02T09:00:00Z'),
  ('repayment', 'e0000000-0000-0000-0000-000000000001', 'repayment', 166.67, 'Principal repayment - LN-5001', 'a0000000-0000-0000-0000-000000000004', '2025-02-16T09:00:00Z'),
  ('interest_earned', 'e0000000-0000-0000-0000-000000000001', 'repayment', 16.67, 'Interest earned - LN-5001', 'a0000000-0000-0000-0000-000000000004', '2025-02-16T09:00:00Z'),
  ('repayment', 'e0000000-0000-0000-0000-000000000002', 'repayment', 166.67, 'Principal repayment - LN-5001', 'a0000000-0000-0000-0000-000000000004', '2025-03-16T09:00:00Z'),
  ('interest_earned', 'e0000000-0000-0000-0000-000000000002', 'repayment', 16.67, 'Interest earned - LN-5001', 'a0000000-0000-0000-0000-000000000004', '2025-03-16T09:00:00Z'),
  ('repayment', 'e0000000-0000-0000-0000-000000000003', 'repayment', 166.67, 'Principal repayment - LN-5001', 'a0000000-0000-0000-0000-000000000004', '2025-04-16T09:00:00Z'),
  ('interest_earned', 'e0000000-0000-0000-0000-000000000003', 'repayment', 16.67, 'Interest earned - LN-5001', 'a0000000-0000-0000-0000-000000000004', '2025-04-16T09:00:00Z'),
  ('repayment', 'e0000000-0000-0000-0000-000000000004', 'repayment', 166.67, 'Principal repayment - LN-5002', 'a0000000-0000-0000-0000-000000000004', '2025-03-02T09:00:00Z'),
  ('interest_earned', 'e0000000-0000-0000-0000-000000000004', 'repayment', 10, 'Interest earned - LN-5002', 'a0000000-0000-0000-0000-000000000004', '2025-03-02T09:00:00Z'),
  ('repayment', 'e0000000-0000-0000-0000-000000000005', 'repayment', 166.67, 'Principal repayment - LN-5002', 'a0000000-0000-0000-0000-000000000004', '2025-04-02T09:00:00Z'),
  ('interest_earned', 'e0000000-0000-0000-0000-000000000005', 'repayment', 10, 'Interest earned - LN-5002', 'a0000000-0000-0000-0000-000000000004', '2025-04-02T09:00:00Z');

-- Sample Repayment Schedules for LN-5001
INSERT INTO repayment_schedules (loan_id, installment_number, due_date, amount_due, principal_portion, interest_portion, amount_paid, paid_date, status)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 1, '2025-02-16', 183.33, 166.67, 16.67, 183.33, '2025-02-16', 'paid'),
  ('d0000000-0000-0000-0000-000000000001', 2, '2025-03-16', 183.33, 166.67, 16.67, 183.33, '2025-03-16', 'paid'),
  ('d0000000-0000-0000-0000-000000000001', 3, '2025-04-16', 183.33, 166.67, 16.67, 183.33, '2025-04-16', 'paid'),
  ('d0000000-0000-0000-0000-000000000001', 4, '2025-05-16', 183.33, 166.67, 16.67, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000001', 5, '2025-06-16', 183.33, 166.67, 16.67, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000001', 6, '2025-07-16', 183.33, 166.67, 16.67, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000001', 7, '2025-08-16', 183.33, 166.67, 16.67, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000001', 8, '2025-09-16', 183.33, 166.67, 16.67, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000001', 9, '2025-10-16', 183.33, 166.67, 16.67, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000001', 10, '2025-11-16', 183.33, 166.67, 16.67, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000001', 11, '2025-12-16', 183.33, 166.67, 16.67, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000001', 12, '2026-01-16', 183.37, 166.67, 16.67, 0, NULL, 'pending');

-- Sample Repayment Schedules for LN-5002
INSERT INTO repayment_schedules (loan_id, installment_number, due_date, amount_due, principal_portion, interest_portion, amount_paid, paid_date, status)
VALUES
  ('d0000000-0000-0000-0000-000000000002', 1, '2025-03-02', 176.67, 166.67, 10, 176.67, '2025-03-02', 'paid'),
  ('d0000000-0000-0000-0000-000000000002', 2, '2025-04-02', 176.67, 166.67, 10, 176.67, '2025-04-02', 'paid'),
  ('d0000000-0000-0000-0000-000000000002', 3, '2025-05-02', 176.67, 166.67, 10, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000002', 4, '2025-06-02', 176.67, 166.67, 10, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000002', 5, '2025-07-02', 176.67, 166.67, 10, 0, NULL, 'pending'),
  ('d0000000-0000-0000-0000-000000000002', 6, '2025-08-02', 176.65, 166.67, 10, 0, NULL, 'pending');

-- Sample Documents
INSERT INTO documents (entity_type, entity_id, document_type, file_name, file_path, file_size, mime_type, uploaded_by, verified, verified_by, verified_at)
VALUES
  ('client_kyc', 'b0000000-0000-0000-0000-000000000001', 'national_id', 'memory_national_id.pdf', '/uploads/memory_national_id.pdf', 245000, 'application/pdf', 'a0000000-0000-0000-0000-000000000003', true, 'a0000000-0000-0000-0000-000000000002', '2025-01-10T10:00:00Z'),
  ('client_kyc', 'b0000000-0000-0000-0000-000000000001', 'proof_of_residence', 'memory_proof_residence.pdf', '/uploads/memory_proof_residence.pdf', 180000, 'application/pdf', 'a0000000-0000-0000-0000-000000000003', true, 'a0000000-0000-0000-0000-000000000002', '2025-01-10T10:05:00Z'),
  ('client_kyc', 'b0000000-0000-0000-0000-000000000002', 'national_id', 'tapiwa_national_id.pdf', '/uploads/tapiwa_national_id.pdf', 230000, 'application/pdf', 'a0000000-0000-0000-0000-000000000003', true, 'a0000000-0000-0000-0000-000000000002', '2025-01-20T10:00:00Z'),
  ('client_kyc', 'b0000000-0000-0000-0000-000000000003', 'national_id', 'nyasha_national_id.pdf', '/uploads/nyasha_national_id.pdf', 250000, 'application/pdf', 'a0000000-0000-0000-0000-000000000003', true, 'a0000000-0000-0000-0000-000000000002', '2025-02-01T10:00:00Z'),
  ('client_kyc', 'b0000000-0000-0000-0000-000000000003', 'payslip', 'nyasha_payslip_jan.pdf', '/uploads/nyasha_payslip_jan.pdf', 320000, 'application/pdf', 'a0000000-0000-0000-0000-000000000003', true, 'a0000000-0000-0000-0000-000000000002', '2025-02-01T10:05:00Z'),
  ('client_kyc', 'b0000000-0000-0000-0000-000000000004', 'national_id', 'kuda_national_id.pdf', '/uploads/kuda_national_id.pdf', 240000, 'application/pdf', 'a0000000-0000-0000-0000-000000000003', false, NULL, NULL),
  ('guarantor_kyc', 'c0000000-0000-0000-0000-000000000001', 'national_id', 'tendai_g_national_id.pdf', '/uploads/tendai_g_national_id.pdf', 235000, 'application/pdf', 'a0000000-0000-0000-0000-000000000003', true, 'a0000000-0000-0000-0000-000000000002', '2025-01-12T10:00:00Z'),
  ('guarantor_kyc', 'c0000000-0000-0000-0000-000000000002', 'national_id', 'rumbi_g_national_id.pdf', '/uploads/rumbi_g_national_id.pdf', 220000, 'application/pdf', 'a0000000-0000-0000-0000-000000000003', true, 'a0000000-0000-0000-0000-000000000002', '2025-01-25T10:00:00Z'),
  ('guarantor_kyc', 'c0000000-0000-0000-0000-000000000003', 'national_id', 'dzimbabwe_g_national_id.pdf', '/uploads/dzimbabwe_g_national_id.pdf', 228000, 'application/pdf', 'a0000000-0000-0000-0000-000000000003', true, 'a0000000-0000-0000-0000-000000000002', '2025-02-01T10:00:00Z');

-- Sample Audit Logs
INSERT INTO audit_logs (user_id, user_role, action, module, entity_id, entity_type, details, ip_address, device_info, created_at)
VALUES
  ('a0000000-0000-0000-0000-000000000003', 'loan_officer', 'create_client', 'clients', 'b0000000-0000-0000-0000-000000000001', 'client', '{"client_number":"CLI-1001"}', '192.168.1.100', 'Chrome/Windows', '2025-01-10T08:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'manager', 'verify_kyc', 'documents', 'b0000000-0000-0000-0000-000000000001', 'client', '{"document_type":"national_id"}', '192.168.1.101', 'Chrome/Mac', '2025-01-10T10:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'loan_officer', 'create_loan', 'loans', 'd0000000-0000-0000-0000-000000000001', 'loan', '{"loan_number":"LN-5001","principal":2000}', '192.168.1.100', 'Chrome/Windows', '2025-01-14T08:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'manager', 'approve_loan', 'loans', 'd0000000-0000-0000-0000-000000000001', 'loan', '{"loan_number":"LN-5001"}', '192.168.1.101', 'Chrome/Mac', '2025-01-15T10:00:00Z'),
  ('a0000000-0000-0000-0000-000000000004', 'cashier', 'disburse_loan', 'loans', 'd0000000-0000-0000-0000-000000000001', 'loan', '{"loan_number":"LN-5001","amount":2000}', '192.168.1.102', 'Chrome/Windows', '2025-01-16T09:00:00Z'),
  ('a0000000-0000-0000-0000-000000000004', 'cashier', 'record_repayment', 'repayments', 'e0000000-0000-0000-0000-000000000001', 'repayment', '{"receipt":"RCP-8001","amount":183.33}', '192.168.1.102', 'Chrome/Windows', '2025-02-16T09:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'admin', 'create_user', 'users', 'a0000000-0000-0000-0000-000000000003', 'user', '{"email":"officer@ksmms.co.zw","role":"loan_officer"}', '192.168.1.1', 'Chrome/Mac', '2025-01-01T08:00:00Z');