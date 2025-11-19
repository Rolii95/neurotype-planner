// Core Application Types

// Re-export matrix types
export type { MatrixQuadrant, MatrixQuadrantId } from './matrix';
import type { MatrixQuadrantId } from './matrix';

// Re-export enhanced routine types
export type {
  RoutineStepType,
  TransitionCueType,
  FreeformDataType,
  FreeformData,
  TransitionCue,
  TimerSettings,
  RoutineStep,
  RoutineExecution,
  StepExecution,
  Interruption,
  RoutineModification,
  RoutineTemplate,
  RoutineValidationRule,
  EnhancedRoutine,
  DragDropResult,
  RoutineBuilderState
} from './routine';

// Import for internal use
import type { RoutineStep } from './routine';

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  displayName?: string;
  neurotype?: string;
  ageGroup?: string;
  preferences?: Record<string, any>;
  createdAt: Date;
  lastActiveAt: Date;
}

// Task Management Types
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'not-started' | 'in-progress' | 'blocked' | 'completed' | 'cancelled' | 'deferred';
export type TaskCategory = 'work' | 'personal' | 'health' | 'learning' | 'social' | 'creative' | 'maintenance';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type FocusLevel = 'low' | 'medium' | 'high' | 'deep';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  category?: TaskCategory;
  
  // Time management
  estimated_duration?: number; // in minutes
  actual_duration?: number;
  scheduled_at?: string;
  due_date?: string;
  buffer_time?: number;
  
  // Neurotype support fields (from database schema)
  energy_required?: EnergyLevel;
  focus_required?: FocusLevel;
  sensory_considerations?: any[]; // JSONB array in database
  
  // Matrix positioning
  quadrant?: MatrixQuadrantId;
  // If a task was parked (moved to Park), record when it was parked
  parked_at?: string | null;
  // When task is completed and moved to 'Eliminate', preserve previous quadrant to allow restore
  previous_quadrant?: MatrixQuadrantId | null;
  
  // Organization
  tags?: string[];
  project_id?: string;
  parent_task_id?: string;
  
  // Accessibility and neurotype support
  visual_cues?: {
    color?: string;
    icon?: string;
    emoji?: string;
  };
  
  // Metadata
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// Legacy routine interfaces are now in routine.ts
// Keeping basic Routine interface for backward compatibility
export interface Routine {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  
  // Routine structure
  steps: RoutineStep[];
  estimated_duration: number;
  
  // Scheduling
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    days_of_week?: number[]; // 0-6, Sunday = 0
    time_of_day?: string;
    timezone?: string;
    reminders?: number[]; // minutes before
  };
  is_active: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Mood and Energy Tracking
export interface MoodEntry {
  id: string;
  user_id: string;
  
  // Core measurements
  mood_score: number; // 1-10
  energy_level: number; // 1-10
  focus_level?: number; // 1-10
  anxiety_level?: number; // 1-10
  
  // Context
  notes?: string;
  tags?: string[];
  activities?: string[];
  triggers?: string[];
  
  // Environment
  weather?: string;
  location?: string;
  social_context?: 'alone' | 'family' | 'friends' | 'work' | 'public';
  
  // Metadata
  recorded_at: string;
  created_at: string;
}

// Calendar and Event Types
export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  
  // Timing
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone: string;
  
  // Recurrence
  recurrence?: RecurrenceRule;
  
  // Associations
  task_id?: string;
  routine_id?: string;
  
  // Visual and accessibility
  color: string;
  visibility: 'public' | 'private' | 'shared';
  
  // Neurotype support
  buffer_before?: number; // minutes
  buffer_after?: number;
  transition_notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end_date?: string;
  count?: number;
  by_weekday?: number[];
  by_month_day?: number[];
}

// Collaboration and Sharing
export interface SharedResource {
  id: string;
  resource_type: 'routine' | 'board' | 'calendar' | 'task_list';
  resource_id: string;
  owner_id: string;
  
  // Permissions
  permissions: SharePermission[];
  is_public: boolean;
  access_code?: string;
  
  // Metadata
  created_at: string;
  expires_at?: string;
}

export interface SharePermission {
  user_id?: string;
  email?: string;
  role: 'viewer' | 'editor' | 'collaborator';
  granted_at: string;
  granted_by: string;
}

// App Events and Analytics
export interface AppEvent {
  id: string;
  user_id: string;
  type: string;
  source: 'user-action' | 'system-trigger' | 'external-api';
  data: Record<string, any>;
  
  // Context
  page_url?: string;
  user_agent?: string;
  session_id?: string;
  
  // Metadata
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Form and Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormState {
  isSubmitting: boolean;
  errors: ValidationError[];
  touched: Record<string, boolean>;
  values: Record<string, any>;
}