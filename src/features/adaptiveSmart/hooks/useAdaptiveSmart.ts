import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdaptiveSmart } from '../components/AdaptiveSmartContext';

/**
 * Main hook for adaptive smart functions
 * Provides activity tracking, suggestions, and quick entry functionality
 */
export function useAdaptiveSmartFeatures() {
  const { state, actions, deviceInfo, cognitiveProfile } = useAdaptiveSmart();
  const location = useLocation();

  // Auto-track navigation
  useEffect(() => {
    if (state.smartFeatures.activityRecall) {
      const trackNavigation = async () => {
        await actions.logActivity({
          path: location.pathname,
          action: 'navigation',
          context: {
            page: getPageNameFromPath(location.pathname),
            metadata: {
              search: location.search,
              hash: location.hash,
            },
          },
        });
      };

      trackNavigation();
    }
  }, [location, state.smartFeatures.activityRecall, actions]);

  // Auto-refresh suggestions
  useEffect(() => {
    if (state.smartFeatures.dynamicSuggestions && state.suggestionSettings.enabled) {
      const refreshSuggestions = () => {
        actions.fetchSuggestions();
      };

      // Initial fetch
      refreshSuggestions();

      // Set up periodic refresh based on frequency setting
      const intervals = {
        minimal: 300000, // 5 minutes
        normal: 120000,  // 2 minutes
        frequent: 60000, // 1 minute
      };

      const interval = setInterval(refreshSuggestions, intervals[state.suggestionSettings.frequency]);

      return () => clearInterval(interval);
    }
  }, [
    state.smartFeatures.dynamicSuggestions,
    state.suggestionSettings.enabled,
    state.suggestionSettings.frequency,
    actions
  ]);

  // Track user interactions
  const trackInteraction = useCallback(async (
    component: string,
    action: string,
    metadata?: Record<string, any>
  ) => {
    if (state.smartFeatures.contextAwareness) {
      await actions.logActivity({
        path: location.pathname,
        action: 'interaction',
        context: {
          page: getPageNameFromPath(location.pathname),
          component,
          metadata: { ...metadata, action },
        },
      });
    }
  }, [location.pathname, state.smartFeatures.contextAwareness, actions]);

  // Track task completion
  const trackCompletion = useCallback(async (
    taskType: string,
    taskId: string,
    duration?: number
  ) => {
    if (state.smartFeatures.contextAwareness) {
      await actions.logActivity({
        path: location.pathname,
        action: 'completion',
        context: {
          page: getPageNameFromPath(location.pathname),
          component: taskType,
          duration,
          metadata: { taskId, taskType, completed: true },
        },
      });
    }
  }, [location.pathname, state.smartFeatures.contextAwareness, actions]);

  // Get activity insights
  const getActivityInsights = useCallback(() => {
    const recentActivities = state.activityHistory.slice(0, 50);
    
    // Calculate session patterns
    const today = new Date();
    const todayActivities = recentActivities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate.toDateString() === today.toDateString();
    });

    // Most used pages
    const pageUsage = todayActivities.reduce((acc, activity) => {
      const page = activity.context.page;
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedPage = Object.entries(pageUsage).reduce((max, [page, count]) =>
      count > (pageUsage[max] || 0) ? page : max
    , Object.keys(pageUsage)[0]);

    // Average session length
    const sessionDurations = todayActivities
      .filter(a => a.context.duration)
      .map(a => a.context.duration || 0);
    
    const avgSessionLength = sessionDurations.length > 0
      ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
      : 0;

    // Productivity score (simplified)
    const productivePages = ['priority-matrix', 'visual-sensory', 'mood-tracker'];
    const productiveTime = todayActivities
      .filter(a => productivePages.includes(a.context.page))
      .reduce((sum, a) => sum + (a.context.duration || 0), 0);
    
    const totalTime = todayActivities
      .reduce((sum, a) => sum + (a.context.duration || 0), 0);

    const productivityScore = totalTime > 0 ? (productiveTime / totalTime) * 100 : 0;

    return {
      todayActivities: todayActivities.length,
      mostUsedPage,
      avgSessionLength: Math.round(avgSessionLength / 60), // Convert to minutes
      productivityScore: Math.round(productivityScore),
      pageUsage,
    };
  }, [state.activityHistory]);

  // Get neurotype-specific recommendations
  const getNeuroRecommendations = useCallback(() => {
    if (!cognitiveProfile) return [];

    const recommendations = [];
    const recentActivities = state.activityHistory.slice(0, 10);
    const currentHour = new Date().getHours();

    switch (cognitiveProfile.neurotype) {
      case 'adhd':
        // Focus recommendations
        if (recentActivities.length > 5) {
          recommendations.push({
            type: 'break',
            message: 'Consider taking a short break to maintain focus',
            priority: 'medium',
          });
        }

        // Time blocking recommendations
        if (currentHour >= 9 && currentHour <= 17) {
          const hasStructuredTime = recentActivities.some(a => 
            a.context.page === 'priority-matrix'
          );
          if (!hasStructuredTime) {
            recommendations.push({
              type: 'organization',
              message: 'Try using the Priority Matrix to structure your tasks',
              priority: 'high',
            });
          }
        }
        break;

      case 'autism':
        // Routine recommendations
        const routinePages = ['routine-board', 'visual-sensory'];
        const hasCheckedRoutine = recentActivities.some(a =>
          routinePages.includes(a.context.page)
        );
        
        if (!hasCheckedRoutine && [9, 13, 18].includes(currentHour)) {
          recommendations.push({
            type: 'routine',
            message: 'Time to check your routine board',
            priority: 'high',
          });
        }

        // Sensory comfort
        if (recentActivities.length > 8) {
          recommendations.push({
            type: 'sensory',
            message: 'Check your sensory comfort levels',
            priority: 'medium',
          });
        }
        break;

      case 'dyslexia':
        // Reading support
        const hasTextIntensiveActivity = recentActivities.some(a =>
          a.context.metadata && 
          typeof a.context.metadata === 'object' &&
          'textContent' in a.context.metadata
        );
        
        if (hasTextIntensiveActivity) {
          recommendations.push({
            type: 'reading-support',
            message: 'Consider using voice features for easier reading',
            priority: 'medium',
          });
        }
        break;
    }

    return recommendations;
  }, [cognitiveProfile, state.activityHistory]);

  // Check if user needs assistance
  const needsAssistance = useCallback(() => {
    const recentActivities = state.activityHistory.slice(0, 5);
    
    // Check for signs of confusion (multiple rapid navigation changes)
    const rapidNavigations = recentActivities.filter(a => 
      a.action === 'navigation' && 
      a.timestamp.getTime() > Date.now() - 30000 // Last 30 seconds
    );

    if (rapidNavigations.length >= 3) {
      return {
        type: 'navigation-confusion',
        message: 'You seem to be looking for something. Can I help?',
        suggestions: ['Show activity recall', 'Open search', 'Go to dashboard'],
      };
    }

    // Check for long inactivity
    const lastActivity = recentActivities[0];
    if (lastActivity && Date.now() - lastActivity.timestamp.getTime() > 600000) { // 10 minutes
      return {
        type: 'inactivity',
        message: 'Welcome back! Where would you like to continue?',
        suggestions: ['Show last activity', 'View suggestions', 'Quick entry'],
      };
    }

    return null;
  }, [state.activityHistory]);

  return {
    // State
    isEnabled: state.smartFeatures,
    suggestions: state.suggestions,
    quickEntries: state.quickEntries,
    activityHistory: state.activityHistory,
    lastActiveLocation: state.lastActiveLocation,
    
    // Actions
    trackInteraction,
    trackCompletion,
    createQuickEntry: actions.createQuickEntry,
    acceptSuggestion: actions.acceptSuggestion,
    dismissSuggestion: actions.dismissSuggestion,
    jumpToLastActivity: actions.jumpToLastActivity,
    
    // Insights
    getActivityInsights,
    getNeuroRecommendations,
    needsAssistance,
    
    // Device & Profile
    deviceInfo,
    cognitiveProfile,
    
    // Settings
    updateSettings: actions.updateSmartSettings,
    toggleFeature: actions.toggleSmartFeature,
  };
}

/**
 * Hook for managing quick entry functionality
 */
export function useQuickEntry() {
  const { actions, state, deviceInfo } = useAdaptiveSmart();

  const createEntry = useCallback(async (
    type: 'text' | 'voice' | 'image' | 'link',
    content: any,
    context?: { tags?: string[]; source?: string }
  ) => {
    return actions.createQuickEntry({
      type,
      content,
      context: {
        source: context?.source || window.location.pathname,
        tags: context?.tags || state.quickEntrySettings.defaultTags,
      },
      processing: {
        status: 'pending',
      },
    });
  }, [actions, state.quickEntrySettings.defaultTags]);

  const searchEntries = useCallback((query: string) => {
    return actions.searchQuickEntries(query);
  }, [actions]);

  return {
    entries: state.quickEntries,
    settings: state.quickEntrySettings,
    capabilities: deviceInfo.capabilities,
    createEntry,
    searchEntries,
    deleteEntry: actions.deleteQuickEntry,
    processEntry: actions.processQuickEntry,
  };
}

/**
 * Hook for managing adaptive suggestions
 */
export function useAdaptiveSuggestions() {
  const { state, actions, cognitiveProfile } = useAdaptiveSmart();

  const getFilteredSuggestions = useCallback(() => {
    if (!state.suggestionSettings.enabled) return [];

    const now = new Date();
    return state.suggestions.filter(suggestion => {
      // Filter by status
      if (suggestion.status !== 'pending') return false;
      
      // Filter by expiration
      if (suggestion.expiresAt && suggestion.expiresAt <= now) return false;
      
      // Filter by enabled types
      if (!state.suggestionSettings.types.includes(suggestion.type)) return false;
      
      // Filter by neurotype if optimization is enabled
      if (state.suggestionSettings.neurotypeOptimization && suggestion.context.neurotype) {
        return cognitiveProfile?.neurotype === suggestion.context.neurotype;
      }

      return true;
    }).sort((a, b) => {
      // Sort by priority and confidence
      const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.confidence - a.confidence;
    });
  }, [state.suggestions, state.suggestionSettings, cognitiveProfile]);

  return {
    suggestions: getFilteredSuggestions(),
    settings: state.suggestionSettings,
    accept: actions.acceptSuggestion,
    snooze: actions.snoozeSuggestion,
    dismiss: actions.dismissSuggestion,
    updateSettings: actions.updateSuggestionSettings,
    refresh: actions.fetchSuggestions,
  };
}

// Helper function
function getPageNameFromPath(pathname: string): string {
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