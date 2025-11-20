-- Migration: create table for metric ingestion rejections
-- This table stores lightweight records of rejected ingestion attempts
-- so that operators can investigate abuse or malformed payloads.

CREATE TABLE IF NOT EXISTS public.app_metrics_rejections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip inet,
  user_id uuid,
  reason text,
  content_length integer,
  note text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_metrics_rejections_created_at ON public.app_metrics_rejections (created_at DESC);

-- Keep this migration idempotent. No RLS is necessary because Edge Function uses
-- the service role key to insert, but if you want to restrict insertions later,
-- add RLS policies guarded by an admin role.
