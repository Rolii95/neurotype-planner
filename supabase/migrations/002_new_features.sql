-- Migration: Add tables for new features (Pomodoro, Habits, Focus, Energy, Body Doubling)
-- Created: 2025-11-07

-- =============================================
-- POMODORO SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.pomodoro_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preset_id TEXT NOT NULL,
    preset_name TEXT NOT NULL,
    work_duration INTEGER NOT NULL, -- in seconds
    break_duration INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    phase TEXT NOT NULL CHECK (phase IN ('work', 'break', 'long-break')),
    completed BOOLEAN NOT NULL DEFAULT false,
    interruptions INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pomodoro sessions"
    ON public.pomodoro_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pomodoro sessions"
    ON public.pomodoro_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pomodoro sessions"
    ON public.pomodoro_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_pomodoro_sessions_user_id ON public.pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_sessions_started_at ON public.pomodoro_sessions(started_at);

-- =============================================
-- HABITS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    category TEXT NOT NULL CHECK (category IN ('health', 'productivity', 'self-care', 'social', 'learning', 'creative')),
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'custom')),
    target_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=Sunday, 6=Saturday
    reminder_time TIME,
    reminder_enabled BOOLEAN DEFAULT false,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits"
    ON public.habits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
    ON public.habits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
    ON public.habits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
    ON public.habits FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habits_category ON public.habits(category);

-- =============================================
-- HABIT LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'struggling', 'difficult')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit logs"
    ON public.habit_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habit logs"
    ON public.habit_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own habit logs"
    ON public.habit_logs FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX idx_habit_logs_user_id ON public.habit_logs(user_id);
CREATE INDEX idx_habit_logs_completed_at ON public.habit_logs(completed_at);

-- =============================================
-- HABIT STACKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.habit_stacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
    new_habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    trigger_description TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.habit_stacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit stacks"
    ON public.habit_stacks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habit stacks"
    ON public.habit_stacks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own habit stacks"
    ON public.habit_stacks FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_habit_stacks_user_id ON public.habit_stacks(user_id);

-- =============================================
-- FOCUS SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_name TEXT,
    duration INTEGER NOT NULL, -- in seconds
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    distraction_count INTEGER DEFAULT 0,
    ambient_sound TEXT,
    blocked_sites TEXT[],
    completed BOOLEAN DEFAULT false,
    focus_score INTEGER CHECK (focus_score >= 0 AND focus_score <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own focus sessions"
    ON public.focus_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus sessions"
    ON public.focus_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus sessions"
    ON public.focus_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_start_time ON public.focus_sessions(start_time);

-- =============================================
-- ENERGY LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.energy_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    energy_level INTEGER NOT NULL CHECK (energy_level >= 1 AND energy_level <= 5),
    mood TEXT,
    physical_energy INTEGER CHECK (physical_energy >= 1 AND physical_energy <= 5),
    mental_energy INTEGER CHECK (mental_energy >= 1 AND mental_energy <= 5),
    factors TEXT[], -- e.g., ['slept_well', 'exercised', 'caffeine']
    notes TEXT,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.energy_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own energy logs"
    ON public.energy_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own energy logs"
    ON public.energy_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own energy logs"
    ON public.energy_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own energy logs"
    ON public.energy_logs FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_energy_logs_user_id ON public.energy_logs(user_id);
CREATE INDEX idx_energy_logs_logged_at ON public.energy_logs(logged_at);

-- =============================================
-- BODY DOUBLING ROOMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.body_doubling_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    room_type TEXT NOT NULL CHECK (room_type IN ('video', 'silent', 'audio-only')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 10,
    current_participants INTEGER DEFAULT 0,
    tags TEXT[],
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'ended')),
    webrtc_room_id TEXT UNIQUE, -- For WebRTC integration
    external_service_id TEXT, -- For integration with external body doubling services
    external_service_name TEXT, -- e.g., 'focusmate', 'study-together', 'flow-club'
    webhook_url TEXT, -- Webhook URL for external service integration
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.body_doubling_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public rooms"
    ON public.body_doubling_rooms FOR SELECT
    USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create rooms"
    ON public.body_doubling_rooms FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms"
    ON public.body_doubling_rooms FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Room creators can delete their rooms"
    ON public.body_doubling_rooms FOR DELETE
    USING (auth.uid() = created_by);

-- Add indexes
CREATE INDEX idx_body_doubling_rooms_created_by ON public.body_doubling_rooms(created_by);
CREATE INDEX idx_body_doubling_rooms_status ON public.body_doubling_rooms(status);
CREATE INDEX idx_body_doubling_rooms_external_service ON public.body_doubling_rooms(external_service_id);

-- =============================================
-- ROOM PARTICIPANTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.body_doubling_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    camera_enabled BOOLEAN DEFAULT false,
    microphone_enabled BOOLEAN DEFAULT false,
    peer_id TEXT, -- For WebRTC peer connection
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Add RLS policies
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their rooms"
    ON public.room_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.body_doubling_rooms
            WHERE id = room_id AND (is_public = true OR created_by = auth.uid())
        )
    );

CREATE POLICY "Users can join rooms"
    ON public.room_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
    ON public.room_participants FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
    ON public.room_participants FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_room_participants_room_id ON public.room_participants(room_id);
CREATE INDEX idx_room_participants_user_id ON public.room_participants(user_id);

-- =============================================
-- TASK CHUNKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_task TEXT NOT NULL,
    chunks JSONB NOT NULL, -- Array of {title, description, estimatedTime, difficulty, completed, order}
    completed_chunks INTEGER DEFAULT 0,
    total_chunks INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.task_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task chunks"
    ON public.task_chunks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task chunks"
    ON public.task_chunks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task chunks"
    ON public.task_chunks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own task chunks"
    ON public.task_chunks FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_task_chunks_user_id ON public.task_chunks(user_id);

-- =============================================
-- HYPERFOCUS SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.hyperfocus_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    break_reminders_sent INTEGER DEFAULT 0,
    hydration_reminders_sent INTEGER DEFAULT 0,
    movement_reminders_sent INTEGER DEFAULT 0,
    reminders_acknowledged INTEGER DEFAULT 0,
    reminders_snoozed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.hyperfocus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hyperfocus sessions"
    ON public.hyperfocus_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hyperfocus sessions"
    ON public.hyperfocus_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hyperfocus sessions"
    ON public.hyperfocus_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_hyperfocus_sessions_user_id ON public.hyperfocus_sessions(user_id);
CREATE INDEX idx_hyperfocus_sessions_start_time ON public.hyperfocus_sessions(start_time);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_pomodoro_sessions_updated_at
    BEFORE UPDATE ON public.pomodoro_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON public.habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_focus_sessions_updated_at
    BEFORE UPDATE ON public.focus_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_energy_logs_updated_at
    BEFORE UPDATE ON public.energy_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_body_doubling_rooms_updated_at
    BEFORE UPDATE ON public.body_doubling_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_chunks_updated_at
    BEFORE UPDATE ON public.task_chunks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hyperfocus_sessions_updated_at
    BEFORE UPDATE ON public.hyperfocus_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update room participant count
CREATE OR REPLACE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.body_doubling_rooms
        SET current_participants = current_participants + 1
        WHERE id = NEW.room_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.body_doubling_rooms
        SET current_participants = GREATEST(0, current_participants - 1)
        WHERE id = OLD.room_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_active = false AND OLD.is_active = true THEN
            UPDATE public.body_doubling_rooms
            SET current_participants = GREATEST(0, current_participants - 1)
            WHERE id = NEW.room_id;
        ELSIF NEW.is_active = true AND OLD.is_active = false THEN
            UPDATE public.body_doubling_rooms
            SET current_participants = current_participants + 1
            WHERE id = NEW.room_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for room participant count
CREATE TRIGGER update_room_participant_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.room_participants
    FOR EACH ROW EXECUTE FUNCTION update_room_participant_count();

-- Function to notify room updates via webhook
CREATE OR REPLACE FUNCTION notify_room_webhook()
RETURNS TRIGGER AS $$
DECLARE
    webhook TEXT;
BEGIN
    SELECT webhook_url INTO webhook
    FROM public.body_doubling_rooms
    WHERE id = NEW.room_id;

    IF webhook IS NOT NULL THEN
        -- This would be called by a Supabase Edge Function or external service
        -- Store webhook notification in a queue table
        INSERT INTO public.webhook_queue (
            webhook_url,
            payload,
            event_type
        ) VALUES (
            webhook,
            jsonb_build_object(
                'room_id', NEW.room_id,
                'user_id', NEW.user_id,
                'event', TG_OP,
                'timestamp', NOW()
            ),
            'room_participant_change'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- WEBHOOK QUEUE TABLE (for async webhook processing)
-- =============================================
CREATE TABLE IF NOT EXISTS public.webhook_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Add index
CREATE INDEX idx_webhook_queue_status ON public.webhook_queue(status);
CREATE INDEX idx_webhook_queue_created_at ON public.webhook_queue(created_at);

-- Add trigger for webhook notifications
CREATE TRIGGER notify_room_webhook_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.room_participants
    FOR EACH ROW EXECUTE FUNCTION notify_room_webhook();

-- =============================================
-- ANALYTICS VIEWS
-- =============================================

-- View for habit completion rates
CREATE OR REPLACE VIEW habit_completion_stats AS
SELECT 
    h.id,
    h.user_id,
    h.name,
    h.category,
    h.current_streak,
    h.longest_streak,
    COUNT(hl.id) as total_completions,
    COUNT(DISTINCT DATE(hl.completed_at)) as unique_days_completed,
    MAX(hl.completed_at) as last_completed
FROM public.habits h
LEFT JOIN public.habit_logs hl ON h.id = hl.habit_id
WHERE h.archived = false
GROUP BY h.id, h.user_id, h.name, h.category, h.current_streak, h.longest_streak;

-- View for energy patterns
CREATE OR REPLACE VIEW energy_patterns AS
SELECT 
    user_id,
    EXTRACT(HOUR FROM logged_at) as hour_of_day,
    AVG(energy_level) as avg_energy_level,
    AVG(physical_energy) as avg_physical_energy,
    AVG(mental_energy) as avg_mental_energy,
    COUNT(*) as sample_count
FROM public.energy_logs
WHERE logged_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, EXTRACT(HOUR FROM logged_at);

-- View for focus session stats
CREATE OR REPLACE VIEW focus_session_stats AS
SELECT 
    user_id,
    COUNT(*) as total_sessions,
    SUM(duration) as total_focus_time_seconds,
    AVG(duration) as avg_session_duration,
    AVG(distraction_count) as avg_distractions,
    AVG(focus_score) as avg_focus_score,
    COUNT(*) FILTER (WHERE completed = true) as completed_sessions
FROM public.focus_sessions
WHERE start_time > NOW() - INTERVAL '30 days'
GROUP BY user_id;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant access to authenticated users
GRANT ALL ON public.pomodoro_sessions TO authenticated;
GRANT ALL ON public.habits TO authenticated;
GRANT ALL ON public.habit_logs TO authenticated;
GRANT ALL ON public.habit_stacks TO authenticated;
GRANT ALL ON public.focus_sessions TO authenticated;
GRANT ALL ON public.energy_logs TO authenticated;
GRANT ALL ON public.body_doubling_rooms TO authenticated;
GRANT ALL ON public.room_participants TO authenticated;
GRANT ALL ON public.task_chunks TO authenticated;
GRANT ALL ON public.hyperfocus_sessions TO authenticated;
GRANT ALL ON public.webhook_queue TO authenticated;

-- Grant read access to views
GRANT SELECT ON habit_completion_stats TO authenticated;
GRANT SELECT ON energy_patterns TO authenticated;
GRANT SELECT ON focus_session_stats TO authenticated;
