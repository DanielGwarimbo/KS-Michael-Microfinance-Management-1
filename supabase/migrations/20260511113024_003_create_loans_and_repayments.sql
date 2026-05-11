/*
  # Create Loans, Repayments, and Repayment Schedules

  1. New Tables
    - `loans` - Loan lifecycle management (pending, approved, rejected, active, overdue, closed, defaulted)
    - `repayment_schedules` - Installment tracking per loan
    - `repayments` - Payment records with receipt numbers

  2. Security
    - Enable RLS on all tables
    - Role-based access: admin/manager read all, loan_officer reads own, cashier/accountant read all
    - Insert/update policies per role
*/

CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_number text UNIQUE NOT NULL DEFAULT 'LN-' || lpad(floor(random() * 10000)::text, 4, '0'),
  client_id uuid NOT NULL REFERENCES clients(id),
  principal numeric NOT NULL CHECK (principal > 0),
  interest_rate numeric NOT NULL CHECK (interest_rate >= 0),
  term_months integer NOT NULL CHECK (term_months > 0),
  repayment_frequency text DEFAULT 'monthly' CHECK (repayment_frequency IN ('monthly', 'biweekly', 'weekly')),
  total_payable numeric NOT NULL DEFAULT 0,
  installment_amount numeric NOT NULL DEFAULT 0,
  purpose text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'overdue', 'closed', 'defaulted')),
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  rejected_by uuid REFERENCES user_profiles(id),
  rejected_at timestamptz,
  rejection_reason text DEFAULT '',
  disbursed_by uuid REFERENCES user_profiles(id),
  disbursed_at timestamptz,
  outstanding_balance numeric DEFAULT 0,
  total_paid numeric DEFAULT 0,
  start_date date,
  maturity_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repayment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount_due numeric NOT NULL,
  principal_portion numeric NOT NULL DEFAULT 0,
  interest_portion numeric NOT NULL DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  paid_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id),
  receipt_number text UNIQUE NOT NULL DEFAULT 'RCP-' || lpad(floor(random() * 10000)::text, 4, '0'),
  amount numeric NOT NULL CHECK (amount > 0),
  principal_amount numeric NOT NULL DEFAULT 0,
  interest_amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money', 'bank_transfer')),
  received_by uuid NOT NULL REFERENCES user_profiles(id),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads all loans"
  ON loans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'admin'));

CREATE POLICY "Manager reads all loans"
  ON loans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'manager'));

CREATE POLICY "Loan officer reads own loans"
  ON loans FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Cashier reads all loans"
  ON loans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'cashier'));

CREATE POLICY "Accountant reads all loans"
  ON loans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'accountant'));

CREATE POLICY "Staff can create loans"
  ON loans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'loan_officer')));

CREATE POLICY "Admin updates loans"
  ON loans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'admin'));

CREATE POLICY "Manager updates loans"
  ON loans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'manager'));

CREATE POLICY "Cashier updates loans for disbursement"
  ON loans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'cashier'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'cashier'));

CREATE POLICY "Loan officer updates own loans"
  ON loans FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Staff reads repayment schedules"
  ON repayment_schedules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = repayment_schedules.loan_id
      AND (
        l.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'cashier', 'accountant'))
      )
    )
  );

CREATE POLICY "Staff inserts repayment schedules"
  ON repayment_schedules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'loan_officer', 'cashier')));

CREATE POLICY "Staff updates repayment schedules"
  ON repayment_schedules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'cashier', 'loan_officer')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'cashier', 'loan_officer')));

CREATE POLICY "Admin reads all repayments"
  ON repayments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'admin'));

CREATE POLICY "Manager reads all repayments"
  ON repayments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'manager'));

CREATE POLICY "Cashier reads all repayments"
  ON repayments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'cashier'));

CREATE POLICY "Accountant reads all repayments"
  ON repayments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'accountant'));

CREATE POLICY "Loan officer reads repayments for own loans"
  ON repayments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM loans l WHERE l.id = repayments.loan_id AND l.created_by = auth.uid())
  );

CREATE POLICY "Cashier creates repayments"
  ON repayments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'cashier')));

CREATE INDEX IF NOT EXISTS idx_loans_client ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_created_by ON loans(created_by);
CREATE INDEX IF NOT EXISTS idx_loans_number ON loans(loan_number);
CREATE INDEX IF NOT EXISTS idx_schedules_loan ON repayment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON repayment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_repayments_loan ON repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayments_date ON repayments(payment_date);