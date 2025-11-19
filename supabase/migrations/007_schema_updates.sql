-- Migration: Schema Updates and Fixes
-- Created: 2025-11-08
-- Purpose: Add missing columns and update existing tables to match application requirements

-- =============================================
-- TASKS TABLE UPDATES
-- =============================================
-- Ensure tasks table has all required columns for calendar scheduling

-- Add scheduled_at if it doesn't exist (for calendar time blocking)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'scheduled_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN scheduled_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add actual_duration if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'actual_duration'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN actual_duration INTEGER;
    END IF;
END $$;

-- Add buffer_time if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'buffer_time'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN buffer_time INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add completed_at if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- =============================================
-- BOARDS TABLE UPDATES
-- =============================================
-- Ensure boards table has share_code and is_public

-- Add share_code if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'boards' 
        AND column_name = 'share_code'
    ) THEN
        ALTER TABLE public.boards ADD COLUMN share_code TEXT UNIQUE;
        CREATE INDEX idx_boards_share_code ON public.boards(share_code) WHERE share_code IS NOT NULL;
    END IF;
END $$;

-- Add is_public if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'boards' 
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE public.boards ADD COLUMN is_public BOOLEAN DEFAULT false;
        CREATE INDEX idx_boards_is_public ON public.boards(is_public) WHERE is_public = true;
    END IF;
END $$;

-- =============================================
-- USER_ACTIVITY TABLE UPDATES
-- =============================================
-- Ensure user_activity context field is properly typed

-- Add comment to clarify context JSONB usage
COMMENT ON COLUMN public.user_activity.context IS 'Flexible JSONB field for storing activity-specific data. For analytics activities, stores metrics like tasksCompleted, averageCompletionTime, productivityScore, streakDays, etc.';

-- =============================================
-- NOTIFICATIONS TABLE UPDATES
-- =============================================
-- Ensure notifications table exists and has proper structure

-- Check if notifications table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN
        -- Create notifications type if it doesn't exist
        DO $notification_type$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
                CREATE TYPE notification_type AS ENUM (
                    'reminder', 'celebration', 'suggestion', 'warning', 'update', 'social'
                );
            END IF;
        END $notification_type$;

        -- Create priority type if it doesn't exist (may already exist from tasks)
        DO $priority_type$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
                CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
            END IF;
        END $priority_type$;

        -- Create the notifications table
        CREATE TABLE public.notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
            type notification_type NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            priority notification_priority DEFAULT 'medium',
            actionable BOOLEAN DEFAULT false,
            actions JSONB DEFAULT '[]', -- Array of action buttons
            scheduled_for TIMESTAMPTZ,
            delivered_at TIMESTAMPTZ,
            read_at TIMESTAMPTZ,
            dismissed_at TIMESTAMPTZ,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Add indexes
        CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
        CREATE INDEX idx_notifications_delivered_at ON public.notifications(delivered_at);
        CREATE INDEX idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;
        CREATE INDEX idx_notifications_scheduled_for ON public.notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;

        -- Enable RLS
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

        -- RLS Policies
        CREATE POLICY "Users can view own notifications"
            ON public.notifications FOR SELECT
            USING (auth.uid() IN (
                SELECT id FROM auth.users 
                WHERE id IN (SELECT id FROM user_profiles WHERE id = notifications.user_id)
            ));

        CREATE POLICY "Users can insert own notifications"
            ON public.notifications FOR INSERT
            WITH CHECK (auth.uid() IN (
                SELECT id FROM auth.users 
                WHERE id IN (SELECT id FROM user_profiles WHERE id = notifications.user_id)
            ));

        CREATE POLICY "Users can update own notifications"
            ON public.notifications FOR UPDATE
            USING (auth.uid() IN (
                SELECT id FROM auth.users 
                WHERE id IN (SELECT id FROM user_profiles WHERE id = notifications.user_id)
            ));

        CREATE POLICY "Users can delete own notifications"
            ON public.notifications FOR DELETE
            USING (auth.uid() IN (
                SELECT id FROM auth.users 
                WHERE id IN (SELECT id FROM user_profiles WHERE id = notifications.user_id)
            ));

        -- Add update trigger
        CREATE TRIGGER update_notifications_updated_at
            BEFORE UPDATE ON public.notifications
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =============================================
-- DATA VALIDATION
-- =============================================
-- Add constraints to ensure data integrity

-- Ensure time_blocks have valid time ranges
ALTER TABLE public.time_blocks DROP CONSTRAINT IF EXISTS valid_time_range;
ALTER TABLE public.time_blocks ADD CONSTRAINT valid_time_range 
    CHECK (end_time > start_time);

-- Ensure task estimated_duration is positive
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'tasks' AND constraint_name = 'positive_estimated_duration'
    ) THEN
        ALTER TABLE public.tasks ADD CONSTRAINT positive_estimated_duration 
            CHECK (estimated_duration > 0);
    END IF;
END $$;

-- Ensure task_templates estimated_duration is positive
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'task_templates' AND constraint_name = 'positive_template_duration'
    ) THEN
        ALTER TABLE public.task_templates ADD CONSTRAINT positive_template_duration 
            CHECK (estimated_duration > 0);
    END IF;
END $$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
-- Add missing indexes for common queries

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_at ON public.tasks(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);

-- User activity indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_started_at ON public.user_activity(started_at);

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================
COMMENT ON COLUMN public.tasks.scheduled_at IS 'Specific date/time when task is scheduled on calendar';
COMMENT ON COLUMN public.tasks.due_date IS 'Deadline for task completion';
COMMENT ON COLUMN public.tasks.actual_duration IS 'Actual time spent on task in minutes';
COMMENT ON COLUMN public.tasks.buffer_time IS 'Extra time buffer in minutes for transitions';
COMMENT ON COLUMN public.tasks.completed_at IS 'Timestamp when task was marked complete';

COMMENT ON COLUMN public.boards.share_code IS 'Unique code for sharing board with others';
COMMENT ON COLUMN public.boards.is_public IS 'Whether board is publicly accessible via share code';
