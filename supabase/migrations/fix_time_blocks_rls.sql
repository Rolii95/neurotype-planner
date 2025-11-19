-- Fix RLS policies for time_blocks table
-- The original policies have overly complex nested queries that may cause 403 errors

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own time blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Users can insert own time blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Users can update own time blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Users can delete own time blocks" ON public.time_blocks;

-- Create simplified RLS policies
CREATE POLICY "Users can view own time blocks"
    ON public.time_blocks FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own time blocks"
    ON public.time_blocks FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time blocks"
    ON public.time_blocks FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own time blocks"
    ON public.time_blocks FOR DELETE
    USING (user_id = auth.uid());
