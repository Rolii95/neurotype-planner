-- Migration: Add missing tables required by the application
-- Created: 2025-11-08
-- Purpose: Add time_blocks and task_templates tables that are referenced in code

-- =============================================
-- TIME BLOCKS TABLE
-- =============================================
-- Stores calendar time blocks for scheduling tasks
CREATE TABLE IF NOT EXISTS public.time_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule JSONB, -- iCal RRULE format
    color TEXT DEFAULT '#3B82F6', -- Default blue
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Add indexes for performance
CREATE INDEX idx_time_blocks_user_id ON public.time_blocks(user_id);
CREATE INDEX idx_time_blocks_task_id ON public.time_blocks(task_id);
CREATE INDEX idx_time_blocks_start_time ON public.time_blocks(start_time);
CREATE INDEX idx_time_blocks_end_time ON public.time_blocks(end_time);

-- Enable RLS
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own time blocks"
    ON public.time_blocks FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = time_blocks.user_id)
    ));

CREATE POLICY "Users can insert own time blocks"
    ON public.time_blocks FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = time_blocks.user_id)
    ));

CREATE POLICY "Users can update own time blocks"
    ON public.time_blocks FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = time_blocks.user_id)
    ));

CREATE POLICY "Users can delete own time blocks"
    ON public.time_blocks FOR DELETE
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = time_blocks.user_id)
    ));

-- =============================================
-- TASK TEMPLATES TABLE
-- =============================================
-- Stores reusable task templates for quick task creation
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category task_category NOT NULL,
    priority priority DEFAULT 'medium',
    estimated_duration INTEGER NOT NULL, -- minutes
    tags TEXT[] DEFAULT '{}',
    energy_required energy_level DEFAULT 'medium',
    focus_required focus_level DEFAULT 'medium',
    sensory_considerations JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false, -- Allow sharing templates
    usage_count INTEGER DEFAULT 0, -- Track popularity
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_task_templates_user_id ON public.task_templates(user_id);
CREATE INDEX idx_task_templates_category ON public.task_templates(category);
CREATE INDEX idx_task_templates_is_public ON public.task_templates(is_public);
CREATE INDEX idx_task_templates_usage_count ON public.task_templates(usage_count DESC);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own task templates"
    ON public.task_templates FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE id IN (SELECT id FROM user_profiles WHERE id = task_templates.user_id)
        )
        OR is_public = true
    );

CREATE POLICY "Users can insert own task templates"
    ON public.task_templates FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = task_templates.user_id)
    ));

CREATE POLICY "Users can update own task templates"
    ON public.task_templates FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = task_templates.user_id)
    ));

CREATE POLICY "Users can delete own task templates"
    ON public.task_templates FOR DELETE
    USING (auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE id IN (SELECT id FROM user_profiles WHERE id = task_templates.user_id)
    ));

-- =============================================
-- UPDATE TRIGGERS
-- =============================================
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_time_blocks_updated_at
    BEFORE UPDATE ON public.time_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at
    BEFORE UPDATE ON public.task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DEFAULT TASK TEMPLATES
-- =============================================
-- Add some default public templates for new users
-- Note: This requires a system user_id. Adjust UUID as needed or create from app.
-- For now, these are commented out. Create them from the application instead.

/*
INSERT INTO public.task_templates (user_id, name, description, category, priority, estimated_duration, tags, is_public, usage_count)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'Quick Email Response', 'Respond to urgent email', 'work', 'high', 15, ARRAY['email', 'communication'], true, 0),
    ('00000000-0000-0000-0000-000000000000', 'Morning Exercise', '30-minute workout routine', 'health', 'medium', 30, ARRAY['exercise', 'morning'], true, 0),
    ('00000000-0000-0000-0000-000000000000', 'Grocery Shopping', 'Weekly grocery run', 'personal', 'medium', 60, ARRAY['errands', 'shopping'], true, 0),
    ('00000000-0000-0000-0000-000000000000', 'Code Review', 'Review pull requests', 'work', 'medium', 45, ARRAY['development', 'code-review'], true, 0),
    ('00000000-0000-0000-0000-000000000000', 'Meditation Break', '10-minute mindfulness session', 'self-care', 'low', 10, ARRAY['meditation', 'wellness'], true, 0);
*/

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE public.time_blocks IS 'Calendar time blocks for scheduling tasks and events';
COMMENT ON TABLE public.task_templates IS 'Reusable task templates for quick task creation';

COMMENT ON COLUMN public.time_blocks.recurrence_rule IS 'iCalendar RRULE format for recurring events';
COMMENT ON COLUMN public.task_templates.usage_count IS 'Number of times this template has been used';
COMMENT ON COLUMN public.task_templates.is_public IS 'Whether this template is shared with all users';
