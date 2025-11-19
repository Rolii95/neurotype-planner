import React from 'react';
import {
  CalendarDaysIcon,
  FireIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { RoutineAnalyticsSummary } from '../../services/routineAnalyticsService';

interface RoutineHeroStatsProps {
  analytics: RoutineAnalyticsSummary | null;
  isLoading: boolean;
}

const formatMinutes = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remaining}m`;
};

export const RoutineHeroStats: React.FC<RoutineHeroStatsProps> = ({
  analytics,
  isLoading,
}) => {
  const stats = [
    {
      label: 'Days Tracked',
      value: analytics?.daysTracked ?? 0,
      icon: CalendarDaysIcon,
      helper: analytics?.lastTrackedDate ? `Last: ${analytics.lastTrackedDate}` : 'Get started today',
    },
    {
      label: 'Current Streak',
      value: `${analytics?.currentStreak ?? 0} days`,
      icon: FireIcon,
      helper: `Best streak: ${analytics?.longestStreak ?? 0} days`,
    },
    {
      label: 'Routines Completed',
      value: analytics?.totalRoutines ?? 0,
      icon: CheckCircleIcon,
      helper: `${analytics?.totalSteps ?? 0} steps finished`,
    },
    {
      label: 'Focused Minutes',
      value: formatMinutes(analytics?.totalStepMinutes ?? 0),
      icon: ClockIcon,
      helper: `${analytics?.totalMinutes ?? 0} planned mins`,
    },
  ];

  return (
    <section className="mb-8 rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 p-6 text-white shadow-xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Routine momentum</p>
          <h1 className="text-3xl font-bold">Keep your flow going</h1>
          <p className="mt-1 text-white/80">
            Track your execution streaks and celebrate every completed step.
          </p>
        </div>
        <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
          {isLoading ? 'Refreshing analytics…' : 'Updated in real time'}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2">
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">{stat.label}</p>
                <p className="text-2xl font-bold">{isLoading ? '—' : stat.value}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/80">{stat.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RoutineHeroStats;
