import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  PlusIcon,
  AdjustmentsHorizontalIcon,
  PlayIcon,
  PauseIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { VisualCard } from './VisualCard';
import { useVisualSensory } from '../VisualSensoryContext';
import { RoutineStep, VisualRoutine, AccessibilitySettings } from '../types';
import { visualSensoryAPI } from '../api/visualSensoryAPI';

interface RoutineVisualBoardProps {
  routineId?: string;
  readonly?: boolean;
  showControls?: boolean;
  compact?: boolean;
}

export const RoutineVisualBoard: React.FC<RoutineVisualBoardProps> = ({
  routineId,
  readonly = false,
  showControls = true,
  compact = false
}) => {
  const {
    routines,
    activeRoutine,
    setActiveRoutine,
    updateRoutine,
    reorderRoutineSteps,
    toggleStepCompletion,
    error,
    isLoading
  } = useVisualSensory();

  const [currentRoutine, setCurrentRoutine] = useState<VisualRoutine | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showCompleted, setShowCompleted] = useState(true);
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReaderMode: false,
    keyboardNavigation: true,
    colorBlindSupport: 'none'
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load routine
  useEffect(() => {
    if (routineId) {
      const routine = routines.find(r => r.id === routineId);
      setCurrentRoutine(routine || null);
    } else if (activeRoutine) {
      setCurrentRoutine(activeRoutine);
    }
  }, [routineId, routines, activeRoutine]);

  // Load accessibility settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibilitySettings');
    if (saved) {
      try {
        setAccessibilitySettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      }
    }
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!currentRoutine || !over || active.id === over.id) {
      return;
    }

    const oldIndex = currentRoutine.steps.findIndex(step => step.id === active.id);
    const newIndex = currentRoutine.steps.findIndex(step => step.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newSteps = arrayMove(currentRoutine.steps, oldIndex, newIndex);
      const updatedSteps = newSteps.map((step, index) => ({
        ...step,
        order: index
      }));

      // Update local state immediately for better UX
      setCurrentRoutine({
        ...currentRoutine,
        steps: updatedSteps
      });

      // Update via context (will sync to server)
      await reorderRoutineSteps(currentRoutine.id, updatedSteps.map(s => s.id));
    }
  };

  const handleStepUpdate = async (stepId: string, updates: Partial<RoutineStep>) => {
    if (!currentRoutine) return;

    const updatedSteps = currentRoutine.steps.map(step =>
      step.id === stepId ? { ...step, ...updates } : step
    );

    // Update local state
    setCurrentRoutine({
      ...currentRoutine,
      steps: updatedSteps
    });

    // Update via context
    await updateRoutine(currentRoutine.id, { steps: updatedSteps });
  };

  const handleStepDelete = async (stepId: string) => {
    if (!currentRoutine) return;

    const updatedSteps = currentRoutine.steps.filter(step => step.id !== stepId);
    
    setCurrentRoutine({
      ...currentRoutine,
      steps: updatedSteps
    });

    await updateRoutine(currentRoutine.id, { steps: updatedSteps });
  };

  const handleImageUpload = async (stepId: string, file: File) => {
    try {
      const imageUrl = await visualSensoryAPI.uploadFile(file);
      await handleStepUpdate(stepId, { imageUrl });
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  const handleAddStep = async () => {
    if (!currentRoutine) return;

    const newStep: RoutineStep = {
      id: crypto.randomUUID(),
      title: 'New Step',
      description: '',
      order: currentRoutine.steps.length,
      isCompleted: false,
      accessibility: {
        altText: 'New routine step',
        highContrast: accessibilitySettings.highContrast,
        largeText: accessibilitySettings.largeText
      }
    };

    const updatedSteps = [...currentRoutine.steps, newStep];
    
    setCurrentRoutine({
      ...currentRoutine,
      steps: updatedSteps
    });

    await updateRoutine(currentRoutine.id, { steps: updatedSteps });
  };

  const handleToggleRunning = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      // Start routine - find first incomplete step
      const nextIncompleteIndex = currentRoutine?.steps.findIndex(step => !step.isCompleted) || 0;
      setCurrentStepIndex(nextIncompleteIndex);
    }
  };

  const handleNextStep = async () => {
    if (!currentRoutine || !isRunning) return;

    const currentStep = currentRoutine.steps[currentStepIndex];
    if (currentStep && !currentStep.isCompleted) {
      await toggleStepCompletion(currentRoutine.id, currentStep.id);
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < currentRoutine.steps.length) {
      setCurrentStepIndex(nextIndex);
    } else {
      // Routine completed
      setIsRunning(false);
      setCurrentStepIndex(0);
    }
  };

  const filteredSteps = currentRoutine?.steps.filter(step => 
    showCompleted || !step.isCompleted
  ) || [];

  const completedCount = currentRoutine?.steps.filter(step => step.isCompleted).length || 0;
  const totalCount = currentRoutine?.steps.length || 0;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentRoutine) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">No routine selected</div>
        <button
          onClick={() => {/* TODO: Open routine selection */}}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Select a Routine
        </button>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto p-4 ${compact ? 'p-2' : ''}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`font-bold text-gray-900 ${
              accessibilitySettings.largeText ? 'text-2xl' : 'text-xl'
            }`}>
              {currentRoutine.title}
            </h2>
            {currentRoutine.description && (
              <p className={`text-gray-600 ${
                accessibilitySettings.largeText ? 'text-lg' : 'text-sm'
              }`}>
                {currentRoutine.description}
              </p>
            )}
          </div>

          {showControls && !readonly && (
            <div className="flex items-center gap-2">
              {/* Accessibility Toggle */}
              <button
                onClick={() => setAccessibilitySettings(prev => ({
                  ...prev,
                  highContrast: !prev.highContrast
                }))}
                className={`p-2 rounded-md border ${
                  accessibilitySettings.highContrast 
                    ? 'bg-yellow-100 border-yellow-300' 
                    : 'bg-white border-gray-300'
                } hover:bg-gray-50`}
                aria-label="Toggle high contrast mode"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </button>

              {/* Show/Hide Completed */}
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="p-2 rounded-md border bg-white border-gray-300 hover:bg-gray-50"
                aria-label={showCompleted ? 'Hide completed steps' : 'Show completed steps'}
              >
                {showCompleted ? (
                  <EyeIcon className="h-5 w-5" />
                ) : (
                  <EyeSlashIcon className="h-5 w-5" />
                )}
              </button>

              {/* Play/Pause */}
              <button
                onClick={handleToggleRunning}
                className={`p-2 rounded-md ${
                  isRunning 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
                aria-label={isRunning ? 'Pause routine' : 'Start routine'}
              >
                {isRunning ? (
                  <PauseIcon className="h-5 w-5" />
                ) : (
                  <PlayIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedCount}/{totalCount} steps</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Running Mode Indicator */}
        {isRunning && currentStepIndex < currentRoutine.steps.length && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-medium">
                  Current Step: {currentRoutine.steps[currentStepIndex]?.title}
                </p>
                <p className="text-blue-600 text-sm">
                  Step {currentStepIndex + 1} of {currentRoutine.steps.length}
                </p>
              </div>
              <button
                onClick={handleNextStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Complete & Next
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Steps Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        autoScroll={{ enabled: false }}
      >
        <SortableContext
          items={filteredSteps.map(step => step.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={`grid gap-4 ${
            compact 
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' 
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`} role="list" aria-label="Routine steps">
            {filteredSteps.map((step, index) => (
              <VisualCard
                key={step.id}
                step={step}
                onUpdate={handleStepUpdate}
                onDelete={handleStepDelete}
                onImageUpload={handleImageUpload}
                disabled={readonly || isRunning}
                showTime={currentRoutine.preferences.timeReminders}
                accessibilityMode={accessibilitySettings.highContrast}
              />
            ))}

            {/* Add Step Button */}
            {!readonly && (
              <div className="flex items-center justify-center">
                <button
                  onClick={handleAddStep}
                  className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors group"
                  aria-label="Add new step"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <PlusIcon className="h-8 w-8 text-gray-400 group-hover:text-gray-600" />
                    <span className="text-sm text-gray-500 group-hover:text-gray-700">
                      Add Step
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Routine completed celebration */}
      {totalCount > 0 && completedCount === totalCount && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-lg">
            <span className="text-lg">🎉</span>
            <span className="ml-2 font-medium">Routine completed! Great job!</span>
          </div>
        </div>
      )}
    </div>
  );
};