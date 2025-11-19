-- Create Demo User Profile for Neurotype Planner
-- Run this AFTER creating the user in Supabase Dashboard

-- STEP 1: First, create the user in Supabase Dashboard:
-- Go to Authentication → Users → Add User
-- Email: demo@neurotypeplanner.com
-- Password: demo123456
-- ✅ Check "Auto Confirm User"
-- Click "Create User"

-- STEP 2: Then run this entire script to create the user profile

-- Get the user ID first
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO demo_user_id
  FROM auth.users
  WHERE email = 'demo@neurotypeplanner.com';
  
  -- Check if user exists
  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'User demo@neurotypeplanner.com not found! Please create it in Dashboard first.';
  END IF;
  
  -- Create or update the user profile
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
    jsonb_build_object(
      'theme', 'light',
      'notifications_enabled', true,
      'default_view', 'dashboard'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    neurotype = EXCLUDED.neurotype,
    age_group = EXCLUDED.age_group,
    preferences = EXCLUDED.preferences;
  
  RAISE NOTICE 'User profile created successfully for user ID: %', demo_user_id;
END $$;

-- Verify the profile was created
SELECT 
  up.id,
  up.email,
  up.display_name,
  up.neurotype,
  up.age_group,
  au.email_confirmed_at,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed'
    ELSE '❌ Email NOT Confirmed - Auto-login will fail!'
  END as confirmation_status,
  up.created_at
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.email = 'demo@neurotypeplanner.com';
