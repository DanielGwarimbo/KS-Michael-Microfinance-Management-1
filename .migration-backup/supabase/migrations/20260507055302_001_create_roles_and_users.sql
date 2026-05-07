/*
  # Create Roles and Users Tables

  1. New Tables
    - `roles`
      - `id` (uuid, primary key) - Unique role identifier
      - `name` (text, unique) - Role name (admin, manager, loan_officer, cashier, accountant)
      - `description` (text) - Role description
      - `created_at` (timestamptz) - Creation timestamp
    - `user_profiles`
      - `id` (uuid, primary key) - Links to auth.users.id
      - `email` (text, unique) - User email
      - `full_name` (text) - User's full name
      - `role_id` (uuid, FK to roles) - Assigned role
      - `is_active` (boolean) - Account active status
      - `phone` (text) - Phone number
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    - `login_sessions`
      - `id` (uuid, primary key) - Session identifier
      - `user_id` (uuid, FK to user_profiles) - User who logged in
      - `ip_address` (text) - Login IP address
      - `device_info` (text) - Browser/device information
      - `login_at` (timestamptz) - Login timestamp
      - `logout_at` (timestamptz) - Logout timestamp (nullable)

  2. Security
    - Enable RLS on all tables
    - Admin can manage all users
    - Users can read own profile
    - Users can read own login sessions
*/

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role_id uuid NOT NULL REFERENCES roles(id),
  is_active boolean DEFAULT true,
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  ip_address text DEFAULT '',
  device_info text DEFAULT '',
  login_at timestamptz DEFAULT now(),
  logout_at timestamptz
);

-- Seed default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access with user management'),
  ('manager', 'Approve/reject loans, view reports, manage staff'),
  ('loan_officer', 'Create loan applications, manage assigned clients'),
  ('cashier', 'Disburse loans, record repayments'),
  ('accountant', 'View financial reports, manage accounting entries')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- Roles: authenticated users can read
CREATE POLICY "Authenticated users can read roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- User profiles: users can read own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admin can read all profiles
CREATE POLICY "Admin can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admin can insert profiles
CREATE POLICY "Admin can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admin can update profiles, users can update own
CREATE POLICY "Admin can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Login sessions: users can read own, admin can read all
CREATE POLICY "Users can read own sessions"
  ON login_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all sessions"
  ON login_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Users can insert own sessions"
  ON login_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON login_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON login_sessions(user_id);
