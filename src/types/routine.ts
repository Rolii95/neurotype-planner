// Enhanced Routine Types with Flex Zone & Transition Support

export type RoutineStepType = 'routine' | 'flexZone' | 'note' | 'medication' | 'health';

export type TransitionCueType = 'text' | 'audio' | 'visual' | 'mixed';

export type FreeformDataType = 'note' | 'sketch';

export interface FreeformData {
  type: FreeformDataType;
  content: any; // Rich text JSON or canvas data
  lastModified?: string;
  autoSaved?: boolean;
}

export interface TransitionCue {
  type: TransitionCueType;
  text?: string; // Text for visual cue
  audioUrl?: string; // URL for audio file
  visualUrl?: string; // URL for GIF, image, or video
  duration?: number; // Auto-dismiss duration in seconds (optional)
  isRequired?: boolean; // Whether user must acknowledge before proceeding
}

export interface RoutineAnchorStep {
  title: string;
  description?: string;
  duration: number;
  type?: RoutineStepType;
  transitionCue?: TransitionCue;
  visualCues?: {
    color?: string;
    icon?: string;
    emoji?: string;
  };
  neurotypeNotes?: string;
  extensions?: RoutineStepExtensions;
}

export interface RoutineAnchor {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  tags?: string[];
  estimatedDuration: number;
  steps: RoutineAnchorStep[];
  benefits?: string[];
  isCustom?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TimerSettings {
  autoStart?: boolean;
  showWarningAt?: number; // minutes before end to show warning
  endNotification?: {
    type: 'visual' | 'audio' | 'vibration' | 'all';
    intensity: 'subtle' | 'normal' | 'prominent';
  };
  allowOverrun?: boolean; // Can timer continue past duration
}

export interface RoutineStep {
  stepId: string;
  type: RoutineStepType;
  title: string;
  description?: string;
  duration: number; // minutes
  order: number;
  
  // Transition Support Properties
  transitionCue?: TransitionCue;
  
  // Flex Zone Specific Properties
  freeformData?: FreeformData;
  timerSettings?: TimerSettings;
  isFlexible?: boolean; // Can duration be adjusted during execution
  
  // Visual and Accessibility Support
  visualCues?: {
    color?: string;
    icon?: string;
    emoji?: string;
    backgroundColor?: string;
    borderColor?: string;
  };
  extensions?: RoutineStepExtensions;
  
  // Neurotype Adaptations
  neurotypeAdaptations?: {
    adhd?: {
      shortBreakReminders?: boolean;
      hyperFocusWarning?: boolean;
      timeAwareness?: 'high' | 'medium' | 'low';
    };
    autism?: {
      sensoryConsiderations?: string;
      changeWarnings?: boolean;
      routineRigidity?: 'flexible' | 'structured' | 'strict';
    };
    dyslexia?: {
      textSimplification?: boolean;
      visualPreference?: boolean;
      audioSupport?: boolean;
    };
  };
  
  // Execution State (runtime)
  executionState?: {
    status: 'pending' | 'active' | 'paused' | 'completed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    actualDuration?: number;
    notes?: string;
  };
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
  version?: number; // For optimistic updates and conflict resolution
}

export interface RoutineStepExtensions {
  medication?: {
    regimenId: string;
    doseId?: string;
    requiresFood?: boolean;
    prepTips?: string;
    aiCoachSummary?: string;
  };
  health?: {
    focus: 'nutrition' | 'movement' | 'regulation' | 'hydration';
    entryType?: 'meal' | 'snack' | 'drink' | 'supplement';
    sensoryTags?: string[];
    energyTarget?: 'boost' | 'stabilize' | 'wind-down';
    aiPrompt?: string;
  };
}

export interface RoutineExecution {
  id: string;
  routineId: string;
  userId: string;
  
  // Execution tracking
  startedAt: string;
  completedAt?: string;
  currentStepId?: string;
  totalDuration?: number;
  
  // Step execution details
  stepExecutions: StepExecution[];
  
  // Interruptions and pauses
  interruptions?: Interruption[];
  
  // Flexibility tracking
  modifications?: RoutineModification[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface StepExecution {
  stepId: string;
  startedAt: string;
  completedAt?: string;
  actualDuration?: number;
  status: 'completed' | 'skipped' | 'modified';
  
  // Flex zone specific
  freeformDataSnapshot?: FreeformData;
  timerOverrun?: number; // minutes past planned duration
  
  // User feedback
  difficultyRating?: number; // 1-5
  satisfactionRating?: number; // 1-5
  notes?: string;
}

export interface Interruption {
  id: string;
  type: 'external' | 'internal' | 'planned';
  description?: string;
  startedAt: string;
  endedAt?: string;
  impact: 'minor' | 'moderate' | 'major';
}

export interface RoutineModification {
  id: string;
  type: 'step_added' | 'step_removed' | 'step_modified' | 'order_changed' | 'duration_adjusted';
  description: string;
  appliedAt: string;
  originalValue?: any;
  newValue?: any;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'morning' | 'evening' | 'work' | 'self-care' | 'exercise' | 'custom';
  steps: Omit<RoutineStep, 'stepId' | 'createdAt' | 'updatedAt' | 'executionState'>[];
  estimatedDuration: number;
  
  // Template metadata
  isPublic?: boolean;
  authorId?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  neurotypeOptimized?: string[]; // ['adhd', 'autism', 'dyslexia']
  
  // Usage statistics
  usageCount?: number;
  rating?: number;
  
  createdAt: string;
  updatedAt: string;
}

// Validation and constraints
export interface RoutineValidationRule {
  id: string;
  type: 'sequence' | 'duration' | 'flexibility' | 'transition';
  description: string;
  isRequired: boolean;
  validate: (steps: RoutineStep[]) => { isValid: boolean; errors: string[] };
}

// Enhanced Routine interface extending the original
export interface EnhancedRoutine {
  id: string;
  userId: string;
  title: string;
  description?: string;
  
  // Enhanced step structure
  steps: RoutineStep[];
  totalDuration: number; // Calculated from steps
  flexibilityScore: number; // 0-1, based on flex zones and flexible steps
  
  // Execution preferences
  allowDynamicReordering: boolean;
  pausesBetweenSteps: number; // seconds
  transitionStyle: 'immediate' | 'gentle' | 'structured';
  
  // Schedule and automation
  schedule: {
    isScheduled: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    timeOfDay?: string;
    timezone?: string;
    autoStart?: boolean;
  };
  
  // Visual board configuration
  visualBoard?: {
    layout: 'linear' | 'grid' | 'kanban' | 'timeline';
    theme: string;
    showProgress: boolean;
    showTimers: boolean;
    highlightTransitions: boolean;
  };
  
  // Analytics and insights
  analytics?: {
    completionRate: number;
    averageDuration: number;
    mostSkippedSteps: string[];
    userSatisfaction: number;
    lastExecuted?: string;
    totalExecutions: number;
  };
  
  // Metadata
  isActive: boolean;
  isTemplate: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Drag and Drop types for routine builder
export interface DragDropResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  };
  mode: 'FLUID' | 'SNAP';
}

export interface RoutineBuilderState {
  routine: EnhancedRoutine;
  isDragging: boolean;
  draggedStepId?: string;
  isModified: boolean;
  validationErrors: string[];
  lastSaved?: string;
}
