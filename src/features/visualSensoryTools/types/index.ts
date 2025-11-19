// Visual & Sensory Tools Module Types

export interface RoutineStep {
  id: string;
  title: string;
  description?: string;
  iconUrl?: string;
  imageUrl?: string;
  duration?: number; // in minutes
  order: number;
  isCompleted: boolean;
  completedAt?: Date;
  tags?: string[];
  accessibility?: {
    altText?: string;
    highContrast?: boolean;
    largeText?: boolean;
  };
}

export interface VisualRoutine {
  id: string;
  userId: string;
  title: string;
  description?: string;
  steps: RoutineStep[];
  isActive: boolean;
  category: 'morning' | 'work' | 'evening' | 'custom';
  createdAt: Date;
  updatedAt: Date;
  preferences: {
    showIcons: boolean;
    showImages: boolean;
    autoAdvance: boolean;
    timeReminders: boolean;
  };
}

export interface MoodEntry {
  id: string;
  userId: string;
  timestamp: Date;
  mood: number; // 1-10 scale
  energy: number; // 1-10 scale
  focus: number; // 1-10 scale
  emoji?: string;
  notes?: string;
  tags?: string[];
  triggers?: string[];
  energyFactors?: string[];
  context?: {
    location?: string;
    activity?: string;
    weather?: string;
  };
}

export interface SensoryPreferences {
  id: string;
  userId: string;
  timestamp: Date;
  preferences: {
    soundLevel: number; // 1-10 scale
    lightLevel: number; // 1-10 scale
    temperature: number; // 1-10 scale
    crowdLevel: number; // 1-10 scale
    textureComfort: number; // 1-10 scale
  };
  currentState: {
    isOverstimulated: boolean;
    needsBreak: boolean;
    isInFlow: boolean;
    stressLevel: number; // 1-10 scale
  };
  accommodations: {
    noiseCancel: boolean;
    dimLights: boolean;
    fidgetTools: boolean;
    quietSpace: boolean;
    breakReminders: boolean;
  };
  updatedAt: Date;
}

export interface VisualSensoryState {
  routines: VisualRoutine[];
  activeRoutine: VisualRoutine | null;
  moodEntries: MoodEntry[];
  currentMood: MoodEntry | null;
  sensoryPreferences: SensoryPreferences | null;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
  offlineQueue: Array<{
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: 'routine' | 'mood' | 'sensory';
    data: any;
    timestamp: Date;
  }>;
}

export interface VisualSensoryActions {
  // Routine Management
  createRoutine: (routine: Omit<VisualRoutine, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRoutine: (id: string, updates: Partial<VisualRoutine>) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  setActiveRoutine: (id: string | null) => void;
  reorderRoutineSteps: (routineId: string, stepIds: string[]) => Promise<void>;
  toggleStepCompletion: (routineId: string, stepId: string) => Promise<void>;
  
  // Mood Tracking
  addMoodEntry: (entry: Omit<MoodEntry, 'id' | 'userId' | 'timestamp'>) => Promise<void>;
  updateMoodEntry: (id: string, updates: Partial<MoodEntry>) => Promise<void>;
  deleteMoodEntry: (id: string) => Promise<void>;
  getMoodTrends: (days: number) => MoodEntry[];
  
  // Sensory Preferences
  updateSensoryPreferences: (preferences: Omit<SensoryPreferences, 'id' | 'userId' | 'timestamp' | 'updatedAt'>) => Promise<void>;
  getSensoryRecommendations: () => string[];
  checkOverstimulation: () => boolean;
  
  // Data Management
  syncWithServer: () => Promise<void>;
  loadFromCache: () => void;
  clearError: () => void;
  exportData: () => Promise<Blob>;
  importData: (file: File) => Promise<void>;
}

export interface DragAndDropResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  } | null;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  colorBlindSupport: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
}

export interface ChartData {
  date: string;
  mood: number;
  energy: number;
  focus: number;
  average?: number;
}

export interface SensoryAlert {
  id: string;
  type: 'warning' | 'suggestion' | 'reminder';
  title: string;
  message: string;
  action?: {
    label: string;
    callback: () => void;
  };
  timestamp: Date;
  dismissed: boolean;
}
