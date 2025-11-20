import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from './ToastContext';

export type ActivityType =
  | 'task-completed'
  | 'suggestion-dismissed'
  | 'suggestion-applied'
  | 'time-block-created'
  | 'auto-plan'
  | 'integration'
  | 'notification'
  | 'other';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string; // ISO
  meta?: Record<string, any> | null;
}

interface ActivityLogContextType {
  activities: ActivityEntry[];
  logActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => string;
  clear: () => void;
}

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

export const useActivityLog = () => {
  const ctx = useContext(ActivityLogContext);
  if (!ctx) throw new Error('useActivityLog must be used within ActivityLogProvider');
  return ctx;
};

export const ActivityLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<ActivityEntry[]>(() => {
    try {
      const raw = localStorage.getItem('activityLog');
      if (raw) return JSON.parse(raw) as ActivityEntry[];
    } catch (e) {
      // ignore
    }
    return [];
  });

  const toast = useToast();

  useEffect(() => {
    try {
      localStorage.setItem('activityLog', JSON.stringify(activities));
    } catch (e) {
      // ignore
    }
  }, [activities]);

  const logActivity = useCallback((entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const full: ActivityEntry = {
      id,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    setActivities((prev) => [full, ...prev].slice(0, 200));

    // Show an inline toast for important actions
    if (entry.type === 'task-completed') {
      toast.success(entry.message, 4000);
    } else if (entry.type === 'suggestion-dismissed') {
      toast.info(entry.message, 3500);
    } else if (entry.type === 'suggestion-applied') {
      toast.success(entry.message, 3500);
    } else if (entry.type === 'time-block-created') {
      toast.success(entry.message, 3500);
    } else {
      toast.info(entry.message, 3000);
    }

    return id;
  }, [toast]);

  const clear = useCallback(() => {
    setActivities([]);
  }, []);

  // Expose a global API for non-React callers (stores, services)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__logActivity = (payload: { type: ActivityType; message: string; meta?: Record<string, any> | null }) => {
      try {
        logActivity({ type: payload.type, message: payload.message, meta: payload.meta ?? null });
      } catch (e) {
        console.debug('Failed to handle global logActivity', e);
      }
    };

    return () => {
      try {
        delete (window as any).__logActivity;
      } catch (e) {
        // ignore
      }
    };
  }, [logActivity]);

  return (
    <ActivityLogContext.Provider value={{ activities, logActivity, clear }}>
      {children}
    </ActivityLogContext.Provider>
  );
};

// Add TypeScript declaration for the global helper
declare global {
  interface Window {
    __logActivity?: (payload: { type: ActivityType; message: string; meta?: Record<string, any> | null }) => void;
  }
}

export default ActivityLogProvider;
