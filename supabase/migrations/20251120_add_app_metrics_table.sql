-- Migration: Add app_metrics table for storing client metrics snapshots
-- Created: 2025-11-20

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metrics jsonb NOT NULL,
  source text DEFAULT 'client',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_metrics ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_app_metrics_created_at ON public.app_metrics (created_at DESC);

-- Enable RLS and owner-only policies
ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_metrics_owner ON public.app_metrics;
CREATE POLICY app_metrics_owner ON public.app_metrics
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
