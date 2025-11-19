import { supabase } from './supabase';

export interface FocusSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration: number; // minutes
  task_id?: string;
  task_name?: string;
  distraction_count: number;
  blocked_sites: string[];
  ambient_sound?: string;
  completed: boolean;
  notes?: string;
  created_at: string;
}

export interface FocusPreferences {
  user_id: string;
  default_duration: number;
  auto_start_timer: boolean;
  block_notifications: boolean;
  block_websites: boolean;
  blocked_sites: string[];
  ambient_sound_enabled: boolean;
  default_ambient_sound?: string;
  ambient_volume: number;
  break_reminder_enabled: boolean;
  break_reminder_interval: number; // minutes
}

export interface AmbientSound {
  id: string;
  name: string;
  description: string;
  file: string;
  icon: string;
  category: 'nature' | 'white-noise' | 'productivity' | 'calm';
  duration?: number; // if looped, undefined
}

// Ambient soundscapes library
export const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    description: 'Soft rainfall with distant thunder',
    file: '/sounds/rain.mp3',
    icon: '🌧️',
    category: 'nature',
  },
  {
    id: 'forest',
    name: 'Forest Ambience',
    description: 'Birds chirping and rustling leaves',
    file: '/sounds/forest.mp3',
    icon: '🌲',
    category: 'nature',
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    description: 'Calming waves on the shore',
    file: '/sounds/ocean.mp3',
    icon: '🌊',
    category: 'nature',
  },
  {
    id: 'cafe',
    name: 'Coffee Shop',
    description: 'Background chatter and espresso machine',
    file: '/sounds/cafe.mp3',
    icon: '☕',
    category: 'productivity',
  },
  {
    id: 'white-noise',
    name: 'White Noise',
    description: 'Pure white noise for blocking distractions',
    file: '/sounds/white-noise.mp3',
    icon: '📻',
    category: 'white-noise',
  },
  {
    id: 'brown-noise',
    name: 'Brown Noise',
    description: 'Deeper frequency for relaxation',
    file: '/sounds/brown-noise.mp3',
    icon: '🎵',
    category: 'white-noise',
  },
  {
    id: 'fireplace',
    name: 'Crackling Fire',
    description: 'Cozy fireplace ambience',
    file: '/sounds/fireplace.mp3',
    icon: '🔥',
    category: 'calm',
  },
  {
    id: 'library',
    name: 'Quiet Library',
    description: 'Subtle page turning and quiet atmosphere',
    file: '/sounds/library.mp3',
    icon: '📚',
    category: 'productivity',
  },
  {
    id: 'thunderstorm',
    name: 'Thunderstorm',
    description: 'Powerful storm with thunder',
    file: '/sounds/thunderstorm.mp3',
    icon: '⚡',
    category: 'nature',
  },
  {
    id: 'wind-chimes',
    name: 'Wind Chimes',
    description: 'Gentle chimes in the breeze',
    file: '/sounds/wind-chimes.mp3',
    icon: '🎐',
    category: 'calm',
  },
];

// Common distracting websites
export const COMMON_DISTRACTING_SITES = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'youtube.com',
  'netflix.com',
  'twitch.tv',
  'discord.com',
  'snapchat.com',
];

class FocusService {
  private currentSession: FocusSession | null = null;
  private distractionCount = 0;

  // Start a focus session
  async startSession(
    userId: string,
    duration: number,
    taskId?: string,
    taskName?: string,
    ambientSound?: string
  ): Promise<FocusSession> {
    try {
      const session: FocusSession = {
        id: `focus-${Date.now()}`,
        user_id: userId,
        start_time: new Date().toISOString(),
        duration,
        task_id: taskId,
        task_name: taskName,
        distraction_count: 0,
        blocked_sites: [],
        ambient_sound: ambientSound,
        completed: false,
        created_at: new Date().toISOString(),
      };

      this.currentSession = session;
      this.distractionCount = 0;

      // In real implementation:
      // const { data, error } = await supabase
      //   .from('focus_sessions')
      //   .insert(session)
      //   .select()
      //   .single();

      return session;
    } catch (error) {
      console.error('Error starting focus session:', error);
      throw error;
    }
  }

  // End focus session
  async endSession(sessionId: string, completed: boolean, notes?: string): Promise<void> {
    try {
      const updates = {
        end_time: new Date().toISOString(),
        completed,
        distraction_count: this.distractionCount,
        notes,
      };

      // In real implementation:
      // const { error } = await supabase
      //   .from('focus_sessions')
      //   .update(updates)
      //   .eq('id', sessionId);

      this.currentSession = null;
      this.distractionCount = 0;

      console.log('Focus session ended:', sessionId, updates);
    } catch (error) {
      console.error('Error ending focus session:', error);
      throw error;
    }
  }

  // Record a distraction
  async recordDistraction(sessionId: string): Promise<void> {
    try {
      this.distractionCount++;

      // In real implementation:
      // const { error } = await supabase
      //   .from('focus_sessions')
      //   .update({ distraction_count: this.distractionCount })
      //   .eq('id', sessionId);

      console.log('Distraction recorded:', sessionId, this.distractionCount);
    } catch (error) {
      console.error('Error recording distraction:', error);
    }
  }

  // Get current session
  getCurrentSession(): FocusSession | null {
    return this.currentSession;
  }

  // Get focus statistics
  async getStats(userId: string): Promise<{
    total_sessions: number;
    total_focus_time: number;
    average_session_length: number;
    completion_rate: number;
    average_distractions: number;
    best_time_of_day: string;
  }> {
    try {
      // In real implementation, aggregate from database
      return {
        total_sessions: 87,
        total_focus_time: 2175, // minutes
        average_session_length: 25,
        completion_rate: 78,
        average_distractions: 2.3,
        best_time_of_day: 'Morning',
      };
    } catch (error) {
      console.error('Error fetching focus stats:', error);
      throw error;
    }
  }

  // Get user preferences
  async getPreferences(userId: string): Promise<FocusPreferences> {
    try {
      // In real implementation:
      // const { data, error } = await supabase
      //   .from('focus_preferences')
      //   .select('*')
      //   .eq('user_id', userId)
      //   .single();

      // Default preferences
      return {
        user_id: userId,
        default_duration: 25,
        auto_start_timer: true,
        block_notifications: true,
        block_websites: false,
        blocked_sites: [],
        ambient_sound_enabled: true,
        default_ambient_sound: 'rain',
        ambient_volume: 50,
        break_reminder_enabled: true,
        break_reminder_interval: 25,
      };
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  }

  // Update preferences
  async updatePreferences(userId: string, updates: Partial<FocusPreferences>): Promise<void> {
    try {
      // In real implementation:
      // const { error } = await supabase
      //   .from('focus_preferences')
      //   .upsert({ user_id: userId, ...updates });

      console.log('Preferences updated:', userId, updates);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  // Get ambient sounds
  getAmbientSounds(): AmbientSound[] {
    return AMBIENT_SOUNDS;
  }

  // Get sound by ID
  getSoundById(soundId: string): AmbientSound | undefined {
    return AMBIENT_SOUNDS.find((s) => s.id === soundId);
  }

  // Block notifications (browser API)
  async blockNotifications(): Promise<void> {
    try {
      // Request notification permission to show our own notifications
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      // Store original notification permission
      console.log('Notifications blocked for focus session');
    } catch (error) {
      console.error('Error blocking notifications:', error);
    }
  }

  // Unblock notifications
  async unblockNotifications(): Promise<void> {
    console.log('Notifications unblocked');
  }

  // Check if website should be blocked
  shouldBlockWebsite(url: string, blockedSites: string[]): boolean {
    try {
      const hostname = new URL(url).hostname;
      return blockedSites.some((site) => hostname.includes(site));
    } catch {
      return false;
    }
  }

  // Get recommended focus duration based on time of day and user history
  getRecommendedDuration(): number {
    const hour = new Date().getHours();

    // Morning (6-12): Longer sessions
    if (hour >= 6 && hour < 12) return 45;

    // Afternoon (12-17): Medium sessions
    if (hour >= 12 && hour < 17) return 25;

    // Evening (17-22): Shorter sessions
    if (hour >= 17 && hour < 22) return 15;

    // Late night: Very short sessions
    return 10;
  }

  // Enter fullscreen mode for distraction-free experience
  async enterFullscreen(element?: HTMLElement): Promise<void> {
    try {
      const elem = element || document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
    } catch (error) {
      console.error('Error entering fullscreen:', error);
    }
  }

  // Exit fullscreen mode
  async exitFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  }
}

export const focusService = new FocusService();
