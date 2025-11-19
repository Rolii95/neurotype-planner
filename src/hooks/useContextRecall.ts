import { useMemo } from 'react';
import { useAdaptiveSmart } from '../features/adaptiveSmart';
import type { UserActivity } from '../features/adaptiveSmart';


interface LastActionSummary {
  action: string;
  page?: string;
  component?: string;
  timeAgo: string;
  timestamp: Date;
  details?: Record<string, any>;
  description: string;
}

interface ContextRecallResult {
  contextData: Record<string, any>;
  initialPrompt: string;
  lastActionSummary: LastActionSummary | null;
  lastActionText: string | null;
  activitySummary: string;
}

type ActivityRecord = ReturnType<typeof mapActivity>;

export function useContextRecall(isActive: boolean): ContextRecallResult {
  const { state } = useAdaptiveSmart();

  return useMemo(() => {
    if (!isActive) {
      return {
        contextData: {},
        initialPrompt: '',
        lastActionSummary: null,
        lastActionText: null,
        activitySummary: '',
      };
    }

    const currentPath =
      typeof window !== 'undefined' ? window.location.pathname : 'unknown';
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const recentActivities = state.activityHistory.slice(0, 20).map(mapActivity);
    const lastAction = recentActivities[0];
    const lastActionSummary = lastAction
      ? {
          action: lastAction.action,
          page: lastAction.page,
          component: lastAction.component,
          timeAgo: getTimeAgo(lastAction.timestamp),
          timestamp: lastAction.timestamp,
          details: lastAction.metadata,
          description: formatActionDetail(lastAction),
        }
      : null;

    const activitySummary = recentActivities
      .slice(0, 5)
      .map((activity, index) => {
        const timeAgo = getTimeAgo(activity.timestamp);
        const actionText = formatActionDetail(activity);
        return `${index + 1}. ${actionText} (${timeAgo})`;
      })
      .join('\n');

    const contextData = {
      currentPage: currentPath,
      currentTime,
      lastAction: lastActionSummary,
      recentActivities: recentActivities.slice(0, 10),
      currentActivity: state.currentActivity,
      browserTabs:
        typeof document !== 'undefined'
          ? document.querySelectorAll('a[target="_blank"]').length || 'unknown'
          : 'unknown',
    };

    const initialPrompt =
      lastActionSummary && activitySummary
        ? `Based on my recent activity:\n\n${activitySummary}\n\nCan you help me understand what I was working on and suggest what I should focus on next?`
        : `I just opened the "Where Was I?" feature. I'm currently on the ${currentPath} page. Can you help me get oriented and figure out what I should be working on?`;

    return {
      contextData,
      initialPrompt,
      lastActionSummary,
      lastActionText: lastActionSummary
        ? `${lastActionSummary.description} (${lastActionSummary.timeAgo})`
        : null,
      activitySummary,
    };
  }, [isActive, state.activityHistory, state.currentActivity]);
}

function mapActivity(activity: UserActivity) {
  return {
    path: activity.path,
    action: activity.action,
    page: activity.context?.page || 'unknown',
    component: activity.context?.component,
    duration: activity.context?.duration,
    timestamp:
      activity.timestamp instanceof Date
        ? activity.timestamp
        : new Date(activity.timestamp),
    metadata: activity.context?.metadata,
  };
}

function getTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  return 'earlier today';
}

function formatActionDetail(activity: ActivityRecord): string {
  const pageName = activity.page || 'unknown';
  const componentName = activity.component || pageName;
  let detail: string;

  switch (activity.action) {
    case 'navigation':
      detail = `Viewed ${pageName}`;
      break;
    case 'interaction':
      detail = `Interacted with ${componentName}`;
      break;
    case 'completion':
      detail = `Completed ${componentName}`;
      break;
    case 'creation':
      detail = `Created something on ${componentName}`;
      break;
    default:
      detail = `Engaged on ${pageName}`;
  }

  const metadataDetails = extractMetadataDetails(activity.metadata);
  const durationDetail = formatDuration(activity.duration);

  return [detail, ...metadataDetails, durationDetail].filter(Boolean).join(' — ');
}

function extractMetadataDetails(metadata?: Record<string, any>): string[] {
  if (!metadata) return [];

  const builders: Array<(m: Record<string, any>) => string | null> = [
    (m) => (m.taskName ? `Task: ${m.taskName}` : null),
    (m) =>
      typeof m.duration === 'number'
        ? `Duration: ${formatNumericDuration(m.duration)}`
        : null,
    (m) => (m.soundscape ? `Sound: ${m.soundscape}` : null),
    (m) =>
      typeof m.blockWebsites === 'boolean'
        ? `Web blocker: ${m.blockWebsites ? 'On' : 'Off'}`
        : null,
    (m) =>
      typeof m.blockedSitesCount === 'number' && m.blockedSitesCount > 0
        ? `Blocked sites: ${m.blockedSitesCount}`
        : null,
    (m) =>
      typeof m.elapsedSeconds === 'number'
        ? `Elapsed: ${formatSeconds(m.elapsedSeconds)}`
        : null,
    (m) =>
      typeof m.total === 'number' ? `Distractions logged: ${m.total}` : null,
    (m) => (m.action && typeof m.action === 'string' ? `Action: ${m.action}` : null),
    (m) => (m.event ? `Event: ${m.event}` : null),
    (m) => (m.target ? `Target: ${m.target}` : null),
    (m) => (m.description ? `Description: ${m.description}` : null),
    (m) => (m.details ? `Details: ${m.details}` : null),
    (m) => (m.note ? `Note: ${m.note}` : null),
    (m) => (m.taskType ? `Task type: ${m.taskType}` : null),
    (m) => (m.taskId ? `Task ID: ${m.taskId}` : null),
  ];

  const details: string[] = [];
  builders.forEach((builder) => {
    const detail = builder(metadata);
    if (detail) details.push(detail);
  });

  if (details.length > 0) {
    return details.slice(0, 3);
  }

  const fallback = Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 2)
    .map(([key, value]) => `${capitalizeLabel(key)}: ${String(value)}`);

  return fallback;
}

function formatDuration(duration?: number): string | null {
  if (!duration || duration <= 0) return null;

  if (duration < 60) {
    return `for ${duration}s`;
  }

  const minutes = Math.round(duration / 60);
  if (minutes < 60) {
    return `for ${minutes}m`;
  }

  const hours = (minutes / 60).toFixed(1).replace(/\.0$/, '');
  return `for ${hours}h`;
}

function formatNumericDuration(value: number): string {
  if (value <= 0) {
    return `${Math.round(value * 60)}s`;
  }

  if (value < 1) {
    return `${Math.round(value * 60)}s`;
  }

  if (value < 60) {
    return `${value}m`;
  }

  const hours = (value / 60).toFixed(1).replace(/\.0$/, '');
  return `${hours}h`;
}

function formatSeconds(value: number): string {
  if (value < 60) {
    return `${value}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  if (minutes < 60) {
    return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = (minutes / 60).toFixed(1).replace(/\.0$/, '');
  return `${hours}h`;
}

function capitalizeLabel(label: string): string {
  return label
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, (char) => char.toUpperCase());
}

export type { LastActionSummary };

