import { ChevronRightIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useAdaptiveSmart } from './AdaptiveSmartContext';
import { formatDistance } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ActivityRecallBannerProps {
  showWhenNoActivity?: boolean;
  className?: string;
  variant?: 'banner' | 'card' | 'minimal';
}

export function ActivityRecallBanner({ 
  showWhenNoActivity = true, 
  className = '',
  variant = 'banner' 
}: ActivityRecallBannerProps) {
  const { state, actions, cognitiveProfile } = useAdaptiveSmart();
  const navigate = useNavigate();

  // Don't show if smart features are disabled
  if (!state.smartFeatures.activityRecall) {
    return null;
  }

  // Get last meaningful activity (exclude current page)
  const currentPath = window.location.pathname;
  const lastActivity = state.activityHistory.find(
    activity => activity.path !== currentPath && 
    activity.action === 'navigation' &&
    activity.context.duration && activity.context.duration > 10 // At least 10 seconds
  );

  // Don't show if no previous activity and showWhenNoActivity is false
  if (!lastActivity && !showWhenNoActivity) {
    return null;
  }

  // Get neurotype-specific styling
  const getNeuroStyles = () => {
    const baseStyles = "rounded-lg border transition-all duration-200";
    
    switch (cognitiveProfile?.neurotype) {
      case 'adhd':
        return `${baseStyles} border-l-4 border-l-blue-500 bg-blue-50 hover:bg-blue-100 focus-within:ring-2 focus-within:ring-blue-500`;
      case 'autism':
        return `${baseStyles} border-green-300 bg-green-50 hover:bg-green-100 shadow-sm`;
      case 'dyslexia':
        return `${baseStyles} border-purple-300 bg-purple-50 hover:bg-purple-100 text-lg leading-relaxed`;
      default:
        return `${baseStyles} border-gray-300 bg-gray-50 hover:bg-gray-100`;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'p-4 shadow-md';
      case 'minimal':
        return 'p-2 text-sm';
      default:
        return 'p-3';
    }
  };

  const handleRecallClick = async () => {
    if (lastActivity) {
      // Navigate to the last activity
      navigate(lastActivity.path);
      
      // Log this as a recall action
      await actions.logActivity({
        path: lastActivity.path,
        action: 'navigation',
        context: {
          page: lastActivity.context.page,
          component: 'ActivityRecall',
          metadata: { 
            recallAction: true,
            originalTimestamp: lastActivity.timestamp,
            timeAgo: formatDistance(lastActivity.timestamp, new Date()),
          },
        },
      });
    } else {
      // Jump to last known location if available
      await actions.jumpToLastActivity();
    }
  };

  const getTimeAgo = () => {
    if (!lastActivity) return 'No recent activity';
    return formatDistance(lastActivity.timestamp, new Date(), { addSuffix: true });
  };

  const getActivityIcon = () => {
    if (!lastActivity) return <ClockIcon className="h-5 w-5 text-gray-400" />;
    
    switch (lastActivity.context.page) {
      case 'dashboard':
        return <MapPinIcon className="h-5 w-5 text-blue-500" />;
      case 'priority-matrix':
        return <div className="h-5 w-5 bg-green-500 rounded-sm" />;
      case 'visual-sensory':
        return <div className="h-5 w-5 bg-purple-500 rounded-full" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPageDisplayName = (page: string) => {
    const pageNames: Record<string, string> = {
      'dashboard': 'Dashboard',
      'priority-matrix': 'Priority Matrix',
      'visual-sensory': 'Visual & Sensory Tools',
      'mood-tracker': 'Mood Tracker',
      'routine-board': 'Routine Board',
      'settings': 'Settings',
    };
    return pageNames[page] || page.charAt(0).toUpperCase() + page.slice(1);
  };

  // ADHD-specific: High contrast and immediate visual feedback
  const getADHDEnhancements = () => {
    if (cognitiveProfile?.neurotype === 'adhd') {
      return {
        focusStyles: 'focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-75',
        hoverStyles: 'hover:shadow-lg hover:scale-[1.02] transform transition-transform',
        textStyles: 'font-semibold',
      };
    }
    return {
      focusStyles: 'focus:outline-none focus:ring-2 focus:ring-blue-500',
      hoverStyles: 'hover:shadow-md',
      textStyles: '',
    };
  };

  const enhancements = getADHDEnhancements();

  // Render different variants
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleRecallClick}
        className={`
          ${getNeuroStyles()} ${getVariantStyles()} ${className}
          ${enhancements.focusStyles} ${enhancements.hoverStyles}
          flex items-center gap-2 w-full text-left
        `}
        aria-label={lastActivity ? `Return to ${getPageDisplayName(lastActivity.context.page)}` : 'No recent activity'}
      >
        {getActivityIcon()}
        <span className={`text-gray-600 ${enhancements.textStyles}`}>
          {lastActivity ? `${getPageDisplayName(lastActivity.context.page)} • ${getTimeAgo()}` : 'No recent activity'}
        </span>
        {lastActivity && <ChevronRightIcon className="h-4 w-4 text-gray-400 ml-auto" />}
      </button>
    );
  }

  return (
    <div className={`${getNeuroStyles()} ${getVariantStyles()} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {getActivityIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-sm font-medium text-gray-900 ${enhancements.textStyles}`}>
                {lastActivity ? 'Where Was I?' : 'Getting Started'}
              </h3>
              
              {state.connectionStatus === 'offline' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Offline
                </span>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              {lastActivity ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span>You were in</span>
                    <span className="font-medium text-gray-900">
                      {getPageDisplayName(lastActivity.context.page)}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">{getTimeAgo()}</span>
                  </div>
                  
                  {lastActivity.context.duration && (
                    <div className="text-xs text-gray-500">
                      Spent {Math.round(lastActivity.context.duration / 60)} minutes there
                    </div>
                  )}
                </div>
              ) : (
                <p>No recent activity to recall. Start exploring to build your activity history!</p>
              )}
            </div>
          </div>
        </div>

        {lastActivity && (
          <button
            onClick={handleRecallClick}
            className={`
              inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
              text-blue-700 bg-blue-100 hover:bg-blue-200 
              ${enhancements.focusStyles} ${enhancements.hoverStyles}
              transition-colors duration-150
            `}
            aria-label={`Return to ${getPageDisplayName(lastActivity.context.page)}`}
          >
            <span>Go Back</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Session Summary for Enhanced Context */}
      {variant === 'card' && state.currentSession && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Session Duration:</span>
              <span>
                {formatDistance(state.currentSession.startTime, new Date())}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pages Visited:</span>
              <span>{state.currentSession.summary.pagesVisited}</span>
            </div>
            <div className="flex justify-between">
              <span>Actions:</span>
              <span>{state.currentSession.summary.actionsPerformed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Neurotype-specific helpful tips */}
      {cognitiveProfile?.neurotype === 'adhd' && variant === 'card' && (
        <div className="mt-3 p-2 bg-blue-100 rounded-md">
          <p className="text-xs text-blue-800">
            💡 <strong>ADHD Tip:</strong> Use "Go Back" to quickly return to your last focus area when you get distracted.
          </p>
        </div>
      )}

      {cognitiveProfile?.neurotype === 'autism' && variant === 'card' && (
        <div className="mt-3 p-2 bg-green-100 rounded-md">
          <p className="text-xs text-green-800">
            🧭 <strong>Navigation:</strong> This helps you maintain your routine by showing exactly where you were before.
          </p>
        </div>
      )}
    </div>
  );
}