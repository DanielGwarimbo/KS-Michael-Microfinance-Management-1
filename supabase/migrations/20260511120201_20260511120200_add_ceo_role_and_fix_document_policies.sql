/*
  # Add CEO role and fix document RLS policies

  1. Changes
    - Add 'ceo' role to the roles table (referenced by frontend but missing from DB)
    - Fix documents SELECT policies: consolidate multiple role-specific policies
      into a single policy that allows admin, ceo, manager, loan_officer, and
      cashier to read documents. The old policies were fragmented and missing
      the CEO role.
    - Add CEO to documents INSERT and DELETE policies

  2. Security
    - CEO role gets same access as admin for document management
    - All policies still require authentication

  3. Important notes
    1. The frontend's RoleName type includes 'ceo' but the database had no
       ceo role, causing RLS policy checks that reference 'ceo' to never match.
    2. The documents table had 4 separate SELECT policies (admin, manager,
       loan_officer, cashier) but no CEO policy, so CEO users couldn't see documents.
*/

-- Add CEO role
INSERT INTO roles (name, description)
VALUES ('ceo', 'Chief Executive Officer - full system access')
ON CONFLICT (name) DO NOTHING;

-- Fix documents: consolidate SELECT policies
DROP POLICY IF EXISTS "Admin reads all documents" ON documents;
DROP POLICY IF EXISTS "Manager reads all documents" ON documents;
DROP POLICY IF EXISTS "Loan officer reads related documents" ON documents;
DROP POLICY IF EXISTS "Cashier reads documents" ON documents;

CREATE POLICY "Staff reads documents"
  ON documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('admin', 'ceo', 'manager', 'loan_officer', 'cashier')
    )
  );

-- Fix documents: add CEO to INSERT
DROP POLICY IF EXISTS "Staff uploads documents" ON documents;
CREATE POLICY "Staff uploads documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('admin', 'ceo', 'manager', 'loan_officer')
    )
  );

-- Fix documents: add delete policy for admin/CEO
DROP POLICY IF EXISTS "Admin CEO can delete documents" ON documents;
CREATE POLICY "Admin CEO manager can delete documents"
  ON documents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('admin', 'ceo', 'manager')
    )
  );
