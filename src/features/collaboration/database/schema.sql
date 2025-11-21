-- Collaborative & Privacy Features - Supabase Database Schema
-- Real-time collaboration and fine-grained privacy controls

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create enhanced user profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  neurotype TEXT CHECK (neurotype IN ('adhd', 'autism', 'dyslexia', 'general', 'multiple')),
  
  -- Privacy preferences
  default_privacy_level TEXT DEFAULT 'private' CHECK (default_privacy_level IN ('private', 'shared', 'public')),
  allow_data_export BOOLEAN DEFAULT TRUE,
  allow_data_sharing BOOLEAN DEFAULT TRUE,
  allow_analytics BOOLEAN DEFAULT TRUE,
  neurotype_privacy_mode BOOLEAN DEFAULT FALSE,
  mask_sensitive_content BOOLEAN DEFAULT FALSE,
  quick_lock_enabled BOOLEAN DEFAULT TRUE,
  quick_lock_shortcut TEXT DEFAULT 'Ctrl+Shift+L',
  
  -- Collaboration preferences
  allow_invitations BOOLEAN DEFAULT TRUE,
  auto_accept_domains TEXT[] DEFAULT '{}',
  require_approval_for_edits BOOLEAN DEFAULT FALSE,
  show_online_status BOOLEAN DEFAULT TRUE,
  show_activity_status BOOLEAN DEFAULT TRUE,
  
  -- Notification preferences
  email_on_invite BOOLEAN DEFAULT TRUE,
  email_on_edit BOOLEAN DEFAULT FALSE,
  email_on_comment BOOLEAN DEFAULT TRUE,
  browser_notifications BOOLEAN DEFAULT TRUE,
  
  -- Security settings
  require_password_for_export BOOLEAN DEFAULT FALSE,
  enable_two_factor_auth BOOLEAN DEFAULT FALSE,
  allow_remember_device BOOLEAN DEFAULT TRUE,
  session_timeout INTEGER DEFAULT 480, -- minutes
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced boards table with collaboration features
CREATE TABLE IF NOT EXISTS collaborative_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Privacy & Sharing
  is_private BOOLEAN DEFAULT TRUE,
  privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('private', 'shared', 'public')),
  allow_public_view BOOLEAN DEFAULT FALSE,
  allow_public_edit BOOLEAN DEFAULT FALSE,
  require_approval_for_edits BOOLEAN DEFAULT FALSE,
  
  -- Share settings
  allow_copy BOOLEAN DEFAULT TRUE,
  allow_download BOOLEAN DEFAULT TRUE,
  allow_print BOOLEAN DEFAULT TRUE,
  expiration_date TIMESTAMPTZ,
  max_views INTEGER,
  current_views INTEGER DEFAULT 0,
  restricted_fields TEXT[] DEFAULT '{}',
  
  -- Real-time features
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES user_profiles(id),
  locked_at TIMESTAMPTZ,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  edit_count INTEGER DEFAULT 0,
  collaborator_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by UUID REFERENCES user_profiles(id),
  version INTEGER DEFAULT 1
);

-- Board collaborators junction table
CREATE TABLE IF NOT EXISTS board_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES collaborative_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  
  -- Permissions
  can_edit BOOLEAN DEFAULT TRUE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_invite BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT TRUE,
  can_view_history BOOLEAN DEFAULT FALSE,
  
  -- Invitation tracking
  invited_by UUID REFERENCES user_profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  
  -- Activity tracking
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(board_id, user_id)
);

-- Board invitations table
CREATE TABLE IF NOT EXISTS board_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES collaborative_boards(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  message TEXT,
  access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url'),
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Enhanced tasks table with collaboration
CREATE TABLE IF NOT EXISTS collaborative_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  board_id UUID NOT NULL REFERENCES collaborative_boards(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Task properties
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done', 'archived')),
  due_date TIMESTAMPTZ,
  estimated_time INTEGER, -- minutes
  actual_time INTEGER, -- minutes
  
  -- Privacy controls
  is_private BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT TRUE,
  share_level TEXT DEFAULT 'edit' CHECK (share_level IN ('none', 'view', 'edit')),
  mask_sensitive_content BOOLEAN DEFAULT FALSE,
  hidden_fields TEXT[] DEFAULT '{}',
  
  -- Sensitive content
  notes TEXT, -- Can be marked as private
  personal_reflections TEXT, -- Always private to owner
  
  -- Collaboration
  assigned_to UUID[] DEFAULT '{}',
  collaborator_ids UUID[] DEFAULT '{}',
  
  -- Real-time state
  is_being_edited BOOLEAN DEFAULT FALSE,
  edited_by UUID REFERENCES user_profiles(id),
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by UUID REFERENCES user_profiles(id),
  
  -- Position in board (for drag & drop)
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  quadrant TEXT CHECK (quadrant IN ('urgent-important', 'urgent-not-important', 'not-urgent-important', 'not-urgent-not-important'))
);

-- Enhanced routines table with collaboration
CREATE TABLE IF NOT EXISTS collaborative_routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  board_id UUID NOT NULL REFERENCES collaborative_boards(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Privacy controls
  is_private BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT TRUE,
  share_level TEXT DEFAULT 'view' CHECK (share_level IN ('none', 'view', 'edit')),
  mask_sensitive_content BOOLEAN DEFAULT FALSE,
  hidden_fields TEXT[] DEFAULT '{}',
  
  -- Routine properties
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Schedule
  schedule_type TEXT DEFAULT 'once' CHECK (schedule_type IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[] DEFAULT '{}',
  frequency INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Sensitive content
  personal_notes TEXT, -- Always private to owner
  reflections TEXT, -- Can be shared or private
  
  -- Collaboration
  collaborator_ids UUID[] DEFAULT '{}',
  shared_with UUID[] DEFAULT '{}',
  
  -- Real-time features
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES user_profiles(id),
  locked_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by UUID REFERENCES user_profiles(id)
);

-- Routine steps table
CREATE TABLE IF NOT EXISTS routine_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES collaborative_routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL,
  estimated_duration INTEGER, -- minutes
  is_optional BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE, -- Step-level privacy
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES collaborative_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE, -- Comment visible only to author and task owner
  parent_comment_id UUID REFERENCES task_comments(id), -- For threaded comments
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ
);

-- Comment reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id, emoji)
);

-- Task attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES collaborative_tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  
  -- Storage URLs (would be Supabase Storage URLs)
  download_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Context
  board_id UUID REFERENCES collaborative_boards(id),
  task_id UUID REFERENCES collaborative_tasks(id),
  routine_id UUID REFERENCES collaborative_routines(id),
  
  -- Actor
  actor_id UUID NOT NULL REFERENCES user_profiles(id),
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  
  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create', 'read', 'update', 'delete', 'share', 'unshare',
    'invite', 'accept_invite', 'decline_invite', 'revoke_invite',
    'change_role', 'export', 'login', 'logout'
  )),
  
  target_item_id UUID NOT NULL,
  target_item_type TEXT NOT NULL CHECK (target_item_type IN ('board', 'task', 'routine', 'user', 'invitation')),
  
  -- Changes
  changes_made JSONB DEFAULT '[]',
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Technical details
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- Metadata
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  additional_context JSONB DEFAULT '{}'
);

-- Real-time events table (for WebSocket broadcasting)
CREATE TABLE IF NOT EXISTS realtime_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'board_updated', 'task_moved', 'task_created', 'task_updated', 'task_deleted',
    'routine_updated', 'user_joined', 'user_left', 'comment_added', 'permission_changed'
  )),
  
  board_id UUID NOT NULL REFERENCES collaborative_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  user_name TEXT NOT NULL,
  
  event_data JSONB DEFAULT '{}',
  affected_user_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Auto-delete old events after 24 hours
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- User presence tracking (for "who's online")
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  board_id UUID REFERENCES collaborative_boards(id) ON DELETE CASCADE,
  
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_page TEXT,
  cursor_position JSONB, -- {x: number, y: number}
  status_color TEXT DEFAULT '#3B82F6', -- For cursor/selection highlighting
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routine completions table
CREATE TABLE IF NOT EXISTS routine_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES collaborative_routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER, -- minutes
  steps_completed UUID[] DEFAULT '{}',
  notes TEXT,
  mood INTEGER CHECK (mood >= 1 AND mood <= 10), -- 1-10 scale
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10) -- 1-10 scale
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_board_collaborators_board_id ON board_collaborators(board_id);
CREATE INDEX IF NOT EXISTS idx_board_collaborators_user_id ON board_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_board_invitations_email ON board_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_board_invitations_token ON board_invitations(access_token);
CREATE INDEX IF NOT EXISTS idx_collaborative_tasks_board_id ON collaborative_tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_tasks_owner_id ON collaborative_tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_routines_board_id ON collaborative_routines(board_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_board_id ON audit_logs(board_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_realtime_events_board_id ON realtime_events(board_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_created_at ON realtime_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_presence_board_id ON user_presence(board_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can read all profiles but only update their own
DO $$
BEGIN
  CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$ LANGUAGE plpgsql;

-- Boards: Users can see boards they own or are collaborators on
CREATE POLICY "Users can view accessible boards" ON collaborative_boards
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT board_id FROM board_collaborators 
      WHERE user_id = auth.uid() AND status = 'accepted'
    ) OR
    (allow_public_view = true AND privacy_level = 'public')
  );

CREATE POLICY "Owners can update boards" ON collaborative_boards
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete boards" ON collaborative_boards
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Users can create boards" ON collaborative_boards
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Board collaborators: Users can see collaborators of boards they have access to
CREATE POLICY "Users can view collaborators of accessible boards" ON board_collaborators
  FOR SELECT USING (
    board_id IN (
      SELECT id FROM collaborative_boards 
      WHERE owner_id = auth.uid() OR
      id IN (
        SELECT board_id FROM board_collaborators 
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Board owners can manage collaborators" ON board_collaborators
  FOR ALL USING (
    board_id IN (SELECT id FROM collaborative_boards WHERE owner_id = auth.uid())
  );

-- Tasks: Users can see tasks from boards they have access to
CREATE POLICY "Users can view accessible tasks" ON collaborative_tasks
  FOR SELECT USING (
    board_id IN (
      SELECT id FROM collaborative_boards 
      WHERE owner_id = auth.uid() OR
      id IN (
        SELECT board_id FROM board_collaborators 
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    ) AND (
      is_private = false OR 
      owner_id = auth.uid() OR
      auth.uid() = ANY(collaborator_ids)
    )
  );

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
  );

CREATE POLICY "Users can update tasks they can edit" ON collaborative_tasks
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    (
      board_id IN (
        SELECT board_id FROM board_collaborators 
        WHERE user_id = auth.uid() AND status = 'accepted' AND can_edit = true
      ) AND is_private = false
    )
  );

-- Similar policies for other tables...
-- (Abbreviated for brevity, but would include all tables)

-- Functions for automatic updates

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborative_boards_updated_at BEFORE UPDATE ON collaborative_boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborative_tasks_updated_at BEFORE UPDATE ON collaborative_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborative_routines_updated_at BEFORE UPDATE ON collaborative_routines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically add board owner as collaborator
CREATE OR REPLACE FUNCTION add_board_owner_as_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO board_collaborators (board_id, user_id, role, can_edit, can_delete, can_invite, can_export, can_view_history, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', true, true, true, true, true, 'accepted');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER add_board_owner_collaborator AFTER INSERT ON collaborative_boards FOR EACH ROW EXECUTE FUNCTION add_board_owner_as_collaborator();

-- Function to clean up expired events
CREATE OR REPLACE FUNCTION cleanup_expired_events()
RETURNS void AS $$
BEGIN
  DELETE FROM realtime_events WHERE expires_at < NOW();
  DELETE FROM board_invitations WHERE expires_at < NOW() AND status = 'pending';
END;
$$ language 'plpgsql';

-- Schedule cleanup to run every hour
SELECT cron.schedule('cleanup-expired-events', '0 * * * *', 'SELECT cleanup_expired_events();');

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_board_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_routine_id UUID DEFAULT NULL,
  p_action_type TEXT,
  p_target_item_id UUID,
  p_target_item_type TEXT,
  p_changes_made JSONB DEFAULT '[]',
  p_risk_level TEXT DEFAULT 'low'
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_user_profile RECORD;
BEGIN
  -- Get user profile information
  SELECT display_name, email INTO v_user_profile
  FROM user_profiles WHERE id = auth.uid();
  
  INSERT INTO audit_logs (
    board_id, task_id, routine_id, actor_id, actor_name, actor_email,
    action_type, target_item_id, target_item_type, changes_made, risk_level,
    ip_address, user_agent, session_id
  ) VALUES (
    p_board_id, p_task_id, p_routine_id, auth.uid(), 
    v_user_profile.display_name, v_user_profile.email,
    p_action_type, p_target_item_id, p_target_item_type, p_changes_made, p_risk_level,
    inet_client_addr(), current_setting('request.headers', true)::json->>'user-agent',
    current_setting('request.jwt.claims', true)::json->>'session_id'
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Views for easier querying

-- User's accessible boards view
CREATE OR REPLACE VIEW user_accessible_boards AS
SELECT 
  b.*,
  bc.role as user_role,
  bc.can_edit,
  bc.can_delete,
  bc.can_invite,
  bc.can_export,
  bc.can_view_history,
  up.display_name as owner_name,
  up.avatar_url as owner_avatar
FROM collaborative_boards b
LEFT JOIN board_collaborators bc ON b.id = bc.board_id AND bc.user_id = auth.uid()
LEFT JOIN user_profiles up ON b.owner_id = up.id
WHERE 
  b.owner_id = auth.uid() OR
  bc.user_id = auth.uid() OR
  (b.allow_public_view = true AND b.privacy_level = 'public');

-- Board statistics view
CREATE OR REPLACE VIEW board_statistics AS
SELECT 
  b.id,
  b.title,
  COUNT(DISTINCT bc.user_id) as collaborator_count,
  COUNT(DISTINCT ct.id) as task_count,
  COUNT(DISTINCT cr.id) as routine_count,
  COUNT(DISTINCT tc.id) as comment_count,
  MAX(b.updated_at) as last_activity
FROM collaborative_boards b
LEFT JOIN board_collaborators bc ON b.id = bc.board_id AND bc.status = 'accepted'
LEFT JOIN collaborative_tasks ct ON b.id = ct.board_id
LEFT JOIN collaborative_routines cr ON b.id = cr.board_id
LEFT JOIN task_comments tc ON ct.id = tc.task_id
GROUP BY b.id, b.title;

-- Privacy Settings Table
CREATE TABLE IF NOT EXISTS board_privacy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES collaborative_boards(id) ON DELETE CASCADE,
  
  -- Visibility settings
  board_visibility TEXT DEFAULT 'private' CHECK (board_visibility IN ('public', 'private', 'organization')),
  task_visibility TEXT DEFAULT 'all' CHECK (task_visibility IN ('all', 'owner', 'editors')),
  
  -- Quick lock settings
  enable_quick_lock BOOLEAN DEFAULT TRUE,
  auto_lock_timeout INTEGER DEFAULT 300, -- seconds of inactivity
  
  -- Content protection
  mask_sensitive_content BOOLEAN DEFAULT FALSE,
  
  -- Audit and compliance
  enable_audit_log BOOLEAN DEFAULT TRUE,
  allow_data_export BOOLEAN DEFAULT TRUE,
  data_retention_days INTEGER DEFAULT 365,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),
  
  UNIQUE(board_id)
);

-- Quick Lock Settings Table
CREATE TABLE IF NOT EXISTS board_quick_lock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES collaborative_boards(id) ON DELETE CASCADE,
  
  -- Lock state
  enabled BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT FALSE,
  
  -- Lock details
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES user_profiles(id),
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES user_profiles(id),
  
  -- Configuration
  auto_lock_timeout INTEGER DEFAULT 300, -- seconds
  require_password BOOLEAN DEFAULT FALSE,
  lock_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(board_id)
);

-- Indexes for privacy settings
CREATE INDEX IF NOT EXISTS idx_board_privacy_settings_board_id ON board_privacy_settings(board_id);
CREATE INDEX IF NOT EXISTS idx_board_quick_lock_board_id ON board_quick_lock(board_id);
CREATE INDEX IF NOT EXISTS idx_board_quick_lock_active ON board_quick_lock(is_active) WHERE is_active = TRUE;

-- Row Level Security for Privacy Settings
ALTER TABLE board_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_quick_lock ENABLE ROW LEVEL SECURITY;

-- Privacy settings policies
CREATE POLICY "Users can view privacy settings for boards they collaborate on" ON board_privacy_settings
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM board_collaborators 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Board owners can manage privacy settings" ON board_privacy_settings
  FOR ALL USING (
    board_id IN (
      SELECT id FROM collaborative_boards WHERE owner_id = auth.uid()
    )
  );

-- Quick lock policies
CREATE POLICY "Users can view quick lock status for boards they collaborate on" ON board_quick_lock
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM board_collaborators 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Board collaborators with edit permissions can manage quick lock" ON board_quick_lock
  FOR ALL USING (
    board_id IN (
      SELECT bc.board_id FROM board_collaborators bc
      WHERE bc.user_id = auth.uid() 
      AND bc.status = 'accepted'
      AND bc.can_edit = TRUE
    )
  );

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_board_privacy_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_board_quick_lock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_board_privacy_settings_updated_at
  BEFORE UPDATE ON board_privacy_settings
  FOR EACH ROW EXECUTE FUNCTION update_board_privacy_settings_updated_at();

CREATE TRIGGER trigger_update_board_quick_lock_updated_at
  BEFORE UPDATE ON board_quick_lock
  FOR EACH ROW EXECUTE FUNCTION update_board_quick_lock_updated_at();

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;