import { DemoStorage, SupabaseStorage, setActiveAdapter, getActiveAdapter } from './storageAdapters';
import { getAllOffline, removeOffline, incrementRetries } from './indexedQueue';
import { createClient } from '@supabase/supabase-js';

// Detect demo mode by checking environment vars (keeps previous heuristic)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isDemoMode = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url_here' || supabaseUrl.includes('your_supabase_url');

let supabaseClient: any = null;

if (!isDemoMode) {
  try {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { storageKey: 'neurotype-planner-auth', autoRefreshToken: true, persistSession: true },
    });
    // Initialize a Supabase-backed adapter by default
    setActiveAdapter(new SupabaseStorage(supabaseClient));
    console.log('✅ Supabase client initialized');
  } catch (e) {
    console.warn('Failed to initialize Supabase client, falling back to demo adapter', e);
    setActiveAdapter(new DemoStorage());
  }
} else {
  // Demo by default
  setActiveAdapter(new DemoStorage());
}

// When Supabase is available, attempt to flush queued offline activities
async function flushQueuedActivities() {
  if (!supabaseClient) return;
  try {
    const items = await getAllOffline('activity');
    if (!items || items.length === 0) return;
    for (const item of items) {
      try {
        // item.payload is the activity object
        const payload = { ...(item.payload || {}) };
        // Prefer using the Supabase-backed adapter directly to ensure auth context
        await getActiveAdapter().updateUserActivity(payload);
        await removeOffline(item.id);
      } catch (err) {
        // If it's a network error, increment retries and stop processing further
        console.warn('Failed to flush offline activity', err);
        try { await incrementRetries(item.id); } catch (e) { /* ignore */ }
        break;
      }
    }
  } catch (e) {
    console.warn('Error flushing queued activities', e);
  }
}

if (typeof window !== 'undefined' && supabaseClient) {
  window.addEventListener('online', () => {
    flushQueuedActivities().catch((err) => console.warn('Failed to flush offline activity queue', err));
  });
}

// Re-export helpers for consumers. supabaseService delegates to the active adapter.
export const isSupabaseDemoMode = isDemoMode;

export const auth = supabaseClient?.auth ?? null;
export const db = supabaseClient ?? null;

export async function getCurrentUserId(): Promise<string | null> {
  return getActiveAdapter().getCurrentUserId();
}

export async function initializeAuth(): Promise<void> {
  return getActiveAdapter().initializeAuth();
}

// Legacy supabaseService wrapper delegating to active adapter
export const supabaseService = {
  getTasks: () => getActiveAdapter().getTasks(),
  createTask: (t: any) => getActiveAdapter().createTask(t),
  updateTask: (id: string, u: any) => getActiveAdapter().updateTask(id, u),
  deleteTask: (id: string) => getActiveAdapter().deleteTask(id),
  subscribeToTasks: (cb: (p: any) => void) => getActiveAdapter().subscribeToTasks(cb),
  updateUserActivity: (a: any) => getActiveAdapter().updateUserActivity(a),
  createTimeBlock: (b: any) => getActiveAdapter().createTimeBlock(b),
  getTimeBlocks: () => getActiveAdapter().getTimeBlocks(),
  deleteTimeBlock: (id: string) => getActiveAdapter().deleteTimeBlock(id),
  createTaskTemplate: (t: any) => getActiveAdapter().createTaskTemplate(t),
  deleteTaskTemplate: (id: string) => getActiveAdapter().deleteTaskTemplate(id),
  getTaskTemplates: () => getActiveAdapter().getTaskTemplates(),
  invokeFunction: <T = unknown>(n: string, b: Record<string, unknown>) => getActiveAdapter().invokeFunction<T>(n, b),
  // Visual routines
  getVisualRoutines: () => getActiveAdapter().getVisualRoutines(),
  createVisualRoutine: (r: any) => getActiveAdapter().createVisualRoutine(r),
  updateVisualRoutine: (id: string, u: any) => getActiveAdapter().updateVisualRoutine(id, u),
  deleteVisualRoutine: (id: string) => getActiveAdapter().deleteVisualRoutine(id),
  // Mood & sensory
  getMoodEntries: () => getActiveAdapter().getMoodEntries(),
  createMoodEntry: (e: any) => getActiveAdapter().createMoodEntry(e),
  updateMoodEntry: (id: string, u: any) => getActiveAdapter().updateMoodEntry(id, u),
  deleteMoodEntry: (id: string) => getActiveAdapter().deleteMoodEntry(id),
  getSensoryPreferences: () => getActiveAdapter().getSensoryPreferences(),
  updateSensoryPreferences: (p: any) => getActiveAdapter().updateSensoryPreferences(p),
  uploadFile: (f: File) => getActiveAdapter().uploadFile(f),
};

export { setActiveAdapter, getActiveAdapter };
