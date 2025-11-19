import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChartPieIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FaceSmileIcon,
  FireIcon,
  LightBulbIcon,
  RectangleGroupIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { PriorityMatrix } from '../components/PriorityMatrix';
import { TimeBlockingCalendar } from '../components/TimeBlocking/TimeBlockingCalendar';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  rectIntersection,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useToast } from '../contexts/ToastContext';
import { TaskTemplates } from '../components/Templates/TaskTemplates';
import { AISuggestions } from '../components/AI/AISuggestions';
import { AnalyticsDashboard } from '../components/Analytics/AnalyticsDashboard';
import {
  AdaptiveSmartProvider,
  ActivityRecallBanner,
  QuickEntryComponent,
  ActivityInsights,
  SuggestionEngine,
} from '../features/adaptiveSmart';
import type {
  ActivityInsightCategory,
  ActivityInsightItem,
} from '../features/adaptiveSmart/components/ActivityInsights';
import { useMatrixStore } from '../stores/useMatrixStore';
import { VisualSensoryProvider, useVisualSensory } from '../features/visualSensoryTools';
import type { MoodEntry } from '../features/visualSensoryTools';
import SensoryNutritionWidget from '../components/Health/SensoryNutritionWidget';
import { useUserPersona } from '../hooks/useUserPersona';
import { ENERGY_FACTOR_MAP } from '../constants/energyFactors';
import {
  routineAnalyticsService,
  type RoutineAnalyticsSummary,
} from '../services/routineAnalyticsService';

const MOOD_LEVELS = [
  { value: 1, label: 'Very low', emoji: '😢', accent: 'text-red-600', softBg: 'bg-red-50' },
  { value: 2, label: 'Low', emoji: '😕', accent: 'text-orange-600', softBg: 'bg-orange-50' },
  { value: 3, label: 'Neutral', emoji: '😐', accent: 'text-amber-600', softBg: 'bg-amber-50' },
  { value: 4, label: 'Good', emoji: '🙂', accent: 'text-emerald-600', softBg: 'bg-emerald-50' },
  { value: 5, label: 'Great', emoji: '😊', accent: 'text-indigo-600', softBg: 'bg-indigo-50' },
] as const;

const ENERGY_LEVELS = [
  { value: 1, label: 'Depleted', icon: '🔋', accent: 'text-red-600', softBg: 'bg-red-50' },
  { value: 2, label: 'Running low', icon: '🔋', accent: 'text-orange-600', softBg: 'bg-orange-50' },
  { value: 3, label: 'Steady', icon: '🔋', accent: 'text-amber-600', softBg: 'bg-amber-50' },
  { value: 4, label: 'Productive', icon: '⚡', accent: 'text-emerald-600', softBg: 'bg-emerald-50' },
  { value: 5, label: 'Fully charged', icon: '⚡', accent: 'text-indigo-600', softBg: 'bg-indigo-50' },
] as const;

const TREND_THRESHOLD = 0.2;

const clampToScale = (value: number | undefined, min: number, max: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
};

const ensureDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

const formatEntryMoment = (entry: MoodEntry | null) => {
  if (!entry) return '';
  const day = entry.timestamp.toLocaleDateString(undefined, { weekday: 'short' });
  const time = entry.timestamp.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (entry.context?.activity) {
    return `${entry.context.activity} on ${day} at ${time}`;
  }
  if (entry.context?.location) {
    return `${day} at ${time} in ${entry.context.location}`;
  }
  return `${day} at ${time}`;
};

interface QuickActionDefinition {
  id: string;
  title: string;
  description: string;
  className: string;
  icon: ReactNode;
  action: () => void;
}

const DashboardContent: React.FC = () => {
  const {
    tasks,
    quadrants,
    timeBlocks,
    aiSuggestions,
    isLoading: matrixLoading,
    error: matrixError,
    analytics,
    syncWithSupabase,
    clearError,
    moveTask,
    updateTask,
    addTask,
  } = useMatrixStore();
  const navigate = useNavigate();
  const {
    moodEntries,
    currentMood,
    isLoading: moodLoading,
    error: moodError,
    syncWithServer: syncMoodData,
  } = useVisualSensory();

  const [showEmptyState, setShowEmptyState] = useState(false);
  const [activeTool, setActiveTool] = useState<
    'matrix' | 'time-blocking' | 'templates' | 'ai' | 'analytics' | 'assistant' | null
  >(null);
  // DnD state for cross-tool drag
  const [activeDragTask, setActiveDragTask] = useState<any | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const toast = useToast();
  const { ageGroup, persona } = useUserPersona();
  const [routineInsightItems, setRoutineInsightItems] = useState<ActivityInsightItem[]>([]);

  const buildRoutineInsights = useCallback(
    (summary: RoutineAnalyticsSummary | null): ActivityInsightItem[] => {
      if (!summary) {
        return [
          {
            id: 'routine-start',
            title: 'Create your flow',
            detail: 'Complete a guided routine to unlock personalized insights.',
          },
        ];
      }

      if (summary.totalRoutines === 0) {
        return [
          {
            id: 'routine-first',
            title: 'First routine',
            detail: 'Start your first routine to begin tracking streaks and celebrate wins.',
          },
        ];
      }

      const items: ActivityInsightItem[] = [];
      if (summary.currentStreak >= 1) {
        const title = summary.currentStreak >= 3 ? 'Streak momentum' : 'Streak builder';
        const detail =
          summary.currentStreak >= 3
            ? `You're on a ${summary.currentStreak}-day streak. Keep the chain going!`
            : `Complete routines ${Math.max(1, 3 - summary.currentStreak)} more day(s) in a row to build a consistency streak.`;
        items.push({
          id: 'routine-streak',
          title,
          detail,
          badge: `${summary.currentStreak}d`,
        });
      }

      items.push({
        id: 'routine-steps',
        title: 'Steps completed',
        detail:
          summary.totalSteps >= 40
            ? `You've executed ${summary.totalSteps} steps—great evidence your scaffolds are working.`
            : `Each completed step builds momentum (${summary.totalSteps} done so far).`,
        badge: `${summary.totalSteps}`,
      });

      const minutesFormatter = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remainder = minutes % 60;
        return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
      };

      items.push({
        id: 'routine-minutes',
        title: 'Focused minutes',
        detail: `Logged ${minutesFormatter(summary.totalStepMinutes)} of actual action via routines.`,
        badge: minutesFormatter(summary.totalMinutes),
      });

      if (summary.lastTrackedDate) {
        const lastTracked = new Date(summary.lastTrackedDate);
        const diffDays = Math.floor((Date.now() - lastTracked.getTime()) / (1000 * 60 * 60 * 24));
        items.push({
          id: 'routine-recency',
          title: 'Last run',
          detail:
            diffDays >= 3
              ? `It's been ${diffDays} days since your last run—queue up a shorter routine to restart.`
              : `Last tracked ${diffDays === 0 ? 'today' : `${diffDays} day(s) ago`}. You're staying fresh.`,
          badge: diffDays === 0 ? 'Today' : `${diffDays}d`,
        });
      }

      return items.slice(0, 4);
    },
    []
  );

  const refreshRoutineAnalytics = useCallback(async () => {
    try {
      const summary = await routineAnalyticsService.fetchSummary();
      setRoutineInsightItems(buildRoutineInsights(summary));
    } catch (error) {
      console.error('Failed to load routine analytics:', error);
      setRoutineInsightItems([]);
    }
  }, [buildRoutineInsights]);

  // Initialize data on mount
  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  // Listen for global tool open events (e.g., quick-schedule from TaskCard)
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const custom = e as CustomEvent;
        const tool = custom?.detail?.tool as typeof activeTool | undefined;
        if (tool) setActiveTool(tool);
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('open-tool', handler as EventListener);
    return () => window.removeEventListener('open-tool', handler as EventListener);
  }, []);

  // DnD handlers to coordinate matrix <-> calendar
  const { createTimeBlock } = useMatrixStore();

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = tasks.find((t) => t.id === taskId) || null;
    setActiveDragTask(task);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // optional: show hover states; keep minimal here
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    try {
      const { active, over } = event;
      if (!active) return;
      const taskId = active.id as string;

      // If dropped over a calendar slot (we set data.type === 'calendar-slot')
      const slotData = (over as any)?.data?.current;
      if (slotData && slotData.type === 'calendar-slot') {
        const startISO = slotData.start;
        const endISO = slotData.end;
        if (startISO && endISO) {
          await createTimeBlock(taskId, startISO, endISO);
          toast.success('Task scheduled.');
        }
        setActiveDragTask(null);
        return;
      }

      // If dropped over a quadrant droppable (quadrantId present)
      const quadrantId = (over as any)?.data?.current?.quadrantId || (typeof over?.id === 'string' ? over.id : null);
      if (quadrantId && quadrantId !== (tasks.find(t => t.id === taskId)?.quadrant)) {
        await moveTask(taskId, quadrantId as any);
        toast.success('Task moved in matrix.');
      }
    } catch (err) {
      console.error('Drag end handler error:', err);
    } finally {
      setActiveDragTask(null);
    }
  };

  // Warm mood & energy data
  useEffect(() => {
    const runMoodSync = async () => {
      try {
        await syncMoodData();
      } catch (err) {
        console.error('Failed to sync mood entries:', err);
      }
    };
    void runMoodSync();
  }, []);

  useEffect(() => {
    void refreshRoutineAnalytics();
  }, [refreshRoutineAnalytics]);

  // Check if should show empty state
  useEffect(() => {
    setShowEmptyState(!matrixLoading && tasks.length === 0);
  }, [matrixLoading, tasks.length]);

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';
  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const formatPersonaCopy = (template: string) =>
    template?.includes('{greeting}') ? template.replace('{greeting}', greeting) : template;
  const heroTitle = formatPersonaCopy(persona.heroTitle ?? '{greeting}! Here’s your executive snapshot.');
  const heroSubtitle = formatPersonaCopy(
    persona.heroSubtitle ??
      'Adaptive insights from your routines, tasks, and energy cycles help you focus on what matters now.'
  );
  const personaQuickTip = formatPersonaCopy(
    persona.quickTip ?? 'Use Quick Capture to empty your head before diving into the next block.'
  );
  const personaSections = persona.sections;
  const heroGradient = persona.lookAndFeel?.palette.heroGradient ?? 'linear-gradient(120deg, #0ea5e9, #6366f1)';
  const heroSurface = persona.lookAndFeel?.palette.primary ?? '#312e81';

  const normalizeDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const startOfWeek = (date: Date) => {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
    copy.setDate(diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const endOfWeek = (date: Date) => {
    const copy = startOfWeek(date);
    copy.setDate(copy.getDate() + 6);
    copy.setHours(23, 59, 59, 999);
    return copy;
  };

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const parsedMoodEntries = useMemo(
    () =>
      moodEntries.map((entry) => ({
        ...entry,
        timestamp: ensureDate(entry.timestamp),
      })),
    [moodEntries]
  );

  const normalizedCurrentMood = useMemo(() => {
    if (!currentMood) return null;
    return {
      ...currentMood,
      timestamp: ensureDate(currentMood.timestamp),
    };
  }, [currentMood]);

  const latestMoodEntry = useMemo(() => {
    const combined = [...parsedMoodEntries];
    if (normalizedCurrentMood) {
      combined.push(normalizedCurrentMood);
    }
    if (combined.length === 0) {
      return null;
    }
    combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return combined[0];
  }, [normalizedCurrentMood, parsedMoodEntries]);

  const todaysMoodEntries = useMemo(
    () => parsedMoodEntries.filter((entry) => isSameDay(entry.timestamp, today)),
    [parsedMoodEntries, today]
  );

  const sevenDayMoodWindow = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 6);
    return parsedMoodEntries.filter((entry) => entry.timestamp >= cutoff);
  }, [parsedMoodEntries, today]);

  const moodWindowStats = useMemo(() => {
    if (sevenDayMoodWindow.length === 0) {
      return null;
    }
    const sorted = [...sevenDayMoodWindow].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    const totals = sorted.reduce(
      (acc, entry) => {
        acc.mood += entry.mood;
        acc.energy += entry.energy;
        return acc;
      },
      { mood: 0, energy: 0 }
    );
    const avgMood = totals.mood / sorted.length;
    const avgEnergy = totals.energy / sorted.length;
    const changeMood = sorted.length > 1 ? sorted[sorted.length - 1].mood - sorted[0].mood : 0;
    const changeEnergy =
      sorted.length > 1 ? sorted[sorted.length - 1].energy - sorted[0].energy : 0;
    return {
      avgMood,
      avgEnergy,
      changeMood,
      changeEnergy,
    };
  }, [sevenDayMoodWindow]);

  const moodScore = latestMoodEntry?.mood;
  const energyScore = latestMoodEntry?.energy;
  const moodLevel =
    typeof moodScore === 'number'
      ? MOOD_LEVELS.find(
          (level) => level.value === Math.round(clampToScale(moodScore, 1, MOOD_LEVELS.length))
        ) ?? null
      : null;
  const energyLevel =
    typeof energyScore === 'number'
      ? ENERGY_LEVELS.find(
          (level) => level.value === Math.round(clampToScale(energyScore, 1, ENERGY_LEVELS.length))
        ) ?? null
      : null;

  const moodChange = moodWindowStats?.changeMood ?? 0;
  const energyChange = moodWindowStats?.changeEnergy ?? 0;
  const moodTrendDirection =
    moodChange > TREND_THRESHOLD ? 'up' : moodChange < -TREND_THRESHOLD ? 'down' : 'flat';
  const energyTrendDirection =
    energyChange > TREND_THRESHOLD
      ? 'up'
      : energyChange < -TREND_THRESHOLD
      ? 'down'
      : 'flat';

  const moodSectionLoading = moodLoading && parsedMoodEntries.length === 0;
  const hasMoodData = !!latestMoodEntry || parsedMoodEntries.length > 0;
  const averageMood = moodWindowStats?.avgMood ?? null;
  const averageEnergy = moodWindowStats?.avgEnergy ?? null;
  const averageFocusScore =
    sevenDayMoodWindow.length > 0
      ? sevenDayMoodWindow.reduce((sum, entry) => sum + (entry.focus ?? 0), 0) / sevenDayMoodWindow.length
      : null;

  const highestEnergyEntry = useMemo(() => {
    if (sevenDayMoodWindow.length === 0) return null;
    return sevenDayMoodWindow.reduce<MoodEntry | null>((best, entry) => {
      if (!best || entry.energy > best.energy) {
        return entry;
      }
      return best;
    }, null);
  }, [sevenDayMoodWindow]);

  const highestFocusEntry = useMemo(() => {
    if (sevenDayMoodWindow.length === 0) return null;
    return sevenDayMoodWindow.reduce<MoodEntry | null>((best, entry) => {
      if (!best || entry.focus > best.focus) {
        return entry;
      }
      return best;
    }, null);
  }, [sevenDayMoodWindow]);

  const dominantMoodTag = useMemo<{ tag: string; count: number } | null>(() => {
    if (sevenDayMoodWindow.length === 0) return null;
    const tagCounts = new Map<string, number>();
    sevenDayMoodWindow.forEach((entry) => {
      entry.tags?.forEach((tag) => {
        const normalized = tag.trim();
        if (!normalized) return;
        tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
      });
    });
    let result: { tag: string; count: number } | null = null;
    tagCounts.forEach((count, tag) => {
      if (!result || count > result.count) {
        result = { tag, count };
      }
    });
    return result;
  }, [sevenDayMoodWindow]);

  const dominantEnergyFactor = useMemo<{ factorId: string; count: number } | null>(() => {
    if (sevenDayMoodWindow.length === 0) return null;
    const factorCounts = new Map<string, number>();
    sevenDayMoodWindow.forEach((entry) => {
      entry.energyFactors?.forEach((factorId) => {
        factorCounts.set(factorId, (factorCounts.get(factorId) ?? 0) + 1);
      });
    });
    let result: { factorId: string; count: number } | null = null;
    factorCounts.forEach((count, factorId) => {
      if (!result || count > result.count) {
        result = { factorId, count };
      }
    });
    return result;
  }, [sevenDayMoodWindow]);

  const moodChangeLabel =
    Math.abs(moodChange) < TREND_THRESHOLD
      ? 'steady'
      : `${moodChange > 0 ? '+' : ''}${moodChange.toFixed(1)} vs. start of week`;
  const energyChangeLabel =
    Math.abs(energyChange) < TREND_THRESHOLD
      ? 'steady'
      : `${energyChange > 0 ? '+' : ''}${energyChange.toFixed(1)} vs. start of week`;
  const MoodTrendIcon = moodTrendDirection === 'up' ? ArrowTrendingUpIcon : moodTrendDirection === 'down' ? ArrowTrendingDownIcon : null;
  const EnergyTrendIcon = energyTrendDirection === 'up' ? ArrowTrendingUpIcon : energyTrendDirection === 'down' ? ArrowTrendingDownIcon : null;
  const lastMoodLoggedAt = latestMoodEntry
    ? latestMoodEntry.timestamp.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : null;
  const todaysMoodCount = todaysMoodEntries.length;
  const moodEnergyInsights = useMemo(() => {
    if (sevenDayMoodWindow.length === 0) return [];
    const insights: { id: string; title: string; detail: string }[] = [];
    if (averageMood) {
      insights.push({
        id: 'mood-trend',
        title: 'Mood trend',
        detail: `Averaging ${averageMood.toFixed(1)}/10 this week (${moodChangeLabel}).`,
      });
    }
    if (averageFocusScore && highestFocusEntry) {
      const focusMoment = formatEntryMoment(highestFocusEntry);
      insights.push({
        id: 'focus',
        title: 'Focus signal',
        detail: `Focus averaged ${averageFocusScore.toFixed(1)}/10; strongest during ${focusMoment || 'the latest check-in'}.`,
      });
    }
    if (highestEnergyEntry) {
      const energyMoment = formatEntryMoment(highestEnergyEntry);
      insights.push({
        id: 'energy',
        title: 'Energy peak',
        detail: `Energy reached ${highestEnergyEntry.energy.toFixed(1)}/10 ${energyMoment ? `during ${energyMoment}` : 'this week'}, ${energyChangeLabel}.`,
      });
    }
    if (dominantMoodTag) {
      insights.push({
        id: 'pattern',
        title: 'Notable pattern',
        detail: `"${dominantMoodTag.tag}" popped up ${dominantMoodTag.count}x over the past 7 logs.`,
      });
    }
    if (dominantEnergyFactor) {
      const factor = ENERGY_FACTOR_MAP[dominantEnergyFactor.factorId];
      if (factor) {
        insights.push({
          id: 'energy-factor',
          title: 'Energy influence',
          detail: `${factor.icon} ${factor.label} appeared ${dominantEnergyFactor.count}x this week.`,
        });
      }
    }
    return insights.slice(0, 3);
  }, [
    averageFocusScore,
    averageMood,
    dominantMoodTag,
    dominantEnergyFactor,
    energyChangeLabel,
    highestEnergyEntry,
    highestFocusEntry,
    moodChangeLabel,
    sevenDayMoodWindow.length,
  ]);

  const upcomingTimeBlocks = useMemo(() => {
    const currentTime = Date.now();
    return [...timeBlocks]
      .map((block) => ({
        ...block,
        start: normalizeDate(block.startTime) ?? new Date(block.startTime),
        end: normalizeDate(block.endTime) ?? new Date(block.endTime),
      }))
      .filter((block) => block.start && block.start.getTime() >= currentTime)
      .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
  }, [timeBlocks]);

  const nextTimeBlock = upcomingTimeBlocks[0];
  const heroStats = [
    {
      id: 'tasks',
      label: persona.stats.tasksLabel ?? 'Total tasks',
      value: tasks.length.toString(),
      show: persona.stats.showTasks !== false,
    },
    {
      id: 'completion',
      label: persona.stats.completionLabel ?? 'Completion rate',
      value: `${Math.round(analytics.productivityScore)}%`,
      show: persona.stats.showCompletion !== false,
    },
    {
      id: 'streak',
      label: persona.stats.streakLabel ?? 'Streak',
      value: `${analytics.streakDays} day${analytics.streakDays === 1 ? '' : 's'}`,
      show: persona.stats.showStreak !== false,
    },
    {
      id: 'nextBlock',
      label: persona.stats.nextBlockLabel ?? 'Upcoming block',
      value: nextTimeBlock?.start
        ? new Date(nextTimeBlock.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
        : '—',
      show: persona.stats.showNextBlock !== false,
    },
  ].filter((stat) => stat.show !== false);

  const tasksDueToday = useMemo(() => {
    const dueToday = tasks.filter((task) => {
      if (task.status === 'completed') return false;
      const due = normalizeDate(task.due_date as string | undefined);
      return due ? isSameDay(due, today) : false;
    });

    const doFirstFallback = tasks.filter(
      (task) => task.status !== 'completed' && task.quadrant === 'urgent-important' && !task.due_date
    );

    const fallbackFiltered = doFirstFallback.filter(
      (task) => !dueToday.some((dueTask) => dueTask.id === task.id)
    );

    return [...dueToday, ...fallbackFiltered];
  }, [tasks, today]);

  const overdueTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (task.status === 'completed') return false;
        const due = normalizeDate(task.due_date as string | undefined);
        return due ? due.getTime() < today.getTime() : false;
      }),
    [tasks, today]
  );

  const urgentImportantTasks = useMemo(
    () =>
      tasks
        .filter((task: any) => task.quadrant === 'urgent-important' && task.status !== 'completed')
        .sort((a, b) => {
          const aDue = normalizeDate(a.due_date as string | undefined)?.getTime() ?? Infinity;
          const bDue = normalizeDate(b.due_date as string | undefined)?.getTime() ?? Infinity;
          return aDue - bDue;
        }),
    [tasks]
  );

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => endOfWeek(new Date()), []);

  const tasksScheduledThisWeek = useMemo(
    () =>
      tasks.filter((task) => {
        const due = normalizeDate(task.due_date as string | undefined);
        if (!due) return false;
        return due >= weekStart && due <= weekEnd;
      }),
    [tasks, weekEnd, weekStart]
  );

  const tasksCompletedThisWeek = useMemo(
    () =>
      tasks.filter((task) => {
        if (task.status !== 'completed' || !task.completed_at) return false;
        const completed = normalizeDate(task.completed_at);
        return completed ? completed >= weekStart && completed <= weekEnd : false;
      }),
    [tasks, weekEnd, weekStart]
  );

  const statusCounts = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        const status = task.status || 'not-started';
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [tasks]);

  const quadrantMeta = useMemo(
    () =>
      ({
        'urgent-important': {
          label: 'Do Now',
          accent: 'text-red-600',
          bg: 'bg-red-50',
          description: 'Critical fires to handle immediately',
        },
        'not-urgent-important': {
          label: 'Strategic',
          accent: 'text-blue-600',
          bg: 'bg-blue-50',
          description: 'Deep work and growth tasks',
        },
                'urgent-not-important': {
                  label: 'Park',
          accent: 'text-amber-600',
          bg: 'bg-amber-50',
          description: 'Fast-moving but low-impact items',
        },
        'not-urgent-not-important': {
          label: 'Park It',
          accent: 'text-slate-600',
          bg: 'bg-slate-100',
          description: 'Consider eliminating or batching',
        },
      } satisfies Record<string, { label: string; accent: string; bg: string; description: string }>),
    []
  );

  const quadrantHighlights = useMemo(() => {
    return quadrants.map((quadrant) => {
      const meta = quadrantMeta[quadrant.id] ?? quadrantMeta['not-urgent-not-important'];
      const quadrantTasks = quadrant.taskIds
        .map((taskId) => tasks.find((task) => task.id === taskId))
        .filter(Boolean) as typeof tasks;
      const openTasks = quadrantTasks.filter((task) => task.status !== 'completed');
      const overdue = openTasks.filter((task) => {
        const due = normalizeDate(task.due_date as string | undefined);
        return due ? due.getTime() < today.getTime() : false;
      });
      const nextTask = [...openTasks]
        .sort((a, b) => {
          const aDue = normalizeDate(a.due_date as string | undefined)?.getTime() ?? Infinity;
          const bDue = normalizeDate(b.due_date as string | undefined)?.getTime() ?? Infinity;
          return aDue - bDue;
        })[0];

      return {
        id: quadrant.id,
        title: quadrant.title,
        meta,
        total: quadrantTasks.length,
        open: openTasks.length,
        overdue: overdue.length,
        nextTask,
      };
    });
  }, [quadrants, tasks, today, quadrantMeta]);

  const activeSuggestions = useMemo(
    () => aiSuggestions.filter((suggestion) => !suggestion.isApplied),
    [aiSuggestions]
  );

  // Group insights by category for visual display
  const activityInsightCategories = useMemo<ActivityInsightCategory[]>(() => {
    const categories: ActivityInsightCategory[] = [];
    if (moodEnergyInsights.length > 0) {
      categories.push({
        id: 'mood-energy',
        title: 'Mood & Energy',
        description: 'Reflections from the last seven check-ins.',
        items: moodEnergyInsights.map((insight) => ({
          ...insight,
          id: `mood-${insight.id}`,
        })),
      });
    }
    if (routineInsightItems.length > 0) {
      categories.push({
        id: 'routine-insights',
        title: 'Routine Insights',
        description: 'Highlights from your recent guided routines.',
        items: routineInsightItems.map((item) => ({
          ...item,
          id: `routine-${item.id}`,
        })),
      });
    }
    if (activeSuggestions.length > 0) {
      categories.push({
        id: 'smart-insights',
        title: 'Smart Suggestions',
        description: 'AI nudges based on your workspace signals.',
        items: activeSuggestions.slice(0, 4).map((suggestion) => ({
          id: `ai-${suggestion.id}`,
          title: suggestion.type,
          detail: suggestion.suggestion,
          badge: `${Math.round((suggestion.confidence ?? 0) * 100)}%`,
        })),
      });
    }
    return categories;
  }, [activeSuggestions, moodEnergyInsights, routineInsightItems]);

  const insightBullets = useMemo(() => {
    const insights: string[] = [];
    if (urgentImportantTasks.length > 0) {
      insights.push(`${urgentImportantTasks.length} critical task${urgentImportantTasks.length > 1 ? 's' : ''} asking for your focus.`);
    }
    if (overdueTasks.length > 0) {
      insights.push(`${overdueTasks.length} overdue item${overdueTasks.length > 1 ? 's' : ''} to triage first.`);
    }
    if (tasksCompletedThisWeek.length > 0) {
      insights.push(`You’ve closed ${tasksCompletedThisWeek.length} task${tasksCompletedThisWeek.length > 1 ? 's' : ''} this week—nice momentum.`);
    }
    if (insights.length === 0) {
      insights.push('No blockers detected—time to invest in strategic work.');
    }
    return insights;
  }, [overdueTasks.length, tasksCompletedThisWeek.length, urgentImportantTasks.length]);

  const scrollToQuickCapture = () => {
    const element = document.getElementById('quick-capture');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddTaskFromMatrix = async (
    taskData: { title?: string; description?: string; priority?: string; status?: string; category?: string },
    quadrant: string
  ) => {
    await addTask({
      title: taskData.title || 'New Task',
      description: taskData.description,
      priority: (taskData.priority as any) || 'medium',
      status: (taskData.status as any) || 'not-started',
      category: (taskData.category as any) || 'work',
      quadrant: quadrant as any,
      estimated_duration: 30,
      buffer_time: 0,
      energy_required: 'medium',
      focus_required: 'medium',
      sensory_considerations: [],
      tags: [],
    });
  };

  const quickActionDefinitions = useMemo<QuickActionDefinition[]>(
    () => [
      {
        id: 'capture',
        title: 'Capture a task',
        description: 'Jump to quick entry',
        icon: <BoltIcon className="h-6 w-6" />,
        className:
          'group bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-4 px-6 flex flex-col items-center gap-2 transition-all',
        action: scrollToQuickCapture,
      },
      {
        id: 'templates',
        title: 'Browse templates',
        description: 'Kickstart with proven flows',
        icon: <DocumentDuplicateIcon className="h-6 w-6" />,
        className:
          'group bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-4 px-6 flex flex-col items-center gap-2 transition-all',
        action: () => setActiveTool('templates'),
      },
      {
        id: 'matrix',
        title: 'Open priority matrix',
        description: 'Place commitments visually',
        icon: <RectangleGroupIcon className="h-6 w-6" />,
        className:
          'group bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-4 px-6 flex flex-col items-center gap-2 transition-all',
        action: () => setActiveTool('matrix'),
      },
      {
        id: 'assistant',
        title: 'Summon assistant',
        description: 'Co-create with the AI coach',
        icon: <SparklesIcon className="h-6 w-6" />,
        className:
          'group bg-pink-600 hover:bg-pink-700 text-white rounded-xl py-4 px-6 flex flex-col items-center gap-2 transition-all',
        action: () => setActiveTool('assistant'),
      },
      {
        id: 'time-blocking',
        title: 'Plan time blocks',
        description: 'Balance appointments & rest',
        icon: <ClockIcon className="h-6 w-6" />,
        className:
          'group bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-4 px-6 flex flex-col items-center gap-2 transition-all',
        action: () => setActiveTool('time-blocking'),
      },
    ],
    [scrollToQuickCapture]
  );

  const defaultQuickActionIds = ['capture', 'templates', 'matrix'];
  const desiredQuickActionIds = persona.quickActions?.length ? persona.quickActions : defaultQuickActionIds;
  const quickActions = desiredQuickActionIds
    .map((id) => quickActionDefinitions.find((action) => action.id === id))
    .filter((action): action is QuickActionDefinition => Boolean(action));

  const renderToolContent = () => {
    switch (activeTool) {
      case 'matrix':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Priority Matrix</h3>
                <p className="text-sm text-gray-600">
                  Drag and drop to rebalance what is urgent versus important.
                </p>
              </div>
            </div>
            <PriorityMatrix
              tasks={tasks}
              onTaskMove={async (taskId, _fromQuadrant, toQuadrant) => {
                await moveTask(taskId, toQuadrant as any);
              }}
              onTaskUpdate={async (taskId, updates) => {
                await updateTask(taskId, updates);
              }}
              onTaskCreate={handleAddTaskFromMatrix}
            />
          </div>
        );
      case 'time-blocking':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Time Blocking Calendar</h3>
              <p className="text-sm text-gray-600">Translate commitments into focused blocks.</p>
            </div>
            <div className="h-[28rem]">
              <TimeBlockingCalendar />
            </div>
          </div>
        );
      case 'templates':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Task Templates Library</h3>
              <p className="text-sm text-gray-600">Reuse proven workflows tuned for neurodivergent brains.</p>
            </div>
            <TaskTemplates />
          </div>
        );
      case 'ai':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">AI Suggestions</h3>
              <p className="text-sm text-gray-600">Let the assistant surface opportunities, bottlenecks, and micro-breaks.</p>
            </div>
            <AISuggestions showGlobalSuggestions />
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-600">Spot cycle patterns, completion velocity, and decision fatigue triggers.</p>
            </div>
            <AnalyticsDashboard />
          </div>
        );
      case 'assistant':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Smart Assistant</h3>
              <p className="text-sm text-gray-600">Capture, recall, and reflect in one neurodivergent-friendly workspace.</p>
            </div>
            <div className="space-y-6">
              <ActivityRecallBanner />
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Quick Capture</h4>
                <QuickEntryComponent />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Smart Suggestions</h4>
                <SuggestionEngine />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Activity Insights</h4>
                {/* ActivityInsights now rendered on the main dashboard; remove duplicate from assistant modal */}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Empty state for first-time users
  const renderEmptyState = () => (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="persona-panel p-10 text-center backdrop-blur">
        <div className="w-18 h-18 mx-auto mb-8 flex items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-600">
          <SparklesIcon className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Welcome to your adaptive hub ✨</h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Start by capturing a task or exploring a ready-made template. Neurotype-aware scaffolds will surface here as you add work.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <button key={action.id} onClick={action.action} className={action.className}>
              <div className="flex flex-col items-center gap-2">
                <div className="text-2xl">{action.icon}</div>
                <span className="font-semibold text-lg text-center">{action.title}</span>
                <span className="text-sm text-white/80 group-hover:text-white text-center">{action.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (matrixLoading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen persona-bg">
      <header className="text-white" style={{ backgroundImage: heroGradient, backgroundColor: heroSurface }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="space-y-4">
              <div className="text-sm uppercase tracking-wide text-white/80">{formattedDate}</div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {heroTitle}
              </h1>
              <p className="text-white/80 max-w-2xl">
                {heroSubtitle}
              </p>
              {!showEmptyState && heroStats.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {heroStats.map((stat) => (
                    <div key={stat.id} className="bg-white/10 backdrop-blur rounded-2xl px-4 py-3">
                      <div className="text-sm text-white/70">{stat.label}</div>
                      <div className="text-2xl font-semibold">{stat.value}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/90 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                  <SparklesIcon className="h-4 w-4" /> Persona tip
                </div>
                <p className="mt-2">{personaQuickTip}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 w-full md:w-auto">
              <button
                onClick={() => setActiveTool('matrix')}
                className="bg-white text-slate-900 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg hover:bg-white/90 transition"
              >
                <div className="flex items-center gap-3">
                  <RectangleGroupIcon className="h-6 w-6 text-indigo-600" />
                  <span className="font-semibold">Open matrix</span>
                </div>
                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-slate-400" />
              </button>
              <button
                onClick={() => setActiveTool('analytics')}
                className="bg-white text-slate-900 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg hover:bg-white/90 transition"
              >
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  <span className="font-semibold">View analytics</span>
                </div>
                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {matrixError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{matrixError}</p>
              <button onClick={clearError} className="mt-2 text-sm text-red-700 underline hover:text-red-900">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

        {showEmptyState ? (
          renderEmptyState()
        ) : (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <section className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 persona-panel p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Today’s focus</h2>
                    <p className="text-sm text-slate-500">High-impact commitments to clear before context switching.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FireIcon className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">{urgentImportantTasks.length} urgent + important</span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl persona-chip p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      <ClockIcon className="h-4 w-4 text-slate-500" /> Due today
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {tasksDueToday.length === 0 && <li className="text-sm text-slate-500">Nothing scheduled—guard your focus.</li>}
                      {tasksDueToday.slice(0, 4).map((task) => (
                        <li
                          key={task.id}
                          className="persona-chip px-3 py-2 text-sm flex justify-between items-center"
                        >
                          <span className="font-medium text-slate-800 truncate pr-3">{task.title}</span>
                          <span className="text-slate-500">
                            {task.due_date
                              ? new Date(task.due_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                              : task.quadrant === 'urgent-important'
                                ? 'Do first'
                                : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl persona-chip p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 uppercase tracking-wide">
                      <ExclamationTriangleIcon className="h-4 w-4" /> Overdue
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {overdueTasks.length === 0 && <li className="text-sm text-amber-700/80">All caught up—celebrate the win.</li>}
                      {overdueTasks.slice(0, 4).map((task) => (
                        <li
                          key={task.id}
                          className="persona-chip px-3 py-2 text-sm flex justify-between items-center"
                        >
                          <span className="font-medium text-amber-800 truncate pr-3">{task.title}</span>
                          <span className="text-amber-600">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Insights</h3>
                  <ul className="mt-3 grid gap-2 md:grid-cols-2">
                    {insightBullets.map((insight, index) => (
                      <li key={index} className="text-sm text-slate-600 persona-chip px-3 py-2">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="persona-panel p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Weekly pulse</h2>
                    <p className="text-sm text-slate-500">Monitor patterns that influence your energy budget.</p>
                  </div>
                  <ChartPieIcon className="h-6 w-6 text-indigo-500" />
                </div>
                <dl className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-slate-500">Scheduled this week</dt>
                    <dd className="text-base font-semibold text-slate-900">{tasksScheduledThisWeek.length}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-slate-500">Completed this week</dt>
                    <dd className="text-base font-semibold text-slate-900">{tasksCompletedThisWeek.length}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-slate-500">Active vs. blocked</dt>
                    <dd className="text-base font-semibold text-slate-900">
                      {(statusCounts['in-progress'] ?? 0) + (statusCounts['not-started'] ?? 0)} / {statusCounts['blocked'] ?? 0}
                    </dd>
                  </div>
                </dl>
                <div className="mt-6 rounded-2xl persona-chip p-4">
                  <div className="text-sm font-semibold text-slate-600 mb-2">Next scheduled block</div>
                  {nextTimeBlock ? (
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <div>
                        <div className="font-medium text-slate-800">
                          {tasks.find((task) => task.id === nextTimeBlock.taskId)?.title || 'Focus block'}
                        </div>
                        <div>
                          {new Date(nextTimeBlock.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                          {' – '}
                          {nextTimeBlock.end
                            ? new Date(nextTimeBlock.end).toLocaleTimeString(undefined, {
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : '—'}
                        </div>
                      </div>
                      <CalendarDaysIcon className="h-6 w-6 text-slate-400" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No time blocks scheduled—create one from Time Blocking.</p>
                  )}
                </div>
              </div>
            </section>
            {/* Move Toolbox directly under Today's focus for easier access */}
            
              {personaSections.showHealthInsights && (
                <section className="mt-8">
                  <SensoryNutritionWidget />
                </section>
              )}

            {/* Mood & Energy and Routine Insights merged into Activity Insights below */}

            {personaSections.showPriorityPulse && (
              <section className="persona-panel p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Priority pulse</h2>
                    <p className="text-sm text-slate-500">Snapshot of your Eisenhower matrix without re-opening the board.</p>
                  </div>
                  <button
                    onClick={() => setActiveTool('matrix')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Manage matrix
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
                {quadrantHighlights.map((item) => (
                  <div key={item.id} className={`${item.meta.bg} border border-white/60 rounded-2xl p-4 shadow-sm`}>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${item.meta.accent}`}>{item.meta.label}</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{item.open} open</div>
                    <p className="text-sm text-slate-600">{item.meta.description}</p>
                    {item.nextTask ? (
                      <div className="mt-4 text-sm">
                        <div className="font-medium text-slate-800 truncate">Next: {item.nextTask.title}</div>
                        {item.nextTask.due_date && (
                          <div className="text-slate-500">
                            Due {new Date(item.nextTask.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 text-sm text-slate-500">All clear.</div>
                    )}
                    {item.overdue > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1 rounded-full persona-chip px-3 py-1 text-xs font-medium text-amber-700">
                        <ExclamationTriangleIcon className="h-4 w-4" /> {item.overdue} overdue
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
            )}

            <section className="grid gap-6" id="quick-capture">
              <div className="persona-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">Quick capture</h2>
                  <BoltIcon className="h-6 w-6 text-sky-500" />
                </div>
                <p className="text-sm text-slate-500">Brain dump incoming thoughts so you can return to focus.</p>
                <ActivityRecallBanner />
                <div className="persona-chip rounded-2xl p-4">
                  <QuickEntryComponent />
                </div>
              </div>
            </section>

            <section className="persona-panel p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Toolbox</h2>
                  <p className="text-sm text-slate-500">Launch core modules without leaving the dashboard.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <button
                  onClick={() => setActiveTool('time-blocking')}
                  className="group persona-chip rounded-2xl p-5 text-left hover:shadow-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDaysIcon className="h-6 w-6 text-sky-500" />
                    <span className="font-semibold text-slate-900">Time blocking</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Plan deep work windows around energy availability.</p>
                </button>
                <button
                  onClick={() => setActiveTool('templates')}
                  className="group persona-chip rounded-2xl p-5 text-left hover:shadow-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <DocumentDuplicateIcon className="h-6 w-6 text-indigo-500" />
                    <span className="font-semibold text-slate-900">Templates</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Reuse anchor routines and scaffolds tuned for neurotype needs.</p>
                </button>
                <button
                  onClick={() => setActiveTool('assistant')}
                  className="group persona-chip rounded-2xl p-5 text-left hover:shadow-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <LightBulbIcon className="h-6 w-6 text-purple-500" />
                    <span className="font-semibold text-slate-900">Smart assistant</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Review insights, recall past actions, and capture adjustments.</p>
                </button>
              </div>
            </section>

            {personaSections.showActivityInsights && (
              <section className="persona-panel p-6">
                <ActivityInsights extraCategories={activityInsightCategories} />
              </section>
            )}
          </main>
        )}

        {/* Tool Modal */}
        {activeTool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
            <div className="relative max-w-6xl w-full max-h-[90vh] overflow-y-auto persona-panel p-6 shadow-2xl">
              <button
                onClick={() => setActiveTool(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
              {renderToolContent()}
            </div>
          </div>
        )}

        <footer className="mt-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto persona-panel p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Cog6ToothIcon className="h-5 w-5" /> Built for ADHD, Autistic, and Dyslexic nervous systems.
            </div>
            <div className="text-sm text-slate-500">AI-powered • Real-time sync • Offline ready</div>
          </div>
        </footer>
      </div>
  );
};

const Dashboard: React.FC = () => (
  <AdaptiveSmartProvider>
    <VisualSensoryProvider>
      <DashboardContent />
    </VisualSensoryProvider>
  </AdaptiveSmartProvider>
);

export default Dashboard;
