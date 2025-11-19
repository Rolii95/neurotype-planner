import { createContext, useContext, useReducer, useEffect, ReactNode, useState, useMemo, useCallback } from 'react';
import { 
  AdaptiveSmartState, 
  AdaptiveSmartActions, 
  UserActivity, 
  SmartSuggestion, 
  QuickEntry,
  DeviceInfo,
  CognitiveProfile
} from '../types';
import { adaptiveSmartAPI } from '../services/adaptiveSmartAPI';
import { useAuth } from '../../../contexts/AuthContext';
import { detectDevice, getCognitiveProfile } from '../services/deviceUtils';

// Initial state
const initialState: AdaptiveSmartState = {
  currentActivity: null,
  activityHistory: [],
  currentSession: null,
  lastActiveLocation: null,
  suggestions: [],
  suggestionSettings: {
    enabled: true,
    frequency: 'normal',
    types: ['reminder', 'break', 'task', 'routine', 'mood-check'],
    neurotypeOptimization: true,
  },
  quickEntries: [],
  quickEntrySettings: {
    voiceEnabled: true,
    imageEnabled: true,
    autoProcessing: true,
    defaultTags: [],
  },
  smartFeatures: {
    activityRecall: true,
    dynamicSuggestions: true,
    universalInput: true,
    contextAwareness: true,
    learningMode: true,
  },
  isLoading: false,
  error: null,
  lastSync: null,
  connectionStatus: 'online',
};

// Action types
type AdaptiveSmartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'online' | 'offline' | 'syncing' }
  | { type: 'SET_CURRENT_ACTIVITY'; payload: UserActivity | null }
  | { type: 'ADD_ACTIVITY'; payload: UserActivity }
  | { type: 'UPDATE_ACTIVITY_HISTORY'; payload: UserActivity[] }
  | { type: 'SET_LAST_ACTIVE_LOCATION'; payload: AdaptiveSmartState['lastActiveLocation'] }
  | { type: 'SET_SUGGESTIONS'; payload: SmartSuggestion[] }
  | { type: 'UPDATE_SUGGESTION'; payload: { id: string; updates: Partial<SmartSuggestion> } }
  | { type: 'REMOVE_SUGGESTION'; payload: string }
  | { type: 'UPDATE_SUGGESTION_SETTINGS'; payload: Partial<AdaptiveSmartState['suggestionSettings']> }
  | { type: 'ADD_QUICK_ENTRY'; payload: QuickEntry }
  | { type: 'UPDATE_QUICK_ENTRY'; payload: { id: string; updates: Partial<QuickEntry> } }
  | { type: 'REMOVE_QUICK_ENTRY'; payload: string }
  | { type: 'SET_QUICK_ENTRIES'; payload: QuickEntry[] }
  | { type: 'UPDATE_QUICK_ENTRY_SETTINGS'; payload: Partial<AdaptiveSmartState['quickEntrySettings']> }
  | { type: 'TOGGLE_SMART_FEATURE'; payload: keyof AdaptiveSmartState['smartFeatures'] }
  | { type: 'UPDATE_SMART_SETTINGS'; payload: Partial<AdaptiveSmartState> }
  | { type: 'SET_LAST_SYNC'; payload: Date }
  | { type: 'RESET_STATE' };

// Reducer
function adaptiveSmartReducer(state: AdaptiveSmartState, action: AdaptiveSmartAction): AdaptiveSmartState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_CURRENT_ACTIVITY':
      return { ...state, currentActivity: action.payload };

    case 'ADD_ACTIVITY':
      return {
        ...state,
        activityHistory: [action.payload, ...state.activityHistory].slice(0, 1000), // Keep last 1000 activities
        currentActivity: action.payload,
      };

    case 'UPDATE_ACTIVITY_HISTORY':
      return { ...state, activityHistory: action.payload };

    case 'SET_LAST_ACTIVE_LOCATION':
      return { ...state, lastActiveLocation: action.payload };

    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };

    case 'UPDATE_SUGGESTION':
      return {
        ...state,
        suggestions: state.suggestions.map(suggestion =>
          suggestion.id === action.payload.id
            ? { ...suggestion, ...action.payload.updates }
            : suggestion
        ),
      };

    case 'REMOVE_SUGGESTION':
      return {
        ...state,
        suggestions: state.suggestions.filter(suggestion => suggestion.id !== action.payload),
      };

    case 'UPDATE_SUGGESTION_SETTINGS':
      return {
        ...state,
        suggestionSettings: { ...state.suggestionSettings, ...action.payload },
      };

    case 'ADD_QUICK_ENTRY':
      return {
        ...state,
        quickEntries: [action.payload, ...state.quickEntries],
      };

    case 'UPDATE_QUICK_ENTRY':
      return {
        ...state,
        quickEntries: state.quickEntries.map(entry =>
          entry.id === action.payload.id
            ? { ...entry, ...action.payload.updates }
            : entry
        ),
      };

    case 'REMOVE_QUICK_ENTRY':
      return {
        ...state,
        quickEntries: state.quickEntries.filter(entry => entry.id !== action.payload),
      };

    case 'SET_QUICK_ENTRIES':
      return { ...state, quickEntries: action.payload };

    case 'UPDATE_QUICK_ENTRY_SETTINGS':
      return {
        ...state,
        quickEntrySettings: { ...state.quickEntrySettings, ...action.payload },
      };

    case 'TOGGLE_SMART_FEATURE':
      return {
        ...state,
        smartFeatures: {
          ...state.smartFeatures,
          [action.payload]: !state.smartFeatures[action.payload],
        },
      };

    case 'UPDATE_SMART_SETTINGS':
      return { ...state, ...action.payload };

    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };

    case 'RESET_STATE':
      return { ...initialState };

    default:
      return state;
  }
}

// Context
interface AdaptiveSmartContextType {
  state: AdaptiveSmartState;
  actions: AdaptiveSmartActions;
  deviceInfo: DeviceInfo;
  cognitiveProfile: CognitiveProfile | null;
}

const AdaptiveSmartContext = createContext<AdaptiveSmartContextType | undefined>(undefined);

// Provider component
interface AdaptiveSmartProviderProps {
  children: ReactNode;
}

export function AdaptiveSmartProvider({ children }: AdaptiveSmartProviderProps) {
  const [state, dispatch] = useReducer(adaptiveSmartReducer, initialState);
  const { user } = useAuth();
  const deviceInfo = useMemo(() => detectDevice(), []); // Only detect device once
  const [cognitiveProfile, setCognitiveProfile] = useState<CognitiveProfile | null>(null);

  // Load cognitive profile on mount
  useEffect(() => {
    const loadCognitiveProfile = async () => {
      if (user) {
        try {
          const profile = await getCognitiveProfile(user.id);
          setCognitiveProfile(profile);
        } catch (error) {
          console.warn('Could not load cognitive profile:', error);
        }
      }
    };

    loadCognitiveProfile();
  }, [user]);

  // Activity logging helper
  const logActivity = useCallback(async (activity: Omit<UserActivity, 'id' | 'userId' | 'timestamp' | 'device'>) => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const newActivity: UserActivity = {
        ...activity,
        id: crypto.randomUUID(),
        userId: user.id,
        timestamp: new Date(),
        device: deviceInfo,
      };

      // Add to local state immediately
      dispatch({ type: 'ADD_ACTIVITY', payload: newActivity });

      // Update last active location if it's a navigation
      if (activity.action === 'navigation') {
        dispatch({
          type: 'SET_LAST_ACTIVE_LOCATION',
          payload: {
            path: activity.path,
            timestamp: new Date(),
            context: activity.context.page,
          },
        });
      }

      // Sync to server
      await adaptiveSmartAPI.logActivity(newActivity);
      dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to log activity' });
      console.error('Activity logging error:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, deviceInfo]);

  // Update current activity
  const updateCurrentActivity = (updates: Partial<UserActivity>) => {
    if (state.currentActivity) {
      const updatedActivity = { ...state.currentActivity, ...updates };
      dispatch({ type: 'SET_CURRENT_ACTIVITY', payload: updatedActivity });
    }
  };

  // Jump to last activity location
  const jumpToLastActivity = async () => {
    if (state.lastActiveLocation) {
      // This would integrate with your router
      window.location.hash = state.lastActiveLocation.path;
      
      // Log this as a recall activity
      await logActivity({
        path: state.lastActiveLocation.path,
        action: 'navigation',
        context: {
          page: state.lastActiveLocation.context,
          component: 'ActivityRecall',
          metadata: { recallAction: true },
        },
      });
    }
  };

  // Get activity summary
  const getActivitySummary = (timeRange: 'day' | 'week' | 'month' = 'day') => {
    const now = new Date();
    const startTime = new Date();
    
    switch (timeRange) {
      case 'day':
        startTime.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startTime.setDate(now.getDate() - 7);
        break;
      case 'month':
        startTime.setMonth(now.getMonth() - 1);
        break;
    }

    const relevantActivities = state.activityHistory.filter(
      activity => activity.timestamp >= startTime
    );

    // Group activities into sessions (activities within 30 minutes of each other)
    const sessions: any[] = []; // Simplified for now
    // Implementation would group activities and calculate metrics

    return sessions;
  };

  // Suggestion management
  const fetchSuggestions = async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const suggestions = await adaptiveSmartAPI.getSuggestions(user.id, {
        neurotype: cognitiveProfile?.neurotype,
        recentActivities: state.activityHistory.slice(0, 10),
      });
      
      dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch suggestions' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const acceptSuggestion = async (suggestionId: string, actionId?: string) => {
    try {
      await adaptiveSmartAPI.updateSuggestion(suggestionId, { 
        status: 'accepted',
        metadata: { actionId, acceptedAt: new Date() }
      });
      
      dispatch({ 
        type: 'UPDATE_SUGGESTION', 
        payload: { id: suggestionId, updates: { status: 'accepted' } }
      });

      // Log this as an activity
      await logActivity({
        path: window.location.pathname,
        action: 'interaction',
        context: {
          page: 'suggestions',
          component: 'SuggestionCard',
          metadata: { suggestionId, actionId, action: 'accept' },
        },
      });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to accept suggestion' });
    }
  };

  const snoozeSuggestion = async (suggestionId: string, duration: number = 3600000) => {
    try {
      const snoozeUntil = new Date(Date.now() + duration);
      
      await adaptiveSmartAPI.updateSuggestion(suggestionId, { 
        status: 'snoozed',
        metadata: { snoozeUntil }
      });
      
      dispatch({ 
        type: 'UPDATE_SUGGESTION', 
        payload: { id: suggestionId, updates: { status: 'snoozed' } }
      });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to snooze suggestion' });
    }
  };

  const dismissSuggestion = async (suggestionId: string, reason?: string) => {
    try {
      await adaptiveSmartAPI.updateSuggestion(suggestionId, { 
        status: 'dismissed',
        metadata: { reason, dismissedAt: new Date() }
      });
      
      dispatch({ type: 'REMOVE_SUGGESTION', payload: suggestionId });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to dismiss suggestion' });
    }
  };

  const updateSuggestionSettings = (settings: Partial<AdaptiveSmartState['suggestionSettings']>) => {
    dispatch({ type: 'UPDATE_SUGGESTION_SETTINGS', payload: settings });
    // Persist to local storage
    localStorage.setItem('adaptiveSmart_suggestionSettings', JSON.stringify({
      ...state.suggestionSettings,
      ...settings,
    }));
  };

  // Quick Entry management
  const createQuickEntry = async (entry: Omit<QuickEntry, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;

    try {
      const newEntry: QuickEntry = {
        ...entry,
        id: crypto.randomUUID(),
        userId: user.id,
        createdAt: new Date(),
      };

      dispatch({ type: 'ADD_QUICK_ENTRY', payload: newEntry });
      
      // Auto-process if enabled
      if (state.quickEntrySettings.autoProcessing) {
        await processQuickEntry(newEntry.id);
      }

      await adaptiveSmartAPI.createQuickEntry(newEntry);

      // Log this activity
      await logActivity({
        path: window.location.pathname,
        action: 'creation',
        context: {
          page: 'quickEntry',
          component: 'QuickEntryForm',
          metadata: { entryType: entry.type, hasContent: !!entry.content },
        },
      });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create quick entry' });
    }
  };

  const processQuickEntry = async (entryId: string) => {
    try {
      const processedData = await adaptiveSmartAPI.processQuickEntry(entryId);
      
      dispatch({
        type: 'UPDATE_QUICK_ENTRY',
        payload: {
          id: entryId,
          updates: {
            processing: { ...processedData, status: 'processed' },
            processedAt: new Date(),
          },
        },
      });

    } catch (error) {
      dispatch({
        type: 'UPDATE_QUICK_ENTRY',
        payload: {
          id: entryId,
          updates: { processing: { status: 'failed' } },
        },
      });
    }
  };

  const deleteQuickEntry = async (entryId: string) => {
    try {
      await adaptiveSmartAPI.deleteQuickEntry(entryId);
      dispatch({ type: 'REMOVE_QUICK_ENTRY', payload: entryId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete quick entry' });
    }
  };

  const searchQuickEntries = (query: string): QuickEntry[] => {
    const normalizedQuery = query.toLowerCase();
    return state.quickEntries.filter(entry => {
      const searchText = [
        entry.content.text || '',
        entry.content.transcript || '',
        ...(entry.context.tags || []),
        entry.processing.extractedData?.intent || '',
        ...(entry.processing.extractedData?.entities || []),
      ].join(' ').toLowerCase();
      
      return searchText.includes(normalizedQuery);
    });
  };

  // Smart feature management
  const toggleSmartFeature = (feature: keyof AdaptiveSmartState['smartFeatures']) => {
    dispatch({ type: 'TOGGLE_SMART_FEATURE', payload: feature });
    
    // Persist to local storage
    const updatedFeatures = {
      ...state.smartFeatures,
      [feature]: !state.smartFeatures[feature],
    };
    localStorage.setItem('adaptiveSmart_smartFeatures', JSON.stringify(updatedFeatures));
  };

  const updateSmartSettings = (settings: Partial<AdaptiveSmartState>) => {
    dispatch({ type: 'UPDATE_SMART_SETTINGS', payload: settings });
  };

  // Sync and data management
  const syncWithServer = async () => {
    if (!user) return;

    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'syncing' });
    
    try {
      // Sync activities, suggestions, and quick entries
      const [activities, suggestions, quickEntries] = await Promise.all([
        adaptiveSmartAPI.getActivities(user.id),
        adaptiveSmartAPI.getSuggestions(user.id, { neurotype: cognitiveProfile?.neurotype }),
        adaptiveSmartAPI.getQuickEntries(user.id),
      ]);

      dispatch({ type: 'UPDATE_ACTIVITY_HISTORY', payload: activities });
      dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
      dispatch({ type: 'SET_QUICK_ENTRIES', payload: quickEntries });
      dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'online' });

    } catch (error) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'offline' });
      dispatch({ type: 'SET_ERROR', payload: 'Sync failed' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const exportData = async (): Promise<Blob> => {
    const exportData = {
      activities: state.activityHistory,
      suggestions: state.suggestions,
      quickEntries: state.quickEntries,
      settings: {
        suggestionSettings: state.suggestionSettings,
        quickEntrySettings: state.quickEntrySettings,
        smartFeatures: state.smartFeatures,
      },
      exportedAt: new Date(),
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      // Validate and merge data
      if (importedData.activities) {
        dispatch({ type: 'UPDATE_ACTIVITY_HISTORY', payload: importedData.activities });
      }
      if (importedData.settings) {
        if (importedData.settings.suggestionSettings) {
          dispatch({ type: 'UPDATE_SUGGESTION_SETTINGS', payload: importedData.settings.suggestionSettings });
        }
        if (importedData.settings.smartFeatures) {
          dispatch({ type: 'UPDATE_SMART_SETTINGS', payload: { smartFeatures: importedData.settings.smartFeatures } });
        }
      }

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to import data' });
    }
  };

  // Actions object - memoized to prevent infinite loops
  const actions: AdaptiveSmartActions = useMemo(() => ({
    logActivity,
    updateCurrentActivity,
    jumpToLastActivity,
    getActivitySummary,
    fetchSuggestions,
    acceptSuggestion,
    snoozeSuggestion,
    dismissSuggestion,
    updateSuggestionSettings,
    createQuickEntry,
    processQuickEntry,
    deleteQuickEntry,
    searchQuickEntries,
    toggleSmartFeature,
    updateSmartSettings,
    syncWithServer,
    clearError,
    exportData,
    importData,
  }), [
    logActivity,
    updateCurrentActivity,
    jumpToLastActivity,
    getActivitySummary,
    fetchSuggestions,
    acceptSuggestion,
    snoozeSuggestion,
    dismissSuggestion,
    updateSuggestionSettings,
    createQuickEntry,
    processQuickEntry,
    deleteQuickEntry,
    searchQuickEntries,
    toggleSmartFeature,
    updateSmartSettings,
    syncWithServer,
    clearError,
    exportData,
    importData,
  ]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSuggestionSettings = localStorage.getItem('adaptiveSmart_suggestionSettings');
    if (savedSuggestionSettings) {
      try {
        const settings = JSON.parse(savedSuggestionSettings);
        dispatch({ type: 'UPDATE_SUGGESTION_SETTINGS', payload: settings });
      } catch (error) {
        console.warn('Failed to load suggestion settings:', error);
      }
    }

    const savedSmartFeatures = localStorage.getItem('adaptiveSmart_smartFeatures');
    if (savedSmartFeatures) {
      try {
        const features = JSON.parse(savedSmartFeatures);
        dispatch({ type: 'UPDATE_SMART_SETTINGS', payload: { smartFeatures: features } });
      } catch (error) {
        console.warn('Failed to load smart features:', error);
      }
    }
  }, []);

  // Auto-sync on mount and periodically
  useEffect(() => {
    if (user && state.smartFeatures.contextAwareness) {
      syncWithServer();
      
      // Set up periodic sync (every 5 minutes)
      const interval = setInterval(syncWithServer, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, state.smartFeatures.contextAwareness]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'online' });
    const handleOffline = () => dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'offline' });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const contextValue: AdaptiveSmartContextType = {
    state,
    actions,
    deviceInfo,
    cognitiveProfile,
  };

  return (
    <AdaptiveSmartContext.Provider value={contextValue}>
      {children}
    </AdaptiveSmartContext.Provider>
  );
}

// Hook for using the context
export function useAdaptiveSmart() {
  const context = useContext(AdaptiveSmartContext);
  if (context === undefined) {
    throw new Error('useAdaptiveSmart must be used within an AdaptiveSmartProvider');
  }
  return context;
}

export { AdaptiveSmartContext };