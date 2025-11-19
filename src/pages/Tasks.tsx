import React, { useEffect, useRef } from 'react';
import { PriorityMatrix } from '../components/PriorityMatrix';
import { useMatrixStore, QuadrantId } from '../stores/useMatrixStore';
import { Task } from '../types';
import { useToast } from '../contexts/ToastContext';
import { notificationService } from '../services/notifications';

const Tasks: React.FC = () => {
  const {
    tasks,
    quadrants,
    isLoading,
    error,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    completeTask,
    syncWithSupabase,
    timeBlocks,
    clearError
  } = useMatrixStore();
  
  const toast = useToast();

  const focusReminderTracker = useRef<Set<string>>(new Set());

  // Initialize store and sync with Supabase on mount
  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  useEffect(() => {
    if (!timeBlocks.length || !tasks.length) return;

    const scheduledKeys = focusReminderTracker.current;
    const validKeys = new Set<string>();

    timeBlocks.forEach((block) => {
      if (!block.startTime || !block.endTime) return;
      const task = tasks.find((item) => item.id === block.taskId);
      if (!task || !task.due_date) return;

      const key = `${block.id}-${block.startTime}`;
      validKeys.add(key);
      if (scheduledKeys.has(key)) return;

      scheduledKeys.add(key);
      notificationService
        .scheduleFocusSessionReminder({
          taskId: task.id,
          taskTitle: task.title,
          startTime: block.startTime,
        })
        .catch((error) => {
          console.error('Failed to schedule focus session reminder', error);
          scheduledKeys.delete(key);
        });
    });

    scheduledKeys.forEach((key) => {
      if (!validKeys.has(key)) {
        scheduledKeys.delete(key);
      }
    });
  }, [tasks, timeBlocks]);

  const handleTaskMove = async (taskId: string, fromQuadrant: string, toQuadrant: string) => {
    console.log('🎬 handleTaskMove called:', { taskId, fromQuadrant, toQuadrant });
    try {
      console.log('🚀 Calling moveTask...');
      await moveTask(taskId, toQuadrant as QuadrantId);
      console.log('✅ moveTask completed');
      toast.success('Task moved successfully!');
    } catch (error) {
      console.error('❌ Failed to move task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to move task. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates);
      toast.success('Task updated successfully!');
    } catch (error) {
      console.error('Failed to update task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleTaskCreate = async (taskData: Partial<Task>, quadrant: string) => {
    try {
      await addTask({
        title: taskData.title || 'New Task',
        description: taskData.description,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'not-started',
        category: taskData.category || 'work',
        estimated_duration: taskData.estimated_duration,
        quadrant: quadrant as QuadrantId,
        // Required neurotype support fields
        buffer_time: taskData.buffer_time ?? 0,
        energy_required: taskData.energy_required || 'medium',
        focus_required: taskData.focus_required || 'medium',
        sensory_considerations: taskData.sensory_considerations || [],
        ...taskData
      });
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Failed to create task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      await completeTask(taskId);
      toast.success('Task completed! 🎉');
    } catch (error) {
      console.error('Failed to complete task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete task. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success('Task deleted successfully!');
    } catch (error) {
      console.error('Failed to delete task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task. Please try again.';
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={clearError}
                    className="bg-red-100 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <PriorityMatrix
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreate={handleTaskCreate}
        />
      </div>
    </div>
  );
};

export default Tasks;
