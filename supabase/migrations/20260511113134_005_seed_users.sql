/*
  # Seed Users via auth.users

  Creates 5 sample users with known passwords via direct auth.users insert.
  All users have password: Password123!

  Users:
  - admin@ksmms.co.zw (Tendai Moyo) - admin role
  - manager@ksmms.co.zw (Chiedza Dube) - manager role
  - officer@ksmms.co.zw (Farai Gumbo) - loan_officer role
  - cashier@ksmms.co.zw (Rumbi Chauke) - cashier role
  - accountant@ksmms.co.zw (Blessing Ncube) - accountant role
*/

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tendai Moyo"}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000002', 'manager@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Chiedza Dube"}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000003', 'officer@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Farai Gumbo"}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000004', 'cashier@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rumbi Chauke"}', now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000005', 'accountant@ksmms.co.zw', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Blessing Ncube"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_profiles (id, email, full_name, role_id, is_active, phone)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@ksmms.co.zw', 'Tendai Moyo', (SELECT id FROM roles WHERE name = 'admin'), true, '+263771000001'),
  ('a0000000-0000-0000-0000-000000000002', 'manager@ksmms.co.zw', 'Chiedza Dube', (SELECT id FROM roles WHERE name = 'manager'), true, '+263771000002'),
  ('a0000000-0000-0000-0000-000000000003', 'officer@ksmms.co.zw', 'Farai Gumbo', (SELECT id FROM roles WHERE name = 'loan_officer'), true, '+263771000003'),
  ('a0000000-0000-0000-0000-000000000004', 'cashier@ksmms.co.zw', 'Rumbi Chauke', (SELECT id FROM roles WHERE name = 'cashier'), true, '+263771000004'),
  ('a0000000-0000-0000-0000-000000000005', 'accountant@ksmms.co.zw', 'Blessing Ncube', (SELECT id FROM roles WHERE name = 'accountant'), true, '+263771000005')
ON CONFLICT (id) DO NOTHING;