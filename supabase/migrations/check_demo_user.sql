-- Diagnostic: Check Demo User Status

-- Check if user exists and is confirmed
SELECT 
  id,
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed - Login should work'
    ELSE '❌ Email NOT Confirmed - Login will fail!'
  END as auth_status,
  created_at
FROM auth.users
WHERE email = 'demo@neurotypeplanner.com';

-- Check if profile exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'demo@neurotypeplanner.com')
    THEN '✅ Profile exists'
    ELSE '❌ Profile missing - Run create_demo_user_SIMPLE.sql'
  END as profile_status;

-- Check if identity exists
SELECT 
  COUNT(*) as identity_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Identity exists'
    ELSE '❌ Identity missing - User may not be able to login'
  END as identity_status
FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'demo@neurotypeplanner.com');
