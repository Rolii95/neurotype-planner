import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdaptiveSmart } from './AdaptiveSmartContext';

interface ActivityTrackerProps {
  children: React.ReactNode;
}

export function ActivityTracker({ children }: ActivityTrackerProps) {
  const {
    actions: { logActivity },
  } = useAdaptiveSmart(); // Isolate the single action we use to keep the effect dependency stable
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());

  // Track route changes
  useEffect(() => {
    startTimeRef.current = Date.now();
    let isActive = true;

    // Log navigation activity
    const logNavigation = async () => {
      await logActivity({
        path: location.pathname,
        action: 'navigation',
        context: {
          page: getPageName(location.pathname),
          metadata: {
            search: location.search,
            hash: location.hash,
            fromPath: document.referrer || 'direct',
          },
        },
      });
    };

    logNavigation();

    // Cleanup function to log duration when leaving page
    return () => {
      isActive = false;
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      // Only log if spent more than 5 seconds
      if (duration > 5) {
        logActivity({
          path: location.pathname,
          action: 'interaction',
          context: {
            page: getPageName(location.pathname),
            component: 'ActivityTracker',
            duration,
            metadata: {
              event: 'page_exit',
              duration,
            },
          },
        }).catch(console.error);
      }
    };
  }, [location.pathname, location.search, location.hash, logActivity]);

  return <>{children}</>;
}

// Helper function to extract page name from pathname
function getPageName(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) return 'dashboard';
  
  const pageMap: Record<string, string> = {
    'priority-matrix': 'priority-matrix',
    'visual-sensory': 'visual-sensory',
    'mood-tracker': 'mood-tracker',
    'routine-board': 'routine-board',
    'settings': 'settings',
    'profile': 'profile',
    'help': 'help',
  };

  return pageMap[segments[0]] || segments[0];
}
