/*
  # Create Accounting Entries, Documents, and Audit Logs

  1. New Tables
    - `accounting_entries`
      - `id` (uuid, primary key)
      - `transaction_type` (text) - 'disbursement', 'repayment', 'interest_earned', 'penalty', 'write_off'
      - `reference_id` (uuid, nullable) - Reference to loan/repayment
      - `reference_type` (text) - 'loan' or 'repayment'
      - `amount` (numeric)
      - `description` (text)
      - `created_by` (uuid, FK to user_profiles)
      - `created_at` (timestamptz)

    - `documents`
      - `id` (uuid, primary key)
      - `entity_type` (text) - 'client_kyc', 'guarantor_kyc', 'loan', 'collateral'
      - `entity_id` (uuid) - ID of the related entity
      - `document_type` (text) - 'national_id', 'passport', 'proof_of_residence', 'payslip', 'contract', 'collateral', 'other'
      - `file_name` (text) - Original file name
      - `file_path` (text) - Storage path
      - `file_size` (bigint) - File size in bytes
      - `mime_type` (text)
      - `uploaded_by` (uuid, FK to user_profiles)
      - `verified` (boolean, default false)
      - `verified_by` (uuid, FK to user_profiles, nullable)
      - `verified_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

    - `audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to user_profiles)
      - `user_role` (text)
      - `action` (text) - e.g. 'create_client', 'approve_loan'
      - `module` (text) - e.g. 'clients', 'loans', 'repayments'
      - `entity_id` (uuid, nullable) - ID of affected entity
      - `entity_type` (text, nullable)
      - `details` (jsonb, default '{}') - Additional details
      - `ip_address` (text)
      - `device_info` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admin and manager can read audit logs
    - Staff can manage documents based on role
*/

CREATE TABLE IF NOT EXISTS accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('disbursement', 'repayment', 'interest_earned', 'penalty', 'write_off')),
  reference_id uuid,
  reference_type text DEFAULT '' CHECK (reference_type IN ('', 'loan', 'repayment')),
  amount numeric NOT NULL,
  description text DEFAULT '',
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('client_kyc', 'guarantor_kyc', 'loan', 'collateral')),
  entity_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('national_id', 'passport', 'proof_of_residence', 'payslip', 'contract', 'collateral', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT '',
  uploaded_by uuid NOT NULL REFERENCES user_profiles(id),
  verified boolean DEFAULT false,
  verified_by uuid REFERENCES user_profiles(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  user_role text NOT NULL,
  action text NOT NULL,
  module text NOT NULL,
  entity_id uuid,
  entity_type text DEFAULT '',
  details jsonb DEFAULT '{}',
  ip_address text DEFAULT '',
  device_info text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Accounting entries: admin, manager, accountant can read
CREATE POLICY "Admin reads accounting entries"
  ON accounting_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'accountant')));

CREATE POLICY "Staff creates accounting entries"
  ON accounting_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'cashier', 'accountant')));

-- Documents: staff can read based on role
CREATE POLICY "Admin reads all documents"
  ON documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'admin'));

CREATE POLICY "Manager reads all documents"
  ON documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'manager'));

CREATE POLICY "Loan officer reads related documents"
  ON documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'loan_officer')
  );

CREATE POLICY "Cashier reads documents"
  ON documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'cashier'));

CREATE POLICY "Staff uploads documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'loan_officer')));

CREATE POLICY "Admin updates documents"
  ON documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager')));

-- Audit logs: admin and manager can read, all authenticated can insert
CREATE POLICY "Admin reads audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager')));

CREATE POLICY "Staff creates audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounting_type ON accounting_entries(transaction_type);
CREATE INDEX IF NOT EXISTS idx_accounting_date ON accounting_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_accounting_created_by ON accounting_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
