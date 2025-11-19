# 🗄️ Database Update SQL Files - Quick Reference

## 📋 What Was Generated

I've created **4 comprehensive SQL files** to update your Supabase database schema:

### 1. **RUN_ALL_MIGRATIONS.sql** ⚡ (RECOMMENDED - START HERE)
**Location**: `supabase/migrations/RUN_ALL_MIGRATIONS.sql`

**What it does**: 
- Single file that applies ALL missing migrations
- Safe to run multiple times (uses `IF NOT EXISTS`)
- Includes built-in verification
- Creates tables: `time_blocks`, `task_templates`
- Adds columns: `scheduled_at`, `actual_duration`, `buffer_time`, `completed_at` to `tasks`
- Sets up all RLS policies and indexes

**How to use**:
1. Open Supabase Dashboard → SQL Editor
2. Copy entire file contents
3. Paste and click **Run**
4. Check the messages for ✅ success indicators

---

### 2. **006_missing_tables.sql** 📦 (Individual Migration)
**Location**: `supabase/migrations/006_missing_tables.sql`

**What it does**:
- Creates `time_blocks` table (calendar scheduling)
- Creates `task_templates` table (reusable templates)
- Full RLS policies
- Performance indexes
- Auto-update triggers

**When to use**: If you prefer to apply migrations individually

---

### 3. **007_schema_updates.sql** 🔧 (Individual Migration)
**Location**: `supabase/migrations/007_schema_updates.sql`

**What it does**:
- Adds missing columns to existing tables
- Creates `notifications` table if missing
- Adds data integrity constraints
- Creates performance indexes
- Adds documentation comments

**When to use**: After running 006, or if you only need column updates

---

### 4. **verify_schema.sql** ✅ (Diagnostic Tool)
**Location**: `supabase/migrations/verify_schema.sql`

**What it does**:
- Checks which tables exist
- Lists all columns in critical tables
- Verifies RLS is enabled
- Shows constraint status
- Generates migration status report

**When to use**: 
- Before migrations (to see what's needed)
- After migrations (to verify success)
- When troubleshooting

---

## 🚀 Quick Start Guide

### Option A: All-in-One (Fastest) ⚡

```
1. Go to: https://supabase.com/dashboard/project/kjzpbpufphrirsjlzxua
2. Click: SQL Editor → New Query
3. Copy: supabase/migrations/RUN_ALL_MIGRATIONS.sql
4. Paste & Run
5. Check messages for ✅ success
```

### Option B: Step-by-Step (Cautious) 🔍

```
1. Run verify_schema.sql to see what's missing
2. Run 006_missing_tables.sql 
3. Run 007_schema_updates.sql
4. Run verify_schema.sql again to confirm
```

---

## 📊 What Gets Created/Updated

### New Tables:
| Table | Columns | Purpose | Used By |
|-------|---------|---------|---------|
| `time_blocks` | 11 | Calendar time blocking | Time blocking calendar widget |
| `task_templates` | 13 | Reusable task templates | Template library, Quick add |

### Updated Tables:
| Table | New Columns | Purpose |
|-------|-------------|---------|
| `tasks` | `scheduled_at`, `actual_duration`, `buffer_time`, `completed_at` | Calendar scheduling & tracking |
| `boards` | `share_code`, `is_public` (if missing) | Board sharing features |

### Created If Missing:
| Table | Purpose |
|-------|---------|
| `notifications` | In-app notification system |

---

## 🔍 Verification Commands

After running migrations, verify success:

```sql
-- Quick check
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('time_blocks', 'task_templates');
-- Should return: 2

-- Detailed check
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- Should include: time_blocks, task_templates, tasks, boards, etc.

-- Column check
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('scheduled_at', 'actual_duration', 'buffer_time', 'completed_at');
-- Should return: 4 rows
```

---

## ⚠️ Common Issues & Solutions

### Issue: "permission denied for schema public"
**Solution**: You're running from the wrong account. Use Supabase Dashboard SQL Editor (runs as superuser)

### Issue: "type task_category does not exist"
**Solution**: Run `001_initial_schema.sql` first (creates enum types)

### Issue: "foreign key violation"
**Solution**: Ensure `user_profiles` table exists and you have a user profile created

### Issue: "relation already exists"
**Solution**: Table already created! This is fine. Migration uses `IF NOT EXISTS`

### Issue: RLS blocks all queries
**Solution**: 
```sql
-- Check auth
SELECT auth.uid(); -- Should return your user ID

-- Check profile exists
SELECT * FROM user_profiles WHERE id = auth.uid();

-- If no profile, create one:
INSERT INTO user_profiles (id, email, display_name)
VALUES (auth.uid(), 'your-email@example.com', 'Your Name');
```

---

## 📝 Files Reference

| File | Size | Purpose | Run Order |
|------|------|---------|-----------|
| `RUN_ALL_MIGRATIONS.sql` | ~200 lines | All-in-one migration | 1 (recommended) |
| `006_missing_tables.sql` | ~150 lines | Create new tables | 1 (if manual) |
| `007_schema_updates.sql` | ~250 lines | Update existing tables | 2 (if manual) |
| `verify_schema.sql` | ~150 lines | Diagnostic queries | Before/After |
| `DATABASE_MIGRATION_GUIDE.md` | Full docs | Complete instructions | Reference |

---

## ✅ Success Checklist

After running migrations, you should have:

- ✅ `time_blocks` table with 11 columns
- ✅ `task_templates` table with 13 columns  
- ✅ `tasks` table with `scheduled_at`, `actual_duration`, `buffer_time`, `completed_at` columns
- ✅ RLS enabled on all new tables
- ✅ Indexes created for performance
- ✅ Triggers for auto-updating `updated_at` timestamps
- ✅ Data integrity constraints (time ranges, positive durations)
- ✅ Foreign key relationships to `user_profiles` and `tasks`

---

## 🎯 What This Fixes in Your App

### Before Migration:
- ❌ Calendar widget crashes: "relation 'time_blocks' does not exist"
- ❌ Template library fails: "relation 'task_templates' does not exist"  
- ❌ Task scheduling errors: "column 'scheduled_at' does not exist"
- ❌ Analytics 400 errors (already fixed in code, just FYI)

### After Migration:
- ✅ Calendar widget works: Create tasks with due dates
- ✅ Template library works: Browse and use task templates
- ✅ Task scheduling works: Schedule tasks on calendar
- ✅ Time blocking works: Create calendar time blocks
- ✅ Analytics works: Proper `user_activity` usage

---

## 📞 Support

If migrations fail:
1. Check Supabase Dashboard → Database → Logs
2. Run `verify_schema.sql` to see current state
3. Check error message carefully
4. Verify you're using SQL Editor in Supabase Dashboard
5. Ensure `001_initial_schema.sql` was applied first

---

## 🎉 Next Steps After Migration

1. **Enable Authentication**
   - See `SUPABASE_AUTH_SETUP.md`
   - Enable Anonymous Auth in Supabase Dashboard

2. **Create User Profile**
   ```sql
   INSERT INTO user_profiles (id, email, display_name)
   VALUES (
       (SELECT id FROM auth.users LIMIT 1),
       'demo@neurotypeplanner.com',
       'Demo User'
   );
   ```

3. **Test Features**
   - Create a task with a due date ✅
   - Use a task template ✅
   - Create a time block ✅
   - Check analytics dashboard ✅

4. **Start Development**
   - Run `npm run dev`
   - Navigate to Priority Matrix
   - Click "Add Task" in Schedule quadrant
   - Select a due date
   - Click Create
   - Success! 🎉

---

**Generated**: 2025-11-08  
**For**: Universal Neurotype Planner  
**Supabase Project**: kjzpbpufphrirsjlzxua
