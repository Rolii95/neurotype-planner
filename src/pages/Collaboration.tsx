import { useState } from 'react';
import { CollaborativeBoardInterface } from '../features/collaboration/components/CollaborativeBoardInterface';
import { PendingInvitations } from '../features/collaboration/components/InvitationComponents';
import { PrivacySettingsModal } from '../features/collaboration/components/PrivacyControlsComponents';
import type { BoardInvitation } from '../features/collaboration/types';

// Simple icons
const Users = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const Share2 = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const Lock = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const SettingsIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Plus = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

type TabType = 'my-boards' | 'shared' | 'invitations' | 'settings';

interface Board {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  role: 'owner' | 'editor' | 'viewer';
  collaborators: number;
  lastActivity: string;
}

export default function CollaborationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('my-boards');
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Demo data
  const myBoards: Board[] = [
    {
      id: '1',
      name: 'Family Task Board',
      description: 'Shared household responsibilities',
      isPublic: false,
      role: 'owner',
      collaborators: 3,
      lastActivity: '2 hours ago'
    },
    {
      id: '2',
      name: 'Work Projects',
      description: 'Team collaboration space',
      isPublic: false,
      role: 'owner',
      collaborators: 5,
      lastActivity: '1 day ago'
    }
  ];

  const sharedBoards: Board[] = [
    {
      id: '3',
      name: 'Study Group Tasks',
      description: 'Collaborative learning tracker',
      isPublic: true,
      role: 'editor',
      collaborators: 8,
      lastActivity: '30 minutes ago'
    }
  ];

  const invitations: BoardInvitation[] = [
    {
      id: 'inv-1',
      boardId: 'board-1',
      boardTitle: 'Community Garden Planning',
      inviterId: 'user-2',
      inviterName: 'Sarah Chen',
      inviterEmail: 'sarah.chen@example.com',
      inviteeEmail: 'me@example.com',
      role: 'editor',
      status: 'pending',
      accessToken: 'token-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      message: 'Join me in planning our community garden project!'
    }
  ];

  const handleAcceptInvitation = async (token: string) => {
    console.log('Accepting invitation:', token);
  };

  const handleDeclineInvitation = async (token: string) => {
    console.log('Declining invitation:', token);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'my-boards':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                My Boards
              </h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus size={20} />
                Create Board
              </button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myBoards.map((board) => (
                <BoardCard 
                  key={board.id} 
                  board={board} 
                  onSelect={() => setSelectedBoard(board.id)}
                />
              ))}
            </div>
          </div>
        );

      case 'shared':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Shared with Me
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sharedBoards.map((board) => (
                <BoardCard 
                  key={board.id} 
                  board={board} 
                  onSelect={() => setSelectedBoard(board.id)}
                />
              ))}
            </div>
          </div>
        );

      case 'invitations':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pending Invitations
            </h2>
            
            <PendingInvitations
              invitations={invitations}
              onAccept={handleAcceptInvitation}
              onDecline={handleDeclineInvitation}
            />
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Collaboration Settings
            </h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Default Privacy
                </h3>
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Configure Privacy Settings
                </button>
              </div>

              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Notifications
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Notify me of new invitations
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Notify me of comments on my boards
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Collaboration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Share boards, collaborate on tasks, and work together with family, friends, or teams.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b dark:border-gray-700">
          <TabButton
            active={activeTab === 'my-boards'}
            onClick={() => setActiveTab('my-boards')}
            icon={<Users size={20} />}
            label="My Boards"
          />
          <TabButton
            active={activeTab === 'shared'}
            onClick={() => setActiveTab('shared')}
            icon={<Share2 size={20} />}
            label="Shared"
            badge={sharedBoards.length}
          />
          <TabButton
            active={activeTab === 'invitations'}
            onClick={() => setActiveTab('invitations')}
            icon={<Users size={20} />}
            label="Invitations"
            badge={invitations.length}
          />
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon size={20} />}
            label="Settings"
          />
        </div>

        {/* Content */}
        {renderTabContent()}

        {/* Collaborative Board Modal */}
        {selectedBoard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {myBoards.find(b => b.id === selectedBoard)?.name || 
                     sharedBoards.find(b => b.id === selectedBoard)?.name}
                  </h2>
                  <button
                    onClick={() => setSelectedBoard(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                <CollaborativeBoardInterface boardId={selectedBoard} />
              </div>
            </div>
          </div>
        )}

        {/* Privacy Settings Modal */}
        {showPrivacyModal && (
          <PrivacySettingsModal
            isOpen={showPrivacyModal}
            onClose={() => setShowPrivacyModal(false)}
            boardId="default"
          />
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors relative ${
        active
          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

interface BoardCardProps {
  board: Board;
  onSelect: () => void;
}

function BoardCard({ board, onSelect }: BoardCardProps) {
  return (
    <button
      onClick={onSelect}
      className="text-left p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
          {board.name}
        </h3>
        {board.isPublic ? (
          <Share2 size={18} className="text-green-600 dark:text-green-400" />
        ) : (
          <Lock size={18} className="text-gray-400" />
        )}
      </div>
      
      {board.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {board.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Users size={16} />
            {board.collaborators}
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {board.role}
          </span>
        </div>
        <span className="text-gray-500 dark:text-gray-500 text-xs">
          {board.lastActivity}
        </span>
      </div>
    </button>
  );
}
