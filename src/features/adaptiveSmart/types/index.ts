// Adaptive & Smart Functions - TypeScript Interfaces

export interface UserActivity {
  id: string;
  userId: string;
  timestamp: Date;
  // Optional linkage to an entity (task, routine, etc.)
  entityId?: string;
  entityType?: string;
  // Duration in minutes when applicable
  durationMinutes?: number;
  path: string;
  action: 'navigation' | 'interaction' | 'completion' | 'creation';
  context: {
    page: string;
    component?: string;
    duration?: number; // time spent in seconds
    metadata?: Record<string, any>;
  };
  device: {
    type: 'desktop' | 'tablet' | 'mobile';
    screenSize: string;
    browser: string;
  };
}

export interface ActivitySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  activities: UserActivity[];
  summary: {
    totalDuration: number;
    pagesVisited: number;
    actionsPerformed: number;
    productivityScore?: number;
  };
}

export interface SmartSuggestion {
  id: string;
  userId: string;
  type: 'reminder' | 'break' | 'task' | 'routine' | 'mood-check' | 'optimization';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number; // 0-100
  context: {
    basedOn: string[]; // what triggered this suggestion
    relatedActivities?: UserActivity[];
    neurotype?: 'adhd' | 'autism' | 'dyslexia' | 'general';
  };
  actions: SuggestionAction[];
  createdAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'accepted' | 'snoozed' | 'dismissed';
  metadata?: Record<string, any>;
}

export interface SuggestionAction {
  id: string;
  label: string;
  type: 'navigate' | 'create' | 'update' | 'external' | 'dismiss';
  payload?: any;
  style?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export interface QuickEntry {
  id: string;
  userId: string;
  type: 'text' | 'voice' | 'image' | 'link';
  content: {
    text?: string;
    transcript?: string;
    imageUrl?: string;
    fileName?: string;
    fileSize?: number;
    url?: string;
  };
  context: {
    source: string; // which page/component it was created from
    tags?: string[];
    relatedEntity?: {
      type: 'task' | 'routine' | 'mood' | 'note';
      id: string;
    };
  };
  processing: {
    status: 'pending' | 'processed' | 'failed';
    extractedData?: {
      intent?: string;
      entities?: string[];
      sentiment?: 'positive' | 'neutral' | 'negative';
      category?: string;
    };
  };
  createdAt: Date;
  processedAt?: Date;
}

export interface AdaptiveSmartState {
  // Activity Tracking
  currentActivity: UserActivity | null;
  activityHistory: UserActivity[];
  currentSession: ActivitySession | null;
  lastActiveLocation: {
    path: string;
    timestamp: Date;
    context: string;
  } | null;

  // Suggestions
  suggestions: SmartSuggestion[];
  suggestionSettings: {
    enabled: boolean;
    frequency: 'minimal' | 'normal' | 'frequent';
    types: string[]; // which suggestion types are enabled
    neurotypeOptimization: boolean;
  };

  // Quick Entry
  quickEntries: QuickEntry[];
  quickEntrySettings: {
    voiceEnabled: boolean;
    imageEnabled: boolean;
    autoProcessing: boolean;
    defaultTags: string[];
  };

  // Smart Features State
  smartFeatures: {
    activityRecall: boolean;
    dynamicSuggestions: boolean;
    universalInput: boolean;
    contextAwareness: boolean;
    learningMode: boolean;
  };

  // Meta State
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
  connectionStatus: 'online' | 'offline' | 'syncing';
}

export interface AdaptiveSmartActions {
  // Activity Management
  logActivity: (activity: Omit<UserActivity, 'id' | 'userId' | 'timestamp' | 'device'>) => Promise<void>;
  updateCurrentActivity: (updates: Partial<UserActivity>) => void;
  jumpToLastActivity: () => Promise<void>;
  getActivitySummary: (timeRange?: 'day' | 'week' | 'month') => ActivitySession[];

  // Suggestion Management
  fetchSuggestions: () => Promise<void>;
  acceptSuggestion: (suggestionId: string, actionId?: string) => Promise<void>;
  snoozeSuggestion: (suggestionId: string, duration?: number) => Promise<void>;
  dismissSuggestion: (suggestionId: string, reason?: string) => Promise<void>;
  updateSuggestionSettings: (settings: Partial<AdaptiveSmartState['suggestionSettings']>) => void;

  // Quick Entry Management
  createQuickEntry: (entry: Omit<QuickEntry, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  processQuickEntry: (entryId: string) => Promise<void>;
  deleteQuickEntry: (entryId: string) => Promise<void>;
  searchQuickEntries: (query: string) => QuickEntry[];

  // Smart Features
  toggleSmartFeature: (feature: keyof AdaptiveSmartState['smartFeatures']) => void;
  updateSmartSettings: (settings: Partial<AdaptiveSmartState>) => void;

  // Sync and State Management
  syncWithServer: () => Promise<void>;
  clearError: () => void;
  exportData: () => Promise<Blob>;
  importData: (file: File) => Promise<void>;
}

export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  screenSize: string;
  browser: string;
  userAgent: string;
  capabilities: {
    speechRecognition: boolean;
    speechSynthesis: boolean;
    fileUpload: boolean;
    camera: boolean;
    microphone: boolean;
    geolocation: boolean;
  };
}

export interface CognitiveProfile {
  neurotype: 'adhd' | 'autism' | 'dyslexia' | 'general' | 'multiple';
  preferences: {
    visualDensity: 'compact' | 'normal' | 'spacious';
    colorScheme: 'light' | 'dark' | 'high-contrast' | 'auto';
    fontSize: 'small' | 'normal' | 'large' | 'xl';
    animations: 'none' | 'reduced' | 'normal';
    sounds: boolean;
    notifications: 'none' | 'minimal' | 'normal' | 'frequent';
  };
  accommodations: {
    reduceDistraction: boolean;
    simplifyNavigation: boolean;
    provideContext: boolean;
    allowFlexibleTiming: boolean;
    offerAlternativeFormats: boolean;
  };
  triggers: {
    overwhelm: string[];
    confusion: string[];
    frustration: string[];
  };
  strengths: {
    focus: number; // 1-10
    creativity: number;
    attention: number;
    memory: number;
    processing: number;
  };
}

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'suggestion';
  priority: 'low' | 'medium' | 'high';
  persistent: boolean;
  actions?: {
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary';
  }[];
  createdAt: Date;
  dismissedAt?: Date;
}

export interface ActivityPattern {
  id: string;
  pattern: {
    timeOfDay: string[];
    dayOfWeek: string[];
    duration: number;
    frequency: string;
  };
  activities: string[];
  productivity: number;
  mood: number;
  confidence: number;
  suggestions: string[];
}