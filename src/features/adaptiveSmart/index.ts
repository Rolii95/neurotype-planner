// Adaptive & Smart Functions Module
// Comprehensive neurotype-adaptive activity tracking, suggestions, and quick entry system

// Core Components
export { AdaptiveSmartProvider, useAdaptiveSmart } from './components/AdaptiveSmartContext';
export { ActivityRecallBanner } from './components/ActivityRecallBanner';
export { ActivityTracker } from './components/ActivityTracker';
export { ActivityInsights } from './components/ActivityInsights';
export { SuggestionNudge } from './components/SuggestionNudge';
export { SuggestionEngine, useNeuroSuggestionStrategy } from './components/SuggestionEngine';
export { QuickEntryComponent } from './components/QuickEntryComponent';
export { QuickEntryHistory } from './components/QuickEntryHistory';

// Custom Hooks
export { 
  useAdaptiveSmartFeatures,
  useQuickEntry,
  useAdaptiveSuggestions
} from './hooks/useAdaptiveSmart';

// Types
export type {
  UserActivity,
  ActivitySession,
  SmartSuggestion,
  SuggestionAction,
  QuickEntry,
  AdaptiveSmartState,
  AdaptiveSmartActions,
  DeviceInfo,
  CognitiveProfile,
  SmartNotification,
  ActivityPattern
} from './types';

// Services
export { adaptiveSmartAPI } from './services/adaptiveSmartAPI';
export { 
  detectDevice,
  getCognitiveProfile,
  updateCognitiveProfile,
  getDeviceCapabilities,
  getNeuroAdaptations,
  getPerformanceMetrics
} from './services/deviceUtils';