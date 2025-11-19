-- Complete Demo User Creation Script
-- This creates BOTH the auth user AND the profile in one script

-- Create the user in auth.users using admin functions
DO $$
DECLARE
  demo_user_id UUID;
  demo_user_exists BOOLEAN;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'demo@neurotypeplanner.com'
  ) INTO demo_user_exists;
  
  IF demo_user_exists THEN
    RAISE NOTICE 'User already exists, getting ID...';
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@neurotypeplanner.com';
  ELSE
    -- Create new user with a random UUID
    demo_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id,
      'authenticated',
      'authenticated',
      'demo@neurotypeplanner.com',
      crypt('demo123456', gen_salt('bf')),
      NOW(), -- Auto-confirm email
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      ''
    );
    
    -- Also insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      demo_user_id,
      demo_user_id::text, -- provider_id is the user_id as text
      jsonb_build_object('sub', demo_user_id::text, 'email', 'demo@neurotypeplanner.com'),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created new user with ID: %', demo_user_id;
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
  
  RAISE NOTICE '✅ User profile created/updated successfully!';
END $$;

-- Verify everything was created correctly
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Email Confirmed'
    ELSE '❌ Email NOT Confirmed'
  END as auth_status,
  up.display_name,
  up.neurotype,
  up.age_group,
  CASE
    WHEN up.id IS NOT NULL THEN '✅ Profile Created'
    ELSE '❌ Profile Missing'
  END as profile_status
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
WHERE au.email = 'demo@neurotypeplanner.com';
