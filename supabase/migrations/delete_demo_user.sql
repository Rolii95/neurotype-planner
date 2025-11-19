-- Delete Demo User (cleanup script)
-- Run this first to remove any partially created demo user

-- Delete from user_profiles first (foreign key)
DELETE FROM public.user_profiles 
WHERE email = 'demo@neurotypeplanner.com';

-- Delete from auth.identities
DELETE FROM auth.identities 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'demo@neurotypeplanner.com'
);

-- Delete from auth.users
DELETE FROM auth.users 
WHERE email = 'demo@neurotypeplanner.com';

-- Verify deletion
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@neurotypeplanner.com')
    THEN '✅ Demo user deleted successfully'
    ELSE '❌ Demo user still exists'
  END as status;
