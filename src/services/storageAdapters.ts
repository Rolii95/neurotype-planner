// Define the storage adapter interface used throughout the app
export interface StorageAdapter {
  getTasks(): Promise<any[]>;
  createTask(task: any): Promise<any>;
  updateTask(id: string, updates: any): Promise<any>;
  deleteTask(id: string): Promise<void>;
  subscribeToTasks(callback: (payload: any) => void): () => void;
  updateUserActivity(activity: any): Promise<any> | null;
  // Visual routine management
  getVisualRoutines(): Promise<any[]>;
  createVisualRoutine(routine: any): Promise<any>;
  updateVisualRoutine(id: string, updates: any): Promise<any>;
  deleteVisualRoutine(id: string): Promise<void>;
  // Mood and sensory
  getMoodEntries(): Promise<any[]>;
  createMoodEntry(entry: any): Promise<any>;
  updateMoodEntry(id: string, updates: any): Promise<any>;
  deleteMoodEntry(id: string): Promise<void>;
  getSensoryPreferences(): Promise<any | null>;
  updateSensoryPreferences(prefs: any): Promise<any>;
  // File upload (returns public URL or data URL)
  uploadFile(file: File): Promise<string>;
  createTimeBlock(block: any): Promise<any>;
  getTimeBlocks(): Promise<any[]>;
  deleteTimeBlock(id: string): Promise<void>;
  createTaskTemplate(template: any): Promise<any>;
  deleteTaskTemplate(templateId: string): Promise<void>;
  getTaskTemplates(): Promise<any[]>;
  invokeFunction<T = unknown>(name: string, body: Record<string, unknown>): Promise<T | null>;
  getCurrentUserId(): Promise<string | null>;
  initializeAuth(): Promise<void>;
}

import { enqueueOffline, getAllOffline, removeOffline, incrementRetries, clearOffline } from './indexedQueue';

// Demo storage implementation (localStorage backed for demo data; IndexedDB for queues)
const DEMO_STORAGE_KEY = 'neurotype_planner_demo_data';

function readDemoData() {
  if (typeof localStorage === 'undefined') return { tasks: [], templates: [], timeBlocks: [] };
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return { tasks: [], templates: [], timeBlocks: [] };
    return JSON.parse(raw) || { tasks: [], templates: [], timeBlocks: [] };
  } catch (e) {
    return { tasks: [], templates: [], timeBlocks: [] };
  }
}

function saveDemoData(data: any) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

// Offline queues (activities, tasks, mood logs) are stored in IndexedDB via `indexedQueue.ts`.

export class DemoStorage implements StorageAdapter {
  async getTasks() {
    const data = readDemoData();
    return data.tasks || [];
  }

  async createTask(task: any) {
    const data = readDemoData();
    const newTask = { ...task, id: task.id || crypto.randomUUID() };
    data.tasks.push(newTask);
    saveDemoData(data);
    return newTask;
  }

  async updateTask(id: string, updates: any) {
    const data = readDemoData();
    const idx = data.tasks.findIndex((t: any) => t.id === id);
    if (idx !== -1) {
      data.tasks[idx] = { ...data.tasks[idx], ...updates, updated_at: new Date().toISOString() };
      saveDemoData(data);
      return data.tasks[idx];
    }
    throw new Error('Task not found');
  }

  async deleteTask(id: string) {
    const data = readDemoData();
    data.tasks = data.tasks.filter((t: any) => t.id !== id);
    saveDemoData(data);
  }

  subscribeToTasks(_callback: (payload: any) => void) {
    // Demo mode: no realtime channel; return noop unsubscribe
    return () => {};
  }

  async updateUserActivity(activity: any) {
    try {
      await enqueueOffline('activity', { ...activity });
      return null;
    } catch (e) {
      console.warn('Failed to enqueue offline activity into IndexedDB', e);
      return null;
    }
  }

  async createTimeBlock(block: any) {
    const data = readDemoData();
    const newBlock = { ...block, id: block.id || crypto.randomUUID() };
    data.timeBlocks = data.timeBlocks || [];
    data.timeBlocks.push(newBlock);
    saveDemoData(data);
    return newBlock;
  }

  async getTimeBlocks() {
    const data = readDemoData();
    return data.timeBlocks || [];
  }

  async deleteTimeBlock(id: string) {
    const data = readDemoData();
    data.timeBlocks = (data.timeBlocks || []).filter((b: any) => b.id !== id);
    saveDemoData(data);
  }

  async createTaskTemplate(template: any) {
    const data = readDemoData();
    const newT = { ...template, id: template.id || crypto.randomUUID() };
    data.templates = data.templates || [];
    data.templates.push(newT);
    saveDemoData(data);
    return newT;
  }

  async deleteTaskTemplate(templateId: string) {
    const data = readDemoData();
    data.templates = (data.templates || []).filter((t: any) => t.id !== templateId);
    saveDemoData(data);
  }

  async getTaskTemplates() {
    const data = readDemoData();
    return data.templates || [];
  }

  // Mood entries and sensory preferences (demo via localStorage)
  async getMoodEntries() {
    try {
      const entries: any[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
      return entries.map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) }));
    } catch (e) {
      return [];
    }
  }

  async createMoodEntry(entry: any) {
    try {
      const entries: any[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
      const newEntry = { ...entry, id: entry.id || crypto.randomUUID() };
      entries.push(newEntry);
      localStorage.setItem('vs-mood-entries', JSON.stringify(entries));
      return newEntry;
    } catch (e) {
      throw e;
    }
  }

  async updateMoodEntry(id: string, updates: any) {
    const entries: any[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Mood entry not found');
    entries[idx] = { ...entries[idx], ...updates };
    localStorage.setItem('vs-mood-entries', JSON.stringify(entries));
    return entries[idx];
  }

  async deleteMoodEntry(id: string) {
    const entries: any[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
    const filtered = entries.filter(e => e.id !== id);
    localStorage.setItem('vs-mood-entries', JSON.stringify(filtered));
  }

  async getSensoryPreferences() {
    try {
      const prefs = localStorage.getItem('vs-sensory-preferences');
      if (!prefs) return null;
      const parsed = JSON.parse(prefs);
      return { ...parsed, timestamp: new Date(parsed.timestamp), updatedAt: new Date(parsed.updatedAt) };
    } catch (e) {
      return null;
    }
  }

  async updateSensoryPreferences(preferences: any) {
    try {
      const payload = { ...preferences, updatedAt: new Date().toISOString() };
      localStorage.setItem('vs-sensory-preferences', JSON.stringify(payload));
      return payload;
    } catch (e) {
      throw e;
    }
  }

  async uploadFile(file: File) {
    // Demo: return data URL
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Visual routines demo helpers (stored under localStorage key `vs-routines`)
  async getVisualRoutines() {
    try {
      const routines = JSON.parse(localStorage.getItem('vs-routines') || '[]');
      return routines || [];
    } catch (e) {
      return [];
    }
  }

  async createVisualRoutine(routine: any) {
    try {
      const routines = JSON.parse(localStorage.getItem('vs-routines') || '[]');
      const newR = { ...routine, id: routine.id || crypto.randomUUID(), updated_at: new Date().toISOString() };
      routines.push(newR);
      localStorage.setItem('vs-routines', JSON.stringify(routines));
      return newR;
    } catch (e) {
      throw e;
    }
  }

  async updateVisualRoutine(id: string, updates: any) {
    const routines = JSON.parse(localStorage.getItem('vs-routines') || '[]');
    const idx = routines.findIndex((r: any) => r.id === id);
    if (idx === -1) throw new Error('Routine not found');
    routines[idx] = { ...routines[idx], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem('vs-routines', JSON.stringify(routines));
    return routines[idx];
  }

  async deleteVisualRoutine(id: string) {
    const routines = JSON.parse(localStorage.getItem('vs-routines') || '[]');
    const filtered = routines.filter((r: any) => r.id !== id);
    localStorage.setItem('vs-routines', JSON.stringify(filtered));
  }

  async invokeFunction<T = unknown>(_name: string, _body: Record<string, unknown>): Promise<T | null> {
    console.warn('DemoStorage: functions are not available in demo mode. Skipping.');
    return null;
  }

  async getCurrentUserId() {
    return 'demo-user-123';
  }

  async initializeAuth() {
    // noop for demo mode
    return;
  }
}

// Supabase-backed adapter
export class SupabaseStorage implements StorageAdapter {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async getTasks() {
    const { data, error } = await this.supabase.from('tasks').select('*');
    if (error) {
      console.error('Supabase getTasks error:', error);
      return [];
    }
    return data || [];
  }

  async createTask(task: any) {
    const cleanTask = { ...task };
    Object.keys(cleanTask).forEach((k) => { if (cleanTask[k] === '') cleanTask[k] = null; });
    const { data, error } = await this.supabase.from('tasks').insert([cleanTask]).select().single();
    if (error) throw error;
    return data;
  }

  async updateTask(id: string, updates: any) {
    const { data, error } = await this.supabase.from('tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteTask(id: string) {
    const { error } = await this.supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  }

  subscribeToTasks(callback: (payload: any) => void) {
    const channel = this.supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  async updateUserActivity(activity: any) {
    const payload = { ...activity };
    if (!payload.user_id) {
      const uid = await this.getCurrentUserId();
      if (!uid) {
        // queue behavior could be implemented here, but keep simple
        return null;
      }
      payload.user_id = uid;
    }
    const { data, error } = await this.supabase.from('user_activity').insert([payload]).select().single();
    if (error) {
      console.error('Failed to save user activity:', error);
      throw error;
    }
    return data;
  }

  async createTimeBlock(block: any) {
    const { data, error } = await this.supabase.from('time_blocks').insert([block]).select().single();
    if (error) throw error;
    return data;
  }

  async getTimeBlocks() {
    const { data, error } = await this.supabase.from('time_blocks').select('*').order('start_time', { ascending: true });
    if (error) throw error;
    return (data || []).map((b: any) => ({
      id: b.id,
      taskId: b.task_id,
      startTime: b.start_time,
      endTime: b.end_time,
      isRecurring: b.is_recurring,
      title: b.title,
      description: b.description,
      color: b.color,
    }));
  }

  async deleteTimeBlock(id: string) {
    const { error } = await this.supabase.from('time_blocks').delete().eq('id', id);
    if (error) throw error;
  }

  async createTaskTemplate(template: any) {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('No authenticated user');
    const payload = {
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
    const { data, error } = await this.supabase.from('task_templates').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }

  async deleteTaskTemplate(templateId: string) {
    const { error } = await this.supabase.from('task_templates').delete().eq('id', templateId);
    if (error) throw error;
  }

  async getTaskTemplates() {
    const uid = await this.getCurrentUserId();
    if (!uid) return [];
    const { data, error } = await this.supabase.from('task_templates').select('id, name, description, category, default_priority, estimated_duration, tags, neurotype_optimized').eq('user_id', uid).order('created_at', { ascending: true });
    if (error) {
      console.error('Failed to fetch task templates:', error);
      return [];
    }
    return data || [];
  }

  async invokeFunction<T = unknown>(name: string, body: Record<string, unknown>): Promise<T | null> {
    const { data, error } = await this.supabase.functions.invoke(name, { body });
    if (error) {
      console.error(`Supabase function "${name}" failed:`, error);
      throw error;
    }
    return data as T;
  }

  async getCurrentUserId() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return user?.id ?? null;
    } catch (e) {
      console.error('Error getting current user id', e);
      return null;
    }
  }

  async initializeAuth() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session) return;
    } catch (e) {
      console.warn('Auth init failed', e);
    }
  }

  // Mood entries and sensory preferences - Supabase implementations
  async getMoodEntries() {
    try {
      const { data, error } = await this.supabase.from('mood_entries').select('*').order('timestamp', { ascending: false }).limit(500);
      if (error) {
        console.error('Failed to load mood entries:', error);
        return [];
      }
      return (data || []).map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
    } catch (e) {
      console.error('Failed to fetch mood entries', e);
      return [];
    }
  }

  async createMoodEntry(entry: any) {
    try {
      const { data, error } = await this.supabase.from('mood_entries').insert([{ ...entry }]).select().single();
      if (error) throw error;
      return { ...data, timestamp: new Date(data.timestamp) };
    } catch (e) {
      console.error('Failed to create mood entry', e);
      throw e;
    }
  }

  async updateMoodEntry(id: string, updates: any) {
    try {
      const { data, error } = await this.supabase.from('mood_entries').update({ ...updates }).eq('id', id).select().single();
      if (error) throw error;
      return { ...data, timestamp: new Date(data.timestamp) };
    } catch (e) {
      console.error('Failed to update mood entry', e);
      throw e;
    }
  }

  async deleteMoodEntry(id: string) {
    try {
      const { error } = await this.supabase.from('mood_entries').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Failed to delete mood entry', e);
      throw e;
    }
  }

  async getSensoryPreferences() {
    try {
      const { data, error } = await this.supabase.from('sensory_preferences').select('*').limit(1).single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return { ...data, timestamp: new Date(data.timestamp), updatedAt: new Date(data.updated_at) };
    } catch (e) {
      console.error('Failed to get sensory preferences', e);
      return null;
    }
  }

  async updateSensoryPreferences(preferences: any) {
    try {
      const payload = { ...preferences } as any;
      payload.updated_at = new Date().toISOString();
      const { data, error } = await this.supabase.from('sensory_preferences').upsert(payload, { onConflict: 'user_id' }).select().single();
      if (error) throw error;
      return { ...data, timestamp: new Date(data.timestamp), updatedAt: new Date(data.updated_at) };
    } catch (e) {
      console.error('Failed to update sensory preferences', e);
      throw e;
    }
  }

  async uploadFile(file: File) {
    try {
      if (!this.supabase.storage) throw new Error('Supabase storage not available');
      const bucket = 'routine-assets';
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { data, error } = await this.supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;
      const { data: publicData } = await this.supabase.storage.from(bucket).getPublicUrl(path);
      return publicData.publicUrl;
    } catch (err) {
      console.error('Failed to upload file to storage; falling back to data URL', err);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }

  // Visual routines - Supabase-backed implementations
  async getVisualRoutines() {
    try {
      const { data, error } = await this.supabase.from('visual_routines').select('*').order('updated_at', { ascending: false }).limit(200);
      if (error) {
        console.error('Failed to load visual routines:', error);
        return [];
      }
      return (data || []) as any[];
    } catch (e) {
      console.error('Error fetching visual routines:', e);
      return [];
    }
  }

  async createVisualRoutine(routine: any) {
    try {
      const { data, error } = await this.supabase.from('visual_routines').insert([{ ...routine }]).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Failed to create visual routine:', e);
      throw e;
    }
  }

  async updateVisualRoutine(id: string, updates: any) {
    try {
      const { data, error } = await this.supabase.from('visual_routines').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Failed to update visual routine:', e);
      throw e;
    }
  }

  async deleteVisualRoutine(id: string) {
    try {
      const { error } = await this.supabase.from('visual_routines').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Failed to delete visual routine:', e);
      throw e;
    }
  }
}

// Module-level adapter instance (default can be set by the supabase service)
let activeAdapter: StorageAdapter | null = null;

export const setActiveAdapter = (adapter: StorageAdapter) => {
  activeAdapter = adapter;
};

export const getActiveAdapter = (): StorageAdapter => {
  if (!activeAdapter) {
    // fallback to demo storage to avoid crashes when env isn't configured
    activeAdapter = new DemoStorage();
  }
  return activeAdapter;
};
