import { createContext, useContext, useReducer, useEffect, ReactNode, FC } from 'react';
import { VisualSensoryState, VisualSensoryActions, VisualRoutine, MoodEntry, SensoryPreferences, RoutineStep } from './types';
import { visualSensoryAPI } from './api/visualSensoryAPI';

// Initial state
const initialState: VisualSensoryState = {
  routines: [],
  activeRoutine: null,
  moodEntries: [],
  currentMood: null,
  sensoryPreferences: null,
  isLoading: false,
  error: null,
  lastSync: null,
  offlineQueue: []
};

// Action types
type VisualSensoryAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ROUTINES'; payload: VisualRoutine[] }
  | { type: 'ADD_ROUTINE'; payload: VisualRoutine }
  | { type: 'UPDATE_ROUTINE'; payload: { id: string; updates: Partial<VisualRoutine> } }
  | { type: 'DELETE_ROUTINE'; payload: string }
  | { type: 'SET_ACTIVE_ROUTINE'; payload: VisualRoutine | null }
  | { type: 'SET_MOOD_ENTRIES'; payload: MoodEntry[] }
  | { type: 'ADD_MOOD_ENTRY'; payload: MoodEntry }
  | { type: 'UPDATE_MOOD_ENTRY'; payload: { id: string; updates: Partial<MoodEntry> } }
  | { type: 'DELETE_MOOD_ENTRY'; payload: string }
  | { type: 'SET_CURRENT_MOOD'; payload: MoodEntry | null }
  | { type: 'SET_SENSORY_PREFERENCES'; payload: SensoryPreferences | null }
  | { type: 'SET_LAST_SYNC'; payload: Date }
  | { type: 'ADD_TO_OFFLINE_QUEUE'; payload: any }
  | { type: 'CLEAR_OFFLINE_QUEUE' }
  | { type: 'LOAD_FROM_CACHE'; payload: Partial<VisualSensoryState> };

// Reducer
function visualSensoryReducer(state: VisualSensoryState, action: VisualSensoryAction): VisualSensoryState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_ROUTINES':
      return { ...state, routines: action.payload };
    
    case 'ADD_ROUTINE':
      return { ...state, routines: [...state.routines, action.payload] };
    
    case 'UPDATE_ROUTINE':
      return {
        ...state,
        routines: state.routines.map(routine =>
          routine.id === action.payload.id
            ? { ...routine, ...action.payload.updates, updatedAt: new Date() }
            : routine
        ),
        activeRoutine: state.activeRoutine?.id === action.payload.id
          ? { ...state.activeRoutine, ...action.payload.updates, updatedAt: new Date() }
          : state.activeRoutine
      };
    
    case 'DELETE_ROUTINE':
      return {
        ...state,
        routines: state.routines.filter(routine => routine.id !== action.payload),
        activeRoutine: state.activeRoutine?.id === action.payload ? null : state.activeRoutine
      };
    
    case 'SET_ACTIVE_ROUTINE':
      return { ...state, activeRoutine: action.payload };
    
    case 'SET_MOOD_ENTRIES':
      return { ...state, moodEntries: action.payload };
    
    case 'ADD_MOOD_ENTRY':
      return { 
        ...state, 
        moodEntries: [...state.moodEntries, action.payload],
        currentMood: action.payload
      };
    
    case 'UPDATE_MOOD_ENTRY':
      return {
        ...state,
        moodEntries: state.moodEntries.map(entry =>
          entry.id === action.payload.id
            ? { ...entry, ...action.payload.updates }
            : entry
        ),
        currentMood: state.currentMood?.id === action.payload.id
          ? { ...state.currentMood, ...action.payload.updates }
          : state.currentMood
      };
    
    case 'DELETE_MOOD_ENTRY':
      return {
        ...state,
        moodEntries: state.moodEntries.filter(entry => entry.id !== action.payload),
        currentMood: state.currentMood?.id === action.payload ? null : state.currentMood
      };
    
    case 'SET_CURRENT_MOOD':
      return { ...state, currentMood: action.payload };
    
    case 'SET_SENSORY_PREFERENCES':
      return { ...state, sensoryPreferences: action.payload };
    
    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };
    
    case 'ADD_TO_OFFLINE_QUEUE':
      return { ...state, offlineQueue: [...state.offlineQueue, action.payload] };
    
    case 'CLEAR_OFFLINE_QUEUE':
      return { ...state, offlineQueue: [] };
    
    case 'LOAD_FROM_CACHE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

// Context
const VisualSensoryContext = createContext<
  (VisualSensoryState & VisualSensoryActions) | undefined
>(undefined);

// Provider component
interface VisualSensoryProviderProps {
  children: ReactNode;
}

export const VisualSensoryProvider: FC<VisualSensoryProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(visualSensoryReducer, initialState);

  // Load cached data on mount
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const cached = localStorage.getItem('visualSensoryTools');
        if (cached) {
          const data = JSON.parse(cached);
          dispatch({ type: 'LOAD_FROM_CACHE', payload: data });
        }
      } catch (error) {
        console.error('Failed to load from cache:', error);
      }
    };
    
    loadFromCache();
  }, []);

  // Cache state changes
  useEffect(() => {
    if (state.lastSync) {
      localStorage.setItem('visualSensoryTools', JSON.stringify({
        routines: state.routines,
        moodEntries: state.moodEntries,
        sensoryPreferences: state.sensoryPreferences,
        lastSync: state.lastSync
      }));
    }
  }, [state.routines, state.moodEntries, state.sensoryPreferences, state.lastSync]);

  // Actions implementation
  const actions: VisualSensoryActions = {
    // Routine Management
    createRoutine: async (routineData) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const newRoutine: VisualRoutine = {
          ...routineData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Try to save to server
        try {
          await visualSensoryAPI.createRoutine(newRoutine);
          dispatch({ type: 'ADD_ROUTINE', payload: newRoutine });
        } catch (error) {
          // Add to offline queue
          dispatch({ 
            type: 'ADD_TO_OFFLINE_QUEUE', 
            payload: { 
              type: 'CREATE', 
              entity: 'routine', 
              data: newRoutine, 
              timestamp: new Date() 
            }
          });
          dispatch({ type: 'ADD_ROUTINE', payload: newRoutine });
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    updateRoutine: async (id, updates) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        try {
          await visualSensoryAPI.updateRoutine(id, updates);
          dispatch({ type: 'UPDATE_ROUTINE', payload: { id, updates } });
        } catch (error) {
          // Add to offline queue
          dispatch({ 
            type: 'ADD_TO_OFFLINE_QUEUE', 
            payload: { 
              type: 'UPDATE', 
              entity: 'routine', 
              data: { id, updates }, 
              timestamp: new Date() 
            }
          });
          dispatch({ type: 'UPDATE_ROUTINE', payload: { id, updates } });
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    deleteRoutine: async (id) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        try {
          await visualSensoryAPI.deleteRoutine(id);
          dispatch({ type: 'DELETE_ROUTINE', payload: id });
        } catch (error) {
          dispatch({ 
            type: 'ADD_TO_OFFLINE_QUEUE', 
            payload: { 
              type: 'DELETE', 
              entity: 'routine', 
              data: { id }, 
              timestamp: new Date() 
            }
          });
          dispatch({ type: 'DELETE_ROUTINE', payload: id });
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    setActiveRoutine: (id) => {
      const routine = id ? state.routines.find(r => r.id === id) || null : null;
      dispatch({ type: 'SET_ACTIVE_ROUTINE', payload: routine });
    },

    reorderRoutineSteps: async (routineId, stepIds) => {
      const routine = state.routines.find(r => r.id === routineId);
      if (!routine) return;

      const reorderedSteps = stepIds.map((stepId, index) => {
        const step = routine.steps.find(s => s.id === stepId);
        return step ? { ...step, order: index } : null;
      }).filter(Boolean) as RoutineStep[];

      await actions.updateRoutine(routineId, { steps: reorderedSteps });
    },

    toggleStepCompletion: async (routineId, stepId) => {
      const routine = state.routines.find(r => r.id === routineId);
      if (!routine) return;

      const updatedSteps = routine.steps.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              isCompleted: !step.isCompleted,
              completedAt: !step.isCompleted ? new Date() : undefined
            }
          : step
      );

      await actions.updateRoutine(routineId, { steps: updatedSteps });
    },

    // Mood Tracking
    addMoodEntry: async (entryData) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const newEntry: MoodEntry = {
          ...entryData,
          id: crypto.randomUUID(),
          userId: 'current-user', // Get from auth context
          timestamp: new Date()
        };

        try {
          await visualSensoryAPI.createMoodEntry(newEntry);
          dispatch({ type: 'ADD_MOOD_ENTRY', payload: newEntry });
        } catch (error) {
          dispatch({ 
            type: 'ADD_TO_OFFLINE_QUEUE', 
            payload: { 
              type: 'CREATE', 
              entity: 'mood', 
              data: newEntry, 
              timestamp: new Date() 
            }
          });
          dispatch({ type: 'ADD_MOOD_ENTRY', payload: newEntry });
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    updateMoodEntry: async (id, updates) => {
      try {
        await visualSensoryAPI.updateMoodEntry(id, updates);
        dispatch({ type: 'UPDATE_MOOD_ENTRY', payload: { id, updates } });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      }
    },

    deleteMoodEntry: async (id) => {
      try {
        await visualSensoryAPI.deleteMoodEntry(id);
        dispatch({ type: 'DELETE_MOOD_ENTRY', payload: id });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      }
    },

    getMoodTrends: (days) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return state.moodEntries
        .filter(entry => entry.timestamp >= cutoffDate)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    },

    // Sensory Preferences
    updateSensoryPreferences: async (preferencesData) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const preferences: SensoryPreferences = {
          ...preferencesData,
          id: state.sensoryPreferences?.id || crypto.randomUUID(),
          userId: 'current-user',
          timestamp: new Date(),
          updatedAt: new Date()
        };

        try {
          await visualSensoryAPI.updateSensoryPreferences(preferences);
          dispatch({ type: 'SET_SENSORY_PREFERENCES', payload: preferences });
        } catch (error) {
          dispatch({ 
            type: 'ADD_TO_OFFLINE_QUEUE', 
            payload: { 
              type: 'UPDATE', 
              entity: 'sensory', 
              data: preferences, 
              timestamp: new Date() 
            }
          });
          dispatch({ type: 'SET_SENSORY_PREFERENCES', payload: preferences });
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    getSensoryRecommendations: () => {
      const prefs = state.sensoryPreferences;
      if (!prefs) return [];

      const recommendations: string[] = [];
      
      if (prefs.currentState.isOverstimulated) {
        recommendations.push('Consider taking a break in a quiet space');
        if (prefs.accommodations.noiseCancel) {
          recommendations.push('Try using noise-canceling headphones');
        }
      }
      
      if (prefs.currentState.stressLevel > 7) {
        recommendations.push('Practice deep breathing exercises');
        recommendations.push('Take a 5-minute walk if possible');
      }
      
      if (prefs.preferences.lightLevel < 3) {
        recommendations.push('Consider dimming bright lights');
      }

      return recommendations;
    },

    checkOverstimulation: () => {
      const prefs = state.sensoryPreferences;
      if (!prefs) return false;

      const { preferences, currentState } = prefs;
      
      // Check if sensory inputs are beyond comfort levels
      const isOverstimulated = 
        preferences.soundLevel > 8 ||
        preferences.lightLevel > 8 ||
        preferences.crowdLevel > 7 ||
        currentState.stressLevel > 7;

      return isOverstimulated;
    },

    // Data Management
    syncWithServer: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Process offline queue
        for (const queueItem of state.offlineQueue) {
          try {
            switch (queueItem.entity) {
              case 'routine':
                if (queueItem.type === 'CREATE') {
                  await visualSensoryAPI.createRoutine(queueItem.data);
                } else if (queueItem.type === 'UPDATE') {
                  await visualSensoryAPI.updateRoutine(queueItem.data.id, queueItem.data.updates);
                } else if (queueItem.type === 'DELETE') {
                  await visualSensoryAPI.deleteRoutine(queueItem.data.id);
                }
                break;
              case 'mood':
                if (queueItem.type === 'CREATE') {
                  await visualSensoryAPI.createMoodEntry(queueItem.data);
                }
                break;
              case 'sensory':
                if (queueItem.type === 'UPDATE') {
                  await visualSensoryAPI.updateSensoryPreferences(queueItem.data);
                }
                break;
            }
          } catch (error) {
            console.error('Failed to sync item:', queueItem, error);
          }
        }

        // Clear queue after successful sync
        dispatch({ type: 'CLEAR_OFFLINE_QUEUE' });
        
        // Fetch latest data
        const [routines, moodEntries, sensoryPreferences] = await Promise.all([
          visualSensoryAPI.getRoutines(),
          visualSensoryAPI.getMoodEntries(),
          visualSensoryAPI.getSensoryPreferences()
        ]);

        dispatch({ type: 'SET_ROUTINES', payload: routines });
        dispatch({ type: 'SET_MOOD_ENTRIES', payload: moodEntries });
        dispatch({ type: 'SET_SENSORY_PREFERENCES', payload: sensoryPreferences });
        dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
        
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to sync with server' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    loadFromCache: () => {
      try {
        const cached = localStorage.getItem('visualSensoryTools');
        if (cached) {
          const data = JSON.parse(cached);
          dispatch({ type: 'LOAD_FROM_CACHE', payload: data });
        }
      } catch (error) {
        console.error('Failed to load from cache:', error);
      }
    },

    clearError: () => {
      dispatch({ type: 'SET_ERROR', payload: null });
    },

    exportData: async () => {
      const exportData = {
        routines: state.routines,
        moodEntries: state.moodEntries,
        sensoryPreferences: state.sensoryPreferences,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      return blob;
    },

    importData: async (file) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.routines) {
          dispatch({ type: 'SET_ROUTINES', payload: data.routines });
        }
        if (data.moodEntries) {
          dispatch({ type: 'SET_MOOD_ENTRIES', payload: data.moodEntries });
        }
        if (data.sensoryPreferences) {
          dispatch({ type: 'SET_SENSORY_PREFERENCES', payload: data.sensoryPreferences });
        }
        
        // Trigger sync to server
        await actions.syncWithServer();
        
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to import data' });
      }
    }
  };

  return (
    <VisualSensoryContext.Provider value={{ ...state, ...actions }}>
      {children}
    </VisualSensoryContext.Provider>
  );
};

// Hook to use the context
export const useVisualSensory = () => {
  const context = useContext(VisualSensoryContext);
  if (context === undefined) {
    throw new Error('useVisualSensory must be used within a VisualSensoryProvider');
  }
  return context;
};