-- Create snapshot tables for board and routine templates so users can branch
-- templates into private snapshots that they own. Includes Row Level Security
-- policies that allow owners and collaborators to access snapshots.

-- Board snapshots
CREATE TABLE IF NOT EXISTS public.board_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  snapshot_data jsonb NOT NULL,
  title text,
  is_public boolean DEFAULT false,
  shared_with jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.board_snapshots IS 'User-owned snapshots created from board templates for branching/collaboration.';

-- Enable RLS
ALTER TABLE public.board_snapshots ENABLE ROW LEVEL SECURITY;

-- Owners can select/update/delete their snapshots
CREATE POLICY "board_snapshots_owner_manage" ON public.board_snapshots
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Allow collaborators on the original template's board to select snapshots
CREATE POLICY "board_snapshots_collaborators_select" ON public.board_snapshots
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.board_collaborators bc WHERE bc.board_id = public.board_snapshots.template_id AND bc.user_id = auth.uid()
    )
  );

-- Allow authenticated users to create snapshots, but enforce owner_id matches auth.uid()
CREATE POLICY "board_snapshots_insert_auth" ON public.board_snapshots
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Routine snapshots
CREATE TABLE IF NOT EXISTS public.routine_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  snapshot_data jsonb NOT NULL,
  title text,
  is_public boolean DEFAULT false,
  shared_with jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.routine_snapshots IS 'User-owned snapshots created from routine templates for branching/collaboration.';

ALTER TABLE public.routine_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routine_snapshots_owner_manage" ON public.routine_snapshots
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "routine_snapshots_insert_auth" ON public.routine_snapshots
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "routine_snapshots_collaborators_select" ON public.routine_snapshots
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.routines r JOIN public.board_collaborators bc ON bc.board_id = r.id WHERE r.id = public.routine_snapshots.template_id AND bc.user_id = auth.uid()
    )
  );

-- Simple indexes for queries
CREATE INDEX IF NOT EXISTS idx_board_snapshots_owner ON public.board_snapshots(owner_id);
CREATE INDEX IF NOT EXISTS idx_routine_snapshots_owner ON public.routine_snapshots(owner_id);
