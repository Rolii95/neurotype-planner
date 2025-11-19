// Database row types matching the SQL schema
export interface DatabaseBoard {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  is_private: boolean;
  privacy_level: 'private' | 'shared' | 'public';
  allow_public_view: boolean;
  allow_public_edit: boolean;
  require_approval_for_edits: boolean;
  allow_copy: boolean;
  allow_download: boolean;
  allow_print: boolean;
  expiration_date: string | null;
  max_views: number | null;
  current_views: number;
  restricted_fields: string[];
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  view_count: number;
  edit_count: number;
  collaborator_count: number;
  created_at: string;
  updated_at: string;
  last_modified_by: string | null;
  version: number;
}

export interface DatabaseBoardCollaborator {
  id: string;
  board_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  can_edit: boolean;
  can_delete: boolean;
  can_invite: boolean;
  can_export: boolean;
  can_view_history: boolean;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  last_active_at: string;
}

export interface DatabaseTask {
  id: string;
  title: string;
  description: string | null;
  board_id: string;
  owner_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'done' | 'archived';
  due_date: string | null;
  estimated_time: number | null;
  actual_time: number | null;
  is_private: boolean;
  is_shared: boolean;
  share_level: 'none' | 'view' | 'edit';
  mask_sensitive_content: boolean;
  hidden_fields: string[];
  notes: string | null;
  personal_reflections: string | null;
  assigned_to: string[];
  collaborator_ids: string[];
  is_being_edited: boolean;
  edited_by: string | null;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
  last_modified_by: string | null;
  position_x: number;
  position_y: number;
  quadrant: 'urgent-important' | 'urgent-not-important' | 'not-urgent-important' | 'not-urgent-not-important' | null;
}

export interface DatabaseUserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  neurotype: 'adhd' | 'autism' | 'dyslexia' | 'general' | 'multiple' | null;
  default_privacy_level: 'private' | 'shared' | 'public';
  allow_data_export: boolean;
  allow_data_sharing: boolean;
  allow_analytics: boolean;
  neurotype_privacy_mode: boolean;
  mask_sensitive_content: boolean;
  quick_lock_enabled: boolean;
  quick_lock_shortcut: string;
  allow_invitations: boolean;
  auto_accept_domains: string[];
  require_approval_for_edits: boolean;
  show_online_status: boolean;
  show_activity_status: boolean;
  email_on_invite: boolean;
  email_on_edit: boolean;
  email_on_comment: boolean;
  browser_notifications: boolean;
  require_password_for_export: boolean;
  enable_two_factor_auth: boolean;
  allow_remember_device: boolean;
  session_timeout: number;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface DatabaseAuditLog {
  id: string;
  board_id: string | null;
  task_id: string | null;
  routine_id: string | null;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  action_type: 'create' | 'read' | 'update' | 'delete' | 'share' | 'unshare' | 'invite' | 'accept_invite' | 'decline_invite' | 'revoke_invite' | 'change_role' | 'export' | 'login' | 'logout';
  target_item_id: string;
  target_item_type: 'board' | 'task' | 'routine' | 'user' | 'invitation';
  changes_made: any[];
  risk_level: 'low' | 'medium' | 'high';
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  timestamp: string;
  additional_context: Record<string, any>;
}