/*
  # Create Clients and Guarantors Tables

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `client_number` (text, unique) - Auto-generated client ID (CLI-XXXX)
      - `first_name` (text)
      - `last_name` (text)
      - `id_number` (text) - National ID or passport number
      - `id_type` (text) - 'national_id' or 'passport'
      - `date_of_birth` (date)
      - `gender` (text) - 'male', 'female', 'other'
      - `phone` (text)
      - `email` (text)
      - `address` (text) - Physical address
      - `city` (text)
      - `province` (text)
      - `employment_status` (text) - 'employed', 'self_employed', 'unemployed', 'retired'
      - `employer` (text)
      - `monthly_income` (numeric)
      - `client_type` (text) - 'individual' or 'business'
      - `business_name` (text, nullable) - For business clients
      - `business_reg_number` (text, nullable) - Business registration number
      - `kyc_verified` (boolean, default false)
      - `assigned_officer_id` (uuid, FK to user_profiles) - Loan officer assigned
      - `status` (text) - 'active', 'inactive', 'blacklisted'
      - `created_by` (uuid, FK to user_profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `guarantors`
      - `id` (uuid, primary key)
      - `client_id` (uuid, FK to clients) - Client this guarantor belongs to
      - `first_name` (text)
      - `last_name` (text)
      - `id_number` (text)
      - `id_type` (text)
      - `phone` (text)
      - `email` (text)
      - `address` (text)
      - `relationship` (text) - Relationship to client
      - `employment_status` (text)
      - `employer` (text)
      - `monthly_income` (numeric)
      - `kyc_verified` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Loan officers can manage assigned clients
    - Managers and admins can read all clients
    - Cashiers and accountants can read client data
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_number text UNIQUE NOT NULL DEFAULT 'CLI-' || lpad(floor(random() * 10000)::text, 4, '0'),
  first_name text NOT NULL,
  last_name text NOT NULL,
  id_number text NOT NULL,
  id_type text NOT NULL DEFAULT 'national_id' CHECK (id_type IN ('national_id', 'passport')),
  date_of_birth date,
  gender text DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other')),
  phone text NOT NULL,
  email text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  province text DEFAULT '',
  employment_status text DEFAULT 'employed' CHECK (employment_status IN ('employed', 'self_employed', 'unemployed', 'retired')),
  employer text DEFAULT '',
  monthly_income numeric DEFAULT 0,
  client_type text DEFAULT 'individual' CHECK (client_type IN ('individual', 'business')),
  business_name text DEFAULT '',
  business_reg_number text DEFAULT '',
  kyc_verified boolean DEFAULT false,
  assigned_officer_id uuid REFERENCES user_profiles(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guarantors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  id_number text NOT NULL,
  id_type text DEFAULT 'national_id' CHECK (id_type IN ('national_id', 'passport')),
  phone text NOT NULL,
  email text DEFAULT '',
  address text DEFAULT '',
  relationship text DEFAULT '',
  employment_status text DEFAULT 'employed' CHECK (employment_status IN ('employed', 'self_employed', 'unemployed', 'retired')),
  employer text DEFAULT '',
  monthly_income numeric DEFAULT 0,
  kyc_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantors ENABLE ROW LEVEL SECURITY;

-- Clients: staff can read based on role
CREATE POLICY "Admin can read all clients"
  ON clients FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'admin')
  );

CREATE POLICY "Manager can read all clients"
  ON clients FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'manager')
  );

CREATE POLICY "Loan officer reads assigned clients"
  ON clients FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'loan_officer')
    AND assigned_officer_id = auth.uid()
  );

CREATE POLICY "Cashier can read all clients"
  ON clients FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'cashier')
  );

CREATE POLICY "Accountant can read all clients"
  ON clients FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'accountant')
  );

-- Insert policies for clients
CREATE POLICY "Admin can insert clients"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'loan_officer'))
  );

-- Update policies
CREATE POLICY "Admin and manager can update clients"
  ON clients FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager'))
  );

CREATE POLICY "Loan officer updates assigned clients"
  ON clients FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'loan_officer')
    AND assigned_officer_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'loan_officer')
    AND assigned_officer_id = auth.uid()
  );

-- Guarantors: same access pattern as clients
CREATE POLICY "Admin can read all guarantors"
  ON guarantors FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'admin')
  );

CREATE POLICY "Manager can read all guarantors"
  ON guarantors FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name = 'manager')
  );

CREATE POLICY "Staff can read guarantors via client access"
  ON guarantors FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = guarantors.client_id
      AND (
        c.assigned_officer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('cashier', 'accountant', 'loan_officer'))
      )
    )
  );

CREATE POLICY "Staff can insert guarantors"
  ON guarantors FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'loan_officer'))
  );

CREATE POLICY "Staff can update guarantors"
  ON guarantors FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'loan_officer'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id WHERE up.id = auth.uid() AND r.name IN ('admin', 'manager', 'loan_officer'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_officer ON clients(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_number ON clients(client_number);
CREATE INDEX IF NOT EXISTS idx_guarantors_client ON guarantors(client_id);
