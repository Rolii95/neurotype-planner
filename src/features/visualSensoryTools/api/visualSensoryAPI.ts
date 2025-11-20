import { VisualRoutine, MoodEntry, SensoryPreferences } from '../types';
import { supabase, isSupabaseDemoMode, supabaseService } from '../../../services/supabase';

const MOCK_DELAY = 500;
const mockDelay = () => new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

// API backed by Supabase with demo-mode fallbacks
export const visualSensoryAPI = {
  // Routine Management
  async getRoutines(): Promise<VisualRoutine[]> {
    await mockDelay();
    try {
      // Delegate to adapter via supabaseService so demo vs production behavior is centralized.
      const routines = await supabaseService.getVisualRoutines();
      return (routines || []).map((r: any) => ({ ...r }));
    } catch (err) {
      console.error('Error fetching routines via adapter:', err);
      // Fallback to localStorage to preserve previous behavior if adapter fails
      try {
        const routines: VisualRoutine[] = JSON.parse(localStorage.getItem('vs-routines') || '[]');
        return routines;
      } catch (e) {
        return [];
      }
    }
  },

  async createRoutine(routine: VisualRoutine): Promise<VisualRoutine> {
    await mockDelay();
    try {
      const created = await supabaseService.createVisualRoutine(routine);
      return created as VisualRoutine;
    } catch (err) {
      console.error('Failed to create routine via adapter, falling back to localStorage:', err);
      const routines = JSON.parse(localStorage.getItem('vs-routines') || '[]');
      routines.push(routine);
      localStorage.setItem('vs-routines', JSON.stringify(routines));
      return routine;
    }
  },

  async updateRoutine(id: string, updates: Partial<VisualRoutine>): Promise<VisualRoutine> {
    await mockDelay();
    try {
      const updated = await supabaseService.updateVisualRoutine(id, updates);
      return updated as VisualRoutine;
    } catch (err) {
      console.error('Failed to update routine via adapter, falling back to localStorage:', err);
      const routines: VisualRoutine[] = JSON.parse(localStorage.getItem('vs-routines') || '[]');
      const index = routines.findIndex(r => r.id === id);
      if (index === -1) throw new Error('Routine not found');
      routines[index] = { ...routines[index], ...updates, updatedAt: new Date() };
      localStorage.setItem('vs-routines', JSON.stringify(routines));
      return routines[index];
    }
  },

  async deleteRoutine(id: string): Promise<void> {
    await mockDelay();
    try {
      await supabaseService.deleteVisualRoutine(id);
    } catch (err) {
      console.error('Failed to delete routine via adapter, falling back to localStorage:', err);
      const routines: VisualRoutine[] = JSON.parse(localStorage.getItem('vs-routines') || '[]');
      const filtered = routines.filter(r => r.id !== id);
      localStorage.setItem('vs-routines', JSON.stringify(filtered));
      return;
    }
  },

  // Mood Tracking
  async getMoodEntries(): Promise<MoodEntry[]> {
    await mockDelay();
    try {
      const entries = await supabaseService.getMoodEntries();
      return (entries || []).map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
    } catch (err) {
      console.error('Failed to load mood entries via adapter, falling back to localStorage:', err);
      const entries: MoodEntry[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]').map((entry: any) => ({ ...entry, timestamp: new Date(entry.timestamp) }));
      return entries;
    }
  },

  async createMoodEntry(entry: MoodEntry): Promise<MoodEntry> {
    await mockDelay();
    try {
      const created = await supabaseService.createMoodEntry(entry);
      return { ...created, timestamp: new Date(created.timestamp) } as MoodEntry;
    } catch (err) {
      console.error('Failed to create mood entry via adapter, falling back to localStorage:', err);
      const entries = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
      entries.push(entry);
      localStorage.setItem('vs-mood-entries', JSON.stringify(entries));
      return entry;
    }
  },

  async updateMoodEntry(id: string, updates: Partial<MoodEntry>): Promise<MoodEntry> {
    await mockDelay();
    try {
      const updated = await supabaseService.updateMoodEntry(id, updates);
      return { ...updated, timestamp: new Date(updated.timestamp) } as MoodEntry;
    } catch (err) {
      console.error('Failed to update mood entry via adapter, falling back to localStorage:', err);
      const entries: MoodEntry[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
      const index = entries.findIndex(e => e.id === id);
      if (index === -1) throw new Error('Mood entry not found');
      entries[index] = { ...entries[index], ...updates };
      localStorage.setItem('vs-mood-entries', JSON.stringify(entries));
      return entries[index];
    }
  },

  async deleteMoodEntry(id: string): Promise<void> {
    await mockDelay();
    try {
      await supabaseService.deleteMoodEntry(id);
    } catch (err) {
      console.error('Failed to delete mood entry via adapter, falling back to localStorage:', err);
      const entries: MoodEntry[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
      const filtered = entries.filter(e => e.id !== id);
      localStorage.setItem('vs-mood-entries', JSON.stringify(filtered));
      return;
    }
  },

  // Sensory Preferences
  async getSensoryPreferences(): Promise<SensoryPreferences | null> {
    await mockDelay();
    try {
      const prefs = await supabaseService.getSensoryPreferences();
      return prefs as SensoryPreferences | null;
    } catch (err) {
      console.error('Failed to get sensory preferences via adapter, falling back to localStorage:', err);
      const prefs = localStorage.getItem('vs-sensory-preferences');
      if (!prefs) return null;
      const parsed = JSON.parse(prefs);
      return { ...parsed, timestamp: new Date(parsed.timestamp), updatedAt: new Date(parsed.updatedAt) } as SensoryPreferences;
    }
  },

  async updateSensoryPreferences(preferences: SensoryPreferences): Promise<SensoryPreferences> {
    await mockDelay();
    try {
      const updated = await supabaseService.updateSensoryPreferences(preferences);
      return updated as SensoryPreferences;
    } catch (err) {
      console.error('Failed to update sensory preferences via adapter, falling back to localStorage:', err);
      localStorage.setItem('vs-sensory-preferences', JSON.stringify(preferences));
      return preferences;
    }
  },

  // File Upload (for routine step images/icons)
  async uploadFile(file: File): Promise<string> {
    await mockDelay();
    try {
      const url = await supabaseService.uploadFile(file);
      return url;
    } catch (err) {
      console.error('Failed to upload file via adapter, falling back to data URL:', err);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  },

  // Health check
  async ping(): Promise<boolean> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) return true;
    try {
      // Simple lightweight check
      const { data, error } = await supabase.rpc('health_check');
      if (error) {
        console.warn('Supabase health check RPC failed, falling back to auth check', error);
        const session = await supabase.auth.getSession();
        return !!session;
      }
      return true;
    } catch (err) {
      console.error('Ping failed:', err);
      return false;
    }
  }
};