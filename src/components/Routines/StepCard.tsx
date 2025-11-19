import React from 'react';
import { RoutineStep } from '../../types/routine';
import FlexZone from './FlexZone';

interface StepCardProps {
  step: RoutineStep;
  isEditable: boolean;
  isDragging?: boolean;
  isActive?: boolean;
  onUpdate: (updates: Partial<RoutineStep>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onComplete?: (actualDuration?: number) => void;
  onSkip?: () => void;
  className?: string;
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  isEditable,
  isDragging = false,
  isActive = false,
  onUpdate,
  onDelete,
  onDuplicate,
  onComplete,
  onSkip,
  className = ''
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(step.title);
  const [editDuration, setEditDuration] = React.useState(step.duration);
  const [editDescription, setEditDescription] = React.useState(step.description || '');

  // Handle editing state
  const handleEditStart = () => {
    if (!isEditable) return;
    setIsEditing(true);
    setEditTitle(step.title);
    setEditDuration(step.duration);
    setEditDescription(step.description || '');
  };

  const handleEditSave = () => {
    onUpdate({
      title: editTitle,
      duration: editDuration,
      description: editDescription || undefined
    });
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditTitle(step.title);
    setEditDuration(step.duration);
    setEditDescription(step.description || '');
    setIsEditing(false);
  };

  // If this is a flex zone, use the FlexZone component
  if (step.type === 'flexZone') {
    return (
      <FlexZone
        step={step}
        isActive={isActive}
        onStepUpdate={(stepId, updates) => onUpdate(updates)}
        onStepComplete={(stepId, actualDuration) => onComplete?.(actualDuration)}
        onStepSkip={() => onSkip?.()}
        className={className}
      />
    );
  }

  const getStepStyles = () => {
    const baseStyles = 'border rounded-lg transition-all duration-200 bg-white';
    const dragStyles = isDragging ? 'opacity-50 transform rotate-2 shadow-lg' : '';
    const activeStyles = isActive ? 'ring-2 ring-blue-500 ring-opacity-50 border-blue-300' : 'border-gray-200';
    const typeStyles = step.type === 'note' ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-blue-400';
    
    return `${baseStyles} ${dragStyles} ${activeStyles} ${typeStyles} ${className}`;
  };

  const getStepIcon = () => {
    if (step.visualCues?.icon) {
      return step.visualCues.icon;
    }
    
    switch (step.type) {
      case 'note':
        return '📝';
      case 'routine':
      default:
        return '✓';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div className={getStepStyles()} role="listitem">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-grow">
            {/* Step Icon/Number */}
            <div className="flex-shrink-0 mt-1">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                {step.visualCues?.emoji || getStepIcon()}
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-grow min-w-0">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-lg font-semibold border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                    placeholder="Step title"
                    autoFocus
                  />
                  <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-600">Duration:</label>
                    <input
                      type="number"
                      min="1"
                      max="480"
                      value={editDuration}
                      onChange={(e) => setEditDuration(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">minutes</span>
                  </div>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Optional description"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEditSave}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {step.title}
                  </h3>
                  {step.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {step.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Duration: {formatDuration(step.duration)}</span>
                    <span>Type: {step.type}</span>
                    {step.order && <span>#{step.order}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isEditable && !isEditing && (
            <div className="flex items-center space-x-1 ml-4">
              {/* Edit Button */}
              <button
                onClick={handleEditStart}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Edit step"
                aria-label="Edit step"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              {/* Duplicate Button */}
              <button
                onClick={onDuplicate}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Duplicate step"
                aria-label="Duplicate step"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Delete Button */}
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Delete step"
                aria-label="Delete step"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Execution controls for active steps (flex zones handle controls internally) */}
        {isActive && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => onComplete?.()}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Complete
              </button>
              <button
                onClick={() => onSkip?.()}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Transition Cue Indicator */}
        {step.transitionCue && (
          <div className="mt-3 p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-blue-700">Has transition cue</span>
            </div>
          </div>
        )}

        {/* Neurotype Adaptations Indicator */}
        {step.neurotypeAdaptations && (
          <div className="mt-2 flex flex-wrap gap-1">
            {step.neurotypeAdaptations.adhd && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">ADHD</span>
            )}
            {step.neurotypeAdaptations.autism && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Autism</span>
            )}
            {step.neurotypeAdaptations.dyslexia && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Dyslexia</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepCard;