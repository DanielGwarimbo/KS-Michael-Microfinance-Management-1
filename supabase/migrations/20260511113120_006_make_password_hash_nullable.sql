/*
  # Make password_hash nullable in user_profiles

  Since we use Supabase Auth for authentication, the password_hash column
  in user_profiles is no longer needed as NOT NULL. Making it nullable
  allows user_profiles to be created alongside auth.users without
  duplicating password storage.
*/

ALTER TABLE user_profiles ALTER COLUMN password_hash DROP NOT NULL;