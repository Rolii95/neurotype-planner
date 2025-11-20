-- Minimal board_collaborators table to satisfy snapshot policies
-- This is intentionally lightweight and idempotent. The full collaboration
-- schema lives under `src/features/collaboration/database/schema.sql`.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.board_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  can_edit boolean DEFAULT FALSE,
  can_delete boolean DEFAULT FALSE,
  can_invite boolean DEFAULT FALSE,
  status text DEFAULT 'accepted',
  invited_by uuid,
  invited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_collaborators_board_id ON public.board_collaborators(board_id);
CREATE INDEX IF NOT EXISTS idx_board_collaborators_user_id ON public.board_collaborators(user_id);

-- Note: this minimal table is intended as a safe migration to unblock
-- `20251120_add_template_snapshots.sql`. Replace with full collaboration
-- migrations when ready.
