// Priority Matrix Types and Interfaces
import { Task } from './index';

// Matrix quadrant identifiers based on Eisenhower Matrix
export type MatrixQuadrantId = 
  | 'urgent-important'     // Do First (Red)
  | 'urgent-not-important' // Park (Orange)
  | 'not-urgent-important' // Schedule (Yellow)
  | 'not-urgent-not-important'; // Eliminate (Green)

// Matrix quadrant configuration
export interface MatrixQuadrant {
  id: MatrixQuadrantId;
  title: string;
  description: string;
  color: {
    bg: string;
    border: string;
    text: string;
    accent: string;
  };
  icon: string; // Heroicon name
  actionLabel: string; // What to do with tasks in this quadrant
  neurotypeTips: {
    adhd: string;
    autism: string;
    dyslexia: string;
  };
}

// Task card props for the matrix view
export interface TaskCardProps {
  task: Task;
  quadrantId: MatrixQuadrantId;
  isDragging: boolean;
  isKeyboardNavigating: boolean;
  showDetails: boolean;
  onEdit?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

// Drag and drop operation types
export interface DragOperation {
  taskId: string;
  fromQuadrant: MatrixQuadrantId;
  toQuadrant: MatrixQuadrantId;
  timestamp: number;
}

// Matrix view configuration
export interface MatrixViewConfig {
  showQuadrantDescriptions: boolean;
  showTaskDetails: boolean;
  compactMode: boolean;
  neurotypeFocus: 'adhd' | 'autism' | 'dyslexia' | 'general';
  colorMode: 'standard' | 'high-contrast' | 'colorblind-safe';
}

// Matrix statistics for analytics
export interface MatrixStats {
  totalTasks: number;
  tasksByQuadrant: Record<MatrixQuadrantId, number>;
  completionRate: number;
  averageTimeInQuadrant: Record<MatrixQuadrantId, number>;
  dragOperationsToday: number;
}

// Keyboard navigation state
export interface MatrixKeyboardState {
  activeQuadrant: MatrixQuadrantId | null;
  activeTaskIndex: number;
  navigationMode: 'quadrant' | 'task' | 'action';
  announcements: string[];
}

// Accessibility announcements for screen readers
export interface MatrixAnnouncement {
  type: 'move' | 'focus' | 'action' | 'error' | 'success';
  message: string;
  priority: 'polite' | 'assertive';
}

// Matrix action types for undo/redo
export type MatrixAction = 
  | { type: 'MOVE_TASK'; payload: DragOperation }
  | { type: 'ADD_TASK'; payload: { task: Task; quadrantId: MatrixQuadrantId } }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: { taskId: string; quadrantId: MatrixQuadrantId } }
  | { type: 'BATCH_MOVE'; payload: DragOperation[] };

// Matrix hook return type
export interface UseMatrixReturn {
  quadrants: MatrixQuadrant[];
  tasksByQuadrant: Record<MatrixQuadrantId, Task[]>;
  stats: MatrixStats;
  viewConfig: MatrixViewConfig;
  keyboardState: MatrixKeyboardState;
  
  // Actions
  moveTask: (operation: DragOperation) => Promise<void>;
  updateViewConfig: (updates: Partial<MatrixViewConfig>) => void;
  navigateKeyboard: (direction: 'up' | 'down' | 'left' | 'right' | 'enter' | 'escape') => void;
  announceToScreenReader: (announcement: MatrixAnnouncement) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Default quadrant configurations
export const DEFAULT_QUADRANTS: MatrixQuadrant[] = [
  {
    id: 'urgent-important',
    title: 'Do First',
    description: 'Urgent and Important - Handle immediately',
    color: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      accent: 'bg-red-500'
    },
    icon: 'ExclamationTriangleIcon',
    actionLabel: 'Do Now',
    neurotypeTips: {
      adhd: 'Break into 15-minute focused sessions',
      autism: 'Follow established emergency procedures',
      dyslexia: 'Use visual timers and step-by-step guides'
    }
  },
  {
    id: 'not-urgent-important',
    title: 'Schedule',
    description: 'Important but Not Urgent - Plan and prioritize',
    color: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      accent: 'bg-yellow-500'
    },
    icon: 'CalendarIcon',
    actionLabel: 'Plan',
    neurotypeTips: {
      adhd: 'Schedule during your peak focus hours',
      autism: 'Add to routine with specific time blocks',
      dyslexia: 'Use color-coding and visual calendars'
    }
  },
  {
    id: 'urgent-not-important',
    title: 'Park',
    description: 'Urgent but Not Important - Park for later review',
    color: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      accent: 'bg-orange-500'
    },
    icon: 'UserGroupIcon',
    actionLabel: 'Park',
    neurotypeTips: {
      adhd: 'Set up automated systems when possible',
      autism: 'Create scripts for common requests',
      dyslexia: 'Use templates and pre-written responses'
    }
  },
  {
    id: 'not-urgent-not-important',
    title: 'Eliminate',
    description: 'Neither Urgent nor Important - Avoid or eliminate',
    color: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      accent: 'bg-gray-400'
    },
    icon: 'TrashIcon',
    actionLabel: 'Delete',
    neurotypeTips: {
      adhd: 'Remove to reduce distraction and overwhelm',
      autism: 'Archive rather than delete if unsure',
      dyslexia: 'Use simple yes/no decision frameworks'
    }
  }
];