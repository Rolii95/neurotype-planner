-- Reload Supabase PostgREST Schema Cache
-- Run this if you get "Could not find the 'column_name' column" errors
-- This forces PostgREST to reload the database schema

-- Method 1: Send NOTIFY signal to reload schema
NOTIFY pgrst, 'reload schema';

-- Method 2: Alternative if above doesn't work
-- This requires superuser access (use Supabase Dashboard SQL Editor)
-- SELECT pg_reload_conf();

-- Verify tasks table schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;
