import { ChartBarIcon, ClockIcon, EyeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useAdaptiveSmart } from './AdaptiveSmartContext';
import { format, startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns';
import { UserActivity } from '../types';

export interface ActivityInsightItem {
  id: string;
  title: string;
  detail: string;
  badge?: string;
}

export interface ActivityInsightCategory {
  id: string;
  title: string;
  description?: string;
  items: ActivityInsightItem[];
}

interface ActivityInsightsProps {
  timeRange?: 'today' | 'week' | 'month';
  className?: string;
  extraCategories?: ActivityInsightCategory[];
}

export function ActivityInsights({
  timeRange = 'today',
  className = '',
  extraCategories = [],
}: ActivityInsightsProps) {
  const { state, cognitiveProfile } = useAdaptiveSmart();

  // Filter activities by time range
  const getFilteredActivities = (): UserActivity[] => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = startOfDay(now);
    }

    return state.activityHistory.filter(activity => 
      isWithinInterval(activity.timestamp, { start: startDate, end: now })
    );
  };

  const activities = getFilteredActivities();
  const hasActivityData = activities.length > 0;
  const supplementaryCategories = extraCategories.filter(
    (category) => category.items && category.items.length > 0
  );

  // Calculate insights
  const getInsights = () => {
    if (activities.length === 0) {
      return {
        totalTime: 0,
        pagesVisited: 0,
        mostVisitedPage: null,
        averageSessionLength: 0,
        totalSessions: 0,
        productivityScore: 0,
        patterns: [],
      };
    }

    // Group by page
    const pageStats: Record<string, { visits: number; totalTime: number; lastVisit: Date }> = {};
    let totalTime = 0;

    activities.forEach(activity => {
      const page = activity.context.page;
      const duration = activity.context.duration || 0;

      if (!pageStats[page]) {
        pageStats[page] = { visits: 0, totalTime: 0, lastVisit: activity.timestamp };
      }

      pageStats[page].visits++;
      pageStats[page].totalTime += duration;
      pageStats[page].lastVisit = new Date(Math.max(
        pageStats[page].lastVisit.getTime(),
        activity.timestamp.getTime()
      ));

      if (activity.action === 'navigation') {
        totalTime += duration;
      }
    });

    // Find most visited page
    const mostVisitedPage = Object.entries(pageStats).reduce((max, [page, stats]) =>
      stats.visits > (pageStats[max]?.visits || 0) ? page : max
    , Object.keys(pageStats)[0]);

    // Calculate sessions (activities within 30 minutes of each other)
    const sessions = calculateSessions(activities);
    const averageSessionLength = sessions.length > 0 
      ? sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length 
      : 0;

    // Calculate productivity score (simplified)
    const productivityScore = calculateProductivityScore(activities, pageStats);

    return {
      totalTime: Math.round(totalTime / 60), // Convert to minutes
      pagesVisited: Object.keys(pageStats).length,
      mostVisitedPage: mostVisitedPage ? {
        page: mostVisitedPage,
        visits: pageStats[mostVisitedPage].visits,
        timeSpent: Math.round(pageStats[mostVisitedPage].totalTime / 60),
      } : null,
      averageSessionLength: Math.round(averageSessionLength / 60), // Convert to minutes
      totalSessions: sessions.length,
      productivityScore: Math.round(productivityScore),
      patterns: identifyPatterns(activities),
      pageStats,
    };
  };

  const insights = getInsights();

  // Get neurotype-specific styling
  const getCardStyles = () => {
    const baseStyles = "bg-white rounded-lg border shadow-sm p-4";
    
    switch (cognitiveProfile?.neurotype) {
      case 'adhd':
        return `${baseStyles} border-l-4 border-l-blue-500`;
      case 'autism':
        return `${baseStyles} border-green-200`;
      case 'dyslexia':
        return `${baseStyles} border-purple-200 text-lg leading-relaxed`;
      default:
        return `${baseStyles} border-gray-200`;
    }
  };

  const formatTimeRange = () => {
    switch (timeRange) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Today';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Activity Insights - {formatTimeRange()}
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <EyeIcon className="h-4 w-4" />
          <span>
            {hasActivityData
              ? `${activities.length} activit${activities.length === 1 ? 'y' : 'ies'}`
              : 'No activity recorded'}
          </span>
        </div>
      </div>

      {hasActivityData ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={getCardStyles()}>
              <div className="flex items-center gap-3">
                <ClockIcon className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Time</p>
                  <p className="text-xl font-semibold text-gray-900">{insights.totalTime}m</p>
                </div>
              </div>
            </div>

            <div className={getCardStyles()}>
              <div className="flex items-center gap-3">
                <MapPinIcon className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Pages Visited</p>
                  <p className="text-xl font-semibold text-gray-900">{insights.pagesVisited}</p>
                </div>
              </div>
            </div>

            <div className={getCardStyles()}>
              <div className="flex items-center gap-3">
                <ChartBarIcon className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Sessions</p>
                  <p className="text-xl font-semibold text-gray-900">{insights.totalSessions}</p>
                </div>
              </div>
            </div>

            <div className={getCardStyles()}>
              <div className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold ${
                    insights.productivityScore >= 80
                      ? 'bg-green-500'
                      : insights.productivityScore >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                >
                  {insights.productivityScore}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Productivity</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {insights.productivityScore}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Most Visited Page */}
          {insights.mostVisitedPage && (
            <div className={getCardStyles()}>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Most Active Area</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {getPageDisplayName(insights.mostVisitedPage.page)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {insights.mostVisitedPage.visits} visits ? {insights.mostVisitedPage.timeSpent} minutes
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  {getPageIcon(insights.mostVisitedPage.page)}
                </div>
              </div>
            </div>
          )}

          {/* Page Breakdown */}
          <div className={getCardStyles()}>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Page Activity</h3>
            <div className="space-y-3">
              {Object.entries(insights.pageStats || {})
                .sort(([,a], [,b]) => b.totalTime - a.totalTime)
                .slice(0, 5)
                .map(([page, stats]) => (
                  <div key={page} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getPageIcon(page)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getPageDisplayName(page)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round(stats.totalTime / 60)}m ? {stats.visits} visit{stats.visits !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {Math.round(stats.totalTime / 60)}m
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      ) : supplementaryCategories.length > 0 ? null : (
        <div className={getCardStyles()}>
          <div className="text-center py-6">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity logged</h3>
            <p className="text-gray-600">
              Navigate through the app to build insights for {formatTimeRange().toLowerCase()}.
            </p>
          </div>
        </div>
      )}

      {supplementaryCategories.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          {supplementaryCategories.map((category) => {
            // Choose icon and accent color by category
            let icon, accent;
            if (category.id === 'mood-energy') {
              icon = <span className="inline-block text-2xl">🙂</span>;
              accent = 'bg-indigo-50 border-indigo-200';
            } else if (category.id === 'routine-insights') {
              icon = <span className="inline-block text-2xl">🔁</span>;
              accent = 'bg-emerald-50 border-emerald-200';
            } else if (category.id === 'smart-insights') {
              icon = <span className="inline-block text-2xl">🤖</span>;
              accent = 'bg-yellow-50 border-yellow-200';
            } else {
              icon = <EyeIcon className="h-6 w-6 text-gray-400" />;
              accent = 'bg-gray-50 border-gray-200';
            }
            return (
              <div key={category.id} className={`rounded-2xl border ${accent} p-5 flex flex-col h-full shadow-sm`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-gray-100">
                    {icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{category.title}</h3>
                    {category.description && (
                      <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                    )}
                  </div>
                  <span className="ml-auto text-xs font-medium text-gray-500">
                    {category.items.length} insight{category.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 flex-1 flex flex-col gap-3">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white/80 p-3 shadow-sm hover:bg-indigo-50 transition"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{item.detail}</p>
                      </div>
                      {item.badge && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Neurotype-specific insights */}
      {cognitiveProfile?.neurotype === 'adhd' && hasActivityData && insights.totalSessions > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">ADHD Insight</h3>
          <p className="text-sm text-blue-800">
            Your average session length is {insights.averageSessionLength} minutes. 
            {insights.averageSessionLength < 15 
              ? " Consider using focus techniques or breaking tasks into smaller chunks."
              : " Great job maintaining focus! Keep up the momentum."
            }
          </p>
        </div>
      )}
    </div>
  );
}

// Helper functions
interface ActivitySession {
  start: Date;
  end: Date;
  duration: number;
  activities: UserActivity[];
}

function calculateSessions(activities: UserActivity[]): ActivitySession[] {
  const sessions: ActivitySession[] = [];
  let currentSession: ActivitySession | null = null;

  activities.forEach(activity => {
    if (!currentSession || shouldStartNewSession(currentSession, activity)) {
      if (currentSession) sessions.push(currentSession);
      currentSession = {
        start: activity.timestamp,
        end: activity.timestamp,
        duration: 0,
        activities: [activity],
      };
    } else {
      currentSession.end = activity.timestamp;
      currentSession.duration = currentSession.end.getTime() - currentSession.start.getTime();
      currentSession.activities.push(activity);
    }
  });

  if (currentSession) sessions.push(currentSession);
  return sessions;
}

function shouldStartNewSession(currentSession: ActivitySession, newActivity: UserActivity): boolean {
  const timeDiff = newActivity.timestamp.getTime() - currentSession.end.getTime();
  return timeDiff > 30 * 60 * 1000; // 30 minutes
}

function calculateProductivityScore(activities: UserActivity[], pageStats: Record<string, any>): number {
  // Simplified productivity calculation
  const productivePages = ['priority-matrix', 'visual-sensory', 'mood-tracker'];
  const productiveTime = Object.entries(pageStats)
    .filter(([page]) => productivePages.includes(page))
    .reduce((sum, [, stats]: [string, any]) => sum + (stats.totalTime || 0), 0);
  
  const totalTime = Object.values(pageStats)
    .reduce((sum, stats: any) => sum + (stats.totalTime || 0), 0);

  return totalTime > 0 ? (productiveTime / totalTime) * 100 : 0;
}

function identifyPatterns(activities: UserActivity[]): string[] {
  const patterns = [];
  
  // Morning vs afternoon activity
  const morningActivities = activities.filter(a => a.timestamp.getHours() < 12);
  const afternoonActivities = activities.filter(a => a.timestamp.getHours() >= 12);
  
  if (morningActivities.length > afternoonActivities.length * 1.5) {
    patterns.push("You're most active in the morning");
  } else if (afternoonActivities.length > morningActivities.length * 1.5) {
    patterns.push("You're most active in the afternoon");
  }

  // Frequent page switching
  const navigationCount = activities.filter(a => a.action === 'navigation').length;
  if (navigationCount > activities.length * 0.6) {
    patterns.push("You switch between pages frequently");
  }

  // Long vs short sessions
  const avgDuration = activities.reduce((sum, a) => sum + (a.context.duration || 0), 0) / activities.length;
  if (avgDuration > 300) { // 5 minutes
    patterns.push("You tend to spend focused time on tasks");
  } else if (avgDuration < 60) { // 1 minute
    patterns.push("You tend to have quick, frequent interactions");
  }

  return patterns;
}

function getPageDisplayName(page: string): string {
  const pageNames: Record<string, string> = {
    'dashboard': 'Dashboard',
    'priority-matrix': 'Priority Matrix',
    'visual-sensory': 'Visual & Sensory Tools',
    'mood-tracker': 'Mood Tracker',
    'routine-board': 'Routine Board',
    'settings': 'Settings',
  };
  return pageNames[page] || page.charAt(0).toUpperCase() + page.slice(1);
}

function getPageIcon(page: string) {
  const iconClass = "h-6 w-6";
  switch (page) {
    case 'dashboard':
      return <MapPinIcon className={`${iconClass} text-blue-500`} />;
    case 'priority-matrix':
      return <div className="h-6 w-6 bg-green-500 rounded-sm" />;
    case 'visual-sensory':
      return <div className="h-6 w-6 bg-purple-500 rounded-full" />;
    default:
      return <ClockIcon className={`${iconClass} text-gray-500`} />;
  }
}











