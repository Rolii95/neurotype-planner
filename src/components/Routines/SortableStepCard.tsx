import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RoutineStep } from '../../types/routine';
import StepCard from './StepCard';

interface SortableStepCardProps {
  step: RoutineStep;
  isEditable: boolean;
  isActive?: boolean;
  onUpdate: (updates: Partial<RoutineStep>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onComplete?: (actualDuration?: number) => void;
  onSkip?: () => void;
  className?: string;
}

const SortableStepCard: React.FC<SortableStepCardProps> = ({
  step,
  isEditable,
  isActive = false,
  onUpdate,
  onDelete,
  onDuplicate,
  onComplete,
  onSkip,
  className = ''
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.stepId,
    disabled: !isEditable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50' : ''} ${className}`}
    >
      {/* Drag Handle */}
      {isEditable && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder step"
        >
          <div className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      )}

      {/* Step Card with padding for drag handle */}
      <div className={`${isEditable ? 'ml-8' : ''}`}>
        <StepCard
          step={step}
          isEditable={isEditable}
          isDragging={isDragging}
          isActive={isActive}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onComplete={onComplete}
          onSkip={onSkip}
        />
      </div>
    </div>
  );
};

export default SortableStepCard;