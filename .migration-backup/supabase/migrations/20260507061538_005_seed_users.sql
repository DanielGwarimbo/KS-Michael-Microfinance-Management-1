/*
  # Seed Sample Users

  1. Creates 5 sample users via auth.users (one per role)
  2. Inserts corresponding user_profiles records
  3. All users have password: Password123!

  Users:
  - admin@ksmms.co.zw (Admin)
  - manager@ksmms.co.zw (Manager)
  - officer@ksmms.co.zw (Loan Officer)
  - cashier@ksmms.co.zw (Cashier)
  - accountant@ksmms.co.zw (Accountant)
*/

-- Create auth users with known passwords
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tendai Moyo"}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000002', 'manager@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Chiedza Dube"}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000003', 'officer@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Farai Gumbo"}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000004', 'cashier@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rumbi Chauke"}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000005', 'accountant@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Blessing Ncube"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Create user profiles
INSERT INTO user_profiles (id, email, full_name, role_id, is_active, phone)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@ksmms.co.zw', 'Tendai Moyo', '6be36838-ce03-4f19-8eee-dcb16759f8e2', true, '+263771000001'),
  ('a0000000-0000-0000-0000-000000000002', 'manager@ksmms.co.zw', 'Chiedza Dube', '3a8dcd8f-479a-4a28-8cec-9afe6a110330', true, '+263771000002'),
  ('a0000000-0000-0000-0000-000000000003', 'officer@ksmms.co.zw', 'Farai Gumbo', '01bb008f-2a2b-4836-9820-930409e58e0a', true, '+263771000003'),
  ('a0000000-0000-0000-0000-000000000004', 'cashier@ksmms.co.zw', 'Rumbi Chauke', '3111c1ec-58e3-455a-9f63-18b713ffc038', true, '+263771000004'),
  ('a0000000-0000-0000-0000-000000000005', 'accountant@ksmms.co.zw', 'Blessing Ncube', 'f760a027-fb1b-4132-8c8e-c5dc9c20ca76', true, '+263771000005')
ON CONFLICT (id) DO NOTHING;
