import { supabase } from './supabase';

export interface RoutineAnalyticsSummary {
  daysTracked: number;
  currentStreak: number;
  longestStreak: number;
  totalRoutines: number;
  totalSteps: number;
  totalMinutes: number;
  totalStepMinutes: number;
  lastTrackedDate: string | null;
}

interface RoutineAnalyticsViewRow {
  user_id: string;
  total_routines: number | null;
  total_steps: number | null;
  total_minutes: number | null;
  total_step_minutes: number | null;
  days_tracked: number | null;
  last_tracked_date: string | null;
}

interface RoutineExecutionDateRow {
  started_at: string;
}

const formatDateKey = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

const calculateStreaks = (dates: string[]): { current: number; longest: number } => {
  if (!dates.length) {
    return { current: 0, longest: 0 };
  }

  const uniqueSet = new Set(dates);
  const unique = Array.from(uniqueSet).sort(); // ascending
  let longest = 0;
  let current = 0;
  let previousDate: Date | null = null;

  unique.forEach((dateString) => {
    const currentDate = new Date(dateString);

    if (!previousDate) {
      current = 1;
    } else {
      const diffDays = Math.round(
        (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        current += 1;
      } else if (diffDays === 0) {
        // same day already handled by Set
      } else {
        current = 1;
      }
    }

    longest = Math.max(longest, current);
    previousDate = currentDate;
  });

  // Determine current streak relative to today
  const todayKey = formatDateKey(new Date().toISOString());
  let currentStreak = 0;
  let cursor = new Date(todayKey);

  while (true) {
    const key = formatDateKey(cursor.toISOString());
    if (uniqueSet.has(key)) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { current: currentStreak, longest };
};

export const routineAnalyticsService = {
  async fetchSummary(): Promise<RoutineAnalyticsSummary> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      throw authError;
    }
    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const summaryRes = await supabase
      .from('routine_analytics_view')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const execRes = await supabase
      .from('routine_executions')
      .select('started_at')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(365);

    if (summaryRes.error) throw summaryRes.error;
    if (execRes.error) throw execRes.error;

    const summaryRow = summaryRes.data as RoutineAnalyticsViewRow | null;
    const executionRows = (execRes.data as RoutineExecutionDateRow[] | null) ?? [];

    const dateKeys = executionRows.map((row: RoutineExecutionDateRow) => formatDateKey(row.started_at));
    const { current, longest } = calculateStreaks(dateKeys);

    return {
      daysTracked: summaryRow?.days_tracked ?? 0,
      currentStreak: current,
      longestStreak: longest,
      totalRoutines: summaryRow?.total_routines ?? 0,
      totalSteps: summaryRow?.total_steps ?? 0,
      totalMinutes: summaryRow?.total_minutes ?? 0,
      totalStepMinutes: summaryRow?.total_step_minutes ?? 0,
      lastTrackedDate: summaryRow?.last_tracked_date ?? null,
    };
  },
};

export type RoutineAnalyticsService = typeof routineAnalyticsService;
