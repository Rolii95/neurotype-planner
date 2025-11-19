// Visual & Sensory Tools Module - Main Export File

// Components
export { RoutineVisualBoard } from './components/RoutineVisualBoard';
export { VisualCard } from './components/VisualCard';
export { MoodEnergyTracker } from './components/MoodEnergyTracker';
export { SensoryComfortWidget } from './components/SensoryComfortWidget';

// Context and Hooks
export { VisualSensoryProvider, useVisualSensory } from './VisualSensoryContext';

// Types
export type {
  RoutineStep,
  VisualRoutine,
  MoodEntry,
  SensoryPreferences,
  VisualSensoryState,
  VisualSensoryActions,
  DragAndDropResult,
  AccessibilitySettings,
  ChartData,
  SensoryAlert
} from './types';

// API
export { visualSensoryAPI } from './api/visualSensoryAPI';

// Re-export for convenience
export * from './types';