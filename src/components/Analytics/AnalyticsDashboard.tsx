import { useState, useMemo } from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  FireIcon, 
  ArrowTrendingUpIcon, 
  CheckCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { format, subDays, isAfter, startOfDay, endOfDay } from 'date-fns';
import { useMatrixStore, QuadrantId } from '../../stores/useMatrixStore';

interface AnalyticsDashboardProps {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
  description?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  timeRange = 'week'
}) => {
  const { tasks, analytics, quadrants } = useMatrixStore();
  const [selectedPeriod, setSelectedPeriod] = useState(timeRange);

  // Calculate date range for analysis
  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      week: subDays(now, 7),
      month: subDays(now, 30),
      quarter: subDays(now, 90),
      year: subDays(now, 365)
    };
    return ranges[selectedPeriod];
  };

  // Filter tasks by date range
  const filteredTasks = useMemo(() => {
    const startDate = getDateRange();
    return tasks.filter(task => {
      const taskDate = new Date(task.created_at);
      return isAfter(taskDate, startDate);
    });
  }, [tasks, selectedPeriod]);

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const completedTasks = filteredTasks.filter(t => t.status === 'completed');
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress');
    const overdueTasks = filteredTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return isAfter(new Date(), dueDate) && t.status !== 'completed';
    });

    // Completion rate
    const completionRate = filteredTasks.length > 0 
      ? (completedTasks.length / filteredTasks.length) * 100 
      : 0;

    // Average completion time
    const completionTimes = completedTasks
      .filter(t => t.completed_at && t.created_at)
      .map(t => {
        const created = new Date(t.created_at);
        const completed = new Date(t.completed_at!);
        return completed.getTime() - created.getTime();
      });

    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    // Productivity score (weighted by priority and completion)
    const productivityScore = completedTasks.reduce((score, task) => {
      const priorityWeight = {
        'urgent': 4,
        'high': 3,
        'medium': 2,
        'low': 1
      }[task.priority] || 1;
      
      const quadrantWeight = {
        'urgent-important': 4,
        'not-urgent-important': 3,
        'urgent-not-important': 2,
        'not-urgent-not-important': 1
      }[task.quadrant || 'not-urgent-not-important'];

      return score + (priorityWeight * quadrantWeight);
    }, 0);

    // Task distribution by quadrant
    const quadrantDistribution = quadrants.reduce((dist, quadrant) => {
      const quadrantTasks = filteredTasks.filter(t => t.quadrant === quadrant.id);
      dist[quadrant.id] = {
        total: quadrantTasks.length,
        completed: quadrantTasks.filter(t => t.status === 'completed').length
      };
      return dist;
    }, {} as Record<QuadrantId, { total: number; completed: number }>);

    // Daily completion pattern
    const dailyCompletions = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      return {
        date: format(date, 'MMM d'),
        completed: completedTasks.filter(t => {
          if (!t.completed_at) return false;
          const completedDate = new Date(t.completed_at);
          return isAfter(completedDate, dayStart) && isAfter(dayEnd, completedDate);
        }).length
      };
    }).reverse();

    // Focus time estimation
    const focusTime = completedTasks.reduce((total, task) => {
      return total + (task.estimated_duration || 30);
    }, 0);

    return {
      completionRate,
      avgCompletionTime,
      productivityScore,
      quadrantDistribution,
      dailyCompletions,
      focusTime,
      totalTasks: filteredTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      overdueTasks: overdueTasks.length,
      streakDays: analytics.streakDays
    };
  }, [filteredTasks, analytics, quadrants]);

  // Metric cards configuration
  const metricCards: MetricCard[] = [
    {
      title: 'Completion Rate',
      value: `${Math.round(metrics.completionRate)}%`,
      change: 5.2,
      trend: 'up',
      icon: CheckCircleIcon,
      color: 'text-green-600 bg-green-100',
      description: 'Tasks completed vs. total tasks'
    },
    {
      title: 'Focus Time',
      value: `${Math.round(metrics.focusTime / 60)}h`,
      change: -2.1,
      trend: 'down',
      icon: ClockIcon,
      color: 'text-blue-600 bg-blue-100',
      description: 'Total focused work time'
    },
    {
      title: 'Productivity Score',
      value: Math.round(metrics.productivityScore),
      change: 8.7,
      trend: 'up',
      icon: ArrowTrendingUpIcon,
      color: 'text-purple-600 bg-purple-100',
      description: 'Weighted completion score'
    },
    {
      title: 'Current Streak',
      value: `${metrics.streakDays} days`,
      change: 1,
      trend: metrics.streakDays > 0 ? 'up' : 'stable',
      icon: FireIcon,
      color: 'text-orange-600 bg-orange-100',
      description: 'Consecutive days with completed tasks'
    }
  ];

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
            <p className="text-gray-600">Track your productivity and task completion patterns</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <select
          value={selectedPeriod}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPeriod(e.target.value as any)}
          className="block border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="quarter">Last 90 days</option>
          <option value="year">Last year</option>
        </select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${metric.color}`}>
                  <metric.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
              </div>
              
              {metric.change !== undefined && (
                <div className={`flex items-center space-x-1 ${getTrendColor(metric.trend!)}`}>
                  <span className="text-sm font-medium">{metric.change > 0 ? '+' : ''}{metric.change}%</span>
                  <span>{getTrendIcon(metric.trend!)}</span>
                </div>
              )}
            </div>
            
            {metric.description && (
              <p className="mt-2 text-sm text-gray-500">{metric.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Completion Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Completions</h3>
          <div className="space-y-2">
            {metrics.dailyCompletions.map((day, index) => (
              <div key={index} className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 w-12">{day.date}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.max((day.completed / Math.max(...metrics.dailyCompletions.map(d => d.completed), 1)) * 100, 2)}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">{day.completed}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quadrant Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Distribution by Quadrant</h3>
          <div className="space-y-3">
            {quadrants.map((quadrant) => {
              const data = metrics.quadrantDistribution[quadrant.id];
              const percentage = data.total > 0 ? (data.completed / data.total) * 100 : 0;
              
              const colorMap = {
                'urgent-important': 'bg-red-500',
                'not-urgent-important': 'bg-blue-500',
                'urgent-not-important': 'bg-yellow-500',
                'not-urgent-not-important': 'bg-gray-500'
              };

              return (
                <div key={quadrant.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{quadrant.title}</span>
                    <span className="text-gray-600">{data.completed}/{data.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${colorMap[quadrant.id]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Most Productive Day */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Most Productive Day</span>
            </div>
            <p className="text-sm text-blue-700">
              {metrics.dailyCompletions.reduce((max, day) => 
                day.completed > max.completed ? day : max
              ).date}
            </p>
          </div>

          {/* Average Task Duration */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <ClockIcon className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Avg. Completion Time</span>
            </div>
            <p className="text-sm text-green-700">
              {metrics.avgCompletionTime > 0 
                ? `${Math.round(metrics.avgCompletionTime / (1000 * 60 * 60 * 24))} days`
                : 'No data yet'
              }
            </p>
          </div>

          {/* Task Backlog */}
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <ChartBarIcon className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-900">Current Backlog</span>
            </div>
            <p className="text-sm text-yellow-700">
              {metrics.inProgressTasks + metrics.overdueTasks} tasks pending
            </p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            {metrics.completionRate < 50 && (
              <li>• Focus on completing smaller tasks to build momentum</li>
            )}
            {metrics.overdueTasks > 0 && (
              <li>• You have {metrics.overdueTasks} overdue tasks that need attention</li>
            )}
            {metrics.streakDays === 0 && (
              <li>• Start a completion streak by finishing at least one task today</li>
            )}
            {metrics.quadrantDistribution['urgent-important'].total > metrics.quadrantDistribution['not-urgent-important'].total && (
              <li>• Consider spending more time on important, non-urgent tasks for better long-term outcomes</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
