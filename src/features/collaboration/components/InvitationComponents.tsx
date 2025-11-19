import React, { useState } from 'react';
import type { 
  Collaborator, 
  BoardInvitation, 
  CollaborativeBoard 
} from '../types';

// Simple icon components
const Mail = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const UserPlus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const Settings = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Check = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const Trash2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Invite User Modal
interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: 'editor' | 'viewer', message?: string) => Promise<void>;
  boardTitle: string;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  boardTitle
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await onInvite(email.trim(), role, message.trim() || undefined);
      
      // Reset form
      setEmail('');
      setRole('viewer');
      setMessage('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <UserPlus className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Invite Collaborator
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Invite someone to collaborate on <strong>{boardTitle}</strong>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="viewer"
                  checked={role === 'viewer'}
                  onChange={() => setRole('viewer')}
                  className="mt-1"
                  disabled={isLoading}
                />
                <div>
                  <div className="font-medium text-gray-900">Viewer</div>
                  <div className="text-sm text-gray-600">
                    Can view and comment on tasks and routines
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="editor"
                  checked={role === 'editor'}
                  onChange={() => setRole('editor')}
                  className="mt-1"
                  disabled={isLoading}
                />
                <div>
                  <div className="font-medium text-gray-900">Editor</div>
                  <div className="text-sm text-gray-600">
                    Can edit tasks, routines, and invite others
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to your invitation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>{isLoading ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Pending Invitations List
interface PendingInvitationsProps {
  invitations: BoardInvitation[];
  onAccept: (token: string) => Promise<void>;
  onDecline: (token: string) => Promise<void>;
}

export const PendingInvitations: React.FC<PendingInvitationsProps> = ({
  invitations,
  onAccept,
  onDecline
}) => {
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const handleAction = async (token: string, action: 'accept' | 'decline') => {
    setLoadingActions(prev => new Set(prev).add(token));
    
    try {
      if (action === 'accept') {
        await onAccept(token);
      } else {
        await onDecline(token);
      }
    } catch (error) {
      console.error(`Failed to ${action} invitation:`, error);
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(token);
        return newSet;
      });
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Pending Invitations</h3>
      
      <div className="space-y-3">
        {invitations.map((invitation) => {
          const isLoading = loadingActions.has(invitation.accessToken);
          const expiresAt = invitation.expiresAt ? new Date(invitation.expiresAt) : null;
          const isExpired = expiresAt ? expiresAt < new Date() : false;

          return (
            <div
              key={invitation.id}
              className={`border rounded-lg p-4 ${
                isExpired ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {invitation.boardTitle || 'Board Invitation'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    From: <strong>{invitation.inviterName}</strong> ({invitation.inviterEmail})
                  </p>
                  <p className="text-sm text-gray-600">
                    Role: <span className="font-medium capitalize">{invitation.role}</span>
                  </p>
                  
                  {invitation.message && (
                    <p className="text-sm text-gray-700 mt-2 italic">
                      "{invitation.message}"
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    {isExpired ? 'Expired' : expiresAt ? `Expires ${expiresAt.toLocaleDateString()}` : 'No expiration'}
                  </p>
                </div>

                {!isExpired && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleAction(invitation.accessToken, 'accept')}
                      disabled={isLoading}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleAction(invitation.accessToken, 'decline')}
                      disabled={isLoading}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center space-x-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Decline</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Permission Settings Modal
interface PermissionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborator: Collaborator;
  currentUserRole: 'owner' | 'editor' | 'viewer';
  onChangeRole: (newRole: 'editor' | 'viewer') => Promise<void>;
  onRemove: () => Promise<void>;
}

export const PermissionSettingsModal: React.FC<PermissionSettingsModalProps> = ({
  isOpen,
  onClose,
  collaborator,
  currentUserRole,
  onChangeRole,
  onRemove
}) => {
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>(
    collaborator.role === 'owner' ? 'editor' : collaborator.role as 'editor' | 'viewer'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = currentUserRole === 'owner' && collaborator.role !== 'owner';

  const handleChangeRole = async () => {
    if (selectedRole === collaborator.role) {
      onClose();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onChangeRole(selectedRole);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Remove ${collaborator.displayName} from this board?`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onRemove();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove collaborator');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Permissions
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
        <div className="p-6 space-y-4">
          {/* Collaborator Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              {collaborator.avatarUrl ? (
                <img
                  src={collaborator.avatarUrl}
                  alt={collaborator.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-medium text-gray-600">
                  {collaborator.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{collaborator.displayName}</h3>
              <p className="text-sm text-gray-500">{collaborator.email}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!canManage ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                {collaborator.role === 'owner' 
                  ? 'This user is the board owner.'
                  : 'You don\'t have permission to manage this collaborator.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="space-y-2">
                  <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="viewer"
                      checked={selectedRole === 'viewer'}
                      onChange={() => setSelectedRole('viewer')}
                      className="mt-1"
                      disabled={isLoading}
                    />
                    <div>
                      <div className="font-medium text-gray-900">Viewer</div>
                      <div className="text-sm text-gray-600">
                        Can view and comment on tasks and routines
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="editor"
                      checked={selectedRole === 'editor'}
                      onChange={() => setSelectedRole('editor')}
                      className="mt-1"
                      disabled={isLoading}
                    />
                    <div>
                      <div className="font-medium text-gray-900">Editor</div>
                      <div className="text-sm text-gray-600">
                        Can edit tasks, routines, and invite others
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Danger Zone</h4>
                <button
                  onClick={handleRemove}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove from Board</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {canManage && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleChangeRole}
              disabled={isLoading || selectedRole === collaborator.role}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};