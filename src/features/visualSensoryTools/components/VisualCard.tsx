import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckIcon,
  ClockIcon,
  PhotoIcon,
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { RoutineStep } from '../types';

interface VisualCardProps {
  step: RoutineStep;
  onUpdate: (stepId: string, updates: Partial<RoutineStep>) => void;
  onDelete: (stepId: string) => void;
  onImageUpload: (stepId: string, file: File) => void;
  disabled?: boolean;
  showTime?: boolean;
  accessibilityMode?: boolean;
}

export const VisualCard: React.FC<VisualCardProps> = ({
  step,
  onUpdate,
  onDelete,
  onImageUpload,
  disabled = false,
  showTime = true,
  accessibilityMode = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editedTitle, setEditedTitle] = useState(step.title);
  const [editedDescription, setEditedDescription] = useState(step.description || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: step.id,
    disabled: disabled || isEditing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleSave = () => {
    onUpdate(step.id, {
      title: editedTitle,
      description: editedDescription
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(step.title);
    setEditedDescription(step.description || '');
    setIsEditing(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(step.id, file);
    }
  };

  const handleToggleComplete = () => {
    onUpdate(step.id, {
      isCompleted: !step.isCompleted,
      completedAt: !step.isCompleted ? new Date() : undefined
    });
  };

  const cardClasses = `
    relative group rounded-lg border-2 transition-all duration-200
    ${step.isCompleted 
      ? 'bg-green-50 border-green-200 shadow-sm' 
      : 'bg-white border-gray-200 shadow-md hover:shadow-lg'
    }
    ${isDragging ? 'rotate-2 scale-105' : ''}
    ${accessibilityMode ? 'border-4' : ''}
    ${step.accessibility?.highContrast ? 'bg-yellow-50 border-yellow-400' : ''}
  `;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClasses}
      aria-label={`Step: ${step.title}`}
    >
      {/* Drag Handle */}
      {!disabled && !isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Menu Button */}
      <div className="absolute top-2 right-2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-gray-100"
          aria-label="Step options"
        >
          <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
        </button>
        
        {showMenu && (
          <div className="absolute right-0 top-8 bg-white rounded-md shadow-lg border z-10 min-w-[120px]">
            <button
              onClick={() => {
                setIsEditing(true);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <PhotoIcon className="h-4 w-4" />
              Add Image
            </button>
            <button
              onClick={() => {
                onDelete(step.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        aria-label="Upload step image"
      />

      <div className="p-4 pt-8">
        {/* Visual Element */}
        <div className="flex justify-center mb-3">
          {step.imageUrl ? (
            <img
              src={step.imageUrl}
              alt={step.accessibility?.altText || step.title}
              className={`w-16 h-16 object-cover rounded-lg ${
                step.accessibility?.highContrast ? 'border-2 border-gray-800' : ''
              }`}
            />
          ) : step.iconUrl ? (
            <img
              src={step.iconUrl}
              alt={step.accessibility?.altText || step.title}
              className={`w-12 h-12 ${
                step.accessibility?.highContrast ? 'filter invert' : ''
              }`}
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <PhotoIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className={`w-full px-2 py-1 border rounded text-center font-medium ${
                step.accessibility?.largeText ? 'text-lg' : 'text-sm'
              }`}
              placeholder="Step title"
              aria-label="Edit step title"
            />
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className={`w-full px-2 py-1 border rounded text-center resize-none ${
                step.accessibility?.largeText ? 'text-base' : 'text-xs'
              }`}
              placeholder="Description (optional)"
              rows={2}
              aria-label="Edit step description"
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                aria-label="Save changes"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                aria-label="Cancel editing"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h3 className={`font-medium mb-1 ${
              step.accessibility?.largeText ? 'text-lg' : 'text-sm'
            } ${step.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {step.title}
            </h3>
            
            {step.description && (
              <p className={`text-gray-600 mb-2 ${
                step.accessibility?.largeText ? 'text-base' : 'text-xs'
              } ${step.isCompleted ? 'line-through' : ''}`}>
                {step.description}
              </p>
            )}

            {/* Duration & Tags */}
            <div className="flex flex-wrap justify-center gap-1 mb-3">
              {showTime && step.duration && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                  <ClockIcon className="h-3 w-3" />
                  {step.duration}m
                </span>
              )}
              
              {step.tags?.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Completion Button */}
            <button
              onClick={handleToggleComplete}
              className={`w-full py-2 rounded-md transition-colors ${
                step.isCompleted
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-label={step.isCompleted ? 'Undo completion' : 'Mark as complete (Mark done)'}
            >
              <div className="flex items-center justify-center gap-2">
                <CheckIcon className={`h-4 w-4 ${
                  step.isCompleted ? 'text-green-600' : 'text-gray-400'
                }`} />
                <span className={step.accessibility?.largeText ? 'text-base' : 'text-sm'}>
                  {step.isCompleted ? 'Completed' : 'Mark Done'}
                </span>
              </div>
            </button>

            {/* Completion Time */}
            {step.isCompleted && step.completedAt && (
              <p className="text-xs text-gray-500 mt-1">
                Completed at {step.completedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

