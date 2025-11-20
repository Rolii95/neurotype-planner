-- Migration: Add visual_routines, mood_entries, sensory_preferences, user_activity tables
-- and RLS policies. Created: 2025-11-20

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Visual routines
CREATE TABLE IF NOT EXISTS public.visual_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  steps jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Ensure timestamp columns exist if table pre-existed without them
ALTER TABLE public.visual_routines ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.visual_routines ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_visual_routines_updated_at ON public.visual_routines (updated_at DESC);

-- Mood entries
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood smallint,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);
ALTER TABLE public.mood_entries ADD COLUMN IF NOT EXISTS timestamp timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_mood_entries_timestamp ON public.mood_entries (timestamp DESC);

-- Sensory preferences
CREATE TABLE IF NOT EXISTS public.sensory_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sensory_preferences ADD COLUMN IF NOT EXISTS timestamp timestamptz DEFAULT now();
ALTER TABLE public.sensory_preferences ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS ux_sensory_preferences_user ON public.sensory_preferences (user_id);

-- User activity (analytics / adaptive smart)
CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text,
  entity_id text,
  entity_type text,
  duration_minutes int,
  context jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_activity ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity (created_at DESC);

-- Enable Row Level Security and add basic owner-only policies
ALTER TABLE public.visual_routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS visual_routines_owner ON public.visual_routines;
CREATE POLICY visual_routines_owner ON public.visual_routines
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mood_entries_owner ON public.mood_entries;
CREATE POLICY mood_entries_owner ON public.mood_entries
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.sensory_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sensory_preferences_owner ON public.sensory_preferences;
CREATE POLICY sensory_preferences_owner ON public.sensory_preferences
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_activity_owner ON public.user_activity;
CREATE POLICY user_activity_owner ON public.user_activity
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: To create a storage bucket for routine assets, run this command in SQL playground or via the Supabase CLI/console:
--   SELECT storage.create_bucket('routine-assets', true);
-- Some Supabase projects include a helper function `storage.create_bucket`; if not available, create the bucket via the Supabase dashboard or CLI.

-- End of migration
