import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tab } from '@headlessui/react';
import {
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
  PencilIcon,
  ArrowSmallUpIcon,
  ArrowSmallDownIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import TransitionCue from '../components/Routines/TransitionCue';
import StepCard from '../components/Routines/StepCard';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { supabase } from '../services/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { routinesApi } from '../services/routinesApi';
import { useRoutineStore } from '../stores/routineStore';
import RoutineHeroStats from '../components/Routines/RoutineHeroStats';
import {
  routineAnalyticsService,
  type RoutineAnalyticsSummary,
} from '../services/routineAnalyticsService';
import type { EnhancedRoutine, RoutineStep } from '../types/routine';

const EXECUTION_STORAGE_KEY = 'routine-execution-state';

interface StoredExecutionState {
  routineId: string;
  executionSteps: RoutineStep[];
  currentStepId: string | null;
  isExecuting: boolean;
  currentExecutionId: string | null;
  dismissedTransitionStepId: string | null;
  storedAt: number;
}

const readStoredExecutionState = (): StoredExecutionState | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(EXECUTION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredExecutionState;
  } catch (error) {
    console.warn('Failed to parse stored routine execution state', error);
    return null;
  }
};

const initializeExecutionSteps = (steps: RoutineStep[]): RoutineStep[] =>
  steps.map((step, index) => ({
    ...step,
    order: step.order ?? index + 1,
    executionState: step.executionState ? { ...step.executionState } : { status: 'pending' as const },
  }));

const getNextUncompletedStep = (steps: RoutineStep[], afterStepId?: string): RoutineStep | null => {
  const ordered = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (ordered.length === 0) return null;

  const statusOf = (step: RoutineStep) => step.executionState?.status ?? 'pending';

  let startIndex = 0;
  if (afterStepId) {
    const index = ordered.findIndex((step) => step.stepId === afterStepId);
    if (index >= 0) {
      startIndex = Math.min(index + 1, ordered.length);
    }
  }

  for (let cursor = startIndex; cursor < ordered.length; cursor += 1) {
    const candidate = ordered[cursor];
    const status = statusOf(candidate);
    if (status !== 'completed' && status !== 'skipped') {
      return candidate;
    }
  }

  for (let cursor = 0; cursor < startIndex; cursor += 1) {
    const candidate = ordered[cursor];
    const status = statusOf(candidate);
    if (status !== 'completed' && status !== 'skipped') {
      return candidate;
    }
  }

  return null;
};

interface RoutineExecutorProps {
  routines: EnhancedRoutine[];
  activeRoutine: EnhancedRoutine | null;
  onSelectRoutine: (routine: EnhancedRoutine | null) => void;
  onCreateRoutine: () => void;
  isLoadingRoutines: boolean;
  onAnalyticsChange?: () => void;
}

const RoutineExecutor: React.FC<RoutineExecutorProps> = ({
  routines,
  activeRoutine,
  onSelectRoutine,
  onCreateRoutine,
  isLoadingRoutines,
  onAnalyticsChange,
}) => {
  const toast = useToast();
  const { user } = useAuth();
  const hasHydratedExecutionRef = useRef(false);

  const [executionSteps, setExecutionSteps] = useState<RoutineStep[]>(() =>
    initializeExecutionSteps(activeRoutine?.steps ?? [])
  );
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [dismissedTransitionStepId, setDismissedTransitionStepId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRoutine) {
      setExecutionSteps([]);
      setCurrentStepId(null);
      setIsExecuting(false);
      setCurrentExecutionId(null);
      hasHydratedExecutionRef.current = false;
      return;
    }

    if (hasHydratedExecutionRef.current) {
      return;
    }

    setExecutionSteps(initializeExecutionSteps(activeRoutine.steps));
    setCurrentStepId(null);
    setIsExecuting(false);
    setCurrentExecutionId(null);
    setDismissedTransitionStepId(null);
  }, [activeRoutine?.id, activeRoutine?.updatedAt]);

  useEffect(() => {
    if (!activeRoutine) {
      hasHydratedExecutionRef.current = false;
      return;
    }

    const stored = readStoredExecutionState();
    if (!stored || stored.routineId !== activeRoutine.id) {
      hasHydratedExecutionRef.current = false;
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(EXECUTION_STORAGE_KEY);
      }
      return;
    }

    setExecutionSteps(stored.executionSteps ?? initializeExecutionSteps(activeRoutine.steps));
    setCurrentStepId(stored.currentStepId ?? null);
    setIsExecuting(Boolean(stored.isExecuting));
    setCurrentExecutionId(stored.currentExecutionId ?? null);
    setDismissedTransitionStepId(stored.dismissedTransitionStepId ?? null);
    hasHydratedExecutionRef.current = true;
  }, [activeRoutine?.id, activeRoutine?.updatedAt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeRoutine || (!isExecuting && !currentExecutionId)) {
      window.sessionStorage.removeItem(EXECUTION_STORAGE_KEY);
      return;
    }

    const payload: StoredExecutionState = {
      routineId: activeRoutine.id,
      executionSteps,
      currentStepId,
      isExecuting,
      currentExecutionId,
      dismissedTransitionStepId,
      storedAt: Date.now(),
    };

    try {
      window.sessionStorage.setItem(EXECUTION_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist routine execution state', error);
    }
  }, [
    activeRoutine?.id,
    executionSteps,
    currentStepId,
    isExecuting,
    currentExecutionId,
    dismissedTransitionStepId,
  ]);

  const currentStep = currentStepId
    ? executionSteps.find((step) => step.stepId === currentStepId) ?? null
    : null;
  useEffect(() => {
    setDismissedTransitionStepId(null);
  }, [currentStepId]);
  const completedSteps = executionSteps.filter((step) => step.executionState?.status === 'completed');
  const progress = executionSteps.length
    ? (completedSteps.length / executionSteps.length) * 100
    : 0;
  const shouldShowTransitionCue =
    Boolean(isExecuting && currentStep?.transitionCue && dismissedTransitionStepId !== currentStepId);

  const handleTransitionDismiss = useCallback(() => {
    if (currentStepId) {
      setDismissedTransitionStepId(currentStepId);
    }
  }, [currentStepId, setDismissedTransitionStepId]);

  const updateExecutionRecord = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!currentExecutionId || !user?.id) return;
      const { error } = await supabase
        .from('routine_executions')
        .update(updates)
        .eq('id', currentExecutionId);
      if (error) {
        console.error('Failed to update routine execution:', error);
      }
    },
    [currentExecutionId, user?.id]
  );

  const handleStepUpdate = (stepId: string, updates: Partial<RoutineStep>) => {
    setExecutionSteps((prev) =>
      prev.map((step) =>
        step.stepId === stepId
          ? {
              ...step,
              ...updates,
              executionState: updates.executionState
                ? { ...step.executionState, ...updates.executionState }
                : step.executionState,
            }
          : step
      )
    );
  };

  const handleStepComplete = (stepId: string, actualDuration?: number) => {
    const updatedSteps = executionSteps.map((step) =>
      step.stepId === stepId
        ? {
            ...step,
            executionState: {
              ...(step.executionState ?? {}),
              status: 'completed' as const,
              completedAt: new Date().toISOString(),
              actualDuration: actualDuration ?? step.duration,
            },
          }
        : step
    );

    const nextStep = getNextUncompletedStep(updatedSteps, stepId);
    setExecutionSteps(updatedSteps);

    if (nextStep) {
      setCurrentStepId(nextStep.stepId);
      void updateExecutionRecord({ current_step_id: nextStep.stepId });
      toast.success(`Step completed. Up next: ${nextStep.title}`, 2500);
      return;
    }

    setIsExecuting(false);
    setCurrentStepId(null);
    void updateExecutionRecord({ current_step_id: null, completed_at: new Date().toISOString() });
    setCurrentExecutionId(null);
    toast.success('Routine finished. Great job!', 5000);
    onAnalyticsChange?.();
  };

  const handleStepSkip = (stepId: string) => {
    const updatedSteps = executionSteps.map((step) =>
      step.stepId === stepId
        ? {
            ...step,
            executionState: {
              ...(step.executionState ?? {}),
              status: 'skipped' as const,
              completedAt: new Date().toISOString(),
            },
          }
        : step
    );

    const nextStep = getNextUncompletedStep(updatedSteps, stepId);
    setExecutionSteps(updatedSteps);

    if (nextStep) {
      setCurrentStepId(nextStep.stepId);
      void updateExecutionRecord({ current_step_id: nextStep.stepId });
    } else {
      setIsExecuting(false);
      setCurrentStepId(null);
      void updateExecutionRecord({ current_step_id: null, completed_at: new Date().toISOString() });
      setCurrentExecutionId(null);
      toast.info('All steps completed or skipped.', 3500);
      onAnalyticsChange?.();
    }
  };

  const startRoutine = async () => {
    if (!activeRoutine) {
      toast.error('Select a routine to start.');
      return;
    }

    if (executionSteps.length === 0) {
      toast.error('This routine has no steps yet.');
      return;
    }

    const firstPending = getNextUncompletedStep(executionSteps);
    if (!firstPending) {
      toast.info('All steps are already completed. Reset before starting again.');
      return;
    }

    setIsExecuting(true);
    setCurrentStepId(firstPending.stepId);

    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('routine_executions')
          .insert({
            routine_id: activeRoutine.id,
            user_id: user.id,
            started_at: new Date().toISOString(),
            current_step_id: firstPending.stepId,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to track routine execution:', error);
        } else {
          setCurrentExecutionId(data.id);
        }
      } catch (err) {
        console.error('Error tracking routine execution:', err);
      }
    }
  };

  const resetRoutine = () => {
    if (!activeRoutine) return;
    setExecutionSteps(initializeExecutionSteps(activeRoutine.steps));
    setIsExecuting(false);
    setCurrentStepId(null);
    if (currentExecutionId) {
      void updateExecutionRecord({ current_step_id: null, completed_at: new Date().toISOString() });
    }
    setCurrentExecutionId(null);
  };

  const pauseRoutine = () => {
    setIsExecuting(false);
    setCurrentStepId(null);
    void updateExecutionRecord({ current_step_id: null });
    toast.info('Routine paused. Start again to resume.', 3000);
  };

  const selectStep = (stepId: string) => {
    if (!isExecuting) return;
    const step = executionSteps.find((item) => item.stepId === stepId);
    if (!step) return;

    const status = step.executionState?.status ?? 'pending';
    if (status !== 'pending') {
      toast.warning('Only pending steps can be activated.');
      return;
    }

    setCurrentStepId(stepId);
    void updateExecutionRecord({ current_step_id: stepId });
  };

  if (isLoadingRoutines) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg bg-white shadow-sm">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!routines.length) {
    return (
      <div className="rounded-lg bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <ClockIcon className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Create your first routine</h3>
        <p className="mt-2 text-sm text-gray-600">
          Build visual routines tailored to your energy, sensory, and focus needs.
        </p>
        <button
          type="button"
          onClick={onCreateRoutine}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          Create routine
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {activeRoutine ? activeRoutine.title : 'Select a routine to get started'}
            </h2>
            {activeRoutine && (
              <p className="mt-1 text-sm text-gray-600">
                {executionSteps.length} steps • {activeRoutine.totalDuration ?? executionSteps.reduce((sum, step) => sum + step.duration, 0)} minutes total
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={activeRoutine?.id ?? ''}
              onChange={(event) => {
                const next = routines.find((routine) => routine.id === event.target.value);
                onSelectRoutine(next ?? null);
              }}
            >
              <option value="" disabled>
                Choose a routine
              </option>
              {routines.map((routine) => (
                <option key={routine.id} value={routine.id}>
                  {routine.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onCreateRoutine}
              className="inline-flex items-center gap-2 rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600"
            >
              <PlusIcon className="h-4 w-4" />
              New routine
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!isExecuting ? (
            <button
              type="button"
              onClick={startRoutine}
              disabled={!activeRoutine || executionSteps.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <PlayIcon className="h-4 w-4" />
              Start routine
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={pauseRoutine}
                className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
              >
                <PauseIcon className="h-4 w-4" />
                Pause
              </button>
              <button
                type="button"
                onClick={resetRoutine}
                className="inline-flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                <StopIcon className="h-4 w-4" />
                Reset
              </button>
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
            <span>Progress</span>
            <span>
              {completedSteps.length} / {executionSteps.length} steps
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

      </div>

      {isExecuting && currentStep && (
        <div className="space-y-4">
          {shouldShowTransitionCue && currentStep.transitionCue && (
            <TransitionCue
              cue={currentStep.transitionCue}
              isVisible
              onDismiss={handleTransitionDismiss}
              onComplete={handleTransitionDismiss}
            />
          )}
          <StepCard
            key={currentStep.stepId}
            step={currentStep}
            isEditable={false}
            isActive
            onUpdate={(updates) => handleStepUpdate(currentStep.stepId, updates)}
            onDelete={() => handleStepSkip(currentStep.stepId)}
            onDuplicate={() => undefined}
            onComplete={(actualDuration) => handleStepComplete(currentStep.stepId, actualDuration)}
            onSkip={() => handleStepSkip(currentStep.stepId)}
            className="animate-fadeIn"
          />
        </div>
      )}

      {!isExecuting && activeRoutine && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Routine steps</h3>
          <div className="mt-4 space-y-3">
            {executionSteps.map((step, index) => {
              const status = step.executionState?.status ?? 'pending';
              const isCompleted = status === 'completed';
              const isSkipped = status === 'skipped';

              return (
                <div
                  key={step.stepId}
                  className={`flex items-start justify-between rounded-lg border p-4 ${
                    isCompleted
                      ? 'border-green-200 bg-green-50'
                      : isSkipped
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex max-w-xl flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-500">{index + 1}</span>
                      <span className="text-base font-semibold text-gray-900">{step.title}</span>
                    </div>
                    {step.description && (
                      <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                    )}
                    {isSkipped && (
                      <span className="mt-2 inline-flex items-center rounded-md bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Skipped last run
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4" />
                    <span>{step.duration} min</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isExecuting && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            All steps
            <span className="ml-2 text-sm font-normal text-gray-500">
              (Select any pending step to jump)
            </span>
          </h3>
          <div className="mt-4 space-y-3">
            {executionSteps.map((step, index) => {
              const status = step.executionState?.status ?? 'pending';
              const isCompleted = status === 'completed';
              const isSkipped = status === 'skipped';
              const isPending = status === 'pending';
              const isActive = step.stepId === currentStepId;

              return (
                <button
                  key={step.stepId}
                  type="button"
                  onClick={() => selectStep(step.stepId)}
                  disabled={!isPending}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : isCompleted
                      ? 'border-green-200 bg-green-50'
                      : isSkipped
                      ? 'border-gray-200 bg-gray-100'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  } ${!isPending ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isActive
                          ? 'bg-blue-600 text-white animate-pulse'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : isSkipped
                          ? 'bg-gray-400 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      >
                        {isActive ? '▶' : isCompleted ? '✓' : isSkipped ? '⊘' : index + 1}
                      </span>
                      <div>
                        <p className={`text-sm font-semibold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                          {step.title}
                        </p>
                        {step.description && (
                          <p className="text-xs text-gray-500">{step.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <ClockIcon className="h-4 w-4" />
                      <span>{step.duration} min</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            Flexible execution enabled. Pending steps remain interactive so you can adapt on the fly.
          </div>
        </div>
      )}
    </div>
  );
};

const ROUTINE_ORDER_STORAGE_KEY = 'routine-order';

const loadRoutineOrder = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ROUTINE_ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load routine order from storage', error);
    return [];
  }
};

const persistRoutineOrder = (order: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ROUTINE_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch (error) {
    console.warn('Failed to persist routine order', error);
  }
};

const Routines: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [selectedTab, setSelectedTab] = useState(0);
  const hasLoadedRef = useRef(false);
  const userSelectedRoutineRef = useRef(false);
  const [routineOrder, setRoutineOrder] = useState<string[]>(() => loadRoutineOrder());
  const [analytics, setAnalytics] = useState<RoutineAnalyticsSummary | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [branchingTemplateId, setBranchingTemplateId] = useState<string | null>(null);

  const {
    routines,
    isLoading,
    loadRoutines,
    deleteRoutine,
    duplicateRoutine,
    activeRoutine,
    setActiveRoutine,
  } = useRoutineStore((state) => ({
    routines: state.routines,
    isLoading: state.isLoading,
    loadRoutines: state.loadRoutines,
    deleteRoutine: state.deleteRoutine,
    duplicateRoutine: state.duplicateRoutine,
    activeRoutine: state.activeRoutine,
    setActiveRoutine: state.setActiveRoutine,
  }));

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      void loadRoutines();
    }
  }, [loadRoutines]);

  const refreshAnalytics = useCallback(async () => {
    setIsAnalyticsLoading(true);
    try {
      const summary = await routineAnalyticsService.fetchSummary();
      setAnalytics(summary);
    } catch (error) {
      console.error('Failed to load routine analytics:', error);
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAnalytics();
  }, [refreshAnalytics]);

  const orderedRoutines = useMemo(() => {
    if (!routineOrder.length) return routines;
    const mapped = routineOrder
      .map((id) => routines.find((routine) => routine.id === id))
      .filter((routine): routine is EnhancedRoutine => Boolean(routine));
    const leftovers = routines.filter((routine) => !routineOrder.includes(routine.id));
    return [...mapped, ...leftovers];
  }, [routineOrder, routines]);

  useEffect(() => {
    if (!orderedRoutines.length) return;

    const stillExists = activeRoutine
      ? orderedRoutines.some((routine) => routine.id === activeRoutine.id)
      : false;

    if (!activeRoutine || !stillExists) {
      setActiveRoutine(orderedRoutines[0]);
      userSelectedRoutineRef.current = true;
      return;
    }

    if (!userSelectedRoutineRef.current) {
      setActiveRoutine(orderedRoutines[0]);
      userSelectedRoutineRef.current = true;
    }
  }, [orderedRoutines, activeRoutine, setActiveRoutine]);

  useEffect(() => {
    setRoutineOrder((prev) => {
      const validIds = routines.map((routine) => routine.id);
      const deduped = prev.filter((id, index) => validIds.includes(id) && prev.indexOf(id) === index);
      const missing = validIds.filter((id) => !deduped.includes(id));
      const next = [...deduped, ...missing];
      const unchanged = next.length === prev.length && next.every((id, index) => id === prev[index]);
      if (!unchanged) {
        persistRoutineOrder(next);
        return next;
      }
      return prev;
    });
  }, [routines]);

  const handleCreateRoutine = () => {
    navigate('/routines/new');
  };

  const handleSelectRoutine = (routine: EnhancedRoutine | null) => {
    if (routine) {
      userSelectedRoutineRef.current = true;
    }
    setActiveRoutine(routine);
  };

  const handleStartFromList = (routine: EnhancedRoutine) => {
    handleSelectRoutine(routine);
    setSelectedTab(0);
    toast.success(`Loaded “${routine.title}” into the executor.`);
  };

  const moveRoutineInOrder = (routineId: string, direction: 'up' | 'down') => {
    setRoutineOrder((prev) => {
      const currentIndex = prev.indexOf(routineId);
      if (currentIndex === -1) return prev;
      const nextIndex =
        direction === 'up'
          ? Math.max(0, currentIndex - 1)
          : Math.min(prev.length - 1, currentIndex + 1);
      if (currentIndex === nextIndex) return prev;
      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, item);
      persistRoutineOrder(next);
      if (next[0] !== prev[0]) {
        userSelectedRoutineRef.current = false;
      }
      return next;
    });
  };

  const handleEditRoutine = (routineId: string) => {
    navigate(`/routines/new?routineId=${encodeURIComponent(routineId)}`);
  };

  const handleDuplicateRoutine = async (routineId: string) => {
    try {
      const newId = await duplicateRoutine(routineId);
      toast.success('Routine duplicated.');
      const newRoutine = useRoutineStore.getState().routines.find((item) => item.id === newId);
      if (newRoutine) {
        handleSelectRoutine(newRoutine);
        setSelectedTab(0);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to duplicate routine.';
      toast.error(message);
    }
  };

  const handleDeleteRoutine = async (routine: EnhancedRoutine) => {
    const confirmed = await confirm({
      title: 'Delete routine?',
      message: `This will permanently delete “${routine.title}”.`,
      confirmLabel: 'Delete routine',
      cancelLabel: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteRoutine(routine.id);
      toast.success('Routine deleted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete routine.';
      toast.error(message);
    }
  };

  const handleBranchRoutineTemplate = async (templateId: string, title?: string) => {
    setBranchingTemplateId(templateId);
    try {
      const res = await routinesApi.createSnapshotFromTemplate(templateId, title);
      if (res) {
        toast.success('Template branched to your snapshots.');
        // Optionally navigate to snapshot editor or refresh list
        void loadRoutines();
      } else {
        toast.error('Failed to branch template.');
      }
    } catch (e) {
      console.error('Error branching template:', e);
      toast.error('Error branching template.');
    } finally {
      setBranchingTemplateId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Routines</h1>
          <p className="mt-1 text-gray-600">Visual, flexible routines with transition support.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <RoutineHeroStats analytics={analytics} isLoading={isAnalyticsLoading} />
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="mb-8 flex space-x-1 rounded-xl bg-blue-900/20 p-1">
            <Tab className={({ selected }) => `
              w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
              ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/10 hover:text-white'}
            `}>
              <div className="flex items-center justify-center gap-2">
                <PlayIcon className="h-5 w-5" />
                <span>Execute</span>
              </div>
            </Tab>
            <Tab className={({ selected }) => `
              w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
              ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/10 hover:text-white'}
            `}>
              <div className="flex items-center justify-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                <span>My Routines</span>
              </div>
            </Tab>
            <Tab className={({ selected }) => `
              w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
              ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/10 hover:text-white'}
            `}>
              <div className="flex items-center justify-center gap-2">
                <Cog6ToothIcon className="h-5 w-5" />
                <span>Settings</span>
              </div>
            </Tab>
          </Tab.List>

          <Tab.Panels>
            <Tab.Panel>
              <RoutineExecutor
                routines={orderedRoutines}
                activeRoutine={activeRoutine}
                onSelectRoutine={handleSelectRoutine}
                onCreateRoutine={handleCreateRoutine}
                isLoadingRoutines={isLoading}
                onAnalyticsChange={refreshAnalytics}
              />
            </Tab.Panel>

            <Tab.Panel>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">My routines</h3>
                    <p className="text-sm text-gray-600">
                      Duplicate, delete, or jump into execution with one click.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadRoutines()}
                      disabled={isLoading}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateRoutine}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Create routine
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex min-h-[200px] items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : routines.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-300 px-6 py-12 text-center text-gray-500">
                    No routines yet. Create one to see it listed here.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderedRoutines.map((routine, index) => {
                      const duration = routine.totalDuration ?? routine.steps.reduce((sum, step) => sum + step.duration, 0);
                      const flexibility = Math.round((routine.flexibilityScore ?? 0) * 100);
                      const isActive = activeRoutine?.id === routine.id;
                      const updatedAt = new Date(routine.updatedAt).toLocaleString();
                      const isFirst = index === 0;
                      const isLast = index === orderedRoutines.length - 1;

                      return (
                        <div
                          key={routine.id}
                          className={`rounded-lg border p-5 transition ${
                            isActive ? 'border-blue-500 shadow-md ring-1 ring-blue-200' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-2xl">
                              <div className="flex items-center gap-3">
                                <h4 className="text-lg font-semibold text-gray-900">{routine.title}</h4>
                                {isActive && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    Active in executor
                                  </span>
                                )}
                              </div>
                              {routine.description && (
                                <p className="mt-1 text-sm text-gray-600">{routine.description}</p>
                              )}
                              <dl className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                  <ClockIcon className="h-4 w-4" />
                                  <span>{duration} min</span>
                                </div>
                                <div>
                                  <span>{routine.steps.length} steps</span>
                                </div>
                                <div>
                                  <span>Flexibility {flexibility}%</span>
                                </div>
                                <div>
                                  <span>Updated {updatedAt}</span>
                                </div>
                              </dl>
                            </div>
                             <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1 rounded-md border border-gray-200 p-1">
                                <button
                                  type="button"
                                  onClick={() => moveRoutineInOrder(routine.id, 'up')}
                                  disabled={isFirst}
                                  className="rounded p-1 text-gray-500 disabled:opacity-30"
                                  aria-label="Move routine up"
                                >
                                  <ArrowSmallUpIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveRoutineInOrder(routine.id, 'down')}
                                  disabled={isLast}
                                  className="rounded p-1 text-gray-500 disabled:opacity-30"
                                  aria-label="Move routine down"
                                >
                                  <ArrowSmallDownIcon className="h-4 w-4" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartFromList(routine)}
                                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                              >
                                <PlayIcon className="h-4 w-4" />
                                Run
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDuplicateRoutine(routine.id)}
                                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                              >
                                <DocumentDuplicateIcon className="h-4 w-4" />
                                Duplicate
                              </button>
                              {routine.isTemplate && (
                                <button
                                  type="button"
                                  onClick={() => void handleBranchRoutineTemplate(routine.id, routine.title)}
                                  disabled={branchingTemplateId === routine.id}
                                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                                >
                                  {branchingTemplateId === routine.id ? (
                                    <LoadingSpinner />
                                  ) : (
                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                  )}
                                  Branch
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEditRoutine(routine.id)}
                                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                              >
                                <PencilIcon className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteRoutine(routine)}
                                className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <TrashIcon className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Tab.Panel>

            <Tab.Panel>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Routine settings</h3>
                <div className="mt-4 space-y-4 text-sm text-gray-700">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" defaultChecked />
                    Show transition animations
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" defaultChecked />
                    Enable timer sounds
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    Auto-start next step
                  </label>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default Routines;

