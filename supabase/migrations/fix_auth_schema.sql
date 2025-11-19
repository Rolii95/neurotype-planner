-- Refresh Supabase Schema Cache and Fix Auth Issues

-- 1. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- 2. Check if auth schema is properly set up
SELECT 
  schemaname,
  tablename,
  COUNT(*) as column_count
FROM pg_tables pt
JOIN information_schema.columns c ON c.table_name = pt.tablename AND c.table_schema = pt.schemaname
WHERE schemaname = 'auth'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 3. Verify auth.users has all required columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;
