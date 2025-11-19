import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Task, TaskPriority } from '../types';
import { supabaseService, getCurrentUserId } from '../services/supabase';
import { notificationService } from '../services/notifications';
import { buildDefaultTemplates, TaskTemplate } from '../constants/taskTemplates';
import { TaskIntegrationService } from '../services/integrations/taskIntegrationService';
import {
  TaskIntegrationConnection,
  TaskProviderId,
  ExternalTaskPayload,
  FileImportResult,
} from '../types/integrations';

// Simplified types for the matrix store
export type QuadrantId = 'urgent-important' | 'urgent-not-important' | 'not-urgent-important' | 'not-urgent-not-important';

export interface SimpleQuadrant {
  id: QuadrantId;
  title: string;
  description: string;
  color: string;
  taskIds: string[];
}

export interface MatrixState {
  // Core state
  tasks: Task[];
  quadrants: SimpleQuadrant[];
  isLoading: boolean;
  error: string | null;
  lastSyncAt: string | null;
  
  // Real-time collaboration
  isOnline: boolean;
  collaborators: string[];
  
  // Analytics
  analytics: {
    tasksCompleted: number;
    averageCompletionTime: number;
    productivityScore: number;
    streakDays: number;
    lastActivityAt: string | null;
  };
  
  // Time blocking
  timeBlocks: Array<{
    id: string;
    taskId: string;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
  }>;
  // UI scheduling target used by quick-schedule flows
  timeBlockingTarget?: {
    taskId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  } | null;
  
  // AI suggestions
  aiSuggestions: Array<{
    id: string;
    type: 'priority' | 'time-estimate' | 'schedule' | 'break-down';
    taskId: string;
    suggestion: string;
    confidence: number;
    isApplied: boolean;
    createdAt: string;
  }>;
  
  // Task templates
  templates: Array<{
    id: string;
    name: string;
    description: string;
    category: 'work' | 'personal' | 'health' | 'learning' | 'custom';
    defaultPriority: TaskPriority;
    estimatedDuration: number;
    tags: string[];
    neurotypeOptimized?: string[];
  }>;

  // External integrations
  integrations: TaskIntegrationConnection[];
}

export interface MatrixActions {
  // Task management
  addTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, targetQuadrant: QuadrantId) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  
  // Data synchronization
  syncWithSupabase: () => Promise<void>;
  initializeRealtime: () => Promise<void>;
  cleanup: () => void;
  
  // Analytics
  updateAnalytics: () => Promise<void>;
  
  // Time blocking
  createTimeBlock: (taskId: string, startTime: string, endTime: string) => Promise<void>;
  deleteTimeBlock: (id: string) => Promise<void>;
  // UI helpers for scheduling flows
  setTimeBlockingTarget: (target: { taskId?: string; date?: string; startTime?: string; endTime?: string } | null) => void;
  clearTimeBlockingTarget: () => void;
  autoPlanFromMatrix: (options?: { maxTasks?: number }) => Promise<number>;
  
  // AI features
  generateAISuggestions: (taskId?: string) => Promise<void>;
  applyAISuggestion: (suggestionId: string) => Promise<void>;
  dismissAISuggestion: (suggestionId: string) => Promise<void>;
  
  // Templates
  createTemplate: (template: Omit<MatrixState['templates'][0], 'id'>) => Promise<void>;
  applyTemplate: (templateId: string, customizations?: Partial<Task>) => Promise<Task | null>;
  deleteTemplate: (templateId: string) => Promise<void>;
  // Integrations
  loadIntegrations: () => Promise<void>;
  connectIntegration: (request: { providerId: TaskProviderId; authorizationCode?: string; redirectUri?: string; apiKey?: string; }) => Promise<void>;
  disconnectIntegration: (providerId: TaskProviderId) => Promise<void>;
  registerIntegrationWebhook: (providerId: TaskProviderId, callbackUrl: string) => Promise<void>;
  syncExternalTasks: (providerId: TaskProviderId) => Promise<void>;
  importTasksFromFile: (file: File | Blob, options?: { providerHint?: TaskProviderId; defaultQuadrant?: QuadrantId; }) => Promise<FileImportResult | null>;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  // Park checks
  checkParkedTasksAndNotify: () => Promise<void>;
}

const DEFAULT_QUADRANTS: SimpleQuadrant[] = [
  {
    id: 'urgent-important',
    title: 'Urgent & Important',
    description: 'Crisis, emergencies, deadline-driven projects',
    color: 'red',
    taskIds: []
  },
  {
    id: 'not-urgent-important',
    title: 'Important, Not Urgent',
    description: 'Prevention, planning, development, relationship building',
    color: 'blue',
    taskIds: []
  },
  {
    id: 'urgent-not-important',
    title: 'Urgent, Not Important',
    description: 'Interruptions, some calls, some emails, some meetings',
    color: 'yellow',
    taskIds: []
  },
  {
    id: 'not-urgent-not-important',
    title: 'Not Urgent, Not Important',
    description: 'Trivia, some phone calls, time wasters, pleasant activities',
    color: 'gray',
    taskIds: []
  }
];

// Helper function to determine quadrant based on task properties
const determineQuadrant = (task: any): QuadrantId => {
  // Check if task already has quadrant set (from local state)
  if (task.quadrant) return task.quadrant;

  // Auto-assign based on priority and due date
  const isUrgent = task.due_date && new Date(task.due_date) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // Due within 2 days
  const isImportant = task.priority === 'high' || task.priority === 'urgent';

  if (isUrgent && isImportant) return 'urgent-important';
  if (!isUrgent && isImportant) return 'not-urgent-important';
  if (isUrgent && !isImportant) return 'urgent-not-important';
  return 'not-urgent-not-important';
};

const mapExternalStatusToTaskStatus = (status: ExternalTaskPayload['status']): Task['status'] => {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'in-progress':
      return 'in-progress';
    default:
      return 'not-started';
  }
};

const mapExternalTaskToLocal = (external: ExternalTaskPayload): Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'> => {
  const preferredQuadrant = (external.sourceData as { quadrant?: QuadrantId } | undefined)?.quadrant;

  const base = {
    title: external.title || 'Imported Task',
    description: external.description || undefined,
    priority: 'medium' as const,
    status: mapExternalStatusToTaskStatus(external.status),
    estimated_duration: 30,
    due_date: external.dueDate || undefined,
    tags: [...(external.labels || []), `integration:${external.providerId}`],
    buffer_time: 0,
    energy_required: 'medium' as const,
    focus_required: 'medium' as const,
    sensory_considerations: [],
  };

  const quadrant = determineQuadrant({
    ...base,
    quadrant: preferredQuadrant,
  });

  return {
    ...base,
    quadrant,
  };
};

const DEFAULT_ANALYTICS = {
  tasksCompleted: 0,
  averageCompletionTime: 0,
  productivityScore: 0,
  streakDays: 0,
  lastActivityAt: null
};

export const useMatrixStore = create<MatrixState & MatrixActions>()(
  subscribeWithSelector(
    persist(
      immer<MatrixState & MatrixActions>((set, get) => ({
        // Initial state
        tasks: [],
        quadrants: DEFAULT_QUADRANTS,
        isLoading: false,
        error: null,
        lastSyncAt: null,
        isOnline: true,
        collaborators: [],
        analytics: DEFAULT_ANALYTICS,
        timeBlocks: [],
        // UI scheduling target used by quick-schedule flows
        timeBlockingTarget: null,
        aiSuggestions: [],
        templates: [],
        integrations: [],

        // Task management actions
        addTask: async (taskData) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // Get current authenticated user ID
            const userId = await getCurrentUserId();
            if (!userId) {
              throw new Error('No authenticated user found. Please sign in to create tasks.');
            }

            const priority = (taskData as any).priority || 'medium';
            const providedQuadrant = (taskData as any).quadrant as QuadrantId | undefined;
            const quadrantId = providedQuadrant || determineQuadrant({
              ...(taskData as any),
              priority,
              quadrant: undefined
            });
            
            // Prepare task data with required fields for database
            const taskForDb = {
              ...(taskData as any),
              id: crypto.randomUUID(),
              user_id: userId,
              category: (taskData as any).category || 'personal',
              priority,
              estimated_duration: (taskData as any).estimated_duration || 30, // default 30 minutes
              buffer_time: (taskData as any).buffer_time ?? 0, // required field, default 0
              energy_required: (taskData as any).energy_required || 'medium',
              focus_required: (taskData as any).focus_required || 'medium',
              sensory_considerations: (taskData as any).sensory_considerations || [],
              tags: (taskData as any).tags || [],
              quadrant: quadrantId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const newTask = await supabaseService.createTask(taskForDb);

            if (!newTask) {
              throw new Error('Failed to create task');
            }

            set((state) => {
              // Add task to state with quadrant info
              const persistedQuadrant = (newTask as any).quadrant as QuadrantId | undefined;
              const resolvedQuadrant = persistedQuadrant || quadrantId;
              const taskWithQuadrant = { ...newTask, quadrant: resolvedQuadrant };
              state.tasks.push(taskWithQuadrant as any);
              
              // Add task to appropriate quadrant
              const targetQuadrant = state.quadrants.find(q => q.id === resolvedQuadrant);
              if (targetQuadrant) {
                targetQuadrant.taskIds.push(newTask.id);
              }
              state.isLoading = false;
              state.lastSyncAt = new Date().toISOString();
            });

            get().updateAnalytics();
            return newTask; // Return the created task
          } catch (error) {
            console.error('Error adding task:', error);
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to add task';
              state.isLoading = false;
            });
            throw error; // Re-throw to show in UI
          }
        },

        updateTask: async (id, updates) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // Detect special transitions:
            // 1) If task is in Eliminate and status changes away from 'completed', restore previous quadrant.
            const currentTask = get().tasks.find(t => t.id === id) as any;
            const patch: any = { ...updates };

            if (patch.status && patch.status !== 'completed' && currentTask?.quadrant === 'not-urgent-not-important') {
              if (currentTask.previous_quadrant) {
                patch.quadrant = currentTask.previous_quadrant;
                patch.previous_quadrant = null;
              }
            }

            // 2) If explicitly moving quadrant and it's not Park, clear parked_at
            if (typeof patch.quadrant === 'string' && patch.quadrant !== 'urgent-not-important') {
              patch.parked_at = null;
            }

            const updatedTask = await supabaseService.updateTask(id, {
              ...patch,
              updated_at: new Date().toISOString(),
            });

            set((state) => {
              const taskIndex = state.tasks.findIndex(t => t.id === id);
              if (taskIndex !== -1) {
                state.tasks[taskIndex] = updatedTask;
              }
              state.isLoading = false;
              state.lastSyncAt = new Date().toISOString();
            });

            get().updateAnalytics();
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to update task';
              state.isLoading = false;
            });
          }
        },

        deleteTask: async (id) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            await supabaseService.deleteTask(id);

            set((state) => {
              state.tasks = state.tasks.filter(t => t.id !== id);
              state.quadrants.forEach(quadrant => {
                quadrant.taskIds = quadrant.taskIds.filter(taskId => taskId !== id);
              });
              state.timeBlocks = state.timeBlocks.filter(tb => tb.taskId !== id);
              state.aiSuggestions = state.aiSuggestions.filter(s => s.taskId !== id);
              state.isLoading = false;
              state.lastSyncAt = new Date().toISOString();
            });

            get().updateAnalytics();
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to delete task';
              state.isLoading = false;
            });
          }
        },

        moveTask: async (taskId, targetQuadrant) => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            console.log('❌ Task not found:', taskId);
            return;
          }

          const previousQuadrant = (task.quadrant as QuadrantId) || determineQuadrant(task);
          console.log('🔄 moveTask:', { taskId, from: previousQuadrant, to: targetQuadrant });

          // Optimistic state update (set parked_at locally when moving into Park)
          set((state) => {
            state.quadrants.forEach(quadrant => {
              quadrant.taskIds = quadrant.taskIds.filter(id => id !== taskId);
            });

            const destinationQuadrant = state.quadrants.find(q => q.id === targetQuadrant);
            if (destinationQuadrant) {
              destinationQuadrant.taskIds.push(taskId);
            }

            const taskIndex = state.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
              (state.tasks[taskIndex] as any).quadrant = targetQuadrant;
              (state.tasks[taskIndex] as any).updated_at = new Date().toISOString();
              if (targetQuadrant === 'urgent-not-important') {
                (state.tasks[taskIndex] as any).parked_at = new Date().toISOString();
              } else {
                (state.tasks[taskIndex] as any).parked_at = null;
              }
              console.log('✅ Optimistic update:', state.tasks[taskIndex].quadrant);
            }
          });

          try {
            // If moving into Park, set parked_at; if moving out, clear parked_at
            const updates: any = { quadrant: targetQuadrant, updated_at: new Date().toISOString() };
            if (targetQuadrant === 'urgent-not-important') {
              updates.parked_at = new Date().toISOString();
            } else {
              updates.parked_at = null;
            }

            const updatedTask = await supabaseService.updateTask(taskId, updates);

            if (updatedTask) {
              set((state) => {
                const taskIndex = state.tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                  state.tasks[taskIndex] = updatedTask as Task;
                }
                state.lastSyncAt = new Date().toISOString();
              });
            }
          } catch (error) {
            console.error('Failed to move task:', error);
            // Revert optimistic update
            set((state) => {
              state.quadrants.forEach(quadrant => {
                quadrant.taskIds = quadrant.taskIds.filter(id => id !== taskId);
              });

              const fallbackQuadrant = state.quadrants.find(q => q.id === previousQuadrant);
              if (fallbackQuadrant) {
                fallbackQuadrant.taskIds.push(taskId);
              }

              const taskIndex = state.tasks.findIndex(t => t.id === taskId);
              if (taskIndex !== -1) {
                (state.tasks[taskIndex] as any).quadrant = previousQuadrant;
              }

              state.error = error instanceof Error ? error.message : 'Failed to move task';
            });
            throw error;
          }
        },

        completeTask: async (id) => {
          const task = get().tasks.find(t => t.id === id);
          if (!task) return;
          const previousQuadrant = task.quadrant as QuadrantId | undefined;

          // Mark completed, set completed_at and move to Eliminate quadrant while preserving previous quadrant
          await get().updateTask(id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
            quadrant: 'not-urgent-not-important',
            previous_quadrant: previousQuadrant ?? null,
            updated_at: new Date().toISOString(),
          });
        },

        // Periodic check for parked tasks older than 3 days and notify
        checkParkedTasksAndNotify: async () => {
          try {
            const { tasks } = get();
            const now = Date.now();
            const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

            for (const task of tasks) {
              if (task.quadrant === 'urgent-not-important' && task.parked_at) {
                const parkedAt = new Date(task.parked_at).getTime();
                if (now - parkedAt >= threeDaysMs) {
                  // Schedule a reminder to review the parked task (deduped by metadata)
                  await notificationService.scheduleNotification({
                    title: 'Review parked task',
                    message: `"${task.title}" has been parked for 3 days. Move or schedule it?`,
                    type: 'reminder',
                    priority: 'medium',
                    actionable: true,
                    actions: [
                      { label: 'View Task', action: 'navigate', data: { path: `/tasks/${task.id}` } },
                      { label: 'Move', action: 'navigate', data: { path: `/tasks` } },
                    ],
                    scheduled_for: new Date().toISOString(),
                    metadata: { taskId: task.id }
                  });
                }
              }
            }
          } catch (error) {
            console.error('Failed to check parked tasks:', error);
          }
        },

        // Data synchronization
        syncWithSupabase: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const [tasks, timeBlocks, templates] = await Promise.all([
              supabaseService.getTasks(),
              supabaseService.getTimeBlocks(),
              supabaseService.getTaskTemplates()
            ]);
            
            set((state) => {
              state.tasks = tasks;
              state.timeBlocks = timeBlocks;
              state.templates = templates;
              
              // Reset quadrant task IDs
              state.quadrants.forEach(quadrant => {
                quadrant.taskIds = [];
              });

              // Redistribute tasks to quadrants based on their properties
              tasks.forEach((task: any) => {
                const quadrantId = determineQuadrant(task);
                const quadrant = state.quadrants.find(q => q.id === quadrantId);
                if (quadrant) {
                  quadrant.taskIds.push(task.id);
                }
                // Store quadrant in task for local state
                task.quadrant = quadrantId;
              });

              state.isLoading = false;
              state.lastSyncAt = new Date().toISOString();
            });

            get().updateAnalytics();
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to sync with database';
              state.isLoading = false;
            });
          }
        },

        initializeRealtime: async () => {
          try {
            await supabaseService.subscribeToTasks((payload) => {
              const { eventType, new: newRecord, old: oldRecord } = payload;

              set((state) => {
                switch (eventType) {
                  case 'INSERT':
                    if (newRecord && !state.tasks.find(t => t.id === newRecord.id)) {
                      const assignedQuadrant = (newRecord.quadrant as QuadrantId) || determineQuadrant(newRecord);
                      const recordWithQuadrant = { ...(newRecord as Task), quadrant: assignedQuadrant };
                      state.tasks.push(recordWithQuadrant);
                      const quadrant = state.quadrants.find(q => q.id === assignedQuadrant);
                      if (quadrant && !quadrant.taskIds.includes(recordWithQuadrant.id)) {
                        quadrant.taskIds.push(recordWithQuadrant.id);
                      }
                    }
                    break;
                  case 'UPDATE':
                    if (newRecord) {
                      const taskIndex = state.tasks.findIndex(t => t.id === newRecord.id);
                      if (taskIndex !== -1) {
                        const assignedQuadrant = (newRecord.quadrant as QuadrantId) || determineQuadrant(newRecord);
                        const previousQuadrant = state.tasks[taskIndex].quadrant as QuadrantId | undefined;

                        if (previousQuadrant && previousQuadrant !== assignedQuadrant) {
                          const prevQuadrant = state.quadrants.find(q => q.id === previousQuadrant);
                          if (prevQuadrant) {
                            prevQuadrant.taskIds = prevQuadrant.taskIds.filter(id => id !== newRecord.id);
                          }
                        }

                        const newQuadrantBucket = state.quadrants.find(q => q.id === assignedQuadrant);
                        if (newQuadrantBucket && !newQuadrantBucket.taskIds.includes(newRecord.id)) {
                          newQuadrantBucket.taskIds.push(newRecord.id);
                        }

                        state.tasks[taskIndex] = { ...(newRecord as Task), quadrant: assignedQuadrant };
                      }
                    }
                    break;
                  case 'DELETE':
                    if (oldRecord) {
                      state.tasks = state.tasks.filter(t => t.id !== oldRecord.id);
                      state.quadrants.forEach(quadrant => {
                        quadrant.taskIds = quadrant.taskIds.filter(id => id !== oldRecord.id);
                      });
                    }
                    break;
                }
                state.lastSyncAt = new Date().toISOString();
              });

              get().updateAnalytics();
            });

            set((state) => {
              state.isOnline = true;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to initialize real-time updates';
            });
          }
        },

        cleanup: () => {
          // Cleanup handled by supabaseService.unsubscribe
        },

        // Analytics
        updateAnalytics: async () => {
          const { tasks } = get();
          const completedTasks = tasks.filter(t => t.status === 'completed');
          const now = new Date();
          
          // Calculate completion times
          const completionTimes = completedTasks
            .filter(t => t.completed_at && t.created_at)
            .map(t => {
              const created = new Date(t.created_at!);
              const completed = new Date(t.completed_at!);
              return completed.getTime() - created.getTime();
            });

          const averageCompletionTime = completionTimes.length > 0
            ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
            : 0;

          // Calculate productivity score
          const productivityScore = tasks.length > 0 
            ? (completedTasks.length / tasks.length) * 100 
            : 0;

          // Calculate streak
          let streakDays = 0;
          const today = new Date().toDateString();
          const completedByDate = completedTasks.reduce((acc, task) => {
            if (task.completed_at) {
              const date = new Date(task.completed_at).toDateString();
              acc[date] = (acc[date] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);

          let checkDate = new Date(today);
          while (completedByDate[checkDate.toDateString()]) {
            streakDays++;
            checkDate.setDate(checkDate.getDate() - 1);
          }

          set((state) => {
            state.analytics = {
              tasksCompleted: completedTasks.length,
              averageCompletionTime,
              productivityScore,
              streakDays,
              lastActivityAt: now.toISOString()
            };
          });

          // Save analytics to Supabase as user activity
          try {
            const userId = await getCurrentUserId();
            if (userId) {
              // Save as a dashboard view activity with analytics in context
              await supabaseService.updateUserActivity({
                user_id: userId,
                activity_type: 'dashboard_view',
                context: {
                  tasksCompleted: completedTasks.length,
                  averageCompletionTime,
                  productivityScore,
                  streakDays,
                  lastActivityAt: now.toISOString()
                },
                started_at: now.toISOString(),
                ended_at: now.toISOString()
              });
            } else {
              console.log('📊 Analytics updated locally (no user authenticated)');
            }
          } catch (error) {
            console.error('Failed to save analytics:', error);
          }
        },

        // Time blocking
        createTimeBlock: async (taskId, startTime, endTime) => {
          const userId = await getCurrentUserId();
          if (!userId) {
            set((state) => {
              state.error = 'User not authenticated';
            });
            return;
          }

          // Get task to use its title
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            set((state) => {
              state.error = 'Task not found';
            });
            return;
          }

          const timeBlock = {
            id: crypto.randomUUID(),
            taskId,
            startTime,
            endTime,
            isRecurring: false
          };

          set((state) => {
            state.timeBlocks.push(timeBlock);
          });

          try {
            // Convert to database format with snake_case and required fields
            await supabaseService.createTimeBlock({
              id: timeBlock.id,
              user_id: userId,
              task_id: taskId,
              title: task.title,
              description: task.description || null,
              start_time: startTime,
              end_time: endTime,
              is_recurring: false,
              recurrence_rule: null,
              color: '#3B82F6'
            });
          } catch (error) {
            // Remove from local state if database save failed
            set((state) => {
              state.timeBlocks = state.timeBlocks.filter(tb => tb.id !== timeBlock.id);
              state.error = error instanceof Error ? error.message : 'Failed to create time block';
            });
          }
        },

        deleteTimeBlock: async (id) => {
          set((state) => {
            state.timeBlocks = state.timeBlocks.filter(tb => tb.id !== id);
          });

          try {
            await supabaseService.deleteTimeBlock(id);
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to delete time block';
            });
          }
        },

        // UI helpers for scheduling flows
        setTimeBlockingTarget: (target: { taskId?: string; date?: string; startTime?: string; endTime?: string } | null) => {
          set((state) => {
            (state as any).timeBlockingTarget = target;
          });
        },

        clearTimeBlockingTarget: () => {
          set((state) => {
            (state as any).timeBlockingTarget = null;
          });
        },

        // Auto-plan tasks from the matrix into today's free slots
        autoPlanFromMatrix: async (options?: { maxTasks?: number }) => {
          const maxTasks = options?.maxTasks ?? 6;
          try {
            const now = new Date();
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const workingStart = 8;
            const workingEnd = 20;

            const windows = get().timeBlocks
              .filter(tb => new Date(tb.startTime).toDateString() === date.toDateString())
              .map(tb => ({ start: new Date(tb.startTime).getTime(), end: new Date(tb.endTime).getTime() }));

            const backlog = get().tasks.filter(t => t.status !== 'completed' && !get().timeBlocks.find(tb => tb.taskId === t.id));
            const prioritized = [...backlog].sort((a, b) => {
              const score = (task: any) => (task.priority === 'urgent' ? 0 : task.priority === 'high' ? 1 : task.priority === 'medium' ? 2 : 3);
              return score(a) - score(b);
            }).slice(0, maxTasks);

            let scheduledCount = 0;
            for (const task of prioritized) {
              const duration = Math.max(30, task.estimated_duration || 60);
              const slotDuration = duration * 60 * 1000;
              const dayStart = new Date(date); dayStart.setHours(workingStart, 0, 0, 0);
              const dayEnd = new Date(date); dayEnd.setHours(workingEnd, 0, 0, 0);

              let placed = false;
              for (let pointer = dayStart.getTime(); pointer + slotDuration <= dayEnd.getTime(); pointer += 15 * 60 * 1000) {
                const pointerEnd = pointer + slotDuration;
                const overlaps = windows.some(w => pointer < w.end && pointerEnd > w.start);
                if (!overlaps) {
                  await get().createTimeBlock(task.id, new Date(pointer).toISOString(), new Date(pointerEnd).toISOString());
                  windows.push({ start: pointer, end: pointerEnd });
                  scheduledCount++;
                  placed = true;
                  break;
                }
              }

              if (!placed) continue;
            }

            return scheduledCount;
          } catch (error) {
            console.error('autoPlanFromMatrix failed:', error);
            return 0;
          }
        },

        // AI features
        generateAISuggestions: async (taskId) => {
          // Simple mock implementation
          set((state) => {
            state.aiSuggestions.push({
              id: crypto.randomUUID(),
              type: 'priority',
              taskId: taskId || '',
              suggestion: 'Consider breaking this task into smaller steps for better focus',
              confidence: 0.8,
              isApplied: false,
              createdAt: new Date().toISOString()
            });
          });
        },

        applyAISuggestion: async (suggestionId) => {
          set((state) => {
            const suggestion = state.aiSuggestions.find(s => s.id === suggestionId);
            if (suggestion) {
              suggestion.isApplied = true;
            }
          });
        },

        dismissAISuggestion: async (suggestionId) => {
          set((state) => {
            state.aiSuggestions = state.aiSuggestions.filter(s => s.id !== suggestionId);
          });
        },

        // Templates
        createTemplate: async (template) => {
          const newTemplate: MatrixState['templates'][0] = {
            ...template,
            id: crypto.randomUUID(),
            neurotypeOptimized: template.neurotypeOptimized || []
          };

          set((state) => {
            state.templates.push(newTemplate);
          });

          try {
            const savedTemplate = await supabaseService.createTaskTemplate(newTemplate);
            if (savedTemplate) {
              set((state) => {
                const index = state.templates.findIndex(t => t.id === newTemplate.id);
                if (index !== -1) {
                  state.templates[index] = savedTemplate;
                }
              });
            }
          } catch (error) {
            set((state) => {
              state.templates = state.templates.filter(t => t.id !== newTemplate.id);
              state.error = error instanceof Error ? error.message : 'Failed to create template';
            });
          }
        },

        applyTemplate: async (templateId, customizations = {}) => {
          const availableTemplates: TaskTemplate[] = [
            ...buildDefaultTemplates(),
            ...get().templates
          ];

          const selectedTemplate = availableTemplates.find(t => t.id === templateId);
          if (!selectedTemplate) {
            console.warn('Template not found:', templateId);
            return null;
          }

          const {
            id: _omitId,
            user_id: _omitUserId,
            created_at: _omitCreatedAt,
            updated_at: _omitUpdatedAt,
            ...customTaskFields
          } = customizations;

          const baseTask: Partial<Task> = {
            title: selectedTemplate.name,
            description: selectedTemplate.description,
            priority: selectedTemplate.defaultPriority,
            status: 'not-started',
            category: selectedTemplate.category === 'custom' ? undefined : selectedTemplate.category,
            estimated_duration: selectedTemplate.estimatedDuration,
            quadrant: 'not-urgent-important',
            tags: selectedTemplate.tags,
            buffer_time: 0,
            energy_required: 'medium',
            focus_required: selectedTemplate.defaultPriority === 'urgent' ? 'high' : 'medium',
            sensory_considerations: [],
          };

          const mergedTask = {
            ...baseTask,
            ...customTaskFields,
          } as Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

          if (!mergedTask.title) {
            mergedTask.title = selectedTemplate.name;
          }
          if (!mergedTask.description) {
            mergedTask.description = selectedTemplate.description;
          }
          if (!mergedTask.priority) {
            mergedTask.priority = selectedTemplate.defaultPriority;
          }
          if (!mergedTask.estimated_duration) {
            mergedTask.estimated_duration = selectedTemplate.estimatedDuration;
          }
          if (!mergedTask.tags) {
            mergedTask.tags = selectedTemplate.tags;
          }
          if (!mergedTask.buffer_time && mergedTask.buffer_time !== 0) {
            mergedTask.buffer_time = 0;
          }
          if (!mergedTask.energy_required) {
            mergedTask.energy_required = 'medium';
          }
          if (!mergedTask.focus_required) {
            mergedTask.focus_required = selectedTemplate.defaultPriority === 'urgent' ? 'high' : 'medium';
          }
          if (!mergedTask.sensory_considerations) {
            mergedTask.sensory_considerations = [];
          }
          if (!mergedTask.quadrant) {
            mergedTask.quadrant = 'not-urgent-important';
          }

          try {
            const createdTask = await get().addTask(mergedTask);
            return createdTask;
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to apply template';
            });
            throw error;
          }
        },

        deleteTemplate: async (templateId) => {
          set((state) => {
            state.templates = state.templates.filter(t => t.id !== templateId);
          });

          try {
            await supabaseService.deleteTaskTemplate(templateId);
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to delete template';
            });
          }
        },

        // Integrations
        loadIntegrations: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const connections = await TaskIntegrationService.listConnections();
            set((state) => {
              state.integrations = connections;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load integrations';
              state.isLoading = false;
            });
          }
        },

        connectIntegration: async ({ providerId, authorizationCode, redirectUri, apiKey }) => {
          set((state) => {
            const existing = state.integrations.find(integration => integration.providerId === providerId);
            if (existing) {
              existing.status = 'connecting';
              existing.errorMessage = null;
            } else {
              state.integrations.push({
                providerId,
                connected: false,
                status: 'connecting',
              } as TaskIntegrationConnection);
            }
          });

          try {
            const connection = await TaskIntegrationService.connectProvider({
              providerId,
              authorizationCode,
              redirectUri,
              apiKey,
            });

            set((state) => {
              const index = state.integrations.findIndex(i => i.providerId === providerId);
              if (index !== -1) {
                state.integrations[index] = connection;
              } else {
                state.integrations.push(connection);
              }
            });
          } catch (error) {
            set((state) => {
              const existing = state.integrations.find(i => i.providerId === providerId);
              if (existing) {
                existing.status = 'error';
                existing.errorMessage = error instanceof Error ? error.message : 'Failed to connect integration';
              }
              state.error = existing?.errorMessage || 'Failed to connect integration';
            });
            throw error;
          }
        },

        disconnectIntegration: async (providerId) => {
          try {
            await TaskIntegrationService.disconnectProvider(providerId);
            set((state) => {
              const existing = state.integrations.find(i => i.providerId === providerId);
              if (existing) {
                existing.connected = false;
                existing.status = 'idle';
                existing.webhookUrl = undefined;
              }
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to disconnect integration';
            });
            throw error;
          }
        },

        registerIntegrationWebhook: async (providerId, callbackUrl) => {
          try {
            const connection = await TaskIntegrationService.registerWebhook({
              providerId,
              callbackUrl,
            });

            set((state) => {
              const index = state.integrations.findIndex(i => i.providerId === providerId);
              if (index !== -1) {
                state.integrations[index] = connection;
              } else {
                state.integrations.push(connection);
              }
            });
          } catch (error) {
            set((state) => {
              const existing = state.integrations.find(i => i.providerId === providerId);
              if (existing) {
                existing.status = 'error';
                existing.errorMessage = error instanceof Error ? error.message : 'Failed to register webhook';
              }
              state.error = existing?.errorMessage || 'Failed to register webhook';
            });
            throw error;
          }
        },

        syncExternalTasks: async (providerId) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const externalTasks = await TaskIntegrationService.syncFromProvider(providerId);
            for (const external of externalTasks) {
              const taskData = mapExternalTaskToLocal(external);
              await get().addTask(taskData);
            }

            set((state) => {
              const existing = state.integrations.find(i => i.providerId === providerId);
              if (existing) {
                existing.status = 'connected';
                existing.connected = true;
                existing.lastSyncedAt = new Date().toISOString();
                existing.errorMessage = null;
              }
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              const existing = state.integrations.find(i => i.providerId === providerId);
              if (existing) {
                existing.status = 'error';
                existing.errorMessage = error instanceof Error ? error.message : 'Failed to sync tasks';
              }
              state.error = existing?.errorMessage || 'Failed to sync tasks';
              state.isLoading = false;
            });
            throw error;
          }
        },

        importTasksFromFile: async (file, options) => {
          try {
            const result = await TaskIntegrationService.importFromFile(file, options || {});
            for (const external of result.tasks) {
              const taskData = mapExternalTaskToLocal(external);
              await get().addTask(taskData);
            }
            return result;
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to import tasks';
            });
            return null;
          }
        },

        // Error handling
        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },

        clearError: () => {
          set((state) => {
            state.error = null;
          });
        }
      })),
      {
        name: 'matrix-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          quadrants: state.quadrants,
          analytics: state.analytics,
          templates: state.templates,
          integrations: state.integrations,
        })
      }
    )
  )
);

// Helper functions
export const getTasksByQuadrant = (quadrantId: QuadrantId) => {
  const { tasks, quadrants } = useMatrixStore.getState();
  const quadrant = quadrants.find(q => q.id === quadrantId);
  if (!quadrant) return [];
  
  return quadrant.taskIds
    .map(taskId => tasks.find(task => task.id === taskId))
    .filter(Boolean) as Task[];
};

export const initializeMatrixStore = async () => {
  const store = useMatrixStore.getState();
  await store.syncWithSupabase();
  await store.initializeRealtime();
  // Periodically check parked tasks and notify if parked > 3 days
  try {
    setInterval(() => {
      store.checkParkedTasksAndNotify().catch((err) => console.error('Park check failed:', err));
    }, 1000 * 60 * 60); // every hour
  } catch (err) {
    console.error('Failed to start parked task checker:', err);
  }
};

// Initialize store on module load
if (typeof window !== 'undefined') {
  // Sync with Supabase when store is created
  setTimeout(() => {
    initializeMatrixStore().catch(console.error);
  }, 1000);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    useMatrixStore.getState().cleanup();
  });
}
