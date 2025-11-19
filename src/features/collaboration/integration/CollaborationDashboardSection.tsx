import React from 'react';
import { Link } from 'react-router-dom';
import { 
  UsersIcon, 
  ShareIcon, 
  ShieldCheckIcon,
  PlusIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface CollaborativeBoardCardProps {
  boardId: string;
  title: string;
  description?: string;
  collaboratorCount: number;
  isPublic: boolean;
  lastActivity: Date;
  userRole: 'owner' | 'editor' | 'viewer';
}

const CollaborativeBoardCard: React.FC<CollaborativeBoardCardProps> = ({
  boardId,
  title,
  description,
  collaboratorCount,
  isPublic,
  lastActivity,
  userRole
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {isPublic && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <EyeIcon className="h-3 w-3 mr-1" />
                Public
              </span>
            )}
            
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              userRole === 'owner' 
                ? 'bg-blue-100 text-blue-800' 
                : userRole === 'editor'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <UsersIcon className="h-4 w-4 mr-1" />
              <span>{collaboratorCount} collaborator{collaboratorCount !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>Updated {lastActivity.toLocaleDateString()}</span>
            </div>
          </div>
          
          <Link
            to={`/collaborate/board/${boardId}`}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
          >
            Open Board
          </Link>
        </div>
      </div>
    </div>
  );
};

/**
 * Collaboration Dashboard Section
 * Integrates collaboration features into the main dashboard
 */
export const CollaborationDashboardSection: React.FC = () => {
  // Mock data - in real app, this would come from useCollaboration context
  const collaborativeBoards = [
    {
      boardId: 'board-1',
      title: 'Team Project Planning',
      description: 'Collaborative planning board for our next sprint',
      collaboratorCount: 4,
      isPublic: false,
      lastActivity: new Date('2024-01-15'),
      userRole: 'owner' as const
    },
    {
      boardId: 'board-2',
      title: 'Weekly Task Coordination',
      description: 'Shared board for weekly task management and updates',
      collaboratorCount: 2,
      isPublic: true,
      lastActivity: new Date('2024-01-14'),
      userRole: 'editor' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Collaborative Boards</h2>
          <p className="text-gray-600 mt-1">
            Shared boards for team collaboration and coordination
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link
            to="/collaborate/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Board
          </Link>
          
          <Link
            to="/collaborate"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <ShareIcon className="h-4 w-4 mr-2" />
            Manage
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Active Collaborators</p>
              <p className="text-2xl font-bold text-blue-900">6</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShareIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Shared Boards</p>
              <p className="text-2xl font-bold text-green-900">{collaborativeBoards.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Privacy Protected</p>
              <p className="text-2xl font-bold text-purple-900">100%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Collaborative Boards Grid */}
      {collaborativeBoards.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {collaborativeBoards.map((board) => (
            <CollaborativeBoardCard
              key={board.boardId}
              {...board}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Collaborative Boards</h3>
          <p className="text-gray-500 mb-6">
            Create your first collaborative board to start working with others.
          </p>
          <Link
            to="/collaborate/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Collaborative Board
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/collaborate/invitations"
            className="flex items-center p-3 text-sm text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ClockIcon className="h-4 w-4 mr-3 text-yellow-500" />
            Pending Invitations
          </Link>
          
          <Link
            to="/collaborate/settings"
            className="flex items-center p-3 text-sm text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ShieldCheckIcon className="h-4 w-4 mr-3 text-purple-500" />
            Privacy Settings
          </Link>
          
          <Link
            to="/collaborate/activity"
            className="flex items-center p-3 text-sm text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ClockIcon className="h-4 w-4 mr-3 text-blue-500" />
            Activity Log
          </Link>
          
          <Link
            to="/collaborate/help"
            className="flex items-center p-3 text-sm text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ShareIcon className="h-4 w-4 mr-3 text-green-500" />
            Collaboration Guide
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CollaborationDashboardSection;