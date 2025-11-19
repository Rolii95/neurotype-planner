// Collaborative & Privacy Features - TypeScript Definitions
// Comprehensive types for real-time collaboration and fine-grained privacy controls

// Core role definitions
export type CollaboratorRole = 'owner' | 'editor' | 'viewer';
export type PrivacyLevel = 'private' | 'shared' | 'public';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

// Collaborator interface
export interface Collaborator {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: CollaboratorRole;
  invitedAt: Date;
  acceptedAt?: Date;
  invitedBy: string; // userId of who sent the invitation
  status: InvitationStatus;
  lastActiveAt?: Date;
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    canExport: boolean;
    canViewHistory: boolean;
  };
}

// Enhanced privacy settings
export interface PrivacySettings {
  level: PrivacyLevel;
  isShared: boolean;
  allowPublicView: boolean;
  allowPublicEdit: boolean;
  requireApprovalForEdits: boolean;
  shareSettings: {
    allowCopy: boolean;
    allowDownload: boolean;
    allowPrint: boolean;
    expirationDate?: Date;
    maxViews?: number;
    currentViews?: number;
  };
  restrictedFields?: string[]; // Fields that remain private even when shared
}

// Item-level sharing controls
export interface ItemPrivacySettings {
  isPrivate: boolean;
  isShared: boolean;
  collaborators: string[]; // userIds who can access this specific item
  shareLevel: 'none' | 'view' | 'edit';
  maskSensitiveContent: boolean;
  hiddenFields: string[];
}

// Enhanced Board interface with collaboration features
export interface CollaborativeBoard {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerEmail: string;
  ownerDisplayName: string;
  
  // Privacy & Sharing
  isPrivate: boolean;
  privacySettings: PrivacySettings;
  collaborators: Collaborator[];
  
  // Content
  tasks: CollaborativeTask[];
  routines: CollaborativeRoutine[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: string;
  version: number;
  
  // Real-time features
  activeUsers: ActiveUser[];
  isLocked?: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  
  // Analytics
  viewCount: number;
  editCount: number;
  collaboratorCount: number;
}

// Enhanced Task interface
export interface CollaborativeTask {
  id: string;
  title: string;
  description?: string;
  boardId: string;
  ownerId: string;
  
  // Privacy controls
  privacySettings: ItemPrivacySettings;
  
  // Task properties
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'done' | 'archived';
  dueDate?: Date;
  estimatedTime?: number;
  actualTime?: number;
  
  // Collaboration
  assignedTo?: string[];
  collaborators: string[];
  comments: TaskComment[];
  
  // Sensitive content that can be masked
  notes?: string; // Can be marked as private
  attachments?: TaskAttachment[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: string;
  editHistory: EditHistoryEntry[];
  
  // Real-time state
  isBeingEdited?: boolean;
  editedBy?: string;
  lastSyncAt?: Date;
}

// Enhanced Routine interface
export interface CollaborativeRoutine {
  id: string;
  title: string;
  description?: string;
  boardId: string;
  ownerId: string;
  
  // Privacy controls
  privacySettings: ItemPrivacySettings;
  
  // Routine properties
  steps: RoutineStep[];
  schedule: RoutineSchedule;
  category: string;
  tags: string[];
  
  // Collaboration
  collaborators: string[];
  sharedWith: string[];
  
  // Sensitive content
  personalNotes?: string; // Always private to owner
  reflections?: string; // Can be shared or private
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: string;
  completionHistory: RoutineCompletion[];
  
  // Real-time features
  activeCollaborators: string[];
  isLocked?: boolean;
  lockedBy?: string;
}

// Supporting interfaces
export interface ActiveUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  lastSeen: Date;
  currentPage?: string;
  isOnline: boolean;
  status: 'online' | 'away' | 'offline';
  cursorPosition?: { x: number; y: number };
  cursorColor: string; // For cursor/selection highlighting
  color: string; // Alias for cursorColor for backward compatibility
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  isPrivate: boolean; // Comment visible only to author and task owner
  createdAt: Date;
  updatedAt?: Date;
  editedAt?: Date;
  parentCommentId?: string; // For threaded comments
  reactions: CommentReaction[];
}

export interface CommentReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  isPrivate: boolean;
  downloadUrl: string;
  thumbnailUrl?: string;
}

export interface EditHistoryEntry {
  id: string;
  itemId: string;
  itemType: 'board' | 'task' | 'routine' | 'comment';
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'share' | 'unshare' | 'permission_change';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface RoutineStep {
  id: string;
  routineId: string;
  title: string;
  description?: string;
  order: number;
  estimatedDuration?: number;
  isOptional: boolean;
  isPrivate: boolean; // Step-level privacy
  completedBy: string[]; // Users who completed this step
  notes?: string; // Private notes per user
}

export interface RoutineSchedule {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  frequency?: number;
  isActive: boolean;
}

export interface RoutineCompletion {
  id: string;
  routineId: string;
  userId: string;
  completedAt: Date;
  duration?: number;
  stepsCompleted: string[];
  notes?: string;
  mood?: number; // 1-10 scale
  difficulty?: number; // 1-10 scale
}

// Invitation and access control
export interface BoardInvitation {
  id: string;
  boardId: string;
  boardTitle: string;
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeId?: string; // Set when user accepts
  role: CollaboratorRole;
  message?: string;
  status: InvitationStatus;
  createdAt: Date;
  expiresAt?: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  revokedAt?: Date;
  accessToken: string; // For secure invitation links
}

// Real-time events
export interface RealtimeEvent {
  id: string;
  type: 'board_updated' | 'task_moved' | 'task_created' | 'task_updated' | 'task_deleted' | 
        'routine_updated' | 'user_joined' | 'user_left' | 'comment_added' | 'permission_changed';
  boardId: string;
  userId: string;
  userName: string;
  data: any;
  timestamp: Date;
  affectedUserIds: string[]; // Who should receive this event
}

// Audit log entries
export interface AuditLogEntry {
  id: string;
  boardId?: string;
  taskId?: string;
  routineId?: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'share' | 'unshare' | 
          'invite' | 'accept_invite' | 'decline_invite' | 'revoke_invite' |
          'change_role' | 'export' | 'login' | 'logout';
  resourceType: 'board' | 'task' | 'routine' | 'user' | 'invitation';
  resourceId: string;
  description: string;
  details?: Record<string, any>;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
    wasPrivate?: boolean;
    wasShared?: boolean;
  }[];
  riskLevel: 'low' | 'medium' | 'high'; // Based on action sensitivity
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  timestamp: string;
  additionalContext?: Record<string, any>;
}

// Privacy and security settings
export interface PrivacyPreferences {
  userId: string;
  
  // Global privacy settings
  defaultPrivacyLevel: PrivacyLevel;
  allowDataExport: boolean;
  allowDataSharing: boolean;
  allowAnalytics: boolean;
  
  // Neurotype-specific privacy
  neurotypePrivacyMode: boolean; // Enhanced privacy for sensitive neurotype data
  maskSensitiveContent: boolean;
  quickLockEnabled: boolean;
  quickLockShortcut: string;
  
  // Collaboration preferences
  allowInvitations: boolean;
  autoAcceptFromDomains: string[];
  requireApprovalForEdits: boolean;
  showOnlineStatus: boolean;
  showActivityStatus: boolean;
  
  // Notification preferences
  emailOnInvite: boolean;
  emailOnEdit: boolean;
  emailOnComment: boolean;
  browserNotifications: boolean;
}

// Board-level privacy settings
export interface PrivacySettings {
  boardId: string;
  
  // Visibility settings
  boardVisibility: 'private' | 'organization' | 'public';
  taskVisibility: 'all' | 'editors' | 'owner';
  
  // Content protection
  enableQuickLock: boolean;
  autoLockTimeout: number; // minutes, 0 = disabled
  maskSensitiveContent: boolean;
  
  // Data handling
  enableAuditLog: boolean;
  allowDataExport: boolean;
  dataRetentionDays: number; // 0 = forever
  
  // Updated metadata
  updatedAt: Date;
  updatedBy: string;
}

// Quick lock settings and state
export interface QuickLockSettings {
  boardId: string;
  enabled: boolean;
  isActive: boolean;
  activatedAt?: Date;
  activatedBy?: string;
  autoLockTimeout: number;
  shortcutKey?: string;
}

// Extended privacy preferences
export interface ExtendedPrivacyPreferences extends PrivacyPreferences {
  // Data retention
  keepEditHistory: boolean;
  editHistoryDuration: number; // days
  autoDeleteOldData: boolean;
  dataRetentionPeriod: number; // days
  
  // Security
  requirePasswordForExport: boolean;
  enableTwoFactorAuth: boolean;
  allowRememberDevice: boolean;
  sessionTimeout: number; // minutes
  
  updatedAt: Date;
}

// Local session state for quick lock and privacy
export interface SessionPrivacyState {
  isQuickLocked: boolean;
  quickLockActivatedAt?: Date;
  maskSensitiveContent: boolean;
  blurLevel: number; // 0-10 for CSS blur intensity
  privacyMode: 'normal' | 'enhanced' | 'maximum';
  hiddenFields: Set<string>;
  lastUserActivity: Date;
  autoLockTimer?: number;
  isIncognitoMode: boolean; // Don't track this session
}

// Permission checking helpers
export interface PermissionCheck {
  hasAccess: boolean;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canExport: boolean;
  canViewHistory: boolean;
  role: CollaboratorRole | null;
  reason?: string; // If access denied, why
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'user_presence' | 'board_update' | 'task_update' | 'routine_update' | 
        'comment_added' | 'invitation_sent' | 'permission_changed' | 'audit_event';
  boardId?: string;
  userId: string;
  payload: any;
  timestamp: Date;
  messageId: string;
}

// Database query helpers
export interface CollaborationQueryFilters {
  userId: string;
  includePrivate?: boolean;
  includeShared?: boolean;
  role?: CollaboratorRole[];
  privacyLevel?: PrivacyLevel[];
  lastModifiedAfter?: Date;
  onlyActive?: boolean;
}