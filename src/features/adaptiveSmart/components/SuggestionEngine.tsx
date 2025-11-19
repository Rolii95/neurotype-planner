import { useEffect, useState } from 'react';
import { useAdaptiveSmart } from './AdaptiveSmartContext';
import { SuggestionNudge } from './SuggestionNudge';
import { SmartSuggestion } from '../types';
import { Transition } from '@headlessui/react';

interface SuggestionEngineProps {
  className?: string;
  maxDisplayed?: number;
  autoRefresh?: boolean;
  position?: 'top' | 'bottom' | 'side';
}

export function SuggestionEngine({ 
  className = '',
  maxDisplayed = 3,
  autoRefresh = true,
  position = 'top'
}: SuggestionEngineProps) {
  const { state, actions, cognitiveProfile } = useAdaptiveSmart();
  const [visibleSuggestions, setVisibleSuggestions] = useState<SmartSuggestion[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Filter and prioritize suggestions
  useEffect(() => {
    if (!state.smartFeatures.dynamicSuggestions || !state.suggestionSettings.enabled) {
      setVisibleSuggestions([]);
      return;
    }

    const now = new Date();
    const activeSuggestions = state.suggestions.filter(suggestion => {
      // Filter by status
      if (suggestion.status !== 'pending') return false;
      
      // Filter by expiration
      if (suggestion.expiresAt && suggestion.expiresAt <= now) return false;
      
      // Filter by enabled types
      if (!state.suggestionSettings.types.includes(suggestion.type)) return false;
      
      // Filter by neurotype optimization if enabled
      if (state.suggestionSettings.neurotypeOptimization && suggestion.context.neurotype) {
        if (cognitiveProfile?.neurotype !== suggestion.context.neurotype) return false;
      }

      return true;
    });

    // Sort by priority and confidence
    const prioritizedSuggestions = activeSuggestions.sort((a, b) => {
      const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return b.confidence - a.confidence; // Higher confidence first
    });

    // Apply frequency limits based on settings
    const frequencyLimits = {
      'minimal': 1,
      'normal': 3,
      'frequent': 5,
    };
    
    const limit = Math.min(maxDisplayed, frequencyLimits[state.suggestionSettings.frequency]);
    setVisibleSuggestions(prioritizedSuggestions.slice(0, limit));
  }, [
    state.suggestions, 
    state.smartFeatures.dynamicSuggestions,
    state.suggestionSettings,
    cognitiveProfile?.neurotype,
    maxDisplayed
  ]);

  // Auto-refresh suggestions
  useEffect(() => {
    if (!autoRefresh || !state.smartFeatures.dynamicSuggestions) return;

    const refreshInterval = 60000; // 1 minute
    const interval = setInterval(async () => {
      await actions.fetchSuggestions();
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, state.smartFeatures.dynamicSuggestions, actions]);

  // Handle suggestion dismissal
  const handleSuggestionDismiss = (suggestionId: string) => {
    setVisibleSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  // Handle suggestion action
  const handleSuggestionAction = (suggestionId: string, actionId: string) => {
    setVisibleSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  // Don't render if no suggestions or feature disabled
  if (!state.smartFeatures.dynamicSuggestions || visibleSuggestions.length === 0) {
    return null;
  }

  // Get position-specific styling
  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return 'fixed bottom-4 right-4 max-w-sm z-50';
      case 'side':
        return 'fixed right-4 top-1/2 transform -translate-y-1/2 max-w-sm z-50';
      default:
        return 'relative';
    }
  };

  // Get neurotype-specific container styling
  const getContainerStyles = () => {
    const baseStyles = "space-y-3";
    
    switch (cognitiveProfile?.neurotype) {
      case 'adhd':
        return `${baseStyles} ${position !== 'top' ? 'animate-fadeIn' : ''}`;
      case 'autism':
        return `${baseStyles}`;
      case 'dyslexia':
        return `${baseStyles}`;
      default:
        return baseStyles;
    }
  };

  return (
    <div className={`${getPositionStyles()} ${className}`}>
      <div className={getContainerStyles()}>
        {visibleSuggestions.map((suggestion, index) => (
          <Transition
            key={suggestion.id}
            show={true}
            appear={true}
            enter="transition-all duration-300 ease-out"
            enterFrom="opacity-0 transform translate-y-2 scale-95"
            enterTo="opacity-100 transform translate-y-0 scale-100"
            leave="transition-all duration-200 ease-in"
            leaveFrom="opacity-100 transform translate-y-0 scale-100"
            leaveTo="opacity-0 transform translate-y-2 scale-95"
          >
            <div style={{ transitionDelay: `${index * 100}ms` }}>
              <SuggestionNudge
                suggestion={suggestion}
                variant={position === 'top' ? 'banner' : 'toast'}
                onAction={(actionId) => handleSuggestionAction(suggestion.id, actionId)}
                onDismiss={() => handleSuggestionDismiss(suggestion.id)}
              />
            </div>
          </Transition>
        ))}
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <div>Total suggestions: {state.suggestions.length}</div>
          <div>Visible: {visibleSuggestions.length}</div>
          <div>Last refresh: {lastRefresh.toLocaleTimeString()}</div>
          <div>Settings: {state.suggestionSettings.frequency}</div>
        </div>
      )}
    </div>
  );
}

// Neurotype-specific suggestion strategies
export function useNeuroSuggestionStrategy() {
  const { cognitiveProfile, state, actions } = useAdaptiveSmart();

  const generateNeuroSpecificSuggestions = async () => {
    if (!cognitiveProfile) return;

    const recentActivities = state.activityHistory.slice(0, 10);
    const currentTime = new Date();
    const hour = currentTime.getHours();

    // ADHD-specific suggestions
    if (cognitiveProfile.neurotype === 'adhd') {
      // Focus break suggestions
      const hasBeenActiveLong = recentActivities.length > 5 && 
        recentActivities.every(a => a.context.duration && a.context.duration > 300);
      
      if (hasBeenActiveLong) {
        // Suggest a focus break
        await actions.createQuickEntry({
          type: 'text',
          content: {
            text: 'ADHD Focus Break Reminder: Time to take a 5-10 minute break to recharge your focus.'
          },
          context: {
            source: 'neuro-suggestion-engine',
            tags: ['adhd', 'focus', 'break'],
          },
          processing: {
            status: 'processed',
            extractedData: {
              intent: 'break_reminder',
              category: 'wellbeing',
              sentiment: 'positive',
            },
          },
        });
      }

      // Time blocking suggestions during work hours
      if (hour >= 9 && hour <= 17) {
        const hasUnstructuredTime = !recentActivities.some(a => 
          a.context.page === 'priority-matrix'
        );
        
        if (hasUnstructuredTime) {
          // Suggest using priority matrix
        }
      }
    }

    // Autism-specific suggestions
    if (cognitiveProfile.neurotype === 'autism') {
      // Routine check suggestions
      const routinePages = ['routine-board', 'visual-sensory'];
      const hasCheckedRoutine = recentActivities.some(a =>
        routinePages.includes(a.context.page) && 
        a.timestamp.getTime() > currentTime.getTime() - 3600000 // Last hour
      );

      if (!hasCheckedRoutine && (hour === 9 || hour === 13 || hour === 18)) {
        // Suggest routine check at key transition times
      }

      // Sensory comfort checks
      const hasHighActivity = recentActivities.length > 8;
      if (hasHighActivity) {
        // Suggest sensory comfort check
      }
    }

    // Dyslexia-specific suggestions
    if (cognitiveProfile.neurotype === 'dyslexia') {
      // Reading break suggestions
      const hasBeenReading = recentActivities.some(a =>
        a.context.metadata && (
          String(a.context.metadata).includes('read') ||
          String(a.context.metadata).includes('text')
        )
      );

      if (hasBeenReading) {
        // Suggest reading break with audio alternatives
      }

      // Voice input suggestions
      const hasBeenTyping = recentActivities.some(a =>
        a.action === 'creation' && a.context.component?.includes('form')
      );

      if (hasBeenTyping) {
        // Suggest using voice input
      }
    }
  };

  return {
    generateNeuroSpecificSuggestions,
  };
}