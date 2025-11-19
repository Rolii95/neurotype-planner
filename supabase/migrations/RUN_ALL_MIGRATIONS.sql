-- QUICK MIGRATION RUNNER
-- Copy and paste this entire file into Supabase SQL Editor to apply all missing migrations
-- This is safe to run multiple times - it uses IF NOT EXISTS checks

-- =============================================
-- MIGRATION 006: MISSING TABLES
-- =============================================

-- TIME BLOCKS TABLE
CREATE TABLE IF NOT EXISTS public.time_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule JSONB,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_user_id ON public.time_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_task_id ON public.time_blocks(task_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_start_time ON public.time_blocks(start_time);
CREATE INDEX IF NOT EXISTS idx_time_blocks_end_time ON public.time_blocks(end_time);

ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own time blocks" ON public.time_blocks;
CREATE POLICY "Users can view own time blocks"
    ON public.time_blocks FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = time_blocks.user_id)
    ));

DROP POLICY IF EXISTS "Users can insert own time blocks" ON public.time_blocks;
CREATE POLICY "Users can insert own time blocks"
    ON public.time_blocks FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = time_blocks.user_id)
    ));

DROP POLICY IF EXISTS "Users can update own time blocks" ON public.time_blocks;
CREATE POLICY "Users can update own time blocks"
    ON public.time_blocks FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = time_blocks.user_id)
    ));

DROP POLICY IF EXISTS "Users can delete own time blocks" ON public.time_blocks;
CREATE POLICY "Users can delete own time blocks"
    ON public.time_blocks FOR DELETE
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = time_blocks.user_id)
    ));

-- TASK TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category task_category NOT NULL,
    priority priority DEFAULT 'medium',
    estimated_duration INTEGER NOT NULL,
    tags TEXT[] DEFAULT '{}',
    energy_required energy_level DEFAULT 'medium',
    focus_required focus_level DEFAULT 'medium',
    sensory_considerations JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_user_id ON public.task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_category ON public.task_templates(category);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_public ON public.task_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_task_templates_usage_count ON public.task_templates(usage_count DESC);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own task templates" ON public.task_templates;
CREATE POLICY "Users can view own task templates"
    ON public.task_templates FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE id IN (SELECT id FROM user_profiles WHERE id = task_templates.user_id)
        )
        OR is_public = true
    );

DROP POLICY IF EXISTS "Users can insert own task templates" ON public.task_templates;
CREATE POLICY "Users can insert own task templates"
    ON public.task_templates FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = task_templates.user_id)
    ));

DROP POLICY IF EXISTS "Users can update own task templates" ON public.task_templates;
CREATE POLICY "Users can update own task templates"
    ON public.task_templates FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = task_templates.user_id)
    ));

DROP POLICY IF EXISTS "Users can delete own task templates" ON public.task_templates;
CREATE POLICY "Users can delete own task templates"
    ON public.task_templates FOR DELETE
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = task_templates.user_id)
    ));

-- =============================================
-- MIGRATION 007: SCHEMA UPDATES
-- =============================================

-- Add missing columns to tasks table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'scheduled_at') THEN
        ALTER TABLE public.tasks ADD COLUMN scheduled_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'actual_duration') THEN
        ALTER TABLE public.tasks ADD COLUMN actual_duration INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'buffer_time') THEN
        ALTER TABLE public.tasks ADD COLUMN buffer_time INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE public.tasks ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_at ON public.tasks(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_time_blocks_updated_at ON public.time_blocks;
CREATE TRIGGER update_time_blocks_updated_at
    BEFORE UPDATE ON public.time_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_templates_updated_at ON public.task_templates;
CREATE TRIGGER update_task_templates_updated_at
    BEFORE UPDATE ON public.task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MIGRATION 008: PRIORITY MATRIX QUADRANT
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
          AND column_name = 'quadrant'
    ) THEN
        ALTER TABLE public.tasks
          ADD COLUMN quadrant TEXT
          CHECK (quadrant IN (
            'urgent-important',
            'urgent-not-important',
            'not-urgent-important',
            'not-urgent-not-important'
          ))
          DEFAULT 'not-urgent-not-important';

        UPDATE public.tasks
        SET quadrant = CASE
          WHEN priority IN ('high', 'urgent') AND due_date IS NOT NULL AND due_date <= (NOW() + INTERVAL '2 days') THEN 'urgent-important'
          WHEN priority IN ('high', 'urgent') AND (due_date IS NULL OR due_date > (NOW() + INTERVAL '2 days')) THEN 'not-urgent-important'
          WHEN (priority IS NULL OR priority NOT IN ('high', 'urgent')) AND due_date IS NOT NULL AND due_date <= (NOW() + INTERVAL '2 days') THEN 'urgent-not-important'
          ELSE 'not-urgent-not-important'
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_quadrant ON public.tasks(quadrant);

-- =============================================
-- VERIFICATION
-- =============================================

-- Check if migrations were successful
DO $$
DECLARE
    time_blocks_exists BOOLEAN;
    task_templates_exists BOOLEAN;
    scheduled_at_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'time_blocks'
    ) INTO time_blocks_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'task_templates'
    ) INTO task_templates_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'scheduled_at'
    ) INTO scheduled_at_exists;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION RESULTS:';
    RAISE NOTICE '========================================';
    
    IF time_blocks_exists THEN
        RAISE NOTICE '✅ time_blocks table created successfully';
    ELSE
        RAISE NOTICE '❌ time_blocks table FAILED to create';
    END IF;

    IF task_templates_exists THEN
        RAISE NOTICE '✅ task_templates table created successfully';
    ELSE
        RAISE NOTICE '❌ task_templates table FAILED to create';
    END IF;

    IF scheduled_at_exists THEN
        RAISE NOTICE '✅ tasks.scheduled_at column added successfully';
    ELSE
        RAISE NOTICE '❌ tasks.scheduled_at column FAILED to add';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Check the messages above for any failures.';
    RAISE NOTICE 'If you see ✅ for all items, migrations are complete!';
    RAISE NOTICE '========================================';
END $$;
