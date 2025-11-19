-- SIMPLE Demo User Creation
-- This ONLY creates the profile for a user you create manually in the Dashboard

-- STEP 1: Create user manually in Supabase Dashboard:
-- 1. Go to Authentication → Users → Add User
-- 2. Email: demo@neurotypeplanner.com
-- 3. Password: demo123456
-- 4. ✅ Check "Auto Confirm User"
-- 5. Click "Create User"

-- STEP 2: Run this script to create the profile

DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO demo_user_id
  FROM auth.users
  WHERE email = 'demo@neurotypeplanner.com';
  
  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found! Create demo@neurotypeplanner.com in Dashboard first.';
  END IF;
  
  -- Create the profile
  INSERT INTO public.user_profiles (
    id,
    email,
    display_name,
    neurotype,
    age_group,
    preferences
  ) VALUES (
    demo_user_id,
    'demo@neurotypeplanner.com',
    'Demo User',
    'exploring',
    'adult',
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;
  
  RAISE NOTICE '✅ Profile created for user: %', demo_user_id;
END $$;

-- Verify
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  up.display_name,
  up.neurotype
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
WHERE au.email = 'demo@neurotypeplanner.com';
