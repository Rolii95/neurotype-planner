import { useState, useEffect } from 'react';
import { 
  LightBulbIcon, 
  ClockIcon, 
  CalendarIcon, 
  ChartBarIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useMatrixStore } from '../../stores/useMatrixStore';
import { Task } from '../../types';

interface AISuggestion {
  id: string;
  type: 'priority' | 'time-estimate' | 'schedule' | 'break-down';
  taskId: string;
  suggestion: string;
  confidence: number;
  isApplied: boolean;
  createdAt: string;
}

interface AISuggestionsProps {
  taskId?: string; // If provided, show suggestions for specific task
  showGlobalSuggestions?: boolean;
}

export const AISuggestions: React.FC<AISuggestionsProps> = ({ 
  taskId, 
  showGlobalSuggestions = true 
}) => {
  const {
    tasks,
    aiSuggestions,
    analytics,
    generateAISuggestions,
    applyAISuggestion,
    dismissAISuggestion
  } = useMatrixStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filter suggestions based on taskId or show all
  const relevantSuggestions = taskId 
    ? aiSuggestions.filter(s => s.taskId === taskId)
    : aiSuggestions;

  useEffect(() => {
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      setSelectedTask(task || null);
    }
  }, [taskId, tasks]);

  const handleGenerateSuggestions = async (forTaskId?: string) => {
    setIsGenerating(true);
    try {
      await generateAISuggestions(forTaskId);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    try {
      await applyAISuggestion(suggestionId);
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    try {
      await dismissAISuggestion(suggestionId);
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  const getSuggestionIcon = (type: AISuggestion['type']) => {
    switch (type) {
      case 'priority':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'time-estimate':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'schedule':
        return <CalendarIcon className="h-5 w-5 text-green-500" />;
      case 'break-down':
        return <ChartBarIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <LightBulbIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getSuggestionTypeLabel = (type: AISuggestion['type']) => {
    switch (type) {
      case 'priority':
        return 'Priority Adjustment';
      case 'time-estimate':
        return 'Time Estimation';
      case 'schedule':
        return 'Scheduling';
      case 'break-down':
        return 'Task Breakdown';
      default:
        return 'General';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Generate productivity insights
  const generateProductivityInsights = () => {
    const insights = [];
    
    // Task completion rate insight
    if (analytics.productivityScore < 50) {
      insights.push({
        id: 'productivity-low',
        type: 'priority' as const,
        taskId: '',
        suggestion: 'Your task completion rate is low. Consider breaking large tasks into smaller, manageable chunks.',
        confidence: 0.9,
        isApplied: false,
        createdAt: new Date().toISOString()
      });
    }

    // Time estimation insight
    if (analytics.averageCompletionTime > 0) {
      const avgHours = analytics.averageCompletionTime / (1000 * 60 * 60);
      if (avgHours > 4) {
        insights.push({
          id: 'time-estimation',
          type: 'time-estimate' as const,
          taskId: '',
          suggestion: 'Tasks are taking longer than expected on average. Consider adding buffer time to estimates.',
          confidence: 0.8,
          isApplied: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Streak motivation
    if (analytics.streakDays === 0) {
      insights.push({
        id: 'streak-motivation',
        type: 'schedule' as const,
        taskId: '',
        suggestion: 'Start a completion streak! Complete at least one small task today to build momentum.',
        confidence: 0.7,
        isApplied: false,
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  };

  // Mock AI suggestions for demonstration
  const mockTaskSpecificSuggestions = (task: Task): Omit<AISuggestion, 'id' | 'createdAt'>[] => {
    const suggestions = [];

    // Priority suggestions
    if (task.priority === 'low' && task.due_date) {
      const dueDate = new Date(task.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 3) {
        suggestions.push({
          type: 'priority' as const,
          taskId: task.id,
          suggestion: 'This task is due soon but marked as low priority. Consider raising its priority.',
          confidence: 0.85,
          isApplied: false
        });
      }
    }

    // Time estimation suggestions
    if (!task.estimated_duration || task.estimated_duration < 15) {
      suggestions.push({
        type: 'time-estimate' as const,
        taskId: task.id,
        suggestion: 'Consider adding a time estimate to better plan your schedule. Most similar tasks take 30-60 minutes.',
        confidence: 0.7,
        isApplied: false
      });
    }

    // Break down suggestions
    if (task.estimated_duration && task.estimated_duration > 120) {
      suggestions.push({
        type: 'break-down' as const,
        taskId: task.id,
        suggestion: 'This is a large task. Breaking it into smaller subtasks can improve focus and completion rate.',
        confidence: 0.9,
        isApplied: false
      });
    }

    // Scheduling suggestions
    if (task.status === 'not-started' && !task.scheduled_at) {
      suggestions.push({
        type: 'schedule' as const,
        taskId: task.id,
        suggestion: 'Schedule this task in your calendar to ensure it gets proper attention.',
        confidence: 0.8,
        isApplied: false
      });
    }

    return suggestions;
  };

  const displaySuggestions = [
    ...relevantSuggestions,
    ...(showGlobalSuggestions ? generateProductivityInsights() : []),
    ...(selectedTask ? mockTaskSpecificSuggestions(selectedTask).map(s => ({
      ...s,
      id: `mock-${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString()
    })) : [])
  ].filter((suggestion, index, self) => 
    index === self.findIndex(s => s.suggestion === suggestion.suggestion)
  );

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LightBulbIcon className="h-6 w-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">AI Suggestions</h3>
              <p className="text-sm text-gray-500">
                {selectedTask 
                  ? `Suggestions for "${selectedTask.title}"`
                  : 'Intelligent recommendations to improve your productivity'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={() => handleGenerateSuggestions(taskId)}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <LightBulbIcon className="h-4 w-4 mr-2" />
                Get Suggestions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="divide-y divide-gray-200">
        {displaySuggestions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No suggestions yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Click "Get Suggestions" to generate AI-powered recommendations.
            </p>
          </div>
        ) : (
          displaySuggestions.map((suggestion) => (
            <div key={suggestion.id} className="px-6 py-4">
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getSuggestionIcon(suggestion.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {getSuggestionTypeLabel(suggestion.type)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getConfidenceColor(suggestion.confidence)
                      }`}>
                        {Math.round(suggestion.confidence * 100)}% confident
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {!suggestion.isApplied && (
                        <>
                          <button
                            onClick={() => handleApplySuggestion(suggestion.id)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Apply suggestion"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDismissSuggestion(suggestion.id)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Dismiss suggestion"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">
                    {suggestion.suggestion}
                  </p>

                  {suggestion.isApplied && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      <CheckIcon className="h-3 w-3 mr-1" />
                      Applied
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer with stats */}
      {displaySuggestions.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{displaySuggestions.length} suggestions available</span>
            <span>
              {displaySuggestions.filter(s => s.isApplied).length} applied
            </span>
          </div>
        </div>
      )}
    </div>
  );
};