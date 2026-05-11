/*
  # Create Accounting Entries, Documents, Audit Logs, and Login Sessions

  1. New Tables
    - `accounting_entries` - Financial transaction tracking (disbursement, repayment, interest, penalty, write_off)
    - `documents` - File management for KYC, loans, collateral
    - `audit_logs` - Comprehensive activity tracking
    - `login_sessions` - User session tracking

  2. Security
    - Enable RLS on all tables
    - Admin/manager/accountant can read accounting entries
    - Staff can manage documents based on role
    - Admin/manager can read audit logs
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

CREATE TABLE IF NOT EXISTS login_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  ip_address text DEFAULT '',
  device_info text DEFAULT '',
  login_at timestamptz DEFAULT now(),
  logout_at timestamptz
);

ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads accounting entries"
  ON accounting_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'accountant')));

CREATE POLICY "Staff creates accounting entries"
  ON accounting_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'cashier', 'accountant')));

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

CREATE POLICY "Admin reads audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager')));

CREATE POLICY "Staff creates audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own sessions"
  ON login_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all sessions"
  ON login_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Users can insert own sessions"
  ON login_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON login_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_accounting_type ON accounting_entries(transaction_type);
CREATE INDEX IF NOT EXISTS idx_accounting_date ON accounting_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_accounting_created_by ON accounting_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON login_sessions(user_id);