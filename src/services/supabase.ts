import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Demo mode flag - true when Supabase is not configured
const isDemoMode = !supabaseUrl || !supabaseAnonKey || 
                   supabaseUrl === 'your_supabase_url_here' ||
                   supabaseUrl.includes('your_supabase_url');

let supabase: any = null;

if (!isDemoMode) {
  try {
    // Create singleton instance with unique storage key to avoid conflicts
    supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storageKey: 'neurotype-planner-auth',
        autoRefreshToken: true,
        persistSession: true,
      },
    });
    console.log('✅ Supabase client initialized successfully');
    console.log('📊 Supabase URL:', supabaseUrl);
    console.log('📊 Has anon key:', !!supabaseAnonKey);
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
  }
} else {
  console.log('⚠️ Running in DEMO MODE - using localStorage instead of Supabase');
}

// Demo mode storage helpers
const DEMO_STORAGE_KEY = 'neurotype_planner_demo_data';
const OFFLINE_ACTIVITY_QUEUE_KEY = 'neurotype_planner_activity_queue';

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError) return true;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as Record<string, unknown>).message ?? '');
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return true;
    }
  }
  return false;
};

const readOfflineActivityQueue = (): any[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_ACTIVITY_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to read offline activity queue', error);
    return [];
  }
};

const persistOfflineActivityQueue = (queue: any[]) => {
  if (typeof localStorage === 'undefined') return;
  try {
    if (queue.length === 0) {
      localStorage.removeItem(OFFLINE_ACTIVITY_QUEUE_KEY);
    } else {
      localStorage.setItem(OFFLINE_ACTIVITY_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.warn('Failed to persist offline activity queue', error);
  }
};

const enqueueOfflineActivity = (activity: any) => {
  const queue = readOfflineActivityQueue();
  queue.push({
    ...activity,
    queued_at: new Date().toISOString(),
  });
  persistOfflineActivityQueue(queue);
};

const flushOfflineActivityQueue = async () => {
  if (isDemoMode || !supabase) return;
  const queue = readOfflineActivityQueue();
  if (!queue.length) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const remaining: any[] = [];
  for (const activity of queue) {
    const payload = { ...activity, user_id: activity.user_id ?? userId };
    try {
      const { error } = await supabase.from('user_activity').insert([payload]);
      if (error) {
        if (isNetworkError(error)) {
          remaining.push(activity);
          break;
        }
        console.error('Failed to flush queued activity', error);
      }
    } catch (error) {
      if (isNetworkError(error)) {
        remaining.push(activity);
        break;
      }
      console.error('Failed to flush queued activity', error);
    }
  }

  persistOfflineActivityQueue(remaining);
};

if (typeof window !== 'undefined' && !isDemoMode) {
  window.addEventListener('online', () => {
    flushOfflineActivityQueue().catch((error) => console.warn('Failed to flush offline activity queue', error));
  });
}

function getDemoData() {
  const data = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!data) {
    return { tasks: [], templates: [], timeBlocks: [] };
  }

  const parsed = JSON.parse(data);
  return {
    tasks: parsed.tasks || [],
    templates: parsed.templates || [],
    timeBlocks: parsed.timeBlocks || []
  };
}

function saveDemoData(data: any) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
}

function mapDbTemplateToApp(record: any) {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    category: record.category,
    defaultPriority: record.default_priority,
    estimatedDuration: record.estimated_duration,
    tags: record.tags || [],
    neurotypeOptimized: record.neurotype_optimized || []
  };
}

function mapTemplateToDb(template: any, userId: string) {
  return {
    id: template.id,
    user_id: userId,
    name: template.name,
    description: template.description,
    category: template.category,
    default_priority: template.defaultPriority,
    estimated_duration: template.estimatedDuration,
    tags: template.tags || [],
    neurotype_optimized: template.neurotypeOptimized || []
  };
}

// Helper to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  if (isDemoMode) {
    return 'demo-user-123';
  }

  if (!supabase) {
    console.warn('Supabase client unavailable; cannot resolve current user id');
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Auto-login helper - call this on app startup
async function initializeAuth(): Promise<void> {
  if (isDemoMode) {
    console.log('⚠️ Demo mode - skipping auth initialization');
    return;
  }

  if (!supabase) {
    console.warn('Supabase client not initialized; skipping auth initialization');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('🔐 No active session found on initialization. User must sign in manually.');
    } else {
      console.log('✅ Active session found:', session.user?.email ?? '<unknown>');
    }
  } catch (error) {
    console.error('Auth initialization error:', error);
  }
}

// Legacy exports for backwards compatibility
export const auth = isDemoMode ? null : supabase?.auth;
export const db = isDemoMode ? null : supabase;
export type Database = any;
export { getCurrentUserId, initializeAuth };
export const isSupabaseDemoMode = isDemoMode;
export const isSupabaseNetworkError = (error: unknown) => isNetworkError(error);
export const supabaseService = {
  async getTasks() {
    if (isDemoMode) {
      const data = getDemoData();
      return data.tasks || [];
    }
    
    try {
      // Simple select all - let Supabase return what columns exist
      const { data, error } = await supabase
        .from('tasks')
        .select('*');
      
      if (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  },
  
  async createTask(task: any) {
    if (isDemoMode) {
      const data = getDemoData();
      const newTask = { ...task, id: task.id || crypto.randomUUID() };
      data.tasks.push(newTask);
      saveDemoData(data);
      return newTask;
    }
    
    try {
      // Remove any fields that don't exist in the database schema
      const cleanTask = { ...task };
      
      // Debug logging - check for empty strings in UUID fields
      console.log('📝 Creating task with data:', cleanTask);
      console.log('📝 user_id:', typeof cleanTask.user_id, '=', cleanTask.user_id);
      console.log('📝 id:', typeof cleanTask.id, '=', cleanTask.id);
      
      // Check for empty strings and convert to null
      Object.keys(cleanTask).forEach(key => {
        if (cleanTask[key] === '') {
          console.warn(`⚠️ Found empty string in field: ${key}, converting to null`);
          cleanTask[key] = null;
        }
      });
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([cleanTask])
        .select('id, user_id, title, description, category, priority, estimated_duration, actual_duration, buffer_time, status, due_date, scheduled_at, completed_at, tags, energy_required, focus_required, sensory_considerations, quadrant, created_at, updated_at')
        .single();
      
      if (error) {
        console.error('Supabase createTask error:', error);
        throw new Error(error.message || 'Failed to create task in database');
      }
      
      return data;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  },
  
  async updateTask(id: string, updates: any) {
    if (isDemoMode) {
      const data = getDemoData();
      const taskIndex = data.tasks.findIndex((t: any) => t.id === id);
      if (taskIndex !== -1) {
        data.tasks[taskIndex] = { ...data.tasks[taskIndex], ...updates, updated_at: new Date().toISOString() };
        saveDemoData(data);
        return data.tasks[taskIndex];
      }
      throw new Error('Task not found');
    }
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  
  async deleteTask(id: string) {
    if (isDemoMode) {
      const data = getDemoData();
      data.tasks = data.tasks.filter((t: any) => t.id !== id);
      saveDemoData(data);
      return;
    }
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  
  subscribeToTasks(callback: (payload: any) => void) {
    if (isDemoMode) {
      // In demo mode, return a no-op unsubscribe function
      return () => {};
    }
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        callback
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },
  
  async updateUserActivity(activity: any) {
    if (isDemoMode) {
      console.log('Demo mode: User activity:', activity);
      return;
    }

    const payload = { ...activity };
    if (!payload.user_id) {
      const resolvedUserId = await getCurrentUserId();
      if (!resolvedUserId) {
        enqueueOfflineActivity(payload);
        return;
      }
      payload.user_id = resolvedUserId;
    }

    try {
      await flushOfflineActivityQueue();
      const { data, error } = await supabase
        .from('user_activity')
        .insert([payload])
        .select('id, user_id, activity_type, entity_id, entity_type, duration_minutes, context, started_at, ended_at')
        .single();

      if (error) {
        if (isNetworkError(error)) {
          console.warn('Supabase unavailable, queueing user activity locally.');
          enqueueOfflineActivity(payload);
          return null;
        }
        console.error('Failed to save user activity:', error);
        throw error;
      }

      return data;
    } catch (error) {
      if (isNetworkError(error)) {
        console.warn('User activity tracking deferred until connectivity returns.');
        enqueueOfflineActivity(payload);
        return null;
      }
      console.error('User activity tracking failed:', error);
      throw error;
    }
  },
  
  async createTimeBlock(timeBlock: any) {
    if (isDemoMode) {
      const data = getDemoData();
      const newBlock = { ...timeBlock, id: timeBlock.id || crypto.randomUUID() };
      data.timeBlocks = data.timeBlocks || [];
      data.timeBlocks.push(newBlock);
      saveDemoData(data);
      return newBlock;
    }
    const { data, error } = await supabase
      .from('time_blocks')
      .insert([timeBlock])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getTimeBlocks() {
    if (isDemoMode) {
      const data = getDemoData();
      return data.timeBlocks || [];
    }
    const { data, error } = await supabase
      .from('time_blocks')
      .select('*')
      .order('start_time', { ascending: true });
    if (error) throw error;
    // Convert snake_case to camelCase for frontend
    return (data || []).map((block: any) => ({
      id: block.id,
      taskId: block.task_id,
      startTime: block.start_time,
      endTime: block.end_time,
      isRecurring: block.is_recurring,
      title: block.title,
      description: block.description,
      color: block.color
    }));
  },
  
  async deleteTimeBlock(id: string) {
    if (isDemoMode) {
      const data = getDemoData();
      data.timeBlocks = (data.timeBlocks || []).filter((b: any) => b.id !== id);
      saveDemoData(data);
      return;
    }
    const { error } = await supabase
      .from('time_blocks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  
  async createTaskTemplate(template: any) {
    if (isDemoMode) {
      const data = getDemoData();
      const newTemplate = { ...template, id: template.id || crypto.randomUUID() };
      data.templates = data.templates || [];
      data.templates.push(newTemplate);
      saveDemoData(data);
      return newTemplate;
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('No authenticated user found. Please sign in to manage templates.');
    }

    const payload = mapTemplateToDb(template, userId);

    const { data, error } = await supabase
      .from('task_templates')
      .insert([payload])
      .select('id, name, description, category, default_priority, estimated_duration, tags, neurotype_optimized')
      .single();
    if (error) throw error;
    return mapDbTemplateToApp(data);
  },
  
  async deleteTaskTemplate(templateId: string) {
    if (isDemoMode) {
      const data = getDemoData();
      data.templates = (data.templates || []).filter((t: any) => t.id !== templateId);
      saveDemoData(data);
      return;
    }
    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', templateId);
    if (error) throw error;
  },

  async getTaskTemplates() {
    if (isDemoMode) {
      const data = getDemoData();
      return data.templates || [];
    }

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return [];
      }

      const { data, error } = await supabase
        .from('task_templates')
        .select('id, name, description, category, default_priority, estimated_duration, tags, neurotype_optimized')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch task templates:', error);
        return [];
      }

      return (data || []).map(mapDbTemplateToApp);
    } catch (error) {
      console.error('Error loading task templates:', error);
      return [];
    }
  },

  async invokeFunction<T = unknown>(name: string, body: Record<string, unknown>): Promise<T | null> {
    if (isDemoMode) {
      console.warn(`Supabase functions are not available in demo mode. Function "${name}" was skipped.`);
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke(name, {
        body,
      });

      if (error) {
        console.error(`Supabase function "${name}" failed:`, error);
        throw error;
      }

      return data as T;
    } catch (error) {
      console.error(`Error invoking Supabase function "${name}":`, error);
      throw error;
    }
  },
};

export { supabase };
