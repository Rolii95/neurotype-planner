import React, { useState, useEffect } from 'react';
import { 
  Cog6ToothIcon, 
  ShieldCheckIcon, 
  UserPlusIcon, 
  EyeIcon,
  LockClosedIcon,
  ClockIcon,
  DocumentTextIcon,
  Bars3Icon,
  UserGroupIcon,
  SignalIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useParams, useNavigate } from 'react-router-dom';
import { useCollaboration } from '../context/CollaborationContext';
import { useAuth } from '../../../contexts/AuthContext';

// Placeholder components (to be implemented)
const PrivacySettingsModal: React.FC<{ boardId: string; onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Privacy Settings</h3>
          <p className="mt-2 text-sm text-gray-500">Configure board privacy and sharing settings.</p>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);

const QuickLockPanel: React.FC<{ boardId: string; onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Lock</h3>
          <p className="mt-2 text-sm text-gray-500">Lock or unlock the board for editing.</p>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);

const AuditLogViewer: React.FC<{ boardId: string; onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Audit Log</h3>
          <p className="mt-2 text-sm text-gray-500">View board activity and change history.</p>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);

const InviteUserModal: React.FC<{ boardId: string; onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Invite User</h3>
          <p className="mt-2 text-sm text-gray-500">Send an invitation to collaborate on this board.</p>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);

const PendingInvitations: React.FC<{ boardId: string; onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Invitations</h3>
          <p className="mt-2 text-sm text-gray-500">Manage outstanding board invitations.</p>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);

const CollaboratorAvatars: React.FC<{ collaborators: any[]; maxVisible: number; size: string }> = ({ collaborators, maxVisible }) => (
  <div className="flex items-center space-x-2">
    <UserGroupIcon className="h-5 w-5 text-gray-400" />
    <span className="text-sm text-gray-600">
      {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
    </span>
  </div>
);

const LiveCursors: React.FC = () => <div></div>;

const ConnectionStatus: React.FC = () => (
  <div className="flex items-center space-x-2">
    <SignalIcon className="h-4 w-4 text-green-500" />
    <span className="text-xs text-gray-600">Connected</span>
  </div>
);

// Simplified Priority Matrix placeholder
const PriorityMatrix: React.FC = () => (
  <div className="p-8 text-center">
    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-12">
      <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Priority Matrix</h3>
      <p className="text-gray-500">Board content will be displayed here.</p>
    </div>
  </div>
);

interface CollaborativeBoardInterfaceProps {
  boardId?: string;
}

export const CollaborativeBoardInterface: React.FC<CollaborativeBoardInterfaceProps> = ({ 
  boardId: propBoardId 
}) => {
  const { boardId: paramBoardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const boardId = propBoardId || paramBoardId;

  // Modal states
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showQuickLock, setShowQuickLock] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPendingInvitations, setShowPendingInvitations] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Collaboration context
  const {
    currentBoard,
    collaborators,
    permissions,
    userRole,
    isQuickLocked,
    isLoading,
    error,
    loadBoard,
    refreshData
  } = useCollaboration();

  // Load board data on mount
  useEffect(() => {
    if (boardId && user) {
      loadBoard(boardId);
      // Note: Real-time connection would be handled by WebSocket service
    }
  }, [boardId, user, loadBoard]);

  // Handle board not found
  if (!boardId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Board Not Found</h2>
          <p className="text-gray-600 mb-4">The collaborative board you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Handle locked board
  if (isQuickLocked && !permissions?.canEdit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LockClosedIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Board Locked</h2>
          <p className="text-gray-600 mb-4">This board has been locked for editing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {currentBoard?.title || 'Collaborative Board'}
                </h1>
                {currentBoard?.description && (
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {currentBoard.description}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Connection Status */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-200">
            <ConnectionStatus />
          </div>
        )}

        {/* Collaborators */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Active Collaborators</h3>
            <CollaboratorAvatars 
              collaborators={collaborators}
              maxVisible={5}
              size="sm"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-4 space-y-2">
          {/* Invite Users */}
          {permissions?.canInvite && (
            <button
              onClick={() => setShowInviteModal(true)}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center' : 'justify-start'
              } p-3 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors`}
              title="Invite Users"
            >
              <UserPlusIcon className="h-5 w-5" />
              {!sidebarCollapsed && <span className="ml-3">Invite Users</span>}
            </button>
          )}

          {/* Pending Invitations */}
          {permissions?.canInvite && (
            <button
              onClick={() => setShowPendingInvitations(true)}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center' : 'justify-start'
              } p-3 text-sm text-amber-600 hover:bg-amber-50 rounded-md transition-colors`}
              title="Pending Invitations"
            >
              <ClockIcon className="h-5 w-5" />
              {!sidebarCollapsed && <span className="ml-3">Pending Invitations</span>}
            </button>
          )}

          {/* Quick Lock */}
          {permissions?.canEdit && (
            <button
              onClick={() => setShowQuickLock(true)}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center' : 'justify-start'
              } p-3 text-sm ${
                isQuickLocked ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
              } rounded-md transition-colors`}
              title={isQuickLocked ? 'Unlock Board' : 'Quick Lock'}
            >
              <LockClosedIcon className="h-5 w-5" />
              {!sidebarCollapsed && (
                <span className="ml-3">{isQuickLocked ? 'Unlock Board' : 'Quick Lock'}</span>
              )}
            </button>
          )}

          {/* Privacy Settings */}
          {permissions?.canEdit && (
            <button
              onClick={() => setShowPrivacySettings(true)}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center' : 'justify-start'
              } p-3 text-sm text-purple-600 hover:bg-purple-50 rounded-md transition-colors`}
              title="Privacy Settings"
            >
              <ShieldCheckIcon className="h-5 w-5" />
              {!sidebarCollapsed && <span className="ml-3">Privacy Settings</span>}
            </button>
          )}

          {/* Audit Log */}
          {permissions?.canViewHistory && (
            <button
              onClick={() => setShowAuditLog(true)}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center' : 'justify-start'
              } p-3 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors`}
              title="Audit Log"
            >
              <DocumentTextIcon className="h-5 w-5" />
              {!sidebarCollapsed && <span className="ml-3">Audit Log</span>}
            </button>
          )}
        </div>

        {/* Board Settings */}
        {!sidebarCollapsed && permissions?.canEdit && (
          <div className="p-4 border-t border-gray-200 mt-auto">
            <button
              onClick={() => setShowPrivacySettings(true)}
              className="w-full flex items-center justify-start p-3 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              <span className="ml-3">Board Settings</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Live Cursors Overlay */}
        <LiveCursors />

        {/* Board Content */}
        <div className="p-6">
          {/* Board Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {currentBoard?.title || 'Collaborative Board'}
                </h1>
                {currentBoard?.description && (
                  <p className="text-gray-600 mt-2">{currentBoard.description}</p>
                )}
              </div>
              
              {/* Privacy Indicator */}
              <div className="flex items-center space-x-2">
                {currentBoard?.privacySettings?.level === 'public' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <EyeIcon className="h-3 w-3 mr-1" />
                    Public
                  </span>
                )}
                
                {isQuickLocked && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <LockClosedIcon className="h-3 w-3 mr-1" />
                    Locked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Priority Matrix - Main Board Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <PriorityMatrix />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteUserModal
          boardId={boardId}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showPendingInvitations && (
        <PendingInvitations
          boardId={boardId}
          onClose={() => setShowPendingInvitations(false)}
        />
      )}

      {showPrivacySettings && (
        <PrivacySettingsModal
          boardId={boardId}
          onClose={() => setShowPrivacySettings(false)}
        />
      )}

      {showQuickLock && (
        <QuickLockPanel
          boardId={boardId}
          onClose={() => setShowQuickLock(false)}
        />
      )}

      {showAuditLog && (
        <AuditLogViewer
          boardId={boardId}
          onClose={() => setShowAuditLog(false)}
        />
      )}
    </div>
  );
};

export default CollaborativeBoardInterface;