# Supabase Authentication Setup

Your Supabase instance is configured, but you need to set up authentication to allow task creation.

## Current Status
✅ Supabase URL configured: `https://kjzpbpufphrirsjlzxua.supabase.co`  
✅ Supabase Anon Key configured  
⚠️ **Authentication needed** - Choose ONE option below

---

## Option 1: Enable Anonymous Sign-In (Recommended for Demo)

### Steps:
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/kjzpbpufphrirsjlzxua
2. Navigate to **Authentication** → **Providers**
3. Find **Anonymous** provider
4. Click **Enable** toggle
5. Click **Save**

**Benefits:**
- No user accounts needed
- Automatic sign-in
- Perfect for testing/demo

---

## Option 2: Create a Demo User Account

### Steps:
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/kjzpbpufphrirsjlzxua
2. Navigate to **Authentication** → **Users**
3. Click **Add User** → **Create new user**
4. Fill in:
   - **Email:** `demo@neurotypeplanner.com`
   - **Password:** `demo123456`
   - **Auto Confirm User:** ✅ (check this box)
5. Click **Create User**

**Benefits:**
- More control over user data
- Persistent user ID
- Can test user-specific features

---

## Option 3: Create User Profile in Database

After enabling auth (Option 1 or 2), you need to create a user profile:

### SQL to run in Supabase SQL Editor:

```sql
-- First, get the user ID from auth.users table
SELECT id FROM auth.users LIMIT 1;

-- Then insert into user_profiles (replace 'USER_ID_HERE' with actual ID)
INSERT INTO user_profiles (id, email, display_name, neurotype, age_group, preferences)
VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID from auth.users
  'demo@neurotypeplanner.com',
  'Demo User',
  'adhd',
  'adult',
  '{}'::jsonb
);
```

---

## Verification

After setup, the app should automatically:
1. ✅ Detect authenticated user
2. ✅ Create tasks successfully
3. ✅ Show success toast: "Task created successfully! ✅"
4. ✅ Save tasks to Supabase database

---

## Troubleshooting

### Error: "No authenticated user found"
- **Solution:** Enable Anonymous Auth (Option 1) OR create demo user (Option 2)

### Error: "Failed to add task"
- Check browser console for detailed error
- Verify user profile exists in `user_profiles` table
- Check Row Level Security (RLS) policies allow inserts

### Error: "Foreign key constraint violation"
- **Solution:** Create user profile (Option 3)
- The `tasks` table requires a valid `user_id` from `user_profiles`

---

## Quick Fix (Disable RLS Temporarily - NOT RECOMMENDED FOR PRODUCTION)

If you just want to test quickly:

```sql
-- Disable RLS on tasks table (TESTING ONLY!)
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Re-enable when done testing
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING:** This allows anyone to read/write tasks. Only use for local testing!

---

## Recommended Setup for Development

1. ✅ **Enable Anonymous Auth** (easiest for testing)
2. ✅ **Keep RLS enabled** (secure)
3. ✅ **Update RLS policies** to allow anonymous users:

```sql
-- Allow anonymous users to insert their own tasks
CREATE POLICY "Users can insert own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow anonymous users to view their own tasks
CREATE POLICY "Users can view own tasks"
ON tasks FOR SELECT
USING (auth.uid() = user_id);

-- Allow anonymous users to update their own tasks
CREATE POLICY "Users can update own tasks"
ON tasks FOR UPDATE
USING (auth.uid() = user_id);

-- Allow anonymous users to delete their own tasks
CREATE POLICY "Users can delete own tasks"
ON tasks FOR DELETE
USING (auth.uid() = user_id);
```

---

**Status:** Choose Option 1 (Anonymous Auth) for fastest setup! 🚀
