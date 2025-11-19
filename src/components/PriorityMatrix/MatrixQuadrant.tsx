import React, { useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MatrixQuadrant, MatrixViewConfig } from '../../types/matrix';
import { Task } from '../../types';
import { TaskCard } from './TaskCard';
import { QuickAddTask } from './QuickAddTask';
import { TaskEditModal } from './TaskEditModal';
import { useToast } from '../../contexts/ToastContext';
import { useMatrixStore } from '../../stores/useMatrixStore';
import { 
  PlusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface MatrixQuadrantProps {
  quadrant: MatrixQuadrant;
  tasks: Task[];
  viewConfig: MatrixViewConfig;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (task: Partial<Task>) => Promise<void>;
  className?: string;
}

export const MatrixQuadrantComponent: React.FC<MatrixQuadrantProps> = ({
  quadrant,
  tasks,
  viewConfig,
  onTaskUpdate,
  onTaskCreate,
  className = ''
}) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const toast = useToast();
  const { timeBlocks, deleteTask } = useMatrixStore();
  
  // Droppable configuration
  const { isOver, setNodeRef } = useDroppable({
    id: quadrant.id,
    data: {
      quadrantId: quadrant.id,
    },
  });
  
  // Handle quick add task
  const handleQuickAdd = useCallback(async (taskData: Partial<Task>) => {
    try {
      await onTaskCreate({
        ...taskData,
        quadrant: quadrant.id,
        priority: getQuadrantPriority(quadrant.id),
        status: 'not-started'
      });
      setShowQuickAdd(false);
      toast.success('Task created successfully! ✅');
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to add task. Please try again.');
    }
  }, [quadrant.id, onTaskCreate, toast]);
  
  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteTask(taskId);
        setEditingTask((current) => (current?.id === taskId ? null : current));
        toast.success('Task deleted');
      } catch (error) {
        console.error('Failed to delete task:', error);
        toast.error('Unable to delete task right now.');
      }
    },
    [deleteTask, toast]
  );
  
  // Get default priority based on quadrant
  const getQuadrantPriority = (quadrantId: string) => {
    switch (quadrantId) {
      case 'urgent-important': return 'urgent';
      case 'urgent-not-important': return 'high';
      case 'not-urgent-important': return 'medium';
      case 'not-urgent-not-important': return 'low';
      default: return 'medium';
    }
  };
  
  // Get quadrant styling classes
  const getQuadrantClasses = () => {
    const baseClasses = [
      'matrix-quadrant',
      'rounded-lg border-2 transition-all duration-200 min-h-[300px] flex flex-col',
      quadrant.color.bg,
      quadrant.color.border,
      quadrant.color.text
    ];
    
    if (isOver) {
      baseClasses.push('ring-2 ring-blue-500 ring-opacity-50', 'scale-[1.02]');
    }
    
    if (viewConfig.compactMode) {
      baseClasses.push('min-h-[200px]');
    }
    
    if (viewConfig.colorMode === 'high-contrast') {
      baseClasses.push('border-4');
    }
    
    return baseClasses.join(' ');
  };
  
  // Get icon component
  const getQuadrantIcon = () => {
    const iconMap = {
      'ExclamationTriangleIcon': '⚠️',
      'CalendarIcon': '📅',
      'UserGroupIcon': '👥',
      'TrashIcon': '🗑️'
    };
    
    return iconMap[quadrant.icon as keyof typeof iconMap] || '📋';
  };
  
  return (
    <div 
      ref={setNodeRef}
      className={`${getQuadrantClasses()} ${className}`}
      role="region"
      aria-label={`${quadrant.title} quadrant with ${tasks.length} tasks`}
    >
      {/* Quadrant Header */}
      <div className="quadrant-header p-4 border-b border-current border-opacity-20">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg" role="img" aria-label={quadrant.title}>
                {getQuadrantIcon()}
              </span>
              <h3 className="font-bold text-lg">
                {quadrant.title}
              </h3>
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-current bg-opacity-20">
                {tasks.length}
              </span>
            </div>
            
            {viewConfig.showQuadrantDescriptions && !viewConfig.compactMode && (
              <p className="text-sm opacity-80 mb-2">
                {quadrant.description}
              </p>
            )}
            
            <div className="flex items-center gap-1 text-xs font-medium">
              <span className={`px-2 py-1 rounded-full ${quadrant.color.accent} text-white`}>
                {quadrant.actionLabel}
              </span>
            </div>
          </div>
          
          {/* Quadrant Actions */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded hover:bg-current hover:bg-opacity-10 transition-colors"
              aria-label={isCollapsed ? 'Expand quadrant' : 'Collapse quadrant'}
            >
              {isCollapsed ? (
                <EyeIcon className="w-4 h-4" />
              ) : (
                <EyeSlashIcon className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={() => setShowQuickAdd(true)}
              className="p-1.5 rounded hover:bg-current hover:bg-opacity-10 transition-colors"
              aria-label={`Add task to ${quadrant.title}`}
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Neurotype Tip */}
        {viewConfig.neurotypeFocus !== 'general' && !viewConfig.compactMode && (
          <div className="mt-3 p-2 bg-current bg-opacity-10 rounded text-xs">
            <div className="font-medium mb-1">
              {viewConfig.neurotypeFocus.toUpperCase()} Tip:
            </div>
            <div>
              {quadrant.neurotypeTips[viewConfig.neurotypeFocus as keyof typeof quadrant.neurotypeTips]}
            </div>
          </div>
        )}
      </div>
      
      {/* Quadrant Content */}
      {!isCollapsed && (
        <div className="quadrant-content flex-1 p-4">
          {/* Quick Add Task */}
          {showQuickAdd && (
            <QuickAddTask
              onSubmit={handleQuickAdd}
              onCancel={() => setShowQuickAdd(false)}
              placeholder={`Add task to ${quadrant.title}...`}
              quadrantId={quadrant.id}
            />
          )}
          
          {/* Task List */}
          <div 
            className="task-list space-y-3"
            role="list"
            aria-label={`Tasks in ${quadrant.title}`}
          >
            {tasks.map(task => {
              // Find time block for this task
              const taskTimeBlock = timeBlocks.find(tb => tb.taskId === task.id);
              
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  quadrantId={quadrant.id}
                  isDragging={false}
                  isKeyboardNavigating={false}
                  showDetails={viewConfig.showTaskDetails}
                  timeBlock={taskTimeBlock}
                  onEdit={(taskId) => {
                    const task = tasks.find(t => t.id === taskId);
                    if (task) setEditingTask(task);
                  }}
                  onComplete={(taskId) => onTaskUpdate(taskId, { status: 'completed' })}
                  onDelete={handleDeleteTask}
                />
              );
            })}
          </div>
          
          {/* Empty State */}
          {tasks.length === 0 && !showQuickAdd && (
            <div className="empty-state text-center py-8">
              <div className="text-4xl mb-2" role="img" aria-hidden="true">
                {getQuadrantIcon()}
              </div>
              <div className="text-sm opacity-60 mb-4">
                No tasks in this quadrant
              </div>
              <button
                onClick={() => setShowQuickAdd(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border-2 border-dashed border-current border-opacity-30 hover:border-opacity-50 hover:bg-current hover:bg-opacity-5 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add first task
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Collapsed State */}
      {isCollapsed && (
        <div className="collapsed-content p-4 text-center">
          <div className="text-2xl mb-1">{getQuadrantIcon()}</div>
          <div className="text-sm font-medium">{tasks.length} tasks</div>
        </div>
      )}
      
      {/* Task Edit Modal with Calendar Widget */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={onTaskUpdate}
          timeBlock={timeBlocks.find(tb => tb.taskId === editingTask.id)}
        />
      )}
    </div>
  );
};
