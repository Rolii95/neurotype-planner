-- Quick check if migration 007 is needed
-- Run this to see what columns are missing from tasks table

SELECT 
    '📋 TASKS TABLE - Column Status' as check_type,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'scheduled_at')
        THEN '✅ scheduled_at EXISTS' ELSE '❌ scheduled_at MISSING' END as scheduled_at_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'actual_duration')
        THEN '✅ actual_duration EXISTS' ELSE '❌ actual_duration MISSING' END as actual_duration_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'buffer_time')
        THEN '✅ buffer_time EXISTS' ELSE '❌ buffer_time MISSING' END as buffer_time_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at')
        THEN '✅ completed_at EXISTS' ELSE '❌ completed_at MISSING' END as completed_at_status;

-- Check if all columns exist
SELECT 
    '🎯 RECOMMENDATION' as action,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'scheduled_at')
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'actual_duration')
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'buffer_time')
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at')
        THEN '✅ All columns exist! Migration 007 already applied or not needed.'
        ELSE '⚠️ Some columns missing. Run migration 007_schema_updates.sql OR RUN_ALL_MIGRATIONS.sql'
    END as recommendation;
