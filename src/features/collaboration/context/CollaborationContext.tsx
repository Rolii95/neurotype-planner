import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { CollaborationAPI, QuickLockService } from '../api';
import { AuthorizationService, AuthError, PermissionError } from '../middleware/auth';
import type { 
  CollaborativeBoard, 
  Collaborator, 
  BoardInvitation,
  PrivacySettings
} from '../types';

// Context types
interface CollaborationContextType {
  // State
  currentBoard: CollaborativeBoard | null;
  collaborators: Collaborator[];
  pendingInvitations: BoardInvitation[];
  isQuickLocked: boolean;
  isLoading: boolean;
  error: string | null;

  // Permissions
  userRole: 'owner' | 'editor' | 'viewer' | null;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    canExport: boolean;
    canViewHistory: boolean;
  } | null;

  // Actions
  loadBoard: (boardId: string) => Promise<void>;
  inviteUser: (email: string, role: 'editor' | 'viewer', message?: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  declineInvitation: (token: string) => Promise<void>;
  changeCollaboratorRole: (collaboratorId: string, newRole: 'editor' | 'viewer') => Promise<void>;
  removeCollaborator: (collaboratorId: string) => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  toggleQuickLock: () => Promise<void>;
  refreshData: () => Promise<void>;
  checkPermission: (boardId: string, permission: string) => boolean;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

// Environment configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Collaboration Context Provider
 * Manages all collaboration state and operations
 */
export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Services
  const [authService] = useState(() => new AuthorizationService());
  const [collaborationAPI] = useState(() => new CollaborationAPI(authService));
  const [quickLockService] = useState(() => new QuickLockService(authService));

  // State
  const [currentBoard, setCurrentBoard] = useState<CollaborativeBoard | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<BoardInvitation[]>([]);
  const [isQuickLocked, setIsQuickLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  const [permissions, setPermissions] = useState<CollaborationContextType['permissions']>(null);

  // Setup quick lock listener
  useEffect(() => {
    const unsubscribe = quickLockService.onLockStateChange(setIsQuickLocked);
    return unsubscribe;
  }, [quickLockService]);

  // Load pending invitations on mount
  useEffect(() => {
    loadPendingInvitations();
  }, []);

  /**
   * Load board and permissions
   */
  const loadBoard = useCallback(async (boardId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get board authorization context
      const authContext = await authService.getBoardAuthContext(boardId);
      
      setUserRole(authContext.userRole);
      setPermissions(authContext.permissions);

      // Load collaborators
      const boardCollaborators = await collaborationAPI.getBoardCollaborators(boardId);
      setCollaborators(boardCollaborators);

      // TODO: Load board details (would need board API)
      // For now, we'll just set a placeholder
      setCurrentBoard({
        id: boardId,
        title: 'Loading...',
        description: '',
        ownerId: authContext.user.id,
        ownerEmail: authContext.user.email,
        ownerDisplayName: authContext.user.display_name,
        isPrivate: true,
        privacySettings: ({
          level: 'private',
          isShared: false,
          allowPublicView: false,
          allowPublicEdit: false,
          requireApprovalForEdits: false,
          shareSettings: {
            allowCopy: true,
            allowDownload: true,
            allowPrint: true
          },
          // Add missing properties for PrivacySettings type
          boardId: boardId,
          boardVisibility: 'private',
          taskVisibility: 'all',
          enableQuickLock: false,
          autoLockTimeout: 0,
          maskSensitiveContent: false,
          enableAuditLog: true,
          allowDataExport: true,
          dataRetentionDays: 365,
          updatedAt: new Date(),
          updatedBy: authContext.user.id
        } as any) as PrivacySettings,
        collaborators: [],
        tasks: [],
        routines: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModifiedBy: authContext.user.id,
        version: 1,
        activeUsers: [],
        isLocked: false,
        viewCount: 0,
        editCount: 0,
        collaboratorCount: 0
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load board';
      setError(errorMessage);
      console.error('Load board error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authService, collaborationAPI]);

  /**
   * Invite a user to the current board
   */
  const inviteUser = useCallback(async (email: string, role: 'editor' | 'viewer', message?: string) => {
    if (!currentBoard) {
      throw new Error('No board selected');
    }

    try {
      setIsLoading(true);
      setError(null);

      await collaborationAPI.inviteUser({
        boardId: currentBoard.id,
        inviteeEmail: email,
        role,
        message
      });

      // Refresh collaborators
      const updatedCollaborators = await collaborationAPI.getBoardCollaborators(currentBoard.id);
      setCollaborators(updatedCollaborators);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to invite user';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentBoard, collaborationAPI]);

  /**
   * Accept a board invitation
   */
  const acceptInvitation = useCallback(async (token: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await collaborationAPI.acceptInvitation(token);
      
      // Refresh pending invitations
      await loadPendingInvitations();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [collaborationAPI]);

  /**
   * Decline a board invitation
   */
  const declineInvitation = useCallback(async (token: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await collaborationAPI.declineInvitation(token);
      
      // Refresh pending invitations
      await loadPendingInvitations();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decline invitation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [collaborationAPI]);

  /**
   * Change a collaborator's role
   */
  const changeCollaboratorRole = useCallback(async (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    if (!currentBoard) {
      throw new Error('No board selected');
    }

    try {
      setIsLoading(true);
      setError(null);

      await collaborationAPI.changeCollaboratorRole({
        boardId: currentBoard.id,
        collaboratorId,
        newRole
      });

      // Refresh collaborators
      const updatedCollaborators = await collaborationAPI.getBoardCollaborators(currentBoard.id);
      setCollaborators(updatedCollaborators);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change role';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentBoard, collaborationAPI]);

  /**
   * Remove a collaborator from the board
   */
  const removeCollaborator = useCallback(async (collaboratorId: string) => {
    if (!currentBoard) {
      throw new Error('No board selected');
    }

    try {
      setIsLoading(true);
      setError(null);

      await collaborationAPI.removeCollaborator({
        boardId: currentBoard.id,
        collaboratorId
      });

      // Refresh collaborators
      const updatedCollaborators = await collaborationAPI.getBoardCollaborators(currentBoard.id);
      setCollaborators(updatedCollaborators);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove collaborator';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentBoard, collaborationAPI]);

  /**
   * Update board privacy settings
   */
  const updatePrivacySettings = useCallback(async (settings: Partial<PrivacySettings>) => {
    if (!currentBoard) {
      throw new Error('No board selected');
    }

    try {
      setIsLoading(true);
      setError(null);

      await collaborationAPI.updateBoardPrivacy({
        boardId: currentBoard.id,
        privacySettings: settings
      });

      // Update local board privacy
      setCurrentBoard(prev => prev ? {
        ...prev,
        privacySettings: { ...prev.privacySettings, ...settings }
      } : null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update privacy settings';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentBoard, collaborationAPI]);

  /**
   * Toggle quick lock
   */
  const toggleQuickLock = useCallback(async () => {
    try {
      await quickLockService.toggleLock();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle lock';
      setError(errorMessage);
      throw err;
    }
  }, [quickLockService]);

  /**
   * Load pending invitations
   */
  const loadPendingInvitations = useCallback(async () => {
    try {
      const invitations = await collaborationAPI.getPendingInvitations();
      setPendingInvitations(invitations);
    } catch (err) {
      // Silent fail for invitations - not critical
      console.warn('Failed to load pending invitations:', err);
    }
  }, [collaborationAPI]);

  /**
   * Check if user has specific permission for a board
   */
  const checkPermission = useCallback((boardId: string, permission: string): boolean => {
    if (!currentBoard || currentBoard.id !== boardId) {
      return false;
    }

    if (!userRole) {
      return false;
    }

    // Owner has all permissions
    if (userRole === 'owner') {
      return true;
    }

    // Editor permissions
    if (userRole === 'editor') {
      const editorPermissions = ['edit', 'create', 'comment', 'view'];
      return editorPermissions.includes(permission);
    }

    // Viewer permissions
    if (userRole === 'viewer') {
      const viewerPermissions = ['view', 'comment'];
      return viewerPermissions.includes(permission);
    }

    return false;
  }, [currentBoard, userRole]);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    if (currentBoard) {
      await loadBoard(currentBoard.id);
    }
    await loadPendingInvitations();
  }, [currentBoard, loadBoard, loadPendingInvitations]);

  const value: CollaborationContextType = {
    // State
    currentBoard,
    collaborators,
    pendingInvitations,
    isQuickLocked,
    isLoading,
    error,
    userRole,
    permissions,

    // Actions
    loadBoard,
    inviteUser,
    acceptInvitation,
    declineInvitation,
    changeCollaboratorRole,
    removeCollaborator,
    updatePrivacySettings,
    toggleQuickLock,
    refreshData,
    checkPermission
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

/**
 * Hook to use collaboration context
 */
export const useCollaboration = (): CollaborationContextType => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

/**
 * Hook for board permissions
 */
export const useBoardPermissions = (boardId?: string) => {
  const [permissions, setPermissions] = useState<CollaborationContextType['permissions']>(null);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authService = new AuthorizationService();

  useEffect(() => {
    if (!boardId) {
      setPermissions(null);
      setUserRole(null);
      return;
    }

    const loadPermissions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const authContext = await authService.getBoardAuthContext(boardId);
        setPermissions(authContext.permissions);
        setUserRole(authContext.userRole);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load permissions';
        setError(errorMessage);
        setPermissions(null);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, [boardId, authService]);

  return {
    permissions,
    userRole,
    isLoading,
    error,
    canEdit: permissions?.canEdit || false,
    canDelete: permissions?.canDelete || false,
    canInvite: permissions?.canInvite || false,
    canExport: permissions?.canExport || false,
    canViewHistory: permissions?.canViewHistory || false,
    isOwner: userRole === 'owner',
    isEditor: userRole === 'editor',
    isViewer: userRole === 'viewer'
  };
};

/**
 * Hook for quick lock functionality
 */
export const useQuickLock = () => {
  const [isLocked, setIsLocked] = useState(false);
  const quickLockService = new QuickLockService(
    new AuthorizationService()
  );

  useEffect(() => {
    const unsubscribe = quickLockService.onLockStateChange(setIsLocked);
    setIsLocked(quickLockService.isInterfaceLocked());
    return unsubscribe;
  }, [quickLockService]);

  const toggleLock = useCallback(async () => {
    try {
      await quickLockService.toggleLock();
    } catch (error) {
      console.error('Failed to toggle quick lock:', error);
      throw error;
    }
  }, [quickLockService]);

  return {
    isLocked,
    toggleLock
  };
};

/**
 * Error boundary for collaboration features
 */
interface CollaborationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class CollaborationErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  CollaborationErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): CollaborationErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Collaboration error boundary caught an error:', error, errorInfo);
    
    // Log to analytics or error reporting service
    if (error instanceof AuthError) {
      console.error('Authentication error in collaboration:', error.message);
    } else if (error instanceof PermissionError) {
      console.error('Permission error in collaboration:', error.message);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} />;
      }

      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Collaboration Error
          </h3>
          <p className="text-red-600 mb-4">
            {this.state.error.message}
          </p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}