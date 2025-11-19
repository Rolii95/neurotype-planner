import { VisualRoutine, MoodEntry, SensoryPreferences } from '../types';
import { supabase, isSupabaseDemoMode } from '../../../services/supabase';

const MOCK_DELAY = 500;
const mockDelay = () => new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

// API backed by Supabase with demo-mode fallbacks
export const visualSensoryAPI = {
  // Routine Management
  async getRoutines(): Promise<VisualRoutine[]> {
    await mockDelay();

    if (isSupabaseDemoMode || !supabase) {
      const routines: VisualRoutine[] = JSON.parse(localStorage.getItem('vs-routines') || '[]');
      return routines;
    }

    try {
      const { data, error } = await supabase.from('visual_routines').select('*').order('updated_at', { ascending: false }).limit(200);
      if (error) {
        console.error('Failed to load visual routines:', error);
        return [];
      }
      return (data || []).map((r: any) => ({ ...r }));
    } catch (err) {
      console.error('Error fetching routines:', err);
      return [];
    }
  },

  async createRoutine(routine: VisualRoutine): Promise<VisualRoutine> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) {
      const routines = JSON.parse(localStorage.getItem('vs-routines') || '[]');
      routines.push(routine);
      localStorage.setItem('vs-routines', JSON.stringify(routines));
      return routine;
    }

    try {
      const { data, error } = await supabase.from('visual_routines').insert([{ ...routine }]).select().single();
      if (error) throw error;
      return data as VisualRoutine;
    } catch (err) {
      console.error('Failed to create routine:', err);
      throw err;
    }
  },

  async updateRoutine(id: string, updates: Partial<VisualRoutine>): Promise<VisualRoutine> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) {
      const routines: VisualRoutine[] = JSON.parse(localStorage.getItem('vs-routines') || '[]');
      const index = routines.findIndex(r => r.id === id);
      if (index === -1) throw new Error('Routine not found');
      routines[index] = { ...routines[index], ...updates, updatedAt: new Date() };
      localStorage.setItem('vs-routines', JSON.stringify(routines));
      return routines[index];
    }

    try {
      const { data, error } = await supabase.from('visual_routines').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data as VisualRoutine;
    } catch (err) {
      console.error('Failed to update routine:', err);
      throw err;
    }
  },

  async deleteRoutine(id: string): Promise<void> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) {
      const routines: VisualRoutine[] = JSON.parse(localStorage.getItem('vs-routines') || '[]');
      const filtered = routines.filter(r => r.id !== id);
      localStorage.setItem('vs-routines', JSON.stringify(filtered));
      return;
    }

    try {
      const { error } = await supabase.from('visual_routines').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete routine:', err);
      throw err;
    }
  },

  // Mood Tracking
  async getMoodEntries(): Promise<MoodEntry[]> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) {
      const entries: MoodEntry[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]').map((entry: any) => ({ ...entry, timestamp: new Date(entry.timestamp) }));
      return entries;
    }

    try {
      const { data, error } = await supabase.from('mood_entries').select('*').order('timestamp', { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []).map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
    } catch (err) {
      console.error('Failed to load mood entries:', err);
      return [];
    }
  },

  async createMoodEntry(entry: MoodEntry): Promise<MoodEntry> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) {
      const entries = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
      entries.push(entry);
      localStorage.setItem('vs-mood-entries', JSON.stringify(entries));
      return entry;
    }

    try {
      const { data, error } = await supabase.from('mood_entries').insert([{ ...entry }]).select().single();
      if (error) throw error;
      return { ...data, timestamp: new Date(data.timestamp) } as MoodEntry;
    } catch (err) {
      console.error('Failed to create mood entry:', err);
      throw err;
    }
  },

  async updateMoodEntry(id: string, updates: Partial<MoodEntry>): Promise<MoodEntry> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) {
      const entries: MoodEntry[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
      const index = entries.findIndex(e => e.id === id);
      if (index === -1) throw new Error('Mood entry not found');
      entries[index] = { ...entries[index], ...updates };
      localStorage.setItem('vs-mood-entries', JSON.stringify(entries));
      return entries[index];
    }

    try {
      const { data, error } = await supabase.from('mood_entries').update({ ...updates }).eq('id', id).select().single();
      if (error) throw error;
      return { ...data, timestamp: new Date(data.timestamp) } as MoodEntry;
    } catch (err) {
      console.error('Failed to update mood entry:', err);
      throw err;
    }
  },

  async deleteMoodEntry(id: string): Promise<void> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) {
      const entries: MoodEntry[] = JSON.parse(localStorage.getItem('vs-mood-entries') || '[]');
      const filtered = entries.filter(e => e.id !== id);
      localStorage.setItem('vs-mood-entries', JSON.stringify(filtered));
      return;
    }

    try {
      const { error } = await supabase.from('mood_entries').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete mood entry:', err);
      throw err;
    }
  },

  // Sensory Preferences
  async getSensoryPreferences(): Promise<SensoryPreferences | null> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) {
      const prefs = localStorage.getItem('vs-sensory-preferences');
      if (!prefs) return null;
      const parsed = JSON.parse(prefs);
      return { ...parsed, timestamp: new Date(parsed.timestamp), updatedAt: new Date(parsed.updatedAt) };
    }

    try {
      const { data, error } = await supabase.from('sensory_preferences').select('*').limit(1).single();
      if (error) {
        if (error.code === 'PGRST116') return null; // no rows
        throw error;
      }
      return { ...data, timestamp: new Date(data.timestamp), updatedAt: new Date(data.updated_at) } as SensoryPreferences;
    } catch (err) {
      console.error('Failed to get sensory preferences:', err);
      return null;
    }
  },

  async updateSensoryPreferences(preferences: SensoryPreferences): Promise<SensoryPreferences> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase) {
      localStorage.setItem('vs-sensory-preferences', JSON.stringify(preferences));
      return preferences;
    }

    try {
      const payload = { ...preferences } as any;
      payload.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('sensory_preferences').upsert(payload, { onConflict: 'user_id' }).select().single();
      if (error) throw error;
      return { ...data, timestamp: new Date(data.timestamp), updatedAt: new Date(data.updated_at) } as SensoryPreferences;
    } catch (err) {
      console.error('Failed to update sensory preferences:', err);
      throw err;
    }
  },

  // File Upload (for routine step images/icons)
  async uploadFile(file: File): Promise<string> {
    await mockDelay();
    if (isSupabaseDemoMode || !supabase || !supabase.storage) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    try {
      const bucket = 'routine-assets';
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { data, error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;
      const { data: publicData } = await supabase.storage.from(bucket).getPublicUrl(path);
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