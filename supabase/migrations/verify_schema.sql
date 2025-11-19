-- Database Schema Verification Script
-- Run this in Supabase SQL Editor to check what tables and columns exist
-- This helps identify what migrations still need to be applied

-- =============================================
-- 1. LIST ALL TABLES
-- =============================================
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('time_blocks', 'task_templates') THEN '⏳ MISSING - Run migration 006'
        ELSE '✅ EXISTS'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =============================================
-- 2. CHECK TASKS TABLE COLUMNS
-- =============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('scheduled_at', 'actual_duration', 'buffer_time', 'completed_at') 
        THEN '🆕 Added by migration 007'
        ELSE '✅ Original'
    END as migration_status
FROM information_schema.columns 
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- =============================================
-- 3. CHECK BOARDS TABLE COLUMNS
-- =============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('share_code', 'is_public') 
        THEN '🆕 May be added by migration 007'
        ELSE '✅ Original'
    END as migration_status
FROM information_schema.columns 
WHERE table_name = 'boards'
ORDER BY ordinal_position;

-- =============================================
-- 4. CHECK IF TIME_BLOCKS TABLE EXISTS
-- =============================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'time_blocks'
        ) 
        THEN '✅ time_blocks table EXISTS'
        ELSE '❌ time_blocks table MISSING - Run migration 006'
    END as time_blocks_status;

-- =============================================
-- 5. CHECK IF TASK_TEMPLATES TABLE EXISTS
-- =============================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'task_templates'
        ) 
        THEN '✅ task_templates table EXISTS'
        ELSE '❌ task_templates table MISSING - Run migration 006'
    END as task_templates_status;

-- =============================================
-- 6. CHECK IF NOTIFICATIONS TABLE EXISTS
-- =============================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications'
        ) 
        THEN '✅ notifications table EXISTS'
        ELSE '⚠️ notifications table MISSING - Will be created by migration 007'
    END as notifications_status;

-- =============================================
-- 7. CHECK RLS STATUS FOR NEW TABLES
-- =============================================
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('time_blocks', 'task_templates', 'tasks', 'boards', 'notifications')
ORDER BY tablename;

-- =============================================
-- 8. COUNT INDEXES ON NEW TABLES
-- =============================================
SELECT 
    tablename,
    COUNT(*) as index_count,
    STRING_AGG(indexname, ', ' ORDER BY indexname) as indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('time_blocks', 'task_templates')
GROUP BY tablename
ORDER BY tablename;

-- =============================================
-- 9. CHECK CONSTRAINTS
-- =============================================
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    CASE 
        WHEN tc.constraint_name LIKE '%time_range%' THEN '🆕 Added by migration 007'
        WHEN tc.constraint_name LIKE '%duration%' THEN '🆕 Added by migration 007'
        ELSE '✅ Original'
    END as migration_status
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('tasks', 'time_blocks', 'task_templates')
ORDER BY tc.table_name, tc.constraint_type;

-- =============================================
-- 10. SUMMARY - WHAT NEEDS TO BE DONE
-- =============================================
SELECT 
    '📋 MIGRATION STATUS SUMMARY' as summary,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_blocks')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_templates')
        THEN '✅ Migration 006 appears to be applied'
        ELSE '❌ Migration 006 NEEDS to be applied'
    END as migration_006_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            AND column_name = 'scheduled_at'
        )
        THEN '✅ Migration 007 appears to be applied (or partially applied)'
        ELSE '❌ Migration 007 NEEDS to be applied'
    END as migration_007_status;

-- =============================================
-- INTERPRETATION GUIDE
-- =============================================
/*
WHAT TO DO BASED ON RESULTS:

1. If time_blocks_status shows "MISSING":
   → Run migration 006_missing_tables.sql

2. If task_templates_status shows "MISSING":
   → Run migration 006_missing_tables.sql

3. If tasks table is missing scheduled_at, actual_duration, etc.:
   → Run migration 007_schema_updates.sql

4. If boards table is missing share_code or is_public:
   → Run migration 007_schema_updates.sql (will add if missing)

5. If RLS shows "DISABLED" for any table:
   → Check migration was applied correctly
   → May need to manually enable RLS

6. If index_count is 0 for time_blocks or task_templates:
   → Migration may not have completed successfully
   → Re-run the migration

RECOMMENDED ORDER:
1. Run this verification script
2. Apply migration 006 if needed
3. Apply migration 007 if needed
4. Run this verification script again to confirm
*/
