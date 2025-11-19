import React, { useEffect, useMemo, useState } from 'react';
import type {
  EnhancedRoutine,
  RoutineStep,
  RoutineStepType,
  TransitionCue,
} from '../../types/routine';
import { useHealthPlannerStore } from '../../stores/healthPlannerStore';

interface RoutineBuilderProps {
  routine: EnhancedRoutine;
  onRoutineUpdate?: (routine: EnhancedRoutine) => void;
  onStepAdd?: (routineId: string, step: RoutineStep) => void;
  onStepUpdate?: (stepId: string, updates: Partial<RoutineStep>) => void;
  onStepDelete?: (stepId: string) => void;
}

type StepFormState = {
  title: string;
  description: string;
  duration: string;
  type: RoutineStepType;
  showTransition: boolean;
  transitionText: string;
  transitionRequired: boolean;
  medicationRegimenId: string;
  medicationDoseId: string;
  medicationRequiresFood: boolean;
  medicationNotes: string;
  healthFocus: 'nutrition' | 'movement' | 'regulation' | 'hydration';
  healthEntryType: 'meal' | 'snack' | 'drink' | 'supplement';
  healthSensoryTags: string;
  healthAiPrompt: string;
};

const DEFAULT_FORM_STATE: StepFormState = {
  title: '',
  description: '',
  duration: '5',
  type: 'routine',
  showTransition: false,
  transitionText: '',
  transitionRequired: false,
  medicationRegimenId: '',
  medicationDoseId: '',
  medicationRequiresFood: false,
  medicationNotes: '',
  healthFocus: 'nutrition',
  healthEntryType: 'meal',
  healthSensoryTags: '',
  healthAiPrompt: '',
};

const generateStepId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `step-${Date.now()}`;

const buildTransitionCue = (
  shouldInclude: boolean,
  text: string,
  required: boolean
): TransitionCue | undefined => {
  if (!shouldInclude) return undefined;
  const cleaned = text.trim();
  if (!cleaned) return undefined;
  return {
    type: 'text',
    text: cleaned,
    isRequired: required,
  };
};

const RoutineBuilder: React.FC<RoutineBuilderProps> = ({
  routine,
  onRoutineUpdate,
  onStepAdd,
  onStepUpdate,
  onStepDelete,
}) => {
  const [formState, setFormState] = useState<StepFormState>(DEFAULT_FORM_STATE);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { medicationRegimens, initialize: initializeHealth } = useHealthPlannerStore((state) => ({
    medicationRegimens: state.medicationRegimens,
    initialize: state.initialize,
  }));

  useEffect(() => {
    if (medicationRegimens.length === 0) {
      void initializeHealth();
    }
  }, [initializeHealth, medicationRegimens.length]);

  const sortedSteps = useMemo(
    () => [...(routine.steps || [])].sort((a, b) => a.order - b.order),
    [routine.steps]
  );

  const handleOpenForm = (step?: RoutineStep) => {
    if (step) {
      setEditingStepId(step.stepId);
      setFormState({
        title: step.title,
        description: step.description || '',
        duration: String(step.duration ?? 5),
        type: step.type,
        showTransition: Boolean(step.transitionCue),
        transitionText: step.transitionCue?.text || '',
        transitionRequired: Boolean(step.transitionCue?.isRequired),
        medicationRegimenId: step.extensions?.medication?.regimenId ?? '',
        medicationDoseId: step.extensions?.medication?.doseId ?? '',
        medicationRequiresFood: Boolean(step.extensions?.medication?.requiresFood),
        medicationNotes: step.extensions?.medication?.prepTips ?? '',
        healthFocus: step.extensions?.health?.focus ?? 'nutrition',
        healthEntryType: step.extensions?.health?.entryType ?? 'meal',
        healthSensoryTags: (step.extensions?.health?.sensoryTags ?? []).join(', '),
        healthAiPrompt: step.extensions?.health?.aiPrompt ?? '',
      });
    } else {
      setEditingStepId(null);
      setFormState(DEFAULT_FORM_STATE);
    }
    setError(null);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setFormState(DEFAULT_FORM_STATE);
    setEditingStepId(null);
    setIsFormOpen(false);
    setError(null);
  };

  const handleSaveStep = () => {
    const duration = Number(formState.duration);
    if (!formState.title.trim()) {
      setError('Step title is required');
      return;
    }
    if (!Number.isFinite(duration) || duration < 1) {
      setError('Duration must be at least 1 minute');
      return;
    }

    const commonData: Partial<RoutineStep> = {
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      duration,
      type: formState.type,
      isFlexible: formState.type === 'flexZone' ? true : undefined,
    };

    const transitionCue = buildTransitionCue(
      formState.showTransition,
      formState.transitionText,
      formState.transitionRequired
    );
    if (transitionCue) {
      commonData.transitionCue = transitionCue;
    }

    if (formState.type === 'medication') {
      commonData.extensions = {
        medication: {
          regimenId: formState.medicationRegimenId,
          doseId: formState.medicationDoseId || undefined,
          requiresFood: formState.medicationRequiresFood,
          prepTips: formState.medicationNotes || undefined,
        },
      };
    } else if (formState.type === 'health') {
      const sensoryTags = formState.healthSensoryTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      commonData.extensions = {
        health: {
          focus: formState.healthFocus,
          entryType: formState.healthEntryType,
          sensoryTags: sensoryTags.length ? sensoryTags : undefined,
          aiPrompt: formState.healthAiPrompt || undefined,
        },
      };
    } else {
      commonData.extensions = undefined;
    }

    if (editingStepId) {
      onStepUpdate?.(editingStepId, commonData);
    } else {
      const newStep: RoutineStep = {
        stepId: generateStepId(),
        order: sortedSteps.length + 1,
        executionState: undefined,
        ...commonData,
      } as RoutineStep;
      onStepAdd?.(routine.id, newStep);
    }

    resetForm();
  };

  const handleDeleteStep = (stepId: string) => {
    onStepDelete?.(stepId);
    if (editingStepId === stepId) {
      resetForm();
    }
  };

  const handleRoutineTitleChange = (title: string) => {
    onRoutineUpdate?.({
      ...routine,
      title,
    });
  };

  return (
    <div className="routine-builder space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <label htmlFor="routine-title" className="sr-only">
            Routine Title
          </label>
          <input
            id="routine-title"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            value={routine.title}
            onChange={(event) => handleRoutineTitleChange(event.target.value)}
            placeholder="Routine title"
          />
        </div>
        <button
          type="button"
          onClick={() => handleOpenForm()}
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
        >
          Add Step
        </button>
      </div>

      <div className="space-y-3">
          {sortedSteps.map((step) => (
            <div
              key={step.stepId}
              data-testid={`step-card-${step.stepId}`}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {step.title} ({step.duration}min)
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{step.type}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-action="edit"
                    className="rounded border border-blue-600 px-3 py-1 text-sm text-blue-600"
                    onClick={() => handleOpenForm(step)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    data-action="delete"
                    className="rounded border border-red-600 px-3 py-1 text-sm text-red-600"
                    onClick={() => handleDeleteStep(step.stepId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {isFormOpen && (
        <div className="rounded-lg border border-gray-200 p-4" aria-live="polite">
          <h2 className="mb-4 text-lg font-semibold">
            {editingStepId ? 'Edit Step' : 'Add Step'}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="step-title" className="mb-1 block text-sm font-medium">
                Step Title
              </label>
              <input
                id="step-title"
                aria-label="Step Title"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>

            <div>
              <label htmlFor="step-description" className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                id="step-description"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                rows={3}
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="step-duration" className="mb-1 block text-sm font-medium">
                  Duration
                </label>
                <input
                  id="step-duration"
                  aria-label="Duration"
                  type="number"
                  min={1}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={formState.duration}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, duration: event.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="step-type" className="mb-1 block text-sm font-medium">
                  Step Type
                </label>
                <select
                  id="step-type"
                  aria-label="Step Type"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={formState.type}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      type: event.target.value as RoutineStepType,
                    }))
                  }
                >
                  <option value="routine">Routine Step</option>
                  <option value="flexZone">Flex Zone</option>
                  <option value="note">Note</option>
                  <option value="medication">Medication / Treatment</option>
                  <option value="health">Health & Diet</option>
                </select>
              </div>
            </div>

            {formState.type === 'medication' && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-sm space-y-3">
                <div>
                  <label className="mb-1 block font-medium">Linked Regimen</label>
                  <select
                    className="w-full rounded-md border border-blue-200 bg-white px-3 py-2"
                    value={formState.medicationRegimenId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        medicationRegimenId: event.target.value,
                        medicationDoseId: '',
                      }))
                    }
                  >
                    <option value="">Quick medication reminder</option>
                    {medicationRegimens.map((regimen) => (
                      <option key={regimen.id} value={regimen.id}>
                        {regimen.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium">Dose</label>
                  <select
                    className="w-full rounded-md border border-blue-200 bg-white px-3 py-2"
                    value={formState.medicationDoseId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        medicationDoseId: event.target.value,
                      }))
                    }
                    disabled={!formState.medicationRegimenId}
                  >
                    <option value="">Any scheduled dose</option>
                    {medicationRegimens
                      .find((regimen) => regimen.id === formState.medicationRegimenId)
                      ?.doses.map((dose) => (
                        <option key={dose.id} value={dose.id}>
                          {dose.label} �+" {dose.dosage}
                        </option>
                      ))}
                  </select>
                </div>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.medicationRequiresFood}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        medicationRequiresFood: event.target.checked,
                      }))
                    }
                  />
                  Needs food buffer
                </label>
                <textarea
                  className="w-full rounded-md border border-blue-200 bg-white px-3 py-2"
                  rows={2}
                  placeholder="Grounding cue, sensory accommodations, prep ritual..."
                  value={formState.medicationNotes}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      medicationNotes: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-blue-700">
                  These notes show beside the step and sync with the Treatment Orbit widget.
                </p>
              </div>
            )}

            {formState.type === 'health' && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 text-sm space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-medium">Focus</label>
                    <select
                      className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2"
                      value={formState.healthFocus}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          healthFocus: event.target.value as StepFormState['healthFocus'],
                        }))
                      }
                    >
                      <option value="nutrition">Sensory Nutrition</option>
                      <option value="hydration">Hydration Ritual</option>
                      <option value="movement">Movement Snack</option>
                      <option value="regulation">Regulation / Transition</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Entry Type</label>
                    <select
                      className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2"
                      value={formState.healthEntryType}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          healthEntryType: event.target.value as StepFormState['healthEntryType'],
                        }))
                      }
                    >
                      <option value="meal">Meal</option>
                      <option value="snack">Snack</option>
                      <option value="drink">Hydration Boost</option>
                      <option value="supplement">Supplement</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-medium">Sensory tags</label>
                  <input
                    className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2"
                    placeholder="crunchy, room-temp, low effort"
                    value={formState.healthSensoryTags}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        healthSensoryTags: event.target.value,
                      }))
                    }
                  />
                </div>
                <textarea
                  className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2"
                  rows={2}
                  placeholder="Optional AI prompt (e.g., 'suggest gentle breakfast ideas when energy < 3')"
                  value={formState.healthAiPrompt}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      healthAiPrompt: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-emerald-700">
                  Health steps sync with the Sensory Nutrition widget and keep analytics in one place.
                </p>
              </div>
            )}

            <div>
              <button
                type="button"
                className="text-sm text-blue-600 underline"
                onClick={() =>
                  setFormState((prev) => ({
                    ...prev,
                    showTransition: !prev.showTransition,
                  }))
                }
              >
                {formState.showTransition ? 'Remove Transition Cue' : 'Add Transition Cue'}
              </button>

              {formState.showTransition && (
                <div className="mt-3 space-y-3 rounded-md bg-gray-50 p-3">
                  <div>
                    <label htmlFor="transition-text" className="mb-1 block text-sm font-medium">
                      Transition Text
                    </label>
                    <textarea
                      id="transition-text"
                      aria-label="Transition Text"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      rows={2}
                      value={formState.transitionText}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          transitionText: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formState.transitionRequired}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          transitionRequired: event.target.checked,
                        }))
                      }
                    />
                    Require acknowledgement
                  </label>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-white"
              onClick={handleSaveStep}
            >
              Save Step
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2"
              onClick={resetForm}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutineBuilder;
