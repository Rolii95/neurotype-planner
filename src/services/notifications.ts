import { supabase } from './supabase';
import { Database } from '../types/supabase';

export type NotificationType = 'reminder' | 'celebration' | 'suggestion' | 'warning' | 'update' | 'social';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationAction {
  label: string;
  action: string;
  data?: any;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  actionable: boolean;
  actions?: NotificationAction[];
  scheduled_for?: string;
  delivered_at?: string;
  read_at?: string;
  dismissed_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface NotificationSettings {
  enabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
  };
  taskReminders: {
    enabled: boolean;
    advanceNotice: number; // minutes before due time
    adaptiveTiming: boolean; // adjust based on user patterns
  };
  celebrations: {
    enabled: boolean;
    streaks: boolean;
    milestones: boolean;
  };
  suggestions: {
    enabled: boolean;
    frequency: 'realtime' | 'hourly' | 'daily' | 'never';
  };
  sound: {
    enabled: boolean;
    volume: number; // 0-100
    customSound?: string;
  };
  vibration: boolean;
  neurotype: {
    adhd: {
      gentleReminders: boolean; // Softer, less intrusive
      frequencyLimit: number; // Max notifications per hour
    };
    autism: {
      predictableSchedule: boolean; // Only at set times
      detailedContext: boolean; // More information in notifications
    };
    dyslexia: {
      visualIcons: boolean; // Icon-heavy notifications
      simpleLanguage: boolean; // Clearer, shorter text
    };
  };
}

class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings;
  private notificationQueue: Notification[] = [];
  private isProcessing: boolean = false;

  private constructor() {
    this.settings = this.loadSettings();
    this.requestPermission();
    this.startNotificationWorker();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Load settings from localStorage or defaults
  private loadSettings(): NotificationSettings {
    const stored = localStorage.getItem('notification-settings');
    if (stored) {
      return JSON.parse(stored);
    }

    // Default settings
    return {
      enabled: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      taskReminders: {
        enabled: true,
        advanceNotice: 15,
        adaptiveTiming: true,
      },
      celebrations: {
        enabled: true,
        streaks: true,
        milestones: true,
      },
      suggestions: {
        enabled: true,
        frequency: 'hourly',
      },
      sound: {
        enabled: true,
        volume: 70,
      },
      vibration: true,
      neurotype: {
        adhd: {
          gentleReminders: true,
          frequencyLimit: 3,
        },
        autism: {
          predictableSchedule: true,
          detailedContext: true,
        },
        dyslexia: {
          visualIcons: true,
          simpleLanguage: true,
        },
      },
    };
  }

  // Save settings
  saveSettings(settings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('notification-settings', JSON.stringify(this.settings));
  }

  getSettings(): NotificationSettings {
    return this.settings;
  }

  // Request browser notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Check if currently in quiet hours
  private isQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = this.settings.quietHours;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    
    return currentTime >= start && currentTime < end;
  }

  // Schedule a notification
  async scheduleNotification(
    notification: Omit<Notification, 'id' | 'created_at' | 'user_id'>
  ): Promise<string | null> {
    if (!this.settings.enabled) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      if (notification.metadata?.taskId) {
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .eq('type', notification.type)
          .eq('metadata->>taskId', notification.metadata.taskId);
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // If scheduled for immediate delivery and not in quiet hours
      if (!notification.scheduled_for || new Date(notification.scheduled_for) <= new Date()) {
        if (!this.isQuietHours()) {
          await this.deliverNotification(data as Notification);
        } else {
          // Queue for later delivery
          this.notificationQueue.push(data as Notification);
        }
      }

      return data.id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  // Deliver a notification
  private async deliverNotification(notification: Notification): Promise<void> {
    if (!this.settings.enabled) return;

    // Update delivery timestamp
    await supabase
      .from('notifications')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', notification.id);

    // Show browser notification
    if (Notification.permission === 'granted') {
      const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
        body: notification.message,
        icon: '/icon-192.png',
        badge: '/icon-badge.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        silent: !this.settings.sound.enabled,
      };

      if (this.settings.vibration) {
        notificationOptions.vibrate = [200, 100, 200];
      }

      const browserNotification = new Notification(notification.title, notificationOptions);

      // Play sound if enabled
      if (this.settings.sound.enabled) {
        this.playNotificationSound(notification.type, notification.priority);
      }

      // Handle notification click
      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        browserNotification.close();
        
        // Handle actions if any
        if (notification.actions && notification.actions.length > 0) {
          this.handleNotificationAction(notification.actions[0]);
        }
      };
    }
  }

  // Play notification sound based on type and priority
  private playNotificationSound(type: NotificationType, priority: NotificationPriority): void {
    const audio = new Audio();
    
    // Different sounds for different types
    const soundMap: Record<NotificationType, string> = {
      reminder: '/sounds/gentle-reminder.mp3',
      celebration: '/sounds/celebration.mp3',
      suggestion: '/sounds/soft-ping.mp3',
      warning: '/sounds/alert.mp3',
      update: '/sounds/notification.mp3',
      social: '/sounds/message.mp3',
    };

    audio.src = this.settings.sound.customSound || soundMap[type] || '/sounds/default.mp3';
    audio.volume = this.settings.sound.volume / 100;
    
    // Shorter, softer sound for ADHD users
    if (this.settings.neurotype.adhd.gentleReminders) {
      audio.volume *= 0.7;
    }

    audio.play().catch(err => console.warn('Could not play notification sound:', err));
  }

  // Handle notification action
  private handleNotificationAction(action: NotificationAction): void {
    // Dispatch custom event that can be handled by app
    window.dispatchEvent(new CustomEvent('notification-action', {
      detail: { action: action.action, data: action.data }
    }));
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await this.markNotificationsAsRead([notificationId]);
  }

  // Mark multiple notifications as read
  async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', notificationIds);
  }

  // Dismiss notification
  async dismissNotification(notificationId: string): Promise<void> {
    await this.dismissNotifications([notificationId]);
  }

  // Dismiss multiple notifications
  async dismissNotifications(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .in('id', notificationIds);
  }

  // Get unread notifications
  async getUnreadNotifications(): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .is('read_at', null)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return data as Notification[];
  }

  // Get recent notifications (read + unread, excluding dismissed)
  async getRecentNotifications(limit: number = 25): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return data as Notification[];
  }

  // Get all notifications (including dismissed)
  async getAllNotifications(): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return data as Notification[];
  }

  // Create notification manually
  async createNotification(notification: {
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    actionable: boolean;
    actions?: NotificationAction[];
    scheduled_for?: string | null;
  }): Promise<Notification | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const payload = {
      ...notification,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
      return null;
    }

    const created = data as Notification;

    if (!notification.scheduled_for || new Date(notification.scheduled_for) <= new Date()) {
      await this.deliverNotification(created);
    }

    return created;
  }

  // Update notification content
  async updateNotification(
    notificationId: string,
    updates: Partial<{
      title: string;
      message: string;
      type: NotificationType;
      priority: NotificationPriority;
      actionable: boolean;
      actions?: NotificationAction[];
      scheduled_for?: string | null;
    }>
  ): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update notification:', error);
      return null;
    }

    return data as Notification;
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
    if (error) {
      console.error('Failed to delete notification:', error);
    }
  }

  // Mark notification as unread
  async markAsUnread(notificationId: string): Promise<void> {
    await supabase.from('notifications').update({ read_at: null }).eq('id', notificationId);
  }

  // Start background worker to process queue
  private startNotificationWorker(): void {
    setInterval(() => {
      if (!this.isProcessing && this.notificationQueue.length > 0 && !this.isQuietHours()) {
        this.processNotificationQueue();
      }
    }, 60000); // Check every minute
  }

  // Process queued notifications
  private async processNotificationQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.notificationQueue.length > 0 && !this.isQuietHours()) {
      const notification = this.notificationQueue.shift();
      if (notification) {
        await this.deliverNotification(notification);
        // Add delay between notifications for ADHD users
        if (this.settings.neurotype.adhd.gentleReminders) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    this.isProcessing = false;
  }

  // Subscribe to real-time notification updates
  subscribeToNotifications(callback: (notification: Notification) => void): () => void {
    let subscription: any = null;

    // Get user asynchronously and set up subscription
    supabase.auth.getUser().then((response: { data: { user: { id: string } | null } }) => {
      const user = response?.data?.user;
      if (!user) {
        console.warn('No user found for notification subscription');
        return;
      }

      subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: { new: Notification }) => {
            callback(payload.new);
          }
        )
        .subscribe();
    }).catch((error: unknown) => {
      console.error('Failed to subscribe to notifications:', error);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }

  // Helper: Schedule task reminder
  async scheduleTaskReminder(task: { id: string; title: string; due_date: string }): Promise<void> {
    if (!this.settings.taskReminders.enabled) return;

    const dueDate = new Date(task.due_date);
    const notificationTime = new Date(dueDate.getTime() - this.settings.taskReminders.advanceNotice * 60000);

    await this.scheduleNotification({
      title: '📋 Task Reminder',
      message: `"${task.title}" is due soon`,
      type: 'reminder',
      priority: 'medium',
      actionable: true,
      actions: [
        { label: 'View Task', action: 'navigate', data: { path: `/tasks/${task.id}` } },
        { label: 'Mark Complete', action: 'complete-task', data: { taskId: task.id } },
      ],
      scheduled_for: notificationTime.toISOString(),
      metadata: { taskId: task.id },
    });
  }

  // Helper: Send celebration notification
  async celebrateAchievement(achievement: { title: string; message: string }): Promise<void> {
    if (!this.settings.celebrations.enabled) return;

    await this.scheduleNotification({
      title: `🎉 ${achievement.title}`,
      message: achievement.message,
      type: 'celebration',
      priority: 'low',
      actionable: false,
    });
  }
  async scheduleFocusSessionReminder(params: {
    taskId: string;
    taskTitle: string;
    startTime: string;
  }): Promise<string | null> {
    const start = new Date(params.startTime);
    if (Number.isNaN(start.getTime())) {
      console.warn('Unable to schedule focus reminder - invalid start time', params.startTime);
      return null;
    }

    const reminderLeadMs = 5 * 60 * 1000;
    const reminderTime = new Date(start.getTime() - reminderLeadMs);
    const now = new Date();
    const scheduledFor = reminderTime > now ? reminderTime.toISOString() : now.toISOString();
    const readableTime = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    return this.scheduleNotification({
      title: 'Focus session starts soon',
      message: `Task "${params.taskTitle}" begins at ${readableTime}. Start a Focus session?`,
      type: 'reminder',
      priority: 'high',
      actionable: true,
      actions: [
        {
          label: 'Start Focus Session',
          action: 'navigate',
          data: { path: `/focus?taskId=${params.taskId}` },
        },
        {
          label: 'View Task',
          action: 'navigate',
          data: { path: '/tasks' },
        },
      ],
      scheduled_for: scheduledFor,
      metadata: { taskId: params.taskId },
    });
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;

