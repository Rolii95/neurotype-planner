import { UserActivity, SmartSuggestion, QuickEntry, ActivitySession } from '../types';
import { supabase, isSupabaseDemoMode, supabaseService } from '../../../services/supabase';

// Mock API service for Adaptive Smart Functions
// This will be replaced with real Supabase integration

class AdaptiveSmartAPIService {
  private baseDelay = 100; // Simulate network delay

  private async delay(ms: number = this.baseDelay): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Activity Management
  async logActivity(activity: UserActivity): Promise<void> {
    await this.delay();

    try {
      if (isSupabaseDemoMode || !supabase) {
        // Fallback to localStorage in demo mode
        const stored = this.getStoredActivities();
        stored.push(activity);
        if (stored.length > 1000) stored.splice(0, stored.length - 1000);
        localStorage.setItem('adaptiveSmart_activities', JSON.stringify(stored));
        return;
      }

      // Use supabaseService helper for user_activity table to keep behavior consistent
      const durationMinutes =
        activity.durationMinutes ?? (activity.context?.duration ? Math.round((activity.context.duration as number) / 60) : 0);

      await supabaseService.updateUserActivity({
        activity_type: activity.action,
        entity_id: activity.entityId,
        entity_type: activity.entityType,
        duration_minutes: durationMinutes,
        context: activity.context || {},
        started_at: activity.timestamp,
        ended_at: activity.timestamp,
        user_id: activity.userId,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      throw new Error('Activity logging failed');
    }
  }

  async getActivities(userId: string, limit: number = 100): Promise<UserActivity[]> {
    await this.delay();

    try {
      if (isSupabaseDemoMode || !supabase) {
        const stored = this.getStoredActivities();
        return stored
          .filter((a) => a.userId === userId)
          .slice(0, limit)
          .map((a) => ({
            ...a,
            durationMinutes: a.durationMinutes ?? (a.context?.duration ? Math.round((a.context.duration as number) / 60) : 0),
          }));
      }

      const { data, error } = await supabase
        .from('adaptive_activities')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Supabase error fetching adaptive activities:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        action: row.activity_type,
        entityId: row.entity_id,
        entityType: row.entity_type,
        timestamp: new Date(row.timestamp),
        durationMinutes: row.duration_minutes,
        context: row.context || {},
      }));
    } catch (error) {
      console.error('Failed to get activities:', error);
      return [];
    }
  }

  async getActivitySessions(userId: string, timeRange: 'day' | 'week' | 'month' = 'day'): Promise<ActivitySession[]> {
    await this.delay();
    
    try {
      const activities = await this.getActivities(userId, 1000);
      
      // Group activities into sessions (simplified logic)
      const sessions: ActivitySession[] = [];
      let currentSession: ActivitySession | null = null;
      
      activities.forEach(activity => {
        if (!currentSession || this.shouldStartNewSession(currentSession, activity)) {
          if (currentSession) {
            currentSession.endTime = new Date();
            sessions.push(currentSession);
          }
          
          currentSession = {
            id: crypto.randomUUID(),
            userId,
            startTime: activity.timestamp,
            activities: [activity],
            summary: {
              totalDuration: 0,
              pagesVisited: 1,
              actionsPerformed: 1,
            },
          };
        } else {
          currentSession.activities.push(activity);
          currentSession.summary.actionsPerformed++;
          if (activity.action === 'navigation') {
            currentSession.summary.pagesVisited++;
          }
        }
      });

      if (currentSession) {
        sessions.push(currentSession);
      }

      return sessions;
    } catch (error) {
      console.error('Failed to get activity sessions:', error);
      return [];
    }
  }

  // Suggestion Management
  async getSuggestions(userId: string, context?: { neurotype?: string; recentActivities?: UserActivity[] }): Promise<SmartSuggestion[]> {
    await this.delay(200);

    try {
      // First fetch persisted suggestions from Supabase
      let persisted: SmartSuggestion[] = [];
      if (isSupabaseDemoMode || !supabase) {
        const stored = this.getStoredSuggestions();
        persisted = stored.filter(s => s.userId === userId && s.status === 'pending');
      } else {
        const { data, error } = await supabase
          .from('adaptive_suggestions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Failed to load persisted suggestions:', error);
        } else {
          persisted = (data || []).map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            type: r.type,
            title: r.title,
            message: r.message,
            priority: r.priority,
            confidence: r.confidence,
            context: r.context || {},
            actions: r.actions || [],
            createdAt: new Date(r.created_at),
            expiresAt: r.expires_at ? new Date(r.expires_at) : undefined,
            status: r.status,
          }));
        }
      }

      // Merge with generated suggestions
      const generated = this.generateMockSuggestions(userId, context);
      const now = new Date();
      const allSuggestions = [...persisted, ...generated];
      return allSuggestions.filter(s => !s.expiresAt || s.expiresAt > now);

    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }

  async updateSuggestion(suggestionId: string, updates: Partial<SmartSuggestion>): Promise<void> {
    await this.delay();
    
    try {
      if (isSupabaseDemoMode || !supabase) {
        const stored = this.getStoredSuggestions();
        const index = stored.findIndex(s => s.id === suggestionId);
        if (index !== -1) {
          stored[index] = { ...stored[index], ...updates };
          localStorage.setItem('adaptiveSmart_suggestions', JSON.stringify(stored));
        }
        return;
      }

      const payload: any = { ...updates };
      if (payload.expiresAt instanceof Date) payload.expires_at = payload.expiresAt.toISOString();
      delete payload.expiresAt;

      const { error } = await supabase.from('adaptive_suggestions').update(payload).eq('id', suggestionId);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to update suggestion:', error);
      throw new Error('Suggestion update failed');
    }
  }

  // Quick Entry Management
  async createQuickEntry(entry: QuickEntry): Promise<void> {
    await this.delay();
    
    try {
      if (isSupabaseDemoMode || !supabase) {
        const stored = this.getStoredQuickEntries();
        stored.push(entry);
        localStorage.setItem('adaptiveSmart_quickEntries', JSON.stringify(stored));
        return;
      }

      const { error } = await supabase.from('adaptive_quick_entries').insert([{ ...entry }]);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to create quick entry:', error);
      throw new Error('Quick entry creation failed');
    }
  }

  async getQuickEntries(userId: string): Promise<QuickEntry[]> {
    await this.delay();
    
    try {
      if (isSupabaseDemoMode || !supabase) {
        const stored = this.getStoredQuickEntries();
        return stored.filter(entry => entry.userId === userId);
      }

      const { data, error } = await supabase
        .from('adaptive_quick_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to fetch quick entries:', error);
        return [];
      }

      return (data || []).map((r: any) => ({ ...r }));
    } catch (error) {
      console.error('Failed to get quick entries:', error);
      return [];
    }
  }

  async processQuickEntry(entryId: string): Promise<any> {
    await this.delay(500);

    try {
      if (isSupabaseDemoMode || !supabase) {
        return {
          intent: 'task_creation',
          entities: ['meeting', 'tomorrow', '2pm'],
          sentiment: 'neutral' as const,
          category: 'work',
        };
      }

      try {
        const result = await supabaseService.invokeFunction('process_quick_entry', { entryId });
        return result;
      } catch (err) {
        console.warn('Edge function processing failed; falling back to mock', err);
        return {
          intent: 'task_creation',
          entities: ['meeting', 'tomorrow', '2pm'],
          sentiment: 'neutral' as const,
          category: 'work',
        };
      }
    } catch (error) {
      console.error('Failed to process quick entry:', error);
      throw new Error('Quick entry processing failed');
    }
  }

  async deleteQuickEntry(entryId: string): Promise<void> {
    await this.delay();
    
    try {
      if (isSupabaseDemoMode || !supabase) {
        const stored = this.getStoredQuickEntries();
        const filtered = stored.filter(entry => entry.id !== entryId);
        localStorage.setItem('adaptiveSmart_quickEntries', JSON.stringify(filtered));
        return;
      }

      const { error } = await supabase.from('adaptive_quick_entries').delete().eq('id', entryId);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete quick entry:', error);
      throw new Error('Quick entry deletion failed');
    }
  }

  // Helper methods
  private getStoredActivities(): UserActivity[] {
    try {
      const stored = localStorage.getItem('adaptiveSmart_activities');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getStoredSuggestions(): SmartSuggestion[] {
    try {
      const stored = localStorage.getItem('adaptiveSmart_suggestions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getStoredQuickEntries(): QuickEntry[] {
    try {
      const stored = localStorage.getItem('adaptiveSmart_quickEntries');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private shouldStartNewSession(currentSession: ActivitySession, newActivity: UserActivity): boolean {
    const lastActivity = currentSession.activities[currentSession.activities.length - 1];
    const timeDiff = newActivity.timestamp.getTime() - lastActivity.timestamp.getTime();
    
    // Start new session if more than 30 minutes gap
    return timeDiff > 30 * 60 * 1000;
  }

  private generateMockSuggestions(userId: string, context?: { neurotype?: string; recentActivities?: UserActivity[] }): SmartSuggestion[] {
    const now = new Date();
    const suggestions: SmartSuggestion[] = [];

    // Break reminder (if user has been active for a while)
    if (context?.recentActivities && context.recentActivities.length > 5) {
      suggestions.push({
        id: crypto.randomUUID(),
        userId,
        type: 'break',
        title: 'Time for a break?',
        message: 'You\'ve been active for a while. Consider taking a 5-minute break to recharge.',
        priority: 'medium',
        confidence: 75,
        context: {
          basedOn: ['activity-duration', 'neurotype-optimization'],
          neurotype: context.neurotype as any,
        },
        actions: [
          {
            id: 'take-break',
            label: 'Take Break',
            type: 'external',
            style: 'primary',
          },
          {
            id: 'remind-later',
            label: 'Remind Later',
            type: 'dismiss',
            style: 'secondary',
          },
        ],
        createdAt: now,
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
        status: 'pending',
      });
    }

    // Mood check suggestion
    if (Math.random() > 0.7) { // 30% chance
      suggestions.push({
        id: crypto.randomUUID(),
        userId,
        type: 'mood-check',
        title: 'How are you feeling?',
        message: 'Quick mood check-in to help personalize your experience.',
        priority: 'low',
        confidence: 60,
        context: {
          basedOn: ['routine-timing', 'wellbeing-optimization'],
        },
        actions: [
          {
            id: 'mood-check',
            label: 'Check In',
            type: 'navigate',
            payload: '/mood-tracker',
            style: 'primary',
          },
          {
            id: 'skip',
            label: 'Skip',
            type: 'dismiss',
            style: 'ghost',
          },
        ],
        createdAt: now,
        status: 'pending',
      });
    }

    // Task organization suggestion
    if (context?.neurotype === 'adhd') {
      suggestions.push({
        id: crypto.randomUUID(),
        userId,
        type: 'optimization',
        title: 'Organize your tasks',
        message: 'Consider using the Priority Matrix to structure your tasks for better focus.',
        priority: 'medium',
        confidence: 80,
        context: {
          basedOn: ['neurotype-optimization', 'productivity-patterns'],
          neurotype: 'adhd',
        },
        actions: [
          {
            id: 'open-matrix',
            label: 'Open Matrix',
            type: 'navigate',
            payload: '/priority-matrix',
            style: 'primary',
          },
          {
            id: 'not-now',
            label: 'Not Now',
            type: 'dismiss',
            style: 'secondary',
          },
        ],
        createdAt: now,
        status: 'pending',
      });
    }

    return suggestions;
  }
}

// Export singleton instance
export const adaptiveSmartAPI = new AdaptiveSmartAPIService();