import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Context Providers
import { AuthProvider } from '../../../contexts/AuthContext';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Main App Components
import Dashboard from '../../../pages/Dashboard';
import LoginPage from '../../../pages/LoginPage';
import Settings from '../../../pages/Settings';

// Collaboration Features
import { CollaborationRoutes } from '../routes/CollaborationRoutes';

// Layout Components
import { MainLayout } from '../../../components/Layout/MainLayout';
import { ProtectedRoute } from '../../../components/Auth/ProtectedRoute';

/**
 * Global Error Fallback Component
 */
const GlobalErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Application Error
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {error.message}
        </p>
        <div className="space-y-2">
          <button
            onClick={resetErrorBoundary}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Integrated App Component
 * Combines the main neurotype planner with collaboration features
 */
export const IntegratedApp: React.FC = () => {
  return (
    <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
      <AccessibilityProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected Routes */}
              <Route 
                path="/*" 
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Routes>
                        {/* Dashboard */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        
                        {/* Settings */}
                        <Route path="/settings" element={<Settings />} />
                        
                        {/* Collaboration Features */}
                        <Route path="/collaborate/*" element={<CollaborationRoutes />} />
                        
                        {/* Direct Board Access */}
                        <Route path="/board/:boardId" element={<CollaborationRoutes />} />
                        
                        {/* Default redirect */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        
                        {/* Catch-all redirect */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </MainLayout>
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
};

export default IntegratedApp;