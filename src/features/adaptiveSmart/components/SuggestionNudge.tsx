import { XMarkIcon, CheckIcon, ClockIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon, InformationCircleIcon, LightBulbIcon } from '@heroicons/react/24/solid';
import { useAdaptiveSmart } from './AdaptiveSmartContext';
import { SmartSuggestion } from '../types';
import { formatDistance } from 'date-fns';

interface SuggestionNudgeProps {
  suggestion: SmartSuggestion;
  className?: string;
  variant?: 'banner' | 'card' | 'toast' | 'modal';
  onAction?: (actionId: string) => void;
  onDismiss?: () => void;
}

export function SuggestionNudge({ 
  suggestion, 
  className = '',
  variant = 'card',
  onAction,
  onDismiss 
}: SuggestionNudgeProps) {
  const { actions, cognitiveProfile } = useAdaptiveSmart();

  // Handle suggestion actions
  const handleAction = async (actionId: string) => {
    try {
      await actions.acceptSuggestion(suggestion.id, actionId);
      
      // Execute the action based on type
      const action = suggestion.actions.find(a => a.id === actionId);
      if (action) {
        switch (action.type) {
          case 'navigate':
            if (action.payload) {
              window.location.hash = action.payload;
            }
            break;
          case 'external':
            // Handle external actions (e.g., taking a break)
            break;
          case 'create':
          case 'update':
            // Handle data operations
            break;
          case 'dismiss':
            await handleDismiss();
            return;
        }
      }

      if (onAction) {
        onAction(actionId);
      }
    } catch (error) {
      console.error('Failed to handle suggestion action:', error);
    }
  };

  const handleSnooze = async () => {
    try {
      await actions.snoozeSuggestion(suggestion.id, 3600000); // 1 hour
    } catch (error) {
      console.error('Failed to snooze suggestion:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      await actions.dismissSuggestion(suggestion.id);
      if (onDismiss) {
        onDismiss();
      }
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  // Get icon based on suggestion type and priority
  const getSuggestionIcon = () => {
    const iconClass = "h-5 w-5";
    
    if (suggestion.priority === 'urgent') {
      return <ExclamationTriangleIcon className={`${iconClass} text-red-500`} />;
    }

    switch (suggestion.type) {
      case 'reminder':
        return <ClockIcon className={`${iconClass} text-blue-500`} />;
      case 'break':
        return <ExclamationTriangleIcon className={`${iconClass} text-orange-500`} />;
      case 'task':
        return <CheckIcon className={`${iconClass} text-green-500`} />;
      case 'routine':
        return <div className="h-5 w-5 bg-purple-500 rounded-full" />;
      case 'mood-check':
        return <div className="h-5 w-5 bg-pink-500 rounded-full" />;
      case 'optimization':
        return <LightBulbIcon className={`${iconClass} text-yellow-500`} />;
      default:
        return <InformationCircleIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  // Get neurotype-specific styling
  const getNeuroStyles = () => {
    const baseStyles = "transition-all duration-200";
    
    switch (cognitiveProfile?.neurotype) {
      case 'adhd':
        return {
          container: `${baseStyles} border-l-4 ${getPriorityBorderColor()} shadow-md hover:shadow-lg`,
          text: "font-medium",
          focus: "focus:ring-4 focus:ring-opacity-75",
          animation: suggestion.priority === 'high' || suggestion.priority === 'urgent' ? "animate-pulse" : "",
        };
      case 'autism':
        return {
          container: `${baseStyles} border-2 border-gray-200 shadow-sm`,
          text: "font-normal",
          focus: "focus:ring-2 focus:ring-gray-400",
          animation: "",
        };
      case 'dyslexia':
        return {
          container: `${baseStyles} border border-gray-300`,
          text: "text-lg leading-relaxed font-medium",
          focus: "focus:ring-2 focus:ring-purple-500",
          animation: "",
        };
      default:
        return {
          container: baseStyles,
          text: "font-normal",
          focus: "focus:ring-2 focus:ring-blue-500",
          animation: "",
        };
    }
  };

  const getPriorityBorderColor = () => {
    switch (suggestion.priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-blue-500';
      default: return 'border-l-green-500';
    }
  };

  const getPriorityBgColor = () => {
    switch (suggestion.priority) {
      case 'urgent': return 'bg-red-50 hover:bg-red-100';
      case 'high': return 'bg-orange-50 hover:bg-orange-100';
      case 'medium': return 'bg-blue-50 hover:bg-blue-100';
      default: return 'bg-green-50 hover:bg-green-100';
    }
  };

  const neuroStyles = getNeuroStyles();

  // Render different variants
  if (variant === 'toast') {
    return (
      <div className={`
        ${neuroStyles.container} ${getPriorityBgColor()} ${neuroStyles.animation}
        max-w-sm rounded-lg border shadow-lg p-3 ${className}
      `}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {getSuggestionIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${neuroStyles.text} text-gray-900`}>
              {suggestion.title}
            </p>
            {suggestion.message && (
              <p className="text-xs text-gray-600 mt-1">
                {suggestion.message}
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className={`p-1 rounded hover:bg-gray-200 ${neuroStyles.focus}`}
            aria-label="Dismiss suggestion"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {suggestion.actions.length > 0 && (
          <div className="mt-3 flex gap-2">
            {suggestion.actions.slice(0, 2).map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className={`
                  px-3 py-1 text-xs font-medium rounded-md ${neuroStyles.focus}
                  ${action.style === 'primary' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`
        ${neuroStyles.container} ${getPriorityBgColor()} ${neuroStyles.animation}
        rounded-lg border p-4 ${className}
      `}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getSuggestionIcon()}
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`text-sm ${neuroStyles.text} text-gray-900`}>
                  {suggestion.title}
                </h3>
                
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${suggestion.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    suggestion.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    suggestion.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }
                `}>
                  {suggestion.priority}
                </span>
              </div>
              
              <p className="text-sm text-gray-600">
                {suggestion.message}
              </p>

              {/* Confidence and context */}
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>Confidence: {suggestion.confidence}%</span>
                <span>
                  Created {formatDistance(suggestion.createdAt, new Date(), { addSuffix: true })}
                </span>
                {suggestion.context.neurotype && (
                  <span className="capitalize">
                    {suggestion.context.neurotype} optimized
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* Snooze button */}
            <button
              onClick={handleSnooze}
              className={`
                p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100
                ${neuroStyles.focus}
              `}
              aria-label="Snooze for 1 hour"
              title="Snooze for 1 hour"
            >
              <ClockIcon className="h-4 w-4" />
            </button>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className={`
                p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100
                ${neuroStyles.focus}
              `}
              aria-label="Dismiss suggestion"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Actions */}
        {suggestion.actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestion.actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className={`
                  inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
                  transition-colors duration-150 ${neuroStyles.focus}
                  ${action.style === 'primary' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : action.style === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : action.style === 'ghost'
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                <span>{action.label}</span>
                {action.type === 'navigate' && (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Based on context */}
        {suggestion.context.basedOn.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Based on: {suggestion.context.basedOn.join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`
      ${neuroStyles.container} ${getPriorityBgColor()} ${neuroStyles.animation}
      rounded-lg border shadow-sm p-4 ${className}
    `}>
      <div className="flex items-start gap-3">
        {getSuggestionIcon()}
        
        <div className="flex-1">
          <h3 className={`text-sm ${neuroStyles.text} text-gray-900 mb-1`}>
            {suggestion.title}
          </h3>
          
          <p className="text-sm text-gray-600 mb-3">
            {suggestion.message}
          </p>

          {/* Actions */}
          {suggestion.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {suggestion.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${neuroStyles.focus}
                    ${action.style === 'primary' 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : action.style === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : action.style === 'ghost'
                      ? 'text-gray-600 hover:bg-gray-100'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Meta information */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {suggestion.confidence}% confidence
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSnooze}
                className={`hover:text-gray-700 ${neuroStyles.focus} rounded`}
                title="Snooze"
              >
                <ClockIcon className="h-3 w-3" />
              </button>
              <button
                onClick={handleDismiss}
                className={`hover:text-gray-700 ${neuroStyles.focus} rounded`}
                title="Dismiss"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}