# Database Migration Guide

## Overview
This guide explains how to apply the SQL migrations to your Supabase database to ensure all tables and columns required by the application are present.

## New Migration Files Created

### 1. `006_missing_tables.sql` - NEW TABLES
**Purpose**: Creates tables that are referenced in code but were missing from the database

**Tables Created**:
- `time_blocks` - Calendar time blocks for scheduling tasks
- `task_templates` - Reusable task templates for quick task creation

**Key Features**:
- Full RLS (Row Level Security) policies
- Performance indexes
- Automatic `updated_at` triggers
- Foreign key constraints to `user_profiles` and `tasks`

---

### 2. `007_schema_updates.sql` - SCHEMA FIXES
**Purpose**: Adds missing columns to existing tables and ensures data integrity

**Updates to Existing Tables**:

#### `tasks` table:
- ✅ `scheduled_at` - For calendar scheduling
- ✅ `actual_duration` - Track actual time spent
- ✅ `buffer_time` - Extra transition time
- ✅ `completed_at` - Completion timestamp

#### `boards` table:
- ✅ `share_code` - Unique sharing code (if missing)
- ✅ `is_public` - Public sharing flag (if missing)

#### `notifications` table:
- ✅ Full table creation if missing
- ✅ RLS policies
- ✅ Proper enum types

#### Data Integrity:
- ✅ Constraint: `time_blocks.end_time > start_time`
- ✅ Constraint: `tasks.estimated_duration > 0`
- ✅ Constraint: `task_templates.estimated_duration > 0`
- ✅ Performance indexes on all key columns

---

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/kjzpbpufphrirsjlzxua
   - Click on **SQL Editor** in the left sidebar

2. **Run Migration 006 (New Tables)**
   - Click **+ New Query**
   - Copy the entire contents of `supabase/migrations/006_missing_tables.sql`
   - Paste into the SQL editor
   - Click **Run** (or press `Ctrl+Enter`)
   - ✅ Verify: You should see "Success. No rows returned"

3. **Run Migration 007 (Schema Updates)**
   - Click **+ New Query** again
   - Copy the entire contents of `supabase/migrations/007_schema_updates.sql`
   - Paste into the SQL editor
   - Click **Run** (or press `Ctrl+Enter`)
   - ✅ Verify: You should see "Success. No rows returned"

4. **Verify Tables Created**
   - Go to **Table Editor** in the left sidebar
   - You should now see:
     - `time_blocks` (NEW)
     - `task_templates` (NEW)
   - Check `tasks` table → Columns → Verify new columns exist:
     - `scheduled_at`
     - `actual_duration`
     - `buffer_time`
     - `completed_at`

---

### Option 2: Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref kjzpbpufphrirsjlzxua

# Apply migrations
supabase db push

# Or apply specific migration
supabase db push supabase/migrations/006_missing_tables.sql
supabase db push supabase/migrations/007_schema_updates.sql
```

---

## Verification Checklist

After running the migrations, verify the following:

### ✅ New Tables Exist
```sql
-- Run in SQL Editor to verify
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('time_blocks', 'task_templates')
ORDER BY table_name;
```
**Expected**: 2 rows returned

### ✅ Tasks Columns Updated
```sql
-- Verify tasks table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('scheduled_at', 'actual_duration', 'buffer_time', 'completed_at')
ORDER BY column_name;
```
**Expected**: 4 rows returned

### ✅ RLS Policies Active
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('time_blocks', 'task_templates')
ORDER BY tablename;
```
**Expected**: Both tables should have `rowsecurity = true`

### ✅ Indexes Created
```sql
-- Verify indexes exist
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('time_blocks', 'task_templates')
ORDER BY tablename, indexname;
```
**Expected**: Multiple indexes per table

---

## What These Migrations Fix

### 🐛 **Error: "relation 'time_blocks' does not exist"**
- **Fixed by**: `006_missing_tables.sql`
- **Creates**: `time_blocks` table with full RLS
- **Used by**: Time blocking calendar features

### 🐛 **Error: "relation 'task_templates' does not exist"**
- **Fixed by**: `006_missing_tables.sql`
- **Creates**: `task_templates` table with full RLS
- **Used by**: Template library and quick task creation

### 🐛 **Error: "column 'scheduled_at' does not exist"**
- **Fixed by**: `007_schema_updates.sql`
- **Adds**: `scheduled_at` column to `tasks` table
- **Used by**: Calendar widget and task scheduling

### 🐛 **Error: "column 'share_code' does not exist"**
- **Fixed by**: `007_schema_updates.sql`
- **Adds**: `share_code` and `is_public` to `boards` table
- **Used by**: Board sharing features

### 🐛 **Analytics 400 Errors**
- **Fixed by**: Code changes + proper `user_activity` usage
- **Note**: No migration needed - uses existing `context` JSONB field

---

## Rollback (If Needed)

If you need to undo these migrations:

```sql
-- Remove new tables (CAUTION: Deletes all data)
DROP TABLE IF EXISTS public.time_blocks CASCADE;
DROP TABLE IF EXISTS public.task_templates CASCADE;

-- Remove added columns (CAUTION: Deletes column data)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS scheduled_at;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS actual_duration;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS buffer_time;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS completed_at;
```

---

## Next Steps After Migration

1. **Enable Authentication** (if not already done)
   - See `SUPABASE_AUTH_SETUP.md`
   - Enable Anonymous Auth or create demo user

2. **Create User Profile**
   - Required for FK constraints
   - See `SUPABASE_AUTH_SETUP.md` for SQL

3. **Test Features**
   - ✅ Create task with due date (uses `scheduled_at`)
   - ✅ Use task templates (uses `task_templates` table)
   - ✅ Create time blocks (uses `time_blocks` table)
   - ✅ Check analytics (uses `user_activity.context`)

4. **Monitor Logs**
   - Check browser console for errors
   - Check Supabase Dashboard → Logs → API logs

---

## Troubleshooting

### Migration Fails with "permission denied"
**Solution**: Run migrations as the Supabase dashboard user (automatic) or ensure your role has `CREATE TABLE` privileges

### Migration Fails with "type already exists"
**Solution**: The migration uses `IF NOT EXISTS` checks, so this shouldn't happen. If it does, the type already exists and it's safe to continue.

### RLS Policies Block Queries
**Solution**: 
1. Check you're authenticated: `SELECT auth.uid();` should return a UUID
2. Verify user profile exists: `SELECT * FROM user_profiles WHERE id = auth.uid();`
3. Temporarily disable RLS for testing: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;` (NOT RECOMMENDED FOR PRODUCTION)

### "No rows returned" but table doesn't exist
**Solution**: Check for errors in the migration output. Look in Supabase Dashboard → Database → Logs for detailed error messages.

---

## Migration Status

| File | Status | Tables/Updates | Priority |
|------|--------|---------------|----------|
| `001_initial_schema.sql` | ✅ Applied | Core tables | Critical |
| `002_new_features.sql` | ✅ Applied | Pomodoro, Habits, etc. | High |
| `003_boards_system.sql` | ✅ Applied | Boards, Steps, Executions | High |
| `004_board_templates_seed.sql` | ✅ Applied | Template data | Medium |
| `005_ai_integration.sql` | ✅ Applied | AI features | Medium |
| `006_missing_tables.sql` | ⏳ **NEEDS APPLY** | `time_blocks`, `task_templates` | **CRITICAL** |
| `007_schema_updates.sql` | ⏳ **NEEDS APPLY** | Column additions | **HIGH** |

---

## Support

If you encounter issues:
1. Check the Supabase Dashboard → Database → Logs
2. Review browser console for client-side errors
3. Verify migrations ran successfully with verification queries above
4. Check RLS policies are not blocking legitimate queries

---

**Last Updated**: 2025-11-08
**Author**: GitHub Copilot
**Project**: Universal Neurotype Planner
