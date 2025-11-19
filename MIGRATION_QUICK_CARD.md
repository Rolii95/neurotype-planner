# 📊 SQL Migration Quick Reference Card

## ⚡ FASTEST PATH - Copy & Paste This:

### Step 1: Open Supabase SQL Editor
```
https://supabase.com/dashboard/project/kjzpbpufphrirsjlzxua
→ Click "SQL Editor" (left sidebar)
→ Click "+ New Query"
```

### Step 2: Run All Migrations (One File)
```
📁 Open: supabase/migrations/RUN_ALL_MIGRATIONS.sql
📋 Copy: Entire file (Ctrl+A, Ctrl+C)
📥 Paste: Into Supabase SQL Editor
▶️ Run: Click "Run" button or press Ctrl+Enter
✅ Verify: Look for ✅ success messages in output
```

### Step 3: Verify Success
```sql
-- Quick verification query (paste and run):
SELECT COUNT(*) as new_tables_created
FROM information_schema.tables 
WHERE table_name IN ('time_blocks', 'task_templates');
```
**Expected Result**: `2` (both tables created)

---

## 📂 Files You Got

| File | Purpose | When to Use |
|------|---------|-------------|
| **RUN_ALL_MIGRATIONS.sql** | All-in-one runner | ⭐ Start here - use this |
| **006_missing_tables.sql** | Creates time_blocks + task_templates | Individual migration approach |
| **007_schema_updates.sql** | Adds columns to existing tables | Individual migration approach |
| **verify_schema.sql** | Diagnostic queries | Before/after migrations |
| **DATABASE_MIGRATION_GUIDE.md** | Full documentation | Detailed reference |
| **SQL_MIGRATION_SUMMARY.md** | Overview & troubleshooting | Quick reference |

---

## 🎯 What Gets Fixed

### Tables Created:
- ✅ `time_blocks` - Calendar scheduling
- ✅ `task_templates` - Template library

### Columns Added to `tasks`:
- ✅ `scheduled_at` - Calendar date/time
- ✅ `actual_duration` - Time tracking
- ✅ `buffer_time` - Transition buffers
- ✅ `completed_at` - Completion timestamp

### Also Creates:
- ✅ RLS policies (security)
- ✅ Performance indexes
- ✅ Data constraints
- ✅ Auto-update triggers

---

## ✅ Success Indicators

After running, you should see in the output:
```
✅ time_blocks table created successfully
✅ task_templates table created successfully
✅ tasks.scheduled_at column added successfully
```

---

## ⚠️ If Something Goes Wrong

### Error: "permission denied"
**Fix**: Must run in Supabase Dashboard SQL Editor (not from app)

### Error: "already exists"
**Status**: ✅ Good! Means it was already created
**Action**: Continue - migration is idempotent

### Error: "type X does not exist"
**Fix**: Run `001_initial_schema.sql` first (creates enums)

### Error: "foreign key violation"
**Fix**: Need user profile:
```sql
INSERT INTO user_profiles (id, email, display_name)
VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'demo@neurotypeplanner.com',
    'Demo User'
);
```

---

## 🔍 Verify It Worked

Run this in SQL Editor:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('time_blocks', 'task_templates', 'tasks')
ORDER BY table_name;
-- Should show: 3 rows

-- Check new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('scheduled_at', 'actual_duration', 'buffer_time', 'completed_at')
ORDER BY column_name;
-- Should show: 4 rows

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('time_blocks', 'task_templates')
ORDER BY tablename;
-- Should show: rowsecurity = true for both
```

---

## 🚀 After Migration - Next Steps

1. **Enable Auth** → See `SUPABASE_AUTH_SETUP.md`
2. **Create User Profile** → SQL in guide above
3. **Test App** → `npm run dev`
4. **Try Calendar** → Add task with due date
5. **Success!** 🎉

---

## 📱 Contact Card

**Project**: Universal Neurotype Planner  
**Supabase**: kjzpbpufphrirsjlzxua  
**Migration Date**: 2025-11-08  
**Files Location**: `supabase/migrations/`

---

## 💾 Backup Command (Optional)

Before migration, backup current schema:
```bash
# If you have Supabase CLI installed
supabase db dump --schema public > backup_before_migration.sql
```

---

**🎯 REMEMBER**: Use `RUN_ALL_MIGRATIONS.sql` - it's the easiest way!
