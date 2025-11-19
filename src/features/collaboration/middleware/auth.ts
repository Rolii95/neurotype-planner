import { supabase } from '../../../services/supabase';
import type { 
  CollaborativeBoard, 
  Collaborator, 
  PrivacyLevel,
  AuditLogEntry
} from '../types';
import type {
  DatabaseBoard,
  DatabaseBoardCollaborator,
  DatabaseTask,
  DatabaseUserProfile,
  DatabaseAuditLog
} from '../types/database';

// Error classes
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

// Types for authorization
export interface UserPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canExport: boolean;
  canViewHistory: boolean;
}

export interface AuthContext {
  user: any;
  userRole: 'owner' | 'editor' | 'viewer' | null;
  permissions: UserPermissions | null;
}

/**
 * Authorization service for board-related operations
 * Handles user authentication and role-based permissions in the frontend
 */
export class AuthorizationService {
  private supabase = supabase;

  constructor() {
    // Use the configured supabase client
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<any> {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    
    if (error || !user) {
      throw new AuthError('User not authenticated');
    }

    // Get user profile
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new AuthError('User profile not found');
    }

    return profile;
  }

  /**
   * Check if user has access to a specific board and get permissions
   */
  async getBoardAuthContext(boardId: string): Promise<AuthContext> {
    try {
      const user = await this.getCurrentUser();

      // Get board information
      const { data: board, error: boardError } = await this.supabase
        .from('collaborative_boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (boardError || !board) {
        throw new PermissionError('Board not found');
      }

      const boardData = board as DatabaseBoard;

      // Check if user is board owner
      if (boardData.owner_id === user.id) {
        return {
          user,
          userRole: 'owner',
          permissions: {
            canEdit: true,
            canDelete: true,
            canInvite: true,
            canExport: true,
            canViewHistory: true
          }
        };
      }

      // Check if user is a collaborator
      const { data: collaborator, error: collabError } = await this.supabase
        .from('board_collaborators')
        .select('*')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (collabError || !collaborator) {
        // Check if board allows public access
        if (boardData.privacy_level === 'public' && boardData.allow_public_view) {
          return {
            user,
            userRole: 'viewer',
            permissions: {
              canEdit: boardData.allow_public_edit || false,
              canDelete: false,
              canInvite: false,
              canExport: boardData.allow_download || false,
              canViewHistory: false
            }
          };
        } else {
          throw new PermissionError('Access denied to board');
        }
      }

      const collaboratorData = collaborator as DatabaseBoardCollaborator;

      return {
        user,
        userRole: collaboratorData.role as 'owner' | 'editor' | 'viewer',
        permissions: {
          canEdit: collaboratorData.can_edit,
          canDelete: collaboratorData.can_delete,
          canInvite: collaboratorData.can_invite,
          canExport: collaboratorData.can_export,
          canViewHistory: collaboratorData.can_view_history
        }
      };
    } catch (error) {
      if (error instanceof AuthError || error instanceof PermissionError) {
        throw error;
      }
      console.error('Authorization error:', error);
      throw new AuthError('Internal authorization error');
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    boardId: string, 
    permission: keyof UserPermissions
  ): Promise<boolean> {
    try {
      const authContext = await this.getBoardAuthContext(boardId);
      return authContext.permissions?.[permission] || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user can edit specific task (handles task-level privacy)
   */
  async canEditTask(taskId: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();

      // Get task information
      const { data: task, error: taskError } = await this.supabase
        .from('collaborative_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError || !task) {
        return false;
      }

      const taskData = task as DatabaseTask;

      // Check if user is task owner
      if (taskData.owner_id === user.id) {
        return true;
      }

      // Check if task is private
      if (taskData.is_private) {
        return false;
      }

      // Check if user has edit permissions on the board
      const authContext = await this.getBoardAuthContext(taskData.board_id);
      if (!authContext.permissions?.canEdit) {
        return false;
      }

      // Check if user is in task collaborators
      if (taskData.collaborator_ids && !taskData.collaborator_ids.includes(user.id)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Task permission error:', error);
      return false;
    }
  }

  /**
   * Check if user can view specific board
   */
  async canViewBoard(boardId: string): Promise<boolean> {
    try {
      await this.getBoardAuthContext(boardId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user can edit specific board
   */
  async canEditBoard(boardId: string): Promise<boolean> {
    try {
      const authContext = await this.getBoardAuthContext(boardId);
      return authContext.permissions?.canEdit || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's role for a specific board
   */
  async getUserBoardRole(boardId: string): Promise<'owner' | 'editor' | 'viewer' | null> {
    try {
      const authContext = await this.getBoardAuthContext(boardId);
      return authContext.userRole;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user can perform specific action on task
   */
  async canPerformTaskAction(
    taskId: string, 
    action: 'view' | 'edit' | 'delete'
  ): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      
      const { data: task, error: taskError } = await this.supabase
        .from('collaborative_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError || !task) return false;

      const taskData = task as DatabaseTask;

      // Task owner can perform all actions
      if (taskData.owner_id === user.id) return true;

      // Check if task is private
      if (taskData.is_private && action !== 'view') return false;

      // For viewing, check board access
      if (action === 'view') {
        return this.canViewBoard(taskData.board_id);
      }

      // For edit/delete, check board edit permissions
      const canEditBoard = await this.canEditBoard(taskData.board_id);
      if (!canEditBoard) return false;

      // Check if user is task collaborator
      if (taskData.collaborator_ids && !taskData.collaborator_ids.includes(user.id)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Task permission check error:', error);
      return false;
    }
  }

  /**
   * Log audit event
   */
  async logAuditEvent({
    actionType,
    boardId,
    taskId,
    routineId,
    targetItemId,
    targetItemType,
    changesMade = [],
    riskLevel = 'low',
    additionalContext = {}
  }: {
    actionType: string;
    boardId?: string;
    taskId?: string;
    routineId?: string;
    targetItemId: string;
    targetItemType: 'board' | 'task' | 'routine' | 'user' | 'invitation';
    changesMade?: any[];
    riskLevel?: 'low' | 'medium' | 'high';
    additionalContext?: Record<string, any>;
  }): Promise<void> {
    try {
      const user = await this.getCurrentUser();

      // Type the audit log entry
      const auditLogEntry: Partial<DatabaseAuditLog> = {
        board_id: boardId || null,
        task_id: taskId || null,
        routine_id: routineId || null,
        actor_id: user.id,
        actor_name: user.display_name,
        actor_email: user.email,
        action_type: actionType as DatabaseAuditLog['action_type'],
        target_item_id: targetItemId,
        target_item_type: targetItemType,
        changes_made: changesMade,
        risk_level: riskLevel,
        additional_context: additionalContext
      };

      const { error } = await (this.supabase as any).from('audit_logs').insert(auditLogEntry);
      
      if (error) {
        console.error('Audit log insert error:', error);
      }
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw error - audit logging should not break main functionality
    }
  }

  /**
   * Get audit logs for a board (requires appropriate permissions)
   */
  async getBoardAuditLogs(boardId: string, limit = 50): Promise<AuditLogEntry[]> {
    try {
      const authContext = await this.getBoardAuthContext(boardId);
      
      if (!authContext.permissions?.canViewHistory) {
        throw new PermissionError('No permission to view audit history');
      }

      const { data: logs, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('board_id', boardId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error('Failed to fetch audit logs');
      }

      return logs as AuditLogEntry[];
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Check rate limiting (simplified frontend version)
   */
  private rateLimitCache = new Map<string, { count: number; resetTime: number }>();

  checkRateLimit(userId: string, maxRequests = 10, windowMs = 60000): boolean {
    const now = Date.now();
    const userRequests = this.rateLimitCache.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      this.rateLimitCache.set(userId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (userRequests.count >= maxRequests) {
      return false;
    }

    userRequests.count++;
    return true;
  }
}

/**
 * Permission utility functions for React components
 */
export class PermissionUtils {
  private authService: AuthorizationService;

  constructor(authService: AuthorizationService) {
    this.authService = authService;
  }

  /**
   * Hook-friendly permission checker
   */
  async checkPermissions(boardId: string) {
    try {
      const authContext = await this.authService.getBoardAuthContext(boardId);
      return {
        isAuthenticated: true,
        userRole: authContext.userRole,
        permissions: authContext.permissions,
        user: authContext.user
      };
    } catch (error) {
      return {
        isAuthenticated: false,
        userRole: null,
        permissions: null,
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch permission check for multiple boards
   */
  async checkMultipleBoardPermissions(boardIds: string[]) {
    const results = await Promise.allSettled(
      boardIds.map(async (boardId) => ({
        boardId,
        ...(await this.checkPermissions(boardId))
      }))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          boardId: boardIds[index],
          isAuthenticated: false,
          userRole: null,
          permissions: null,
          user: null,
          error: result.reason?.message || 'Permission check failed'
        };
      }
    });
  }

  /**
   * Check if action requires confirmation based on risk level
   */
  requiresConfirmation(action: string, userRole: string): boolean {
    const highRiskActions = ['delete', 'revoke_access', 'change_privacy'];
    const ownerOnlyActions = ['delete_board', 'transfer_ownership'];

    if (ownerOnlyActions.includes(action) && userRole !== 'owner') {
      return true;
    }

    return highRiskActions.includes(action);
  }
}