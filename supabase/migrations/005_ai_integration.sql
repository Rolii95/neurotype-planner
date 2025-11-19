-- =============================================
-- Migration: AI Integration
-- Created: 2025-11-07
-- Adds AI conversation tracking, suggestions, and usage monitoring
-- =============================================

-- =============================================
-- AI CONVERSATIONS TABLE
-- Stores complete conversation history with context
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_type TEXT NOT NULL CHECK (conversation_type IN (
        'general',
        'board_suggestion',
        'task_breakdown',
        'mood_insight',
        'context_recall',
        'routine_creation'
    )),
    
    -- Context linking to other entities
    context_data JSONB, -- {board_id, task_id, mood_entry_id, etc.}
    
    -- Conversation history (array of messages)
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Metadata
    tokens_used INTEGER DEFAULT 0,
    model_used TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Quality and safety tracking
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    flagged_for_review BOOLEAN DEFAULT false,
    flag_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI conversations"
    ON public.ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI conversations"
    ON public.ai_conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI conversations"
    ON public.ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_type ON public.ai_conversations(conversation_type);
CREATE INDEX idx_ai_conversations_created ON public.ai_conversations(created_at DESC);
CREATE INDEX idx_ai_conversations_flagged ON public.ai_conversations(flagged_for_review) 
    WHERE flagged_for_review = true;

-- =============================================
-- AI SUGGESTIONS TABLE
-- Stores AI-generated suggestions for boards, tasks, etc.
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
        'board',
        'task',
        'routine',
        'habit',
        'mood_coping',
        'energy_management'
    )),
    
    -- Source
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
    trigger_context JSONB, -- What prompted this suggestion
    
    -- Suggestion content
    title TEXT NOT NULL,
    description TEXT,
    suggestion_data JSONB NOT NULL, -- Actual board structure, task list, etc.
    
    -- User interaction
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'accepted',
        'rejected',
        'modified',
        'implemented'
    )),
    user_modifications JSONB,
    implemented_at TIMESTAMPTZ,
    implemented_id TEXT, -- ID of the created board/task/etc.
    
    -- Analytics
    confidence_score DECIMAL(3,2), -- AI's confidence in suggestion (0.00-1.00)
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI suggestions"
    ON public.ai_suggestions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI suggestions"
    ON public.ai_suggestions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI suggestions"
    ON public.ai_suggestions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI suggestions"
    ON public.ai_suggestions FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_suggestions_user_id ON public.ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_type ON public.ai_suggestions(suggestion_type);
CREATE INDEX idx_ai_suggestions_status ON public.ai_suggestions(status);
CREATE INDEX idx_ai_suggestions_created ON public.ai_suggestions(created_at DESC);

-- =============================================
-- AI USAGE STATS TABLE
-- Tracks usage for rate limiting and cost management
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Usage metrics
    total_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0, -- Estimated cost in USD
    
    -- Breakdown by type
    requests_by_type JSONB DEFAULT '{}'::jsonb,
    tokens_by_model JSONB DEFAULT '{}'::jsonb,
    
    -- Hourly tracking for rate limiting
    hourly_requests JSONB DEFAULT '{}'::jsonb, -- {hour: count}
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- RLS Policies
ALTER TABLE public.ai_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage stats"
    ON public.ai_usage_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage stats"
    ON public.ai_usage_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage stats"
    ON public.ai_usage_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_usage_user_date ON public.ai_usage_stats(user_id, date DESC);
CREATE INDEX idx_ai_usage_date ON public.ai_usage_stats(date DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp for ai_conversations
CREATE TRIGGER update_ai_conversations_timestamp
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

-- Update updated_at timestamp for ai_suggestions
CREATE TRIGGER update_ai_suggestions_timestamp
    BEFORE UPDATE ON public.ai_suggestions
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

-- Update updated_at timestamp for ai_usage_stats
CREATE TRIGGER update_ai_usage_stats_timestamp
    BEFORE UPDATE ON public.ai_usage_stats
    FOR EACH ROW EXECUTE FUNCTION update_boards_updated_at();

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to increment AI usage statistics
-- Called after each AI request
CREATE OR REPLACE FUNCTION increment_ai_usage(
    p_user_id UUID,
    p_date DATE,
    p_requests INTEGER,
    p_tokens INTEGER,
    p_cost DECIMAL,
    p_type TEXT,
    p_model TEXT
)
RETURNS VOID AS $$
DECLARE
    v_hour TEXT;
    v_requests_by_type JSONB;
    v_tokens_by_model JSONB;
    v_hourly_requests JSONB;
BEGIN
    v_hour := EXTRACT(HOUR FROM NOW())::TEXT;
    
    -- Insert or update usage stats
    INSERT INTO public.ai_usage_stats (
        user_id,
        date,
        total_requests,
        total_tokens,
        total_cost,
        requests_by_type,
        tokens_by_model,
        hourly_requests
    ) VALUES (
        p_user_id,
        p_date,
        p_requests,
        p_tokens,
        p_cost,
        jsonb_build_object(p_type, p_requests),
        jsonb_build_object(p_model, p_tokens),
        jsonb_build_object(v_hour, p_requests)
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_requests = ai_usage_stats.total_requests + p_requests,
        total_tokens = ai_usage_stats.total_tokens + p_tokens,
        total_cost = ai_usage_stats.total_cost + p_cost,
        requests_by_type = ai_usage_stats.requests_by_type || 
            jsonb_build_object(
                p_type, 
                COALESCE((ai_usage_stats.requests_by_type->p_type)::INTEGER, 0) + p_requests
            ),
        tokens_by_model = ai_usage_stats.tokens_by_model || 
            jsonb_build_object(
                p_model,
                COALESCE((ai_usage_stats.tokens_by_model->p_model)::INTEGER, 0) + p_tokens
            ),
        hourly_requests = ai_usage_stats.hourly_requests || 
            jsonb_build_object(
                v_hour,
                COALESCE((ai_usage_stats.hourly_requests->v_hour)::INTEGER, 0) + p_requests
            ),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has exceeded rate limits
CREATE OR REPLACE FUNCTION check_ai_rate_limit(
    p_user_id UUID,
    p_hourly_limit INTEGER DEFAULT 20,
    p_daily_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    within_limits BOOLEAN,
    hourly_count INTEGER,
    daily_count INTEGER
) AS $$
DECLARE
    v_hour TEXT;
    v_hourly_count INTEGER;
    v_daily_count INTEGER;
BEGIN
    v_hour := EXTRACT(HOUR FROM NOW())::TEXT;
    
    -- Get today's usage
    SELECT 
        COALESCE((hourly_requests->v_hour)::INTEGER, 0),
        COALESCE(total_requests, 0)
    INTO v_hourly_count, v_daily_count
    FROM public.ai_usage_stats
    WHERE user_id = p_user_id AND date = CURRENT_DATE;
    
    -- If no record exists, set counts to 0
    v_hourly_count := COALESCE(v_hourly_count, 0);
    v_daily_count := COALESCE(v_daily_count, 0);
    
    -- Return results
    RETURN QUERY SELECT
        (v_hourly_count < p_hourly_limit AND v_daily_count < p_daily_limit),
        v_hourly_count,
        v_daily_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEWS
-- =============================================

-- View for AI usage analytics
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT 
    u.id as user_id,
    u.email,
    DATE_TRUNC('day', aus.created_at) as date,
    SUM(aus.total_requests) as requests,
    SUM(aus.total_tokens) as tokens,
    SUM(aus.total_cost) as cost,
    COUNT(DISTINCT ac.id) as conversations,
    COUNT(DISTINCT asug.id) as suggestions_created,
    COUNT(DISTINCT asug.id) FILTER (WHERE asug.status = 'implemented') as suggestions_implemented
FROM auth.users u
LEFT JOIN public.ai_usage_stats aus ON u.id = aus.user_id
LEFT JOIN public.ai_conversations ac ON u.id = ac.user_id
LEFT JOIN public.ai_suggestions asug ON u.id = asug.user_id
GROUP BY u.id, u.email, DATE_TRUNC('day', aus.created_at);

-- View for conversation insights
CREATE OR REPLACE VIEW conversation_insights AS
SELECT 
    ac.id,
    ac.user_id,
    ac.conversation_type,
    ac.model_used,
    ac.tokens_used,
    ac.user_rating,
    ac.started_at,
    ac.last_message_at,
    (ac.last_message_at - ac.started_at) as conversation_duration,
    jsonb_array_length(ac.messages) as message_count,
    COUNT(asug.id) as suggestions_generated
FROM public.ai_conversations ac
LEFT JOIN public.ai_suggestions asug ON ac.id = asug.conversation_id
GROUP BY ac.id;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT ALL ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_suggestions TO authenticated;
GRANT ALL ON public.ai_usage_stats TO authenticated;

GRANT SELECT ON ai_usage_summary TO authenticated;
GRANT SELECT ON conversation_insights TO authenticated;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION increment_ai_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_ai_rate_limit TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ai_conversations IS 'Stores complete AI conversation history with context and quality tracking';
COMMENT ON TABLE public.ai_suggestions IS 'AI-generated suggestions for boards, tasks, routines, and coping strategies';
COMMENT ON TABLE public.ai_usage_stats IS 'Daily usage statistics for rate limiting and cost management';

COMMENT ON FUNCTION increment_ai_usage IS 'Updates AI usage statistics after each request';
COMMENT ON FUNCTION check_ai_rate_limit IS 'Checks if user has exceeded hourly or daily rate limits';
