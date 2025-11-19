-- TEMPORARY: Disable RLS on tasks table for testing
-- WARNING: This removes security! Only for development/testing!

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS ENABLED (secure)'
    ELSE '⚠️ RLS DISABLED (insecure - testing only!)'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'tasks';

-- To re-enable later, run:
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
