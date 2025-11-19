import { collaborationDB, collaborationSupabase } from './supabase-helpers';
import { AuthorizationService, PermissionError, AuthError } from '../middleware/auth';
import type { 
  CollaborativeBoard, 
  Collaborator, 
  BoardInvitation,
  PrivacySettings,
  QuickLockSettings,
  AuditLogEntry
} from '../types';
import type { DatabaseBoard, DatabaseBoardCollaborator } from '../types/database';

/**
 * API service for managing board collaboration features
 * Handles invitations, permissions, and access control
 */
export class CollaborationAPI {
  private authService: AuthorizationService;

  constructor(authService: AuthorizationService) {
    this.authService = authService;
  }

  /**
   * Invite a user to collaborate on a board
   */
  async inviteUser({
    boardId,
    inviteeEmail,
    role,
    message
  }: {
    boardId: string;
    inviteeEmail: string;
    role: 'editor' | 'viewer';
    message?: string;
  }): Promise<BoardInvitation> {
    try {
      // Check if current user can invite
      const authContext = await this.authService.getBoardAuthContext(boardId);
      
      if (!authContext.permissions?.canInvite) {
        throw new PermissionError('No permission to invite users to this board');
      }

      // Check rate limiting
      if (!this.authService.checkRateLimit(authContext.user.id, 5, 300000)) { // 5 invites per 5 minutes
        throw new Error('Rate limit exceeded for invitations');
      }

      // Create invitation record
      const { data: invitation, error: inviteError } = await (collaborationSupabase
        .from('board_invitations')
        .insert({
          board_id: boardId,
          inviter_id: authContext.user.id,
          invitee_email: inviteeEmail,
          role,
          message: message || null,
        })
        .select()
        .single() as any);

      if (inviteError) {
        throw new Error(`Failed to create invitation: ${inviteError.message}`);
      }

      // Log audit event
      await this.authService.logAuditEvent({
        actionType: 'invite',
        boardId,
        targetItemId: invitation.id,
        targetItemType: 'invitation',
        changesMade: [{ action: 'invited', email: inviteeEmail, role }],
        riskLevel: 'medium'
      });

      return invitation as BoardInvitation;
    } catch (error) {
      console.error('Invitation error:', error);
      throw error;
    }
  }

  /**
   * Accept a board invitation
   */
  async acceptInvitation(invitationToken: string): Promise<void> {
    try {
      const user = await this.authService.getCurrentUser();

      // Get invitation
      const { data: invitation, error: inviteError } = await collaborationSupabase
        .from('board_invitations')
        .select('*')
        .eq('access_token', invitationToken)
        .eq('status', 'pending')
        .single();

      if (inviteError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Check if user matches invitee
      if (invitation.invitee_email !== user.email) {
        throw new Error('Invitation not for this user');
      }

      // Create collaborator record
      const { error: collabError } = await collaborationSupabase
        .from('board_collaborators')
        .insert({
          board_id: invitation.board_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.inviter_id,
          status: 'accepted'
        });

      if (collabError) {
        throw new Error(`Failed to add collaborator: ${collabError.message}`);
      }

      // Update invitation status
      const { error: updateError } = await collaborationSupabase
        .from('board_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          invitee_id: user.id
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Failed to update invitation status:', updateError);
      }

      // Log audit event
      await this.authService.logAuditEvent({
        actionType: 'accept_invite',
        boardId: invitation.board_id,
        targetItemId: invitation.id,
        targetItemType: 'invitation',
        changesMade: [{ action: 'accepted', role: invitation.role }],
        riskLevel: 'low'
      });
    } catch (error) {
      console.error('Accept invitation error:', error);
      throw error;
    }
  }

  /**
   * Decline a board invitation
   */
  async declineInvitation(invitationToken: string): Promise<void> {
    try {
      const user = await this.authService.getCurrentUser();

      // Get invitation
      const { data: invitation, error: inviteError } = await collaborationSupabase
        .from('board_invitations')
        .select('*')
        .eq('access_token', invitationToken)
        .eq('status', 'pending')
        .single();

      if (inviteError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Check if user matches invitee
      if (invitation.invitee_email !== user.email) {
        throw new Error('Invitation not for this user');
      }

      // Update invitation status
      const { error: updateError } = await collaborationSupabase
        .from('board_invitations')
        .update({ 
          status: 'declined',
          declined_at: new Date().toISOString(),
          invitee_id: user.id
        })
        .eq('id', invitation.id);

      if (updateError) {
        throw new Error(`Failed to decline invitation: ${updateError.message}`);
      }

      // Log audit event
      await this.authService.logAuditEvent({
        actionType: 'decline_invite',
        boardId: invitation.board_id,
        targetItemId: invitation.id,
        targetItemType: 'invitation',
        changesMade: [{ action: 'declined' }],
        riskLevel: 'low'
      });
    } catch (error) {
      console.error('Decline invitation error:', error);
      throw error;
    }
  }

  /**
   * Change a collaborator's role
   */
  async changeCollaboratorRole({
    boardId,
    collaboratorId,
    newRole
  }: {
    boardId: string;
    collaboratorId: string;
    newRole: 'editor' | 'viewer';
  }): Promise<void> {
    try {
      // Check permissions
      const authContext = await this.authService.getBoardAuthContext(boardId);
      
      if (authContext.userRole !== 'owner') {
        throw new PermissionError('Only board owners can change roles');
      }

      // Get current collaborator info
      const { data: collaborator, error: collabError } = await collaborationSupabase
        .from('board_collaborators')
        .select('*')
        .eq('board_id', boardId)
        .eq('user_id', collaboratorId)
        .single();

      if (collabError || !collaborator) {
        throw new Error('Collaborator not found');
      }

      // Prevent changing owner role
      if (collaborator.role === 'owner') {
        throw new PermissionError('Cannot change owner role');
      }

      // Update role
      const { error: updateError } = await collaborationSupabase
        .from('board_collaborators')
        .update({ role: newRole })
        .eq('id', collaborator.id);

      if (updateError) {
        throw new Error(`Failed to update role: ${updateError.message}`);
      }

      // Log audit event
      await this.authService.logAuditEvent({
        actionType: 'change_role',
        boardId,
        targetItemId: collaborator.id,
        targetItemType: 'user',
        changesMade: [{ 
          action: 'role_changed',
          oldRole: collaborator.role,
          newRole,
          userId: collaboratorId
        }],
        riskLevel: 'medium'
      });
    } catch (error) {
      console.error('Role change error:', error);
      throw error;
    }
  }

  /**
   * Remove a collaborator from a board
   */
  async removeCollaborator({
    boardId,
    collaboratorId
  }: {
    boardId: string;
    collaboratorId: string;
  }): Promise<void> {
    try {
      // Check permissions
      const authContext = await this.authService.getBoardAuthContext(boardId);
      
      if (authContext.userRole !== 'owner' && authContext.user.id !== collaboratorId) {
        throw new PermissionError('Can only remove yourself or be board owner');
      }

      // Get collaborator info
      const { data: collaborator, error: collabError } = await collaborationSupabase
        .from('board_collaborators')
        .select('*')
        .eq('board_id', boardId)
        .eq('user_id', collaboratorId)
        .single();

      if (collabError || !collaborator) {
        throw new Error('Collaborator not found');
      }

      // Prevent removing owner
      if (collaborator.role === 'owner') {
        throw new PermissionError('Cannot remove board owner');
      }

      // Remove collaborator
      const { error: removeError } = await collaborationSupabase
        .from('board_collaborators')
        .delete()
        .eq('id', collaborator.id);

      if (removeError) {
        throw new Error(`Failed to remove collaborator: ${removeError.message}`);
      }

      // Log audit event
      await this.authService.logAuditEvent({
        actionType: 'unshare',
        boardId,
        targetItemId: collaborator.id,
        targetItemType: 'user',
        changesMade: [{ 
          action: 'removed',
          userId: collaboratorId,
          role: collaborator.role
        }],
        riskLevel: 'high'
      });
    } catch (error) {
      console.error('Remove collaborator error:', error);
      throw error;
    }
  }

  /**
   * Get all collaborators for a board
   */
  async getBoardCollaborators(boardId: string): Promise<Collaborator[]> {
    try {
      // Check if user has access to board
      await this.authService.getBoardAuthContext(boardId);

      const { data: collaborators, error } = await collaborationSupabase
        .from('board_collaborators')
        .select(`
          *,
          user_profiles:user_id (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('board_id', boardId)
        .eq('status', 'accepted');

      if (error) {
        throw new Error(`Failed to fetch collaborators: ${error.message}`);
      }

      return (collaborators.map((collab: any) => ({
        id: collab.id,
        userId: collab.user_id,
        boardId: collab.board_id,
        role: collab.role,
        permissions: {
          canEdit: collab.can_edit,
          canDelete: collab.can_delete,
          canInvite: collab.can_invite,
          canExport: collab.can_export,
          canViewHistory: collab.can_view_history
        },
        invitedBy: collab.invited_by,
        invitedAt: collab.invited_at,
        acceptedAt: collab.accepted_at,
        lastActiveAt: collab.last_active_at,
        user: {
          id: collab.user_profiles.id,
          displayName: collab.user_profiles.display_name,
          email: collab.user_profiles.email,
          avatarUrl: collab.user_profiles.avatar_url
        },
        // Add missing properties for Collaborator type
        email: collab.user_profiles.email,
        displayName: collab.user_profiles.display_name,
        status: 'accepted'
      })) as any) as Collaborator[];
    } catch (error) {
      console.error('Get collaborators error:', error);
      throw error;
    }
  }

  /**
   * Update board privacy settings
   */
  async updateBoardPrivacy({
    boardId,
    privacySettings
  }: {
    boardId: string;
    privacySettings: Partial<PrivacySettings>;
  }): Promise<void> {
    try {
      // Check permissions - only owner can change privacy
      const authContext = await this.authService.getBoardAuthContext(boardId);
      
      if (authContext.userRole !== 'owner') {
        throw new PermissionError('Only board owners can change privacy settings');
      }

      // Map privacy settings to database fields
      const updateData: Partial<DatabaseBoard> = {};
      
      if (privacySettings.level !== undefined) {
        updateData.privacy_level = privacySettings.level;
      }
      
      if (privacySettings.allowPublicView !== undefined) {
        updateData.allow_public_view = privacySettings.allowPublicView;
      }
      
      if (privacySettings.allowPublicEdit !== undefined) {
        updateData.allow_public_edit = privacySettings.allowPublicEdit;
      }
      
      if ((privacySettings as any).allowCopy !== undefined) {
        (updateData as any).allow_copy = (privacySettings as any).allowCopy;
      }
      
      if ((privacySettings as any).allowDownload !== undefined) {
        (updateData as any).allow_download = (privacySettings as any).allowDownload;
      }

      // Update board
      const { error } = await collaborationSupabase
        .from('collaborative_boards')
        .update(updateData)
        .eq('id', boardId);

      if (error) {
        throw new Error(`Failed to update privacy settings: ${error.message}`);
      }

      // Log audit event
      await this.authService.logAuditEvent({
        actionType: 'update',
        boardId,
        targetItemId: boardId,
        targetItemType: 'board',
        changesMade: [{ action: 'privacy_updated', changes: privacySettings }],
        riskLevel: 'high'
      });
    } catch (error) {
      console.error('Update privacy error:', error);
      throw error;
    }
  }

  /**
   * Get pending invitations for current user
   */
  async getPendingInvitations(): Promise<BoardInvitation[]> {
    try {
      const user = await this.authService.getCurrentUser();

      const { data: invitations, error } = await collaborationSupabase
        .from('board_invitations')
        .select(`
          *,
          collaborative_boards:board_id (
            id,
            title,
            description
          ),
          inviter:inviter_id (
            id,
            display_name,
            email
          )
        `)
        .eq('invitee_email', user.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        throw new Error(`Failed to fetch invitations: ${error.message}`);
      }

      return (invitations.map((invite: any) => ({
        id: invite.id,
        boardId: invite.board_id,
        inviterUserId: invite.inviter_id,
        inviteeEmail: invite.invitee_email,
        role: invite.role,
        message: invite.message,
        status: invite.status,
        accessToken: invite.access_token,
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
        board: {
          id: invite.collaborative_boards.id,
          title: invite.collaborative_boards.title,
          description: invite.collaborative_boards.description
        },
        inviter: {
          id: invite.inviter.id,
          displayName: invite.inviter.display_name,
          email: invite.inviter.email
        },
        // Add missing properties for BoardInvitation type
        boardTitle: invite.collaborative_boards.title,
        inviterId: invite.inviter_id,
        inviterName: invite.inviter.display_name,
        inviterEmail: invite.inviter.email
      })) as any) as BoardInvitation[];
    } catch (error) {
      console.error('Get pending invitations error:', error);
      throw error;
    }
  }

  /**
   * Get all boards accessible to current user
   */
  async getAccessibleBoards(): Promise<CollaborativeBoard[]> {
    try {
      const user = await this.authService.getCurrentUser();

      const { data: boards, error } = await collaborationSupabase
        .from('user_accessible_boards')
        .select('*')
        .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`);

      if (error) {
        throw new Error(`Failed to fetch boards: ${error.message}`);
      }

      return boards as CollaborativeBoard[];
    } catch (error) {
      console.error('Get accessible boards error:', error);
      throw error;
    }
  }
}

/**
 * Quick Lock feature for privacy protection
 */
export class QuickLockService {
  private authService: AuthorizationService;
  private isLocked = false;
  private lockListeners: Array<(locked: boolean) => void> = [];

  constructor(authService: AuthorizationService) {
    this.authService = authService;
    
    // Listen for keyboard shortcut
    this.setupKeyboardShortcut();
  }

  /**
   * Lock/unlock the interface
   */
  async toggleLock(): Promise<void> {
    try {
      const user = await this.authService.getCurrentUser();
      
      if (!user.quick_lock_enabled) {
        throw new Error('Quick lock is disabled for this user');
      }

      this.isLocked = !this.isLocked;
      
      // Notify listeners
      this.lockListeners.forEach(listener => listener(this.isLocked));

      // Log audit event
      await this.authService.logAuditEvent({
        actionType: this.isLocked ? 'lock' : 'unlock',
        targetItemId: user.id,
        targetItemType: 'user',
        changesMade: [{ action: this.isLocked ? 'locked' : 'unlocked' }],
        riskLevel: 'medium'
      });
    } catch (error) {
      console.error('Quick lock error:', error);
      throw error;
    }
  }

  /**
   * Check if interface is currently locked
   */
  isInterfaceLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Add listener for lock state changes
   */
  onLockStateChange(listener: (locked: boolean) => void): () => void {
    this.lockListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.lockListeners.indexOf(listener);
      if (index > -1) {
        this.lockListeners.splice(index, 1);
      }
    };
  }

  /**
   * Setup keyboard shortcut listener
   */
  private setupKeyboardShortcut(): void {
    document.addEventListener('keydown', async (event) => {
      try {
        const user = await this.authService.getCurrentUser();
        const shortcut = user.quick_lock_shortcut || 'Ctrl+Shift+L';
        
        if (this.matchesShortcut(event, shortcut)) {
          event.preventDefault();
          await this.toggleLock();
        }
      } catch (error) {
        // Silently fail if user not authenticated
      }
    });
  }

  /**
   * Check if keyboard event matches configured shortcut
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
    const parts = shortcut.split('+');
    const key = parts[parts.length - 1].toLowerCase();
    
    const modifiers = parts.slice(0, -1).map(m => m.toLowerCase());
    
    return (
      event.key.toLowerCase() === key &&
      modifiers.includes('ctrl') === event.ctrlKey &&
      modifiers.includes('shift') === event.shiftKey &&
      modifiers.includes('alt') === event.altKey
    );
  }
}

// Privacy Controls API Extension
export const PrivacyControlsAPI = {
  async getPrivacySettings(boardId: string): Promise<PrivacySettings> {
    try {
      const response = await collaborationSupabase
        .from('board_privacy_settings')
        .select('*')
        .eq('board_id', boardId)
        .single();

      if (response.error) throw response.error;

      return ({
        boardId: response.data.board_id,
        boardVisibility: response.data.board_visibility,
        taskVisibility: response.data.task_visibility,
        enableQuickLock: response.data.enable_quick_lock,
        autoLockTimeout: response.data.auto_lock_timeout,
        maskSensitiveContent: response.data.mask_sensitive_content,
        enableAuditLog: response.data.enable_audit_log,
        allowDataExport: response.data.allow_data_export,
        dataRetentionDays: response.data.data_retention_days,
        updatedAt: new Date(response.data.updated_at),
        updatedBy: response.data.updated_by,
        // Add missing properties for PrivacySettings type
        level: 'private',
        isShared: false,
        allowPublicView: false,
        allowPublicEdit: false,
        requireApprovalForEdits: false,
        shareSettings: {
          allowCopy: true,
          allowDownload: true,
          allowPrint: true
        }
      } as any) as PrivacySettings;
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      throw new Error('Failed to fetch privacy settings');
    }
  },

  async updatePrivacySettings(boardId: string, settings: PrivacySettings): Promise<void> {
    try {
      const { error } = await collaborationSupabase
        .from('board_privacy_settings')
        .upsert({
          board_id: boardId,
          board_visibility: settings.boardVisibility,
          task_visibility: settings.taskVisibility,
          enable_quick_lock: settings.enableQuickLock,
          auto_lock_timeout: settings.autoLockTimeout,
          mask_sensitive_content: settings.maskSensitiveContent,
          enable_audit_log: settings.enableAuditLog,
          allow_data_export: settings.allowDataExport,
          data_retention_days: settings.dataRetentionDays,
          updated_at: new Date().toISOString(),
          updated_by: (await collaborationSupabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw new Error('Failed to update privacy settings');
    }
  },

  async getQuickLockSettings(boardId: string): Promise<QuickLockSettings> {
    try {
      const response = await collaborationSupabase
        .from('board_quick_lock')
        .select('*')
        .eq('board_id', boardId)
        .single();

      if (response.error && response.error.code !== 'PGRST116') {
        throw response.error;
      }

      // If no settings exist, return default
      if (response.error) {
        return {
          boardId,
          enabled: false,
          isActive: false,
          autoLockTimeout: 0
        };
      }

      return {
        boardId: response.data.board_id,
        enabled: response.data.enabled,
        isActive: response.data.is_active,
        activatedAt: response.data.activated_at ? new Date(response.data.activated_at) : undefined,
        activatedBy: response.data.activated_by,
        autoLockTimeout: response.data.auto_lock_timeout,
        shortcutKey: response.data.shortcut_key
      };
    } catch (error) {
      console.error('Error fetching quick lock settings:', error);
      throw new Error('Failed to fetch quick lock settings');
    }
  },

  async activateQuickLock(boardId: string): Promise<void> {
    try {
      const user = (await collaborationSupabase.auth.getUser()).data.user;
      const { error } = await collaborationSupabase
        .from('board_quick_lock')
        .upsert({
          board_id: boardId,
          enabled: true,
          is_active: true,
          activated_at: new Date().toISOString(),
          activated_by: user?.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error activating quick lock:', error);
      throw new Error('Failed to activate quick lock');
    }
  },

  async deactivateQuickLock(boardId: string): Promise<void> {
    try {
      const { error } = await collaborationSupabase
        .from('board_quick_lock')
        .update({
          is_active: false,
          activated_at: null,
          activated_by: null
        })
        .eq('board_id', boardId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating quick lock:', error);
      throw new Error('Failed to deactivate quick lock');
    }
  },

  async getAuditLogs(boardId: string, filters: any): Promise<AuditLogEntry[]> {
    try {
      let query = collaborationSupabase
        .from('audit_logs')
        .select('*')
        .eq('board_id', boardId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.user) {
        query = query.ilike('user_name', `%${filters.user}%`);
      }
      if (filters.dateFrom) {
        query = query.gte('timestamp', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('timestamp', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      type AuditLogRow = {
        id: string;
        board_id?: string | null;
        task_id?: string | null;
        routine_id?: string | null;
        user_id: string;
        user_name: string;
        user_email: string;
        action: AuditLogEntry['action'];
        resource_type: AuditLogEntry['resourceType'];
        resource_id: string;
        description: string;
        details?: Record<string, any>;
        risk_level: AuditLogEntry['riskLevel'];
        ip_address: string;
        user_agent: string;
        session_id: string;
        timestamp: string;
        additional_context?: Record<string, any>;
      };

      const rows: AuditLogRow[] = data ?? [];

      return rows.map((log): AuditLogEntry => ({
        id: log.id,
        boardId: log.board_id ?? undefined,
        taskId: log.task_id ?? undefined,
        routineId: log.routine_id ?? undefined,
        userId: log.user_id,
        userName: log.user_name,
        userEmail: log.user_email,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        description: log.description,
        details: log.details,
        riskLevel: log.risk_level,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        sessionId: log.session_id,
        timestamp: log.timestamp,
        additionalContext: log.additional_context
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error('Failed to fetch audit logs');
    }
  },

  async exportAuditLogs(boardId: string, filters: any): Promise<string> {
    try {
      const logs = await this.getAuditLogs(boardId, filters);
      
      // Convert to CSV format
      const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Description', 'Risk Level'];
      const csvData = [
        headers.join(','),
        ...logs.map(log => [
          log.timestamp,
          log.userName,
          log.action,
          log.resourceType,
          `"${log.description.replace(/"/g, '""')}"`,
          log.riskLevel
        ].join(','))
      ];

      return csvData.join('\n');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw new Error('Failed to export audit logs');
    }
  }
};
