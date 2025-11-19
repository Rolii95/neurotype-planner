import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CollaborationProvider, CollaborationErrorBoundary } from '../context/CollaborationContext';
import { CollaborativeBoardInterface } from '../components/CollaborativeBoardInterface';

/**
 * Collaboration Error Fallback Component
 */
const CollaborationErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Collaboration Error
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Reload Page
        </button>
      </div>
    </div>
  </div>
);

/**
 * Protected Collaboration Routes
 */
export const CollaborationRoutes: React.FC = () => {
  return (
    <CollaborationErrorBoundary fallback={CollaborationErrorFallback}>
      <CollaborationProvider>
        <Routes>
          {/* Collaborative Board Interface */}
          <Route 
            path="/board/:boardId" 
            element={<CollaborativeBoardInterface />} 
          />
          
          {/* Collaborative Board Interface with Workspace */}
          <Route 
            path="/workspace/:workspaceId/board/:boardId" 
            element={<CollaborativeBoardInterface />} 
          />
          
          {/* Default redirect for collaboration root */}
          <Route 
            path="/" 
            element={<Navigate to="/dashboard" replace />} 
          />
          
          {/* Catch-all redirect */}
          <Route 
            path="*" 
            element={<Navigate to="/dashboard" replace />} 
          />
        </Routes>
      </CollaborationProvider>
    </CollaborationErrorBoundary>
  );
};

export default CollaborationRoutes;