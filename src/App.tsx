import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { TimerProvider } from './contexts/TimerContext';
import { I18nProvider } from './i18n/index';
import { AdaptiveSmartProvider, ActivityTracker } from './features/adaptiveSmart';
import { OnboardingFlow } from './components/OnboardingFlow';
import { RecallButton } from './components/RecallButton';
import { FloatingTimerWidget } from './components/FloatingTimerWidget';
import { MainLayout } from './components/Layout/MainLayout';
import { onboardingService } from './services/onboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { PWAInstaller } from './components/PWAInstaller';
import type { NotificationAction } from './services/notifications';
import { useMatrixStore } from './stores/useMatrixStore';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Routines = React.lazy(() => import('./pages/Routines'));
const RoutineDesigner = React.lazy(() => import('./pages/RoutineDesigner'));
const Mood = React.lazy(() => import('./pages/Mood'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Collaboration = React.lazy(() => import('./pages/Collaboration'));
const FeatureDemoPage = React.lazy(() => import('./pages/SimpleWorkingDemo'));
const Focus = React.lazy(() => import('./pages/Focus'));
const Wellness = React.lazy(() => import('./pages/Wellness'));
const Tools = React.lazy(() => import('./pages/Tools'));
const BoardsPage = React.lazy(() => import('./pages/BoardsPage'));
const BoardDetailPage = React.lazy(() => import('./pages/BoardDetailPage'));
const BoardExecutionView = React.lazy(() => import('./pages/BoardExecutionView'));
const AIAssistant = React.lazy(() => import('./pages/AIAssistant'));

// Create a client outside component to prevent recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Optimization: prevent unnecessary refetches
    },
  },
});

const NotificationActionListener: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const completeTask = useMatrixStore((state) => state.completeTask);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationAction>;
      const action = customEvent.detail;
      if (!action) return;

      if (action.action === 'navigate') {
        const path = action.data?.path;
        if (typeof path === 'string') {
          navigate(path);
        }
        return;
      }

      if (action.action === 'complete-task') {
        const taskId = action.data?.taskId;
        if (!taskId) return;

        completeTask(taskId)
          .then(() => {
            toast.success('Task marked complete.');
          })
          .catch((error) => {
            console.error('Failed to complete task from notification action:', error);
            toast.error('Unable to complete task. Please try again.');
          });
      }
    };

    window.addEventListener('notification-action', handler as EventListener);
    return () => window.removeEventListener('notification-action', handler as EventListener);
  }, [navigate, toast, completeTask]);

  return null;
};

const AppContent: React.FC = () => {
  // This component is no longer the outer-most renderer for providers.
  // It will be mounted inside the heavy provider stack once auth is resolved.
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  const toast = useToast();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        console.log('🔍 Checking onboarding status for user:', user.id);
        const completed = await onboardingService.hasCompletedOnboarding(user.id);
        console.log('✅ Onboarding status:', completed ? 'COMPLETE' : 'NOT COMPLETE');
        setHasCompletedOnboarding(completed);
      } catch (error) {
        console.error('❌ Error checking onboarding status:', error);
        // If there's an error, assume onboarding is not complete
        setHasCompletedOnboarding(false);
      } finally {
        console.log('✅ Finished checking onboarding, setting checkingOnboarding to false');
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  // Memoize loading spinner to prevent unnecessary re-renders
  const loadingFallback = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="large" />
    </div>
  ), []);

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, { displayName });
        if (error) {
          toast.error(error.message || 'Sign up failed. Please try again.');
        } else {
          toast.success('Account created! Welcome!');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message || 'Sign in failed. Please check your credentials.');
        } else {
          toast.success('Welcome back!');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Show loading while checking auth or onboarding status
  if (authLoading || checkingOnboarding) {
    console.log('📊 Loading state:', { authLoading, checkingOnboarding, user: user?.id });
    return loadingFallback;
  }

  console.log('📊 Render state:', { 
    authLoading, 
    checkingOnboarding, 
    hasUser: !!user, 
    hasCompletedOnboarding 
  });

  // Show login if not authenticated
  if (!user) {
    return (
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NotificationActionListener />
        <React.Suspense fallback={loadingFallback}>
          <Routes>
            <Route path="/demo" element={<FeatureDemoPage />} />
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Universal Neurotype Planner
                    </h1>
                    <p className="text-gray-600">
                      Your adaptive executive function support tool
                    </p>
                  </div>
                  
                  {!showLoginForm ? (
                    <div className="space-y-4">
                      <button 
                        onClick={() => setShowLoginForm(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                      >
                        Sign In / Sign Up
                      </button>
                      <a 
                        href="/demo" 
                        className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors text-center"
                      >
                        🧠 View Feature Demo
                      </a>
                      <p className="text-xs text-center text-gray-500">
                        Secure authentication powered by Supabase
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          onClick={() => setIsSignUp(false)}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                            !isSignUp 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSignUp(true)}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                            isSignUp 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Sign Up
                        </button>
                      </div>

                      {isSignUp && (
                        <div>
                          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                            Display Name
                          </label>
                          <input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your name"
                            required={isSignUp}
                          />
                        </div>
                      )}

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="you@example.com"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSigningIn}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
                      >
                        {isSigningIn ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowLoginForm(false)}
                        className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
                      >
                        ← Back
                      </button>
                    </form>
                  )}
                </div>
              </div>
            } />
          </Routes>
        </React.Suspense>
      </Router>
    );
  }

  // Show onboarding if not completed
  if (hasCompletedOnboarding === false) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Show main app (this path is only reached when user is authenticated)
  return (
    <>
      <NotificationActionListener />
      <ActivityTracker>
        <MainLayout>
          <React.Suspense fallback={loadingFallback}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/routines" element={<Routines />} />
              <Route path="/routines/new" element={<RoutineDesigner />} />
              <Route path="/mood" element={<Mood />} />
              <Route path="/focus" element={<Focus />} />
              <Route path="/wellness" element={<Wellness />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/boards" element={<BoardsPage />} />
              <Route path="/boards/:boardId" element={<BoardDetailPage />} />
              <Route path="/boards/:boardId/execute" element={<BoardExecutionView />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/collaboration" element={<Collaboration />} />
              <Route path="/demo" element={<FeatureDemoPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </React.Suspense>

          {/* AI Recall Button - Available throughout the app */}
          <RecallButton />
          
          {/* Floating Timer Widget - Shows when timer is active */}
          <FloatingTimerWidget />
        </MainLayout>
      </ActivityTracker>
    </>
  );
};

// Heavy providers that should only mount once auth state is known
const HeavyProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <AccessibilityProvider>
            <ToastProvider>
              <ConfirmProvider>
                <TimerProvider>
                  <AdaptiveSmartProvider>
                    {children}
                    <PWAInstaller />
                  </AdaptiveSmartProvider>
                </TimerProvider>
              </ConfirmProvider>
            </ToastProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

// Auth-aware shell: light-weight routing and unauthenticated UI do NOT mount heavy providers.
const AuthAwareShell: React.FC = () => {
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const completed = await onboardingService.hasCompletedOnboarding(user.id);
        setHasCompletedOnboarding(completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasCompletedOnboarding(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  // While auth is resolving, show a minimal loading UI
  if (authLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // If not authenticated, render the lightweight unauthenticated routes/UI
  if (!user) {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner size="large"/></div>}>
        <Routes>
          <Route path="/demo" element={<FeatureDemoPage />} />
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Universal Neurotype Planner</h1>
                  <p className="text-gray-600">Your adaptive executive function support tool</p>
                </div>
                <div className="space-y-4">
                  <a href="/demo" className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors text-center">🧠 View Feature Demo</a>
                </div>
              </div>
            </div>
          } />
        </Routes>
      </React.Suspense>
    );
  }

  // User exists: mount heavy providers and then render the full app content inside them
  return (
    <HeavyProviders>
      <AppContent />
    </HeavyProviders>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthAwareShell />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
