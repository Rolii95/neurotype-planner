import React, { useState, useCallback, useRef } from 'react';
import { MatrixQuadrant, DEFAULT_QUADRANTS, MatrixViewConfig, MatrixAnnouncement } from '../../types/matrix';
import { Task } from '../../types';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { MatrixQuadrantComponent } from './MatrixQuadrant';
import { MatrixHeader } from './MatrixHeader';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface PriorityMatrixProps {
  tasks: Task[];
  onTaskMove: (taskId: string, fromQuadrant: string, toQuadrant: string) => Promise<void>;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (task: Partial<Task>, quadrant: string) => Promise<void>;
  className?: string;
}

export const PriorityMatrix: React.FC<PriorityMatrixProps> = ({
  tasks,
  onTaskMove,
  onTaskUpdate,
  onTaskCreate,
  className = ''
}) => {
  // State management
  const [viewConfig, setViewConfig] = useState<MatrixViewConfig>({
    showQuadrantDescriptions: true,
    showTaskDetails: true,
    compactMode: false,
    neurotypeFocus: 'general',
    colorMode: 'standard'
  });
  
  // Accessibility context
  const { settings } = useAccessibility();
  const announcementRef = useRef<HTMLDivElement>(null);
  

  // Group tasks by quadrant
  const tasksByQuadrant = React.useMemo(() => {
    const grouped = DEFAULT_QUADRANTS.reduce((acc, quadrant) => {
      acc[quadrant.id] = tasks.filter(task => task.quadrant === quadrant.id);
      return acc;
    }, {} as Record<string, Task[]>);
    
    // Add unassigned tasks to first quadrant temporarily
    const unassigned = tasks.filter(task => !task.quadrant);
    grouped['urgent-important'].push(...unassigned);
    
    return grouped;
  }, [tasks]);

  // Accessibility announcements
  const announceToScreenReader = useCallback((announcement: MatrixAnnouncement) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = announcement.message;
      
      // Brief pause to ensure screen reader picks it up
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const getQuadrantFromOver = useCallback((over: any) => {
    if (!over) return null;

    const dataQuadrant = over.data?.current?.quadrantId;
    if (typeof dataQuadrant === 'string' && DEFAULT_QUADRANTS.some(q => q.id === dataQuadrant)) {
      return dataQuadrant;
    }

    const overId = typeof over.id === 'string' ? over.id : null;
    if (overId) {
      if (DEFAULT_QUADRANTS.some(q => q.id === overId)) {
        return overId;
      }

      const matchingTask = tasks.find(task => task.id === overId);
      if (matchingTask?.quadrant) {
        return matchingTask.quadrant;
      }
    }

    return null;
  }, [tasks]);

  // DnD handling is provided by a shared DndContext at a higher level (Dashboard).
  // PriorityMatrix relies on that context and its quadrant droppables remain functional.

  // Update view configuration
  const updateViewConfig = useCallback((updates: Partial<MatrixViewConfig>) => {
    setViewConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Apply neurotype-specific styling
  const getMatrixClasses = () => {
    const baseClasses = 'priority-matrix w-full max-w-7xl mx-auto';
    const neurotypeFocus = viewConfig.neurotypeFocus;
    
    const classes = [baseClasses];
    
    if (settings.reducedMotion) {
      classes.push('motion-reduce');
    }
    
    if (settings.highContrast || viewConfig.colorMode === 'high-contrast') {
      classes.push('high-contrast');
    }
    
    if (viewConfig.compactMode) {
      classes.push('compact-mode');
    }
    
    if (neurotypeFocus === 'adhd') {
      classes.push('adhd-focus');
    } else if (neurotypeFocus === 'autism') {
      classes.push('autism-focus');
    } else if (neurotypeFocus === 'dyslexia') {
      classes.push('dyslexia-focus');
    }
    
    return classes.join(' ');
  };

  return (
    <div className={`${getMatrixClasses()} ${className}`}>
      {/* Screen reader announcements */}
      <div
        ref={announcementRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
      
      {/* Matrix Header */}
      <MatrixHeader
        viewConfig={viewConfig}
        onViewConfigChange={updateViewConfig}
        totalTasks={tasks.length}
        tasksByQuadrant={tasksByQuadrant}
      />
      
      {/* Main Matrix Grid */}
      <div 
        className="matrix-grid grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6"
        role="region"
        aria-label="Priority Matrix"
      >
        {DEFAULT_QUADRANTS.map(quadrant => (
          <MatrixQuadrantComponent
            key={quadrant.id}
            quadrant={quadrant}
            tasks={tasksByQuadrant[quadrant.id] || []}
            viewConfig={viewConfig}
            onTaskUpdate={onTaskUpdate}
            onTaskCreate={(task) => onTaskCreate(task, quadrant.id)}
            className="matrix-quadrant"
          />
        ))}
      </div>
      
      {/* Help and Instructions */}
      {viewConfig.showQuadrantDescriptions && (
        <div className="matrix-help mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Priority Matrix Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                {DEFAULT_QUADRANTS.map(quadrant => (
                  <div key={quadrant.id} className="flex items-start gap-2">
                    <div className={`w-3 h-3 rounded-full ${quadrant.color.accent} mt-1`} />
                    <div>
                      <div className="font-medium">{quadrant.title}</div>
                      <div className="text-blue-700">{quadrant.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {viewConfig.neurotypeFocus !== 'general' && (
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <div className="font-medium text-blue-900 mb-2">
                    {viewConfig.neurotypeFocus.toUpperCase()} Tips:
                  </div>
                  <div className="space-y-1 text-sm">
                    {DEFAULT_QUADRANTS.map(quadrant => (
                      <div key={quadrant.id}>
                        <span className="font-medium">{quadrant.title}:</span>{' '}
                        {quadrant.neurotypeTips[viewConfig.neurotypeFocus as keyof typeof quadrant.neurotypeTips]}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




