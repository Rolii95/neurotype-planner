import { supabase } from './supabase';

export interface PomodoroPreset {
  id: string;
  name: string;
  workDuration: number; // minutes
  breakDuration: number; // minutes
  longBreakDuration: number; // minutes
  sessionsBeforeLongBreak: number;
  neurotype?: 'adhd' | 'autism' | 'dyslexia' | 'general';
  icon: string;
}

export interface BreakActivity {
  id: string;
  name: string;
  duration: number; // minutes
  category: 'movement' | 'sensory' | 'hydration' | 'breathing' | 'stretching' | 'social';
  description: string;
  instructions: string[];
  icon: string;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  preset_id: string;
  start_time: string;
  end_time?: string;
  completed_sessions: number;
  total_work_time: number; // minutes
  total_break_time: number; // minutes
  task_id?: string;
  task_name?: string;
  notes?: string;
  created_at: string;
}

export interface PomodoroStats {
  today_sessions: number;
  today_work_time: number;
  week_sessions: number;
  week_work_time: number;
  total_sessions: number;
  total_work_time: number;
  average_session_length: number;
  longest_streak: number;
  current_streak: number;
}

// Neurotype-optimized presets
export const DEFAULT_PRESETS: PomodoroPreset[] = [
  {
    id: 'adhd-short',
    name: 'ADHD Friendly',
    workDuration: 15,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 3,
    neurotype: 'adhd',
    icon: '⚡',
  },
  {
    id: 'classic',
    name: 'Classic Pomodoro',
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    neurotype: 'general',
    icon: '🍅',
  },
  {
    id: 'autism-structured',
    name: 'Structured Sessions',
    workDuration: 30,
    breakDuration: 10,
    longBreakDuration: 20,
    sessionsBeforeLongBreak: 3,
    neurotype: 'autism',
    icon: '🎯',
  },
  {
    id: 'deep-work',
    name: 'Deep Work',
    workDuration: 50,
    breakDuration: 10,
    longBreakDuration: 30,
    sessionsBeforeLongBreak: 2,
    neurotype: 'general',
    icon: '🧠',
  },
  {
    id: 'micro-sprint',
    name: 'Micro Sprint',
    workDuration: 10,
    breakDuration: 2,
    longBreakDuration: 10,
    sessionsBeforeLongBreak: 5,
    neurotype: 'adhd',
    icon: '⚡',
  },
];

// Break activities suggestions
export const BREAK_ACTIVITIES: BreakActivity[] = [
  {
    id: 'water-break',
    name: 'Hydration Break',
    duration: 2,
    category: 'hydration',
    description: 'Drink a glass of water and stay hydrated',
    instructions: [
      'Get a glass of water',
      'Drink slowly and mindfully',
      'Notice how you feel',
    ],
    icon: '💧',
  },
  {
    id: 'stretch',
    name: 'Quick Stretch',
    duration: 5,
    category: 'stretching',
    description: 'Simple stretches to release tension',
    instructions: [
      'Roll your shoulders back 10 times',
      'Stretch your arms overhead',
      'Tilt your head gently side to side',
      'Roll your wrists and ankles',
    ],
    icon: '🤸',
  },
  {
    id: 'breathing',
    name: 'Box Breathing',
    duration: 3,
    category: 'breathing',
    description: '4-4-4-4 breathing pattern',
    instructions: [
      'Breathe in for 4 counts',
      'Hold for 4 counts',
      'Breathe out for 4 counts',
      'Hold for 4 counts',
      'Repeat 4 times',
    ],
    icon: '🌬️',
  },
  {
    id: 'walk',
    name: 'Walking Break',
    duration: 10,
    category: 'movement',
    description: 'Short walk to refresh your mind',
    instructions: [
      'Stand up and walk around',
      'Go outside if possible',
      'Notice your surroundings',
      'Return feeling refreshed',
    ],
    icon: '🚶',
  },
  {
    id: 'sensory',
    name: 'Sensory Reset',
    duration: 5,
    category: 'sensory',
    description: 'Sensory grounding exercise',
    instructions: [
      'Notice 5 things you can see',
      'Notice 4 things you can touch',
      'Notice 3 things you can hear',
      'Notice 2 things you can smell',
      'Notice 1 thing you can taste',
    ],
    icon: '👁️',
  },
  {
    id: 'social',
    name: 'Social Break',
    duration: 5,
    category: 'social',
    description: 'Quick chat or message a friend',
    instructions: [
      'Send a message to a friend',
      'Have a quick chat',
      'Share something positive',
      'Return to work with a smile',
    ],
    icon: '💬',
  },
];

class PomodoroService {
  // Get user's custom presets or defaults
  async getPresets(userId: string): Promise<PomodoroPreset[]> {
    try {
      // In real implementation, fetch from Supabase
      // const { data, error } = await supabase
      //   .from('pomodoro_presets')
      //   .select('*')
      //   .eq('user_id', userId);
      
      // For now, return defaults
      return DEFAULT_PRESETS;
    } catch (error) {
      console.error('Error fetching presets:', error);
      return DEFAULT_PRESETS;
    }
  }

  // Create custom preset
  async createPreset(userId: string, preset: Omit<PomodoroPreset, 'id'>): Promise<PomodoroPreset> {
    try {
      const newPreset: PomodoroPreset = {
        id: `custom-${Date.now()}`,
        ...preset,
      };

      // In real implementation, save to Supabase
      // const { data, error } = await supabase
      //   .from('pomodoro_presets')
      //   .insert({ ...newPreset, user_id: userId })
      //   .select()
      //   .single();

      return newPreset;
    } catch (error) {
      console.error('Error creating preset:', error);
      throw error;
    }
  }

  // Start a new session
  async startSession(
    userId: string,
    presetId: string,
    taskId?: string,
    taskName?: string
  ): Promise<PomodoroSession> {
    try {
      const session: PomodoroSession = {
        id: `session-${Date.now()}`,
        user_id: userId,
        preset_id: presetId,
        start_time: new Date().toISOString(),
        completed_sessions: 0,
        total_work_time: 0,
        total_break_time: 0,
        task_id: taskId,
        task_name: taskName,
        created_at: new Date().toISOString(),
      };

      // In real implementation, save to Supabase
      // const { data, error } = await supabase
      //   .from('pomodoro_sessions')
      //   .insert(session)
      //   .select()
      //   .single();

      return session;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }

  // Update session progress
  async updateSession(sessionId: string, updates: Partial<PomodoroSession>): Promise<void> {
    try {
      // In real implementation, update Supabase
      // const { error } = await supabase
      //   .from('pomodoro_sessions')
      //   .update(updates)
      //   .eq('id', sessionId);

      console.log('Session updated:', sessionId, updates);
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  // Complete a session
  async completeSession(sessionId: string, notes?: string): Promise<void> {
    try {
      await this.updateSession(sessionId, {
        end_time: new Date().toISOString(),
        notes,
      });
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  // Get statistics
  async getStats(userId: string): Promise<PomodoroStats> {
    try {
      // In real implementation, calculate from Supabase
      // Mock data for now
      return {
        today_sessions: 4,
        today_work_time: 100,
        week_sessions: 23,
        week_work_time: 575,
        total_sessions: 156,
        total_work_time: 3900,
        average_session_length: 25,
        longest_streak: 12,
        current_streak: 5,
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  // Get suggested break activity based on session count and user preferences
  getSuggestedBreakActivity(sessionCount: number, isLongBreak: boolean): BreakActivity {
    if (isLongBreak) {
      // Suggest longer activities for long breaks
      const longBreakActivities = BREAK_ACTIVITIES.filter(
        (a) => a.duration >= 5
      );
      return longBreakActivities[Math.floor(Math.random() * longBreakActivities.length)];
    }

    // Rotate through different categories
    const categories: BreakActivity['category'][] = [
      'hydration',
      'stretching',
      'breathing',
      'movement',
      'sensory',
    ];
    const category = categories[sessionCount % categories.length];
    
    const activities = BREAK_ACTIVITIES.filter((a) => a.category === category);
    return activities[0] || BREAK_ACTIVITIES[0];
  }

  // Get all break activities
  getBreakActivities(): BreakActivity[] {
    return BREAK_ACTIVITIES;
  }

  // Get preset by ID
  getPresetById(presetId: string): PomodoroPreset | undefined {
    return DEFAULT_PRESETS.find((p) => p.id === presetId);
  }
}

export const pomodoroService = new PomodoroService();
