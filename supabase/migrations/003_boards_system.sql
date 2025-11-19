-- Migration: Visual Boards System
-- Created: 2025-11-07
-- Adds visual routine boards with full CRUD operations

-- =============================================
-- BOARDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    board_type TEXT NOT NULL CHECK (board_type IN ('routine', 'visual', 'kanban', 'timeline', 'custom')),
    layout TEXT NOT NULL DEFAULT 'linear' CHECK (layout IN ('linear', 'grid', 'kanban', 'timeline', 'freeform')),
    theme TEXT DEFAULT 'default',
    
    -- Configuration
    config JSONB DEFAULT '{
        "showProgress": true,
        "showTimers": true,
        "highlightTransitions": true,
        "allowReordering": true,
        "autoSave": true,
        "pauseBetweenSteps": 0
    }'::jsonb,
    
    -- Schedule settings
    schedule JSONB DEFAULT '{
        "isScheduled": false,
        "frequency": null,
        "daysOfWeek": [],
        "timeOfDay": null,
        "autoStart": false
    }'::jsonb,
    
    -- Visual customization
    visual_settings JSONB DEFAULT '{
        "backgroundColor": "#ffffff",
        "cardStyle": "modern",
        "iconSet": "default",
        "fontSize": "medium",
        "spacing": "normal"
    }'::jsonb,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    share_code TEXT UNIQUE,
    tags TEXT[] DEFAULT '{}',
    
    -- Analytics
    total_executions INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    average_duration INTEGER, -- minutes
    completion_rate DECIMAL(3,2),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boards"
    ON public.boards FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own boards"
    ON public.boards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boards"
    ON public.boards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own boards"
    ON public.boards FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_boards_user_id ON public.boards(user_id);
CREATE INDEX idx_boards_board_type ON public.boards(board_type);
CREATE INDEX idx_boards_is_active ON public.boards(is_active, user_id);
CREATE INDEX idx_boards_share_code ON public.boards(share_code) WHERE share_code IS NOT NULL;
CREATE INDEX idx_boards_tags ON public.boards USING GIN(tags);

-- =============================================
-- BOARD STEPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.board_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    step_type TEXT NOT NULL CHECK (step_type IN ('task', 'flexZone', 'note', 'transition', 'break')),
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- minutes
    order_index INTEGER NOT NULL,
    
    -- Visual customization
    visual_cues JSONB DEFAULT '{
        "color": "#3b82f6",
        "icon": "⭐",
        "emoji": null,
        "backgroundColor": null,
        "borderColor": null
    }'::jsonb,
    
    -- Transition support
    transition_cue JSONB,
    
    -- Flex zone specific
    freeform_data JSONB,
    timer_settings JSONB DEFAULT '{
        "autoStart": false,
        "showWarningAt": null,
        "allowOverrun": true,
        "endNotification": {
            "type": "visual",
            "intensity": "normal"
        }
    }'::jsonb,
    
    -- Neurotype adaptations
    neurotype_adaptations JSONB DEFAULT '{}'::jsonb,
    
    -- Flags
    is_flexible BOOLEAN DEFAULT false,
    is_optional BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    
    -- Execution tracking
    execution_state JSONB DEFAULT '{
        "status": "pending",
        "startedAt": null,
        "completedAt": null,
        "actualDuration": null,
        "notes": null
    }'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.board_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view steps of accessible boards"
    ON public.board_steps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.boards
            WHERE id = board_steps.board_id 
            AND (user_id = auth.uid() OR is_public = true)
        )
    );

CREATE POLICY "Users can insert steps to own boards"
    ON public.board_steps FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.boards
            WHERE id = board_steps.board_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update steps of own boards"
    ON public.board_steps FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.boards
            WHERE id = board_steps.board_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete steps from own boards"
    ON public.board_steps FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.boards
            WHERE id = board_steps.board_id AND user_id = auth.uid()
        )
    );

-- Add indexes
CREATE INDEX idx_board_steps_board_id ON public.board_steps(board_id);
CREATE INDEX idx_board_steps_order ON public.board_steps(board_id, order_index);
CREATE INDEX idx_board_steps_type ON public.board_steps(step_type);

-- =============================================
-- BOARD EXECUTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.board_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Execution tracking
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    current_step_id UUID REFERENCES public.board_steps(id) ON DELETE SET NULL,
    total_duration INTEGER, -- minutes
    
    -- Step executions (array of step execution records)
    step_executions JSONB DEFAULT '[]'::jsonb,
    
    -- Interruptions and modifications
    interruptions JSONB DEFAULT '[]'::jsonb,
    modifications JSONB DEFAULT '[]'::jsonb,
    
    -- Completion data
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'paused')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- User feedback
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.board_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions"
    ON public.board_executions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions"
    ON public.board_executions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions"
    ON public.board_executions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own executions"
    ON public.board_executions FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_board_executions_board_id ON public.board_executions(board_id);
CREATE INDEX idx_board_executions_user_id ON public.board_executions(user_id);
CREATE INDEX idx_board_executions_started_at ON public.board_executions(started_at);
CREATE INDEX idx_board_executions_status ON public.board_executions(status, user_id);

-- =============================================
-- BOARD TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.board_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('morning', 'evening', 'work', 'self-care', 'exercise', 'study', 'custom')),
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    
    -- Template structure (copied to boards table)
    template_data JSONB NOT NULL,
    
    -- Neurotype optimization
    neurotype_optimized TEXT[] DEFAULT '{}',
    
    -- Metadata
    is_public BOOLEAN DEFAULT true,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    estimated_duration INTEGER, -- minutes
    tags TEXT[] DEFAULT '{}',
    
    -- Usage stats
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.board_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view public templates"
    ON public.board_templates FOR SELECT
    USING (is_public = true OR auth.uid() = author_id);

CREATE POLICY "Users can create templates"
    ON public.board_templates FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own templates"
    ON public.board_templates FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own templates"
    ON public.board_templates FOR DELETE
    USING (auth.uid() = author_id);

-- Add indexes
CREATE INDEX idx_board_templates_category ON public.board_templates(category);
CREATE INDEX idx_board_templates_public ON public.board_templates(is_public);
CREATE INDEX idx_board_templates_tags ON public.board_templates USING GIN(tags);
CREATE INDEX idx_board_templates_neurotype ON public.board_templates USING GIN(neurotype_optimized);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_boards_timestamp
    BEFORE UPDATE ON public.boards
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

CREATE TRIGGER update_board_steps_timestamp
    BEFORE UPDATE ON public.board_steps
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

CREATE TRIGGER update_board_executions_timestamp
    BEFORE UPDATE ON public.board_executions
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

CREATE TRIGGER update_board_templates_timestamp
    BEFORE UPDATE ON public.board_templates
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

-- Function to update board analytics when execution completes
CREATE OR REPLACE FUNCTION update_board_analytics()
RETURNS TRIGGER AS $$
DECLARE
    avg_dur INTEGER;
    comp_rate DECIMAL(3,2);
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Update board statistics
        UPDATE public.boards
        SET 
            total_executions = total_executions + 1,
            last_executed_at = NEW.completed_at
        WHERE id = NEW.board_id;
        
        -- Calculate average duration
        SELECT AVG(total_duration)::INTEGER INTO avg_dur
        FROM public.board_executions
        WHERE board_id = NEW.board_id AND status = 'completed';
        
        -- Calculate completion rate
        SELECT (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) INTO comp_rate
        FROM public.board_executions
        WHERE board_id = NEW.board_id;
        
        -- Update analytics
        UPDATE public.boards
        SET 
            average_duration = avg_dur,
            completion_rate = comp_rate
        WHERE id = NEW.board_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_board_analytics_trigger
    AFTER UPDATE ON public.board_executions
    FOR EACH ROW EXECUTE FUNCTION update_board_analytics();

-- Function to generate share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
BEGIN
    RETURN substring(md5(random()::text || clock_timestamp()::text) from 1 for 8);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR ANALYTICS
-- =============================================

-- View for board statistics
CREATE OR REPLACE VIEW board_stats AS
SELECT 
    b.id,
    b.user_id,
    b.title,
    b.board_type,
    b.total_executions,
    b.last_executed_at,
    b.average_duration,
    b.completion_rate,
    COUNT(bs.id) as total_steps,
    COUNT(bs.id) FILTER (WHERE bs.is_optional = false) as required_steps,
    SUM(bs.duration) as estimated_total_duration
FROM public.boards b
LEFT JOIN public.board_steps bs ON b.id = bs.board_id
GROUP BY b.id, b.user_id, b.title, b.board_type, b.total_executions, 
         b.last_executed_at, b.average_duration, b.completion_rate;

-- View for recent board activity
CREATE OR REPLACE VIEW recent_board_activity AS
SELECT 
    be.id as execution_id,
    b.id as board_id,
    b.title as board_title,
    be.user_id,
    be.started_at,
    be.completed_at,
    be.status,
    be.total_duration,
    be.satisfaction_rating,
    be.completion_percentage
FROM public.board_executions be
JOIN public.boards b ON be.board_id = b.id
ORDER BY be.started_at DESC;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT ALL ON public.boards TO authenticated;
GRANT ALL ON public.board_steps TO authenticated;
GRANT ALL ON public.board_executions TO authenticated;
GRANT ALL ON public.board_templates TO authenticated;

GRANT SELECT ON board_stats TO authenticated;
GRANT SELECT ON recent_board_activity TO authenticated;
