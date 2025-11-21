-- Generated delta: only include statements missing from remote DB
-- Source: src/features/collaboration/database/schema.sql
-- Generated at 2025-11-20T21:07:10.265Z

CREATE EXTENSION IF NOT EXISTS "pg_cron"
;

CREATE INDEX IF NOT EXISTS idx_board_invitations_email ON board_invitations(invitee_email)
;

CREATE INDEX IF NOT EXISTS idx_board_invitations_token ON board_invitations(access_token)
;

CREATE INDEX IF NOT EXISTS idx_collaborative_tasks_board_id ON collaborative_tasks(board_id)
;

CREATE INDEX IF NOT EXISTS idx_collaborative_tasks_owner_id ON collaborative_tasks(owner_id)
;

CREATE INDEX IF NOT EXISTS idx_collaborative_routines_board_id ON collaborative_routines(board_id)
;

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id)
;

CREATE INDEX IF NOT EXISTS idx_audit_logs_board_id ON audit_logs(board_id)
;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id)
;

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)
;

CREATE INDEX IF NOT EXISTS idx_realtime_events_board_id ON realtime_events(board_id)
;

CREATE INDEX IF NOT EXISTS idx_realtime_events_created_at ON realtime_events(created_at)
;

CREATE INDEX IF NOT EXISTS idx_user_presence_board_id ON user_presence(board_id)
;

ALTER TABLE collaborative_boards ENABLE ROW LEVEL SECURITY
;

ALTER TABLE board_collaborators ENABLE ROW LEVEL SECURITY
;

ALTER TABLE board_invitations ENABLE ROW LEVEL SECURITY
;

ALTER TABLE collaborative_tasks ENABLE ROW LEVEL SECURITY
;

ALTER TABLE collaborative_routines ENABLE ROW LEVEL SECURITY
;

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY
;

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY
;

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY
;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY
;

ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY
;

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY
;

ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY
;

CREATE POLICY "Owners can update boards" ON collaborative_boards
  FOR UPDATE USING (owner_id = auth.uid())
;

CREATE POLICY "Owners can delete boards" ON collaborative_boards
  FOR DELETE USING (owner_id = auth.uid())
;

CREATE POLICY "Users can create boards" ON collaborative_boards
  FOR INSERT WITH CHECK (owner_id = auth.uid())
;

CREATE POLICY "Board owners can manage collaborators" ON board_collaborators
  FOR ALL USING (
    board_id IN (SELECT id FROM collaborative_boards WHERE owner_id = auth.uid())
  )
;

CREATE POLICY "Users can create tasks in accessible boards" ON collaborative_tasks
  FOR INSERT WITH CHECK (
    board_id IN (
      SELECT id FROM collaborative_boards 
      WHERE owner_id = auth.uid() OR
      id IN (
        SELECT board_id FROM board_collaborators 
        WHERE user_id = auth.uid() AND status = 'accepted' AND can_edit = true
      )
    )
  )
;

CREATE POLICY "Users can update tasks they can edit" ON collaborative_tasks
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    (
      board_id IN (
        SELECT board_id FROM board_collaborators 
        WHERE user_id = auth.uid() AND status = 'accepted' AND can_edit = true
      ) AND is_private = false
    )
  )
;

CREATE TRIGGER update_collaborative_boards_updated_at BEFORE UPDATE ON collaborative_boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_collaborative_tasks_updated_at BEFORE UPDATE ON collaborative_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_collaborative_routines_updated_at BEFORE UPDATE ON collaborative_routines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER add_board_owner_collaborator AFTER INSERT ON collaborative_boards FOR EACH ROW EXECUTE FUNCTION add_board_owner_as_collaborator()
;

CREATE INDEX IF NOT EXISTS idx_board_quick_lock_board_id ON board_quick_lock(board_id)
;

CREATE INDEX IF NOT EXISTS idx_board_quick_lock_active ON board_quick_lock(is_active) WHERE is_active = TRUE
;

ALTER TABLE board_quick_lock ENABLE ROW LEVEL SECURITY
;

CREATE POLICY "Board owners can manage privacy settings" ON board_privacy_settings
  FOR ALL USING (
    board_id IN (
      SELECT id FROM collaborative_boards WHERE owner_id = auth.uid()
    )
  )
;

CREATE POLICY "Board collaborators with edit permissions can manage quick lock" ON board_quick_lock
  FOR ALL USING (
    board_id IN (
      SELECT bc.board_id FROM board_collaborators bc
      WHERE bc.user_id = auth.uid() 
      AND bc.status = 'accepted'
      AND bc.can_edit = TRUE
    )
  )
;

CREATE OR REPLACE FUNCTION update_board_quick_lock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW()
;

CREATE TRIGGER trigger_update_board_privacy_settings_updated_at
  BEFORE UPDATE ON board_privacy_settings
  FOR EACH ROW EXECUTE FUNCTION update_board_privacy_settings_updated_at()
;

CREATE TRIGGER trigger_update_board_quick_lock_updated_at
  BEFORE UPDATE ON board_quick_lock
  FOR EACH ROW EXECUTE FUNCTION update_board_quick_lock_updated_at()
;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated
;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated
;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
;