-- Create Demo User for Neurotype Planner
-- Run this in Supabase SQL Editor to create a demo user for testing

-- This script creates a demo user and their profile
-- Email: demo@neurotypeplanner.com
-- Password: demo123456

-- IMPORTANT: This SQL approach doesn't work due to auth.users constraints
-- You MUST create the user through the Supabase Dashboard UI:
-- 
-- 1. Go to Authentication → Users → Add User
-- 2. Enter email: demo@neurotypeplanner.com
-- 3. Enter password: demo123456
-- 4. Click "Create User"
-- 5. Then run the verification query below to get the user ID

-- After creating user in Dashboard, uncomment and run this to create their profile:


-- After creating user in Dashboard, uncomment and run this to create their profile:

-- Step 1: Get the user ID (run this after creating user in Dashboard)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed'
    ELSE '⚠️ Email Not Confirmed'
  END as status
FROM auth.users 
WHERE email = 'demo@neurotypeplanner.com';

-- Step 2: Copy the user ID from above, then uncomment and run this:
-- (Replace 'PASTE_USER_ID_HERE' with the actual UUID from step 1)
-- Step 2: Copy the user ID from above, then uncomment and run this:
-- (Replace 'PASTE_USER_ID_HERE' with the actual UUID from step 1)

/*
INSERT INTO public.user_profiles (
  id,
  email,
  display_name,
  neurotype,
  age_group,
  preferences
) VALUES (
  'PASTE_USER_ID_HERE', -- ⚠️ Replace with actual user ID from Step 1
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
  display_name = EXCLUDED.display_name;
*/

-- Step 3: Verify profile was created
SELECT 
  id,
  email,
  display_name,
  neurotype,
  age_group,
  created_at
FROM public.user_profiles
WHERE email = 'demo@neurotypeplanner.com';
