/*
  # Create Loans, Repayments, and Repayment Schedules

  1. New Tables
    - `loans`
      - `id` (uuid, primary key)
      - `loan_number` (text, unique) - Auto-generated (LN-XXXX)
      - `client_id` (uuid, FK to clients)
      - `principal` (numeric) - Loan amount
      - `interest_rate` (numeric) - Annual interest rate (%)
      - `term_months` (integer) - Loan term in months
      - `repayment_frequency` (text) - 'monthly', 'biweekly', 'weekly'
      - `total_payable` (numeric) - Principal + total interest
      - `installment_amount` (numeric) - Amount per installment
      - `purpose` (text) - Loan purpose
      - `status` (text) - 'pending', 'approved', 'rejected', 'active', 'overdue', 'closed', 'defaulted'
      - `created_by` (uuid, FK to user_profiles) - Loan officer
      - `approved_by` (uuid, FK to user_profiles, nullable) - Manager
      - `approved_at` (timestamptz, nullable)
      - `rejected_by` (uuid, FK to user_profiles, nullable)
      - `rejected_at` (timestamptz, nullable)
      - `rejection_reason` (text, nullable)
      - `disbursed_by` (uuid, FK to user_profiles, nullable) - Cashier
      - `disbursed_at` (timestamptz, nullable)
      - `outstanding_balance` (numeric) - Remaining balance
      - `total_paid` (numeric) - Total amount paid so far
      - `start_date` (date, nullable) - Disbursement date
      - `maturity_date` (date, nullable) - Expected end date
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `repayment_schedules`
      - `id` (uuid, primary key)
      - `loan_id` (uuid, FK to loans)
      - `installment_number` (integer)
      - `due_date` (date)
      - `amount_due` (numeric)
      - `principal_portion` (numeric)
      - `interest_portion` (numeric)
      - `amount_paid` (numeric, default 0)
      - `paid_date` (date, nullable)
      - `status` (text) - 'pending', 'paid', 'partial', 'overdue'
      - `created_at` (timestamptz)

    - `repayments`
      - `id` (uuid, primary key)
      - `loan_id` (uuid, FK to loans)
      - `receipt_number` (text, unique) - Auto-generated (RCP-XXXX)
      - `amount` (numeric)
      - `principal_amount` (numeric)
      - `interest_amount` (numeric)
      - `payment_date` (date)
      - `payment_method` (text) - 'cash', 'mobile_money', 'bank_transfer'
      - `received_by` (uuid, FK to user_profiles) - Cashier
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Role-based access for loan operations
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

-- Loans: role-based read access
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

-- Loans: insert (loan officers, managers, admins)
CREATE POLICY "Staff can create loans"
  ON loans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'loan_officer')));

-- Loans: update (managers approve, cashiers disburse, admins manage)
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

-- Repayment schedules: same access as loans
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

-- Repayments: role-based access
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loans_client ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_created_by ON loans(created_by);
CREATE INDEX IF NOT EXISTS idx_loans_number ON loans(loan_number);
CREATE INDEX IF NOT EXISTS idx_schedules_loan ON repayment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON repayment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_repayments_loan ON repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayments_date ON repayments(payment_date);
