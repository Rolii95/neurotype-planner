import React, { useState } from 'react';
import type { 
  CollaborativeTask, 
  Collaborator, 
  ActiveUser 
} from '../types';

// Simple icon components (replacing lucide-react dependency)
const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 6.5c-.77.833-.192 2.5 1.732 2.5z" />
  </svg>
);

const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Edit3 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const Shield = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Conflict Resolution Modal
interface ConflictData {
  id: string;
  taskId: string;
  conflictType: 'edit' | 'delete' | 'move';
  localChanges: Partial<CollaborativeTask>;
  remoteChanges: Partial<CollaborativeTask>;
  remoteUser: {
    userId: string;
    userName: string;
    avatarUrl?: string;
  };
  timestamp: string;
}

interface ConflictResolutionModalProps {
  conflict: ConflictData;
  onResolve: (resolution: 'accept_remote' | 'keep_local' | 'merge') => void;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflict,
  onResolve,
  onClose
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'accept_remote' | 'keep_local' | 'merge' | null>(null);

  const handleResolve = () => {
    if (selectedResolution) {
      onResolve(selectedResolution);
      onClose();
    }
  };

  const formatChanges = (changes: Partial<CollaborativeTask>) => {
    return Object.entries(changes).map(([key, value]) => (
      <div key={key} className="flex justify-between py-1">
        <span className="font-medium text-gray-700">{key}:</span>
        <span className="text-gray-900">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Conflict Detected
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Conflict Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800">
              <strong>{conflict.remoteUser.userName}</strong> made changes to this task while you were editing it.
              Please choose how to resolve this conflict.
            </p>
            <p className="text-sm text-amber-600 mt-1">
              Conflict type: <span className="font-medium">{conflict.conflictType}</span>
            </p>
          </div>

          {/* Changes Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Changes */}
            <div className="border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                <Edit3 className="w-4 h-4 mr-2" />
                Your Changes
              </h3>
              <div className="space-y-1 text-sm">
                {formatChanges(conflict.localChanges)}
              </div>
            </div>

            {/* Remote Changes */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                {conflict.remoteUser.userName}'s Changes
              </h3>
              <div className="space-y-1 text-sm">
                {formatChanges(conflict.remoteChanges)}
              </div>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Choose Resolution:</h3>
            
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="keep_local"
                  checked={selectedResolution === 'keep_local'}
                  onChange={() => setSelectedResolution('keep_local')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Keep My Changes</div>
                  <div className="text-sm text-gray-600">
                    Discard the remote changes and keep your local modifications.
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="accept_remote"
                  checked={selectedResolution === 'accept_remote'}
                  onChange={() => setSelectedResolution('accept_remote')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Accept Their Changes</div>
                  <div className="text-sm text-gray-600">
                    Discard your changes and accept {conflict.remoteUser.userName}'s modifications.
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="merge"
                  checked={selectedResolution === 'merge'}
                  onChange={() => setSelectedResolution('merge')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Merge Changes</div>
                  <div className="text-sm text-gray-600">
                    Attempt to combine both sets of changes intelligently.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={!selectedResolution}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Resolve Conflict
          </button>
        </div>
      </div>
    </div>
  );
};

// Real-time Collaborator Avatars
interface CollaboratorAvatarsProps {
  activeUsers: ActiveUser[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  activeUsers,
  maxVisible = 5,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const visibleUsers = activeUsers.slice(0, maxVisible);
  const remainingCount = Math.max(0, activeUsers.length - maxVisible);

  return (
    <div className="flex items-center space-x-1">
      {visibleUsers.map((user) => (
        <div
          key={user.userId}
          className={`relative ${sizeClasses[size]} rounded-full bg-blue-500 text-white flex items-center justify-center font-medium border-2 border-white shadow-sm`}
          title={`${user.displayName} (${user.status})`}
          style={{ backgroundColor: user.cursorColor }}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-white font-medium">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          
          {/* Status indicator */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
              user.status === 'online' 
                ? 'bg-green-400' 
                : user.status === 'away' 
                ? 'bg-yellow-400' 
                : 'bg-gray-400'
            }`}
          />
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium border-2 border-white shadow-sm`}
          title={`${remainingCount} more collaborator${remainingCount !== 1 ? 's' : ''}`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

// Live Cursors Component
interface LiveCursorsProps {
  cursors: Map<string, { x: number; y: number; name: string; color: string }>;
  containerRef: React.RefObject<HTMLElement>;
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({ cursors, containerRef }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {Array.from(cursors.entries()).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-2px, -2px)'
          }}
        >
          {/* Cursor */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            className="drop-shadow-sm"
          >
            <path
              d="M2 2L18 8L8 12L2 18L2 2Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          
          {/* Name label */}
          <div
            className="absolute top-4 left-4 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap shadow-sm"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </div>
  );
};

// Editing Indicator
interface EditingIndicatorProps {
  taskId: string;
  editingUser: { userId: string; userName: string } | undefined;
  isCurrentUser: boolean;
}

export const EditingIndicator: React.FC<EditingIndicatorProps> = ({
  taskId,
  editingUser,
  isCurrentUser
}) => {
  if (!editingUser) return null;

  return (
    <div
      className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-medium shadow-lg z-10 ${
        isCurrentUser
          ? 'bg-blue-100 text-blue-800 border border-blue-200'
          : 'bg-amber-100 text-amber-800 border border-amber-200'
      }`}
    >
      <div className="flex items-center space-x-1">
        <Edit3 className="w-3 h-3" />
        <span>
          {isCurrentUser ? 'You are editing' : `${editingUser.userName} is editing`}
        </span>
      </div>
    </div>
  );
};

// Connection Status Indicator
interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  onReconnect?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  onReconnect
}) => {
  const statusConfig = {
    connecting: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '⏳',
      text: 'Connecting...'
    },
    connected: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✅',
      text: 'Connected'
    },
    disconnected: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '⚪',
      text: 'Disconnected'
    },
    error: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '❌',
      text: 'Connection Error'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${config.color}`}>
      <span className="text-sm">{config.icon}</span>
      <span className="text-sm font-medium">{config.text}</span>
      {(status === 'disconnected' || status === 'error') && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-xs underline hover:no-underline"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

// Collaboration Panel
interface CollaborationPanelProps {
  collaborators: Collaborator[];
  activeUsers: ActiveUser[];
  currentUserId: string;
  onInviteUser: () => void;
  onManagePermissions: (collaboratorId: string) => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  collaborators,
  activeUsers,
  currentUserId,
  onInviteUser,
  onManagePermissions
}) => {
  const getActivityStatus = (collaboratorId: string) => {
    const activeUser = activeUsers.find(u => u.userId === collaboratorId);
    return activeUser?.status || 'offline';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case 'editor':
        return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Collaborators</h3>
          <button
            onClick={onInviteUser}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Invite
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {collaborators.map((collaborator) => {
          const activityStatus = getActivityStatus(collaborator.userId);
          const isCurrentUser = collaborator.userId === currentUserId;

          return (
            <div key={collaborator.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {collaborator.avatarUrl ? (
                        <img
                          src={collaborator.avatarUrl}
                          alt={collaborator.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-600">
                          {collaborator.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* Activity indicator */}
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        activityStatus === 'online' 
                          ? 'bg-green-400' 
                          : activityStatus === 'away' 
                          ? 'bg-yellow-400' 
                          : 'bg-gray-400'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {collaborator.displayName}
                        {isCurrentUser && ' (You)'}
                      </span>
                      {getRoleIcon(collaborator.role)}
                    </div>
                    <span className="text-sm text-gray-500">{collaborator.email}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400 capitalize">
                    {collaborator.role}
                  </span>
                  {!isCurrentUser && (
                    <button
                      onClick={() => onManagePermissions(collaborator.userId)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Manage
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};