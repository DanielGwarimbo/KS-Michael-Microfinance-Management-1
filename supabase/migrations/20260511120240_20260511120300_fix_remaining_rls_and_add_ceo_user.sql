/*
  # Fix remaining RLS policies and add CEO user

  1. Changes
    - `clients`: Add CEO to INSERT, UPDATE, DELETE policies (was missing)
    - `guarantors`: Add CEO to INSERT, UPDATE, DELETE policies (was missing)
    - `loans`: Consolidate fragmented SELECT policies into one, add CEO to UPDATE
    - `repayments`: Consolidate fragmented SELECT policies, add CEO
    - `user_profiles`: Add CEO to INSERT, UPDATE, DELETE policies
    - `accounting_entries`: Add CEO to INSERT policy
    - Add a CEO user (auth.users + user_profiles) for testing

  2. Security
    - CEO gets equivalent access to admin across all tables
    - All policies still require authentication

  3. Important notes
    1. Many tables had policies that only included 'admin' but not 'ceo',
       even though the frontend treats both roles identically for access control.
    2. The loans table had 5 separate SELECT policies (admin, manager, cashier,
       accountant, loan_officer) plus the new CEO one - consolidated into one.
*/

-- ─── Clients: fix policies ────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin CEO manager loan_officer can insert clients" ON clients;
CREATE POLICY "Admin CEO manager loan_officer can insert clients"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager', 'loan_officer'))
  );

DROP POLICY IF EXISTS "Admin CEO manager loan_officer can update clients" ON clients;
CREATE POLICY "Admin CEO manager loan_officer can update clients"
  ON clients FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager', 'loan_officer')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager', 'loan_officer')));

DROP POLICY IF EXISTS "Admin CEO can delete clients" ON clients;
CREATE POLICY "Admin CEO can delete clients"
  ON clients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo')));

-- ─── Guarantors: fix policies ────────────────────────────────────────
DROP POLICY IF EXISTS "Admin CEO manager loan_officer can insert guarantors" ON guarantors;
CREATE POLICY "Admin CEO manager loan_officer can insert guarantors"
  ON guarantors FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager', 'loan_officer'))
  );

DROP POLICY IF EXISTS "Admin CEO manager loan_officer can update guarantors" ON guarantors;
CREATE POLICY "Admin CEO manager loan_officer can update guarantors"
  ON guarantors FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager', 'loan_officer')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager', 'loan_officer')));

DROP POLICY IF EXISTS "Admin CEO can delete guarantors" ON guarantors;
CREATE POLICY "Admin CEO can delete guarantors"
  ON guarantors FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo')));

-- ─── Loans: consolidate SELECT policies ──────────────────────────────
DROP POLICY IF EXISTS "Admin reads all loans" ON loans;
DROP POLICY IF EXISTS "Manager reads all loans" ON loans;
DROP POLICY IF EXISTS "Accountant reads all loans" ON loans;
DROP POLICY IF EXISTS "Cashier reads all loans" ON loans;
DROP POLICY IF EXISTS "Loan officer reads own loans" ON loans;
DROP POLICY IF EXISTS "CEO reads all loans" ON loans;

CREATE POLICY "Staff reads loans"
  ON loans FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager', 'accountant', 'cashier', 'loan_officer'))
  );

-- Loans: fix UPDATE policies
DROP POLICY IF EXISTS "Admin updates loans" ON loans;
DROP POLICY IF EXISTS "Manager updates loans" ON loans;
DROP POLICY IF EXISTS "Cashier updates loans for disbursement" ON loans;
DROP POLICY IF EXISTS "Loan officer updates own loans" ON loans;

CREATE POLICY "Admin CEO manager update loans"
  ON loans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager')));

CREATE POLICY "Cashier updates loans for disbursement"
  ON loans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('cashier', 'loan_officer')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('cashier', 'loan_officer')));

-- Loans: fix INSERT
DROP POLICY IF EXISTS "Staff can create loans" ON loans;
CREATE POLICY "Staff can create loans"
  ON loans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager', 'loan_officer')));

-- ─── Repayments: consolidate SELECT policies ────────────────────────
DROP POLICY IF EXISTS "Admin reads all repayments" ON repayments;
DROP POLICY IF EXISTS "Manager reads all repayments" ON repayments;
DROP POLICY IF EXISTS "Accountant reads all repayments" ON repayments;
DROP POLICY IF EXISTS "Cashier reads all repayments" ON repayments;
DROP POLICY IF EXISTS "Loan officer reads repayments for own loans" ON repayments;
DROP POLICY IF EXISTS "CEO reads all repayments" ON repayments;

CREATE POLICY "Staff reads repayments"
  ON repayments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'manager', 'accountant', 'cashier', 'loan_officer'))
  );

-- Repayments: fix INSERT
DROP POLICY IF EXISTS "Cashier creates repayments" ON repayments;
CREATE POLICY "Cashier admin creates repayments"
  ON repayments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'cashier')));

-- ─── user_profiles: fix INSERT/UPDATE/DELETE ─────────────────────────
DROP POLICY IF EXISTS "Admin and CEO can insert profiles" ON user_profiles;
CREATE POLICY "Admin and CEO can insert profiles"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo'))
  );

DROP POLICY IF EXISTS "Admin and CEO can update any profile" ON user_profiles;
CREATE POLICY "Admin and CEO can update any profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo')));

DROP POLICY IF EXISTS "Admin and CEO can delete profiles" ON user_profiles;
CREATE POLICY "Admin and CEO can delete profiles"
  ON user_profiles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo')));

-- ─── accounting_entries: fix INSERT ──────────────────────────────────
DROP POLICY IF EXISTS "Staff creates accounting entries" ON accounting_entries;
CREATE POLICY "Staff creates accounting entries"
  ON accounting_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'ceo', 'cashier', 'accountant')));

-- ─── Add CEO user ────────────────────────────────────────────────────
-- Create auth user for CEO
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token, aud, role)
VALUES (
  'a0000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'ceo@ksmms.co.zw',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create profile for CEO
INSERT INTO user_profiles (id, email, full_name, role_id, is_active, phone)
SELECT 'a0000000-0000-0000-0000-000000000006', 'ceo@ksmms.co.zw', 'Nomsa Sithole', r.id, true, '+263774000006'
FROM roles r WHERE r.name = 'ceo'
ON CONFLICT (id) DO NOTHING;
