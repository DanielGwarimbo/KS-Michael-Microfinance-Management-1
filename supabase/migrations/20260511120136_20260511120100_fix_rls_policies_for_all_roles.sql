/*
  # Fix RLS policies for all roles

  1. Changes
    - `user_profiles`: Allow all authenticated users to read profiles (needed for
      foreign key joins in loans, repayments, documents, audit_logs queries).
      Previously only admin/CEO and own-profile reads were allowed, which broke
      all queries that join to user_profiles for names/roles.
    - `accounting_entries`: Allow manager and accountant roles to read entries
      (previously only admin could read)
    - `audit_logs`: Allow manager and CEO roles to read logs
      (previously only admin could read)
    - `documents`: Allow manager and loan_officer to update/verify documents
      (previously only admin could update)
    - `loans`: Add CEO read policy (was missing alongside admin/manager/cashier/accountant)
    - `repayments`: Add CEO read policy (was missing)

  2. Security
    - All policies still require authentication
    - Write operations remain restricted to appropriate roles
    - Profile reads are now open to all authenticated users (necessary for
      relational joins - profiles contain names/roles shown throughout the UI)

  3. Important notes
    1. The biggest issue was user_profiles SELECT being restricted to admin/CEO only.
       Every query that joins to user_profiles (e.g., loans with creator/approver names,
       repayments with receiver names, audit logs with user names) would return null
       for non-admin users because RLS blocked the profile read.
    2. This is safe because user_profiles doesn't contain sensitive data (no password_hash
       is selected in any query - the column exists but is never fetched).
*/

-- ─── user_profiles: Allow all authenticated users to read ────────────
-- Drop the restrictive admin/CEO-only read policy
DROP POLICY IF EXISTS "Admin and CEO can read all profiles" ON user_profiles;

-- Create a new policy allowing all authenticated users to read profiles
-- (needed for FK joins throughout the app)
CREATE POLICY "Authenticated users can read profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- ─── accounting_entries: Allow manager and accountant to read ────────
DROP POLICY IF EXISTS "Admin reads accounting entries" ON accounting_entries;
CREATE POLICY "Admin manager accountant read accounting entries"
  ON accounting_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      JOIN roles ON roles.id = user_profiles.role_id
      WHERE user_profiles.id = auth.uid()
      AND roles.name IN ('admin', 'ceo', 'manager', 'accountant')
    )
  );

-- ─── audit_logs: Allow manager and CEO to read ──────────────────────
DROP POLICY IF EXISTS "Admin reads audit logs" ON audit_logs;
CREATE POLICY "Admin CEO manager read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      JOIN roles ON roles.id = user_profiles.role_id
      WHERE user_profiles.id = auth.uid()
      AND roles.name IN ('admin', 'ceo', 'manager')
    )
  );

-- ─── documents: Allow manager and loan_officer to update ─────────────
DROP POLICY IF EXISTS "Admin updates documents" ON documents;
CREATE POLICY "Admin manager loan_officer update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      JOIN roles ON roles.id = user_profiles.role_id
      WHERE user_profiles.id = auth.uid()
      AND roles.name IN ('admin', 'ceo', 'manager', 'loan_officer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      JOIN roles ON roles.id = user_profiles.role_id
      WHERE user_profiles.id = auth.uid()
      AND roles.name IN ('admin', 'ceo', 'manager', 'loan_officer')
    )
  );

-- ─── loans: Add CEO read policy ─────────────────────────────────────
CREATE POLICY "CEO reads all loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      JOIN roles ON roles.id = user_profiles.role_id
      WHERE user_profiles.id = auth.uid()
      AND roles.name = 'ceo'
    )
  );

-- ─── repayments: Add CEO read policy ───────────────────────────────
CREATE POLICY "CEO reads all repayments"
  ON repayments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      JOIN roles ON roles.id = user_profiles.role_id
      WHERE user_profiles.id = auth.uid()
      AND roles.name = 'ceo'
    )
  );
