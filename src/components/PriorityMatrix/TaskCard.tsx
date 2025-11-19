import React, { useEffect, useRef, useState, forwardRef } from 'react';
import { useMatrixStore } from '../../stores/useMatrixStore';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { 
  ClockIcon,
  CalendarIcon,
  PencilIcon,
  CheckIcon,
  TrashIcon,
  EllipsisHorizontalIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

interface TimeBlock {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

interface TaskCardProps {
  task: Task;
  quadrantId: string;
  isDragging: boolean;
  isKeyboardNavigating: boolean;
  showDetails: boolean;
  timeBlock?: TimeBlock;
  onEdit?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  className?: string;
}

const TaskCardComponent: React.ForwardRefRenderFunction<HTMLDivElement, TaskCardProps> = ({
  task,
  quadrantId,
  isDragging,
  isKeyboardNavigating,
  showDetails,
  timeBlock,
  onEdit,
  onComplete,
  onDelete,
  className = ''
}, ref) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const openMenu = () => {
    clearHoverTimeout();
    setShowActionsMenu(true);
  };

  const delayCloseMenu = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = window.setTimeout(() => {
      setShowActionsMenu(false);
      hoverTimeoutRef.current = null;
    }, 200);
  };

  useEffect(() => {
    if (!showActionsMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu]);

  useEffect(() => {
    return () => {
      clearHoverTimeout();
    };
  }, []);
  
  // Draggable hook for drag and drop between quadrants
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggableActive,
  } = useDraggable({ 
    id: task.id,
    data: {
      task,
      quadrantId
    }
  });
  
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDraggableActive ? 0.5 : 1,
  };
  
  // Priority color mapping
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };
  
  // Status styling
  const getStatusStyling = () => {
    switch (task.status) {
      case 'completed':
        return 'opacity-60 line-through';
      case 'blocked':
        return 'border-red-300 bg-red-25';
      case 'in-progress':
        return 'border-blue-300 bg-blue-25';
      default:
        return '';
    }
  };
  
  // Format time estimates
  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsExpanded(!isExpanded);
    } else if (event.key === 'e' && onEdit) {
      event.preventDefault();
      onEdit(task.id);
    } else if (event.key === 'c' && onComplete) {
      event.preventDefault();
      onComplete(task.id);
    } else if (event.key === 's') {
      // Schedule shortcut: set time blocking target and open time-blocking tool
      event.preventDefault();
      const { setTimeBlockingTarget } = useMatrixStore.getState();
      setTimeBlockingTarget({ taskId: task.id });
      window.dispatchEvent(new CustomEvent('open-tool', { detail: { tool: 'time-blocking' } }));
    }
  };
  
  const cardClasses = [
    'task-card',
    'bg-white border-l-4 rounded-lg p-3 shadow-sm transition-all duration-200',
    'hover:shadow-md hover:scale-[1.02]',
    'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50',
    getPriorityColor(),
    getStatusStyling(),
    isDragging || isDraggableActive ? 'opacity-50' : '',
    isKeyboardNavigating ? 'ring-2 ring-blue-600' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div
      ref={(node: HTMLDivElement | null) => {
        setNodeRef(node);
        if (ref) {
          if (typeof ref === 'function') ref(node);
          else ref.current = node;
        }
      }}
      style={style}
      className={cardClasses}
      aria-label={`Task: ${task.title}. Priority: ${task.priority}. Status: ${task.status}`}
      onKeyDown={handleKeyDown}
    >
      {/* Drag Handle - top area for dragging */}
      <div 
        className="drag-handle cursor-grab active:cursor-grabbing -mx-3 -mt-3 px-3 pt-3 pb-2"
        style={{ touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        {/* Task Header */}
        <div className="task-header flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="task-title font-medium text-gray-900 leading-tight break-words">
              {task.title}
            </h4>
            
            {/* Visual cues */}
            {task.visual_cues?.emoji && (
              <span className="inline-block mt-1 text-lg" role="img">
                {task.visual_cues.emoji}
              </span>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="task-actions flex items-center gap-1">
            {(onEdit || onComplete || onDelete || task.description) && (
              <div
                className="relative"
                ref={actionsMenuRef}
                onMouseEnter={openMenu}
                onMouseLeave={delayCloseMenu}
              >
                <button
                  onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                  }}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    if (showActionsMenu) {
                      clearHoverTimeout();
                      setShowActionsMenu(false);
                    } else {
                      openMenu();
                    }
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-600"
                  aria-label="Open task actions"
                >
                  <EllipsisHorizontalIcon className="w-4 h-4" />
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 text-left text-sm shadow-lg">
                    {task.description && (
                      <button
                        className="flex w-full items-center justify-between px-3 py-2 hover:bg-gray-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsExpanded((prev) => !prev);
                          clearHoverTimeout();
                          setShowActionsMenu(false);
                        }}
                      >
                        <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
                      </button>
                    )}
                    {onEdit && (
                      <button
                        className="flex w-full items-center justify-between px-3 py-2 hover:bg-gray-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearHoverTimeout();
                          setShowActionsMenu(false);
                          onEdit(task.id);
                        }}
                      >
                        <span>Edit</span>
                        <PencilIcon className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                    {onComplete && (
                      <button
                        className="flex w-full items-center justify-between px-3 py-2 hover:bg-gray-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearHoverTimeout();
                          setShowActionsMenu(false);
                          onComplete(task.id);
                        }}
                      >
                        <span>{task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}</span>
                        <CheckIcon className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="flex w-full items-center justify-between px-3 py-2 text-red-600 hover:bg-red-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearHoverTimeout();
                          setShowActionsMenu(false);
                          onDelete(task.id);
                        }}
                      >
                        <span>Delete</span>
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Schedule handle (native drag for calendar) */}
            <div
              className="ml-2 p-1 rounded hover:bg-gray-100 cursor-grab"
              draggable
              onDragStart={(e: React.DragEvent) => {
                e.dataTransfer.setData('text/plain', task.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              title="Drag to calendar to schedule"
            >
              <svg className="w-4 h-4 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 7V3M16 7V3M3 11h18M21 21H3V7h18v14z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>

            {/* Schedule quick action (opens time-blocking and preselects task) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const { setTimeBlockingTarget } = useMatrixStore.getState();
                setTimeBlockingTarget({ taskId: task.id });
                window.dispatchEvent(new CustomEvent('open-tool', { detail: { tool: 'time-blocking' } }));
              }}
              className="ml-2 p-1 rounded hover:bg-gray-100 text-slate-600"
              title="Schedule task"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 7V3M16 7V3M3 11h18M21 21H3V7h18v14z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Task Metadata */}
      {showDetails && (
        <div className="task-metadata mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          {/* Scheduled Time - show if task has a time block */}
          {timeBlock && (
            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
              <CalendarIcon className="w-3 h-3" />
              <span>
                {format(parseISO(timeBlock.startTime), 'MMM d, h:mm a')} - {format(parseISO(timeBlock.endTime), 'h:mm a')}
              </span>
            </div>
          )}
          
          {/* Duration */}
          {task.estimated_duration && (
            <div className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              <span>{formatDuration(task.estimated_duration)}</span>
            </div>
          )}
          
          {/* Due Date - only show if no time block (otherwise would be redundant) */}
          {!timeBlock && task.due_date && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              <span>{format(new Date(task.due_date), 'MMM d')}</span>
            </div>
          )}
          
          {/* Category */}
          {task.category && (
            <div className="flex items-center gap-1">
              <TagIcon className="w-3 h-3" />
              <span className="capitalize">{task.category}</span>
            </div>
          )}
          
          {/* Priority Badge */}
          <span className={`px-2 py-0.5 rounded-full text-white text-xs font-medium ${
            task.priority === 'urgent' ? 'bg-red-500' :
            task.priority === 'high' ? 'bg-orange-500' :
            task.priority === 'medium' ? 'bg-yellow-500' :
            'bg-green-500'
          }`}>
            {task.priority}
          </span>
        </div>
      )}
      
      {/* Expanded Details */}
      {isExpanded && task.description && (
        <div className="task-description mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
          {task.description}
        </div>
      )}
      
      {/* Tags */}
          {showDetails && task.tags && task.tags.length > 0 && (
            <div className="task-tags mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag: string, index: number) => (
            <span
              key={index}
              className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-gray-500">
              +{task.tags.length - 3} more
            </span>
          )}
        </div>
      )}
      
      {/* Progress Bar for In-Progress Tasks */}
      {task.status === 'in-progress' && task.actual_duration && task.estimated_duration && (
        <div className="progress-bar mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((task.actual_duration / task.estimated_duration) * 100, 100)}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const TaskCard = forwardRef(TaskCardComponent);
