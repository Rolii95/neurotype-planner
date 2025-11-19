import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { EnhancedRoutine, RoutineStep, RoutineExecution, StepExecution } from '../../types/routine';
import { useTransition } from './TransitionProvider';

interface RoutineExecutionState {
  execution: RoutineExecution | null;
  currentStepIndex: number;
  currentStep: RoutineStep | null;
  isActive: boolean;
  isPaused: boolean;
  startedAt: Date | null;
  totalElapsed: number; // seconds
}

interface UseRoutineExecutionReturn {
  state: RoutineExecutionState;
  actions: {
    startRoutine: () => void;
    pauseRoutine: () => void;
    resumeRoutine: () => void;
    stopRoutine: () => void;
    completeCurrentStep: (actualDuration?: number, notes?: string) => void;
    skipCurrentStep: (reason?: string) => void;
    goToStep: (stepIndex: number) => void;
    addInterruption: (type: string, description?: string) => void;
    endInterruption: (impact: 'minor' | 'moderate' | 'major') => void;
  };
  progress: {
    completedSteps: number;
    totalSteps: number;
    estimatedTimeRemaining: number; // minutes
    actualTimeSpent: number; // minutes
    progressPercentage: number;
  };
}

export const useRoutineExecution = (
  routine: EnhancedRoutine,
  onExecutionComplete?: (execution: RoutineExecution) => void,
  onStepComplete?: (step: RoutineStep, execution: StepExecution) => void,
  autoSave?: boolean
): UseRoutineExecutionReturn => {
  
  const [state, setState] = useState<RoutineExecutionState>({
    execution: null,
    currentStepIndex: -1,
    currentStep: null,
    isActive: false,
    isPaused: false,
    startedAt: null,
    totalElapsed: 0
  });

  const { triggerTransition } = useTransition();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeInterruptionRef = useRef<string | null>(null);

  // Timer for tracking total elapsed time
  useEffect(() => {
    if (state.isActive && !state.isPaused) {
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          totalElapsed: prev.totalElapsed + 1
        }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.isActive, state.isPaused]);

  const createExecution = useCallback((): RoutineExecution => {
    const now = new Date().toISOString();
    return {
      id: `execution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      routineId: routine.id,
      userId: routine.userId,
      startedAt: now,
      stepExecutions: [],
      modifications: [],
      createdAt: now,
      updatedAt: now
    };
  }, [routine.id, routine.userId]);

  const createStepExecution = useCallback((
    step: RoutineStep,
    actualDuration?: number,
    notes?: string,
    status: StepExecution['status'] = 'completed'
  ): StepExecution => {
    const now = new Date().toISOString();
    return {
      stepId: step.stepId,
      startedAt: now,
      completedAt: status === 'completed' ? now : undefined,
      actualDuration: actualDuration,
      status,
      notes
    };
  }, []);

  const startRoutine = useCallback(() => {
    if (routine.steps.length === 0) {
      console.warn('Cannot start routine with no steps');
      return;
    }

    const execution = createExecution();
    const firstStep = routine.steps.find(step => step.order === 1) || routine.steps[0];

    setState({
      execution,
      currentStepIndex: 0,
      currentStep: firstStep,
      isActive: true,
      isPaused: false,
      startedAt: new Date(),
      totalElapsed: 0
    });
  }, [routine.steps, createExecution]);

  const pauseRoutine = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  const resumeRoutine = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: false
    }));
  }, []);

  const stopRoutine = useCallback(() => {
    if (state.execution) {
      const completedExecution: RoutineExecution = {
        ...state.execution,
        completedAt: new Date().toISOString(),
        totalDuration: Math.ceil(state.totalElapsed / 60),
        updatedAt: new Date().toISOString()
      };

      onExecutionComplete?.(completedExecution);
    }

    setState({
      execution: null,
      currentStepIndex: -1,
      currentStep: null,
      isActive: false,
      isPaused: false,
      startedAt: null,
      totalElapsed: 0
    });
  }, [state.execution, state.totalElapsed, onExecutionComplete]);

  const moveToNextStep = useCallback(() => {
    const nextIndex = state.currentStepIndex + 1;
    
    if (nextIndex >= routine.steps.length) {
      // Routine completed
      stopRoutine();
      return;
    }

    const currentStep = state.currentStep;
    const nextStep = routine.steps[nextIndex];

    // Update state to next step
    setState(prev => ({
      ...prev,
      currentStepIndex: nextIndex,
      currentStep: nextStep
    }));

    // Trigger transition if next step has transition cue
    if (currentStep && nextStep.transitionCue) {
      triggerTransition(
        currentStep,
        nextStep,
        () => {
          // Transition completed, step is now active
          console.log(`Transitioned to step: ${nextStep.title}`);
        },
        () => {
          // Transition dismissed, step is still active
          console.log(`Transition dismissed for step: ${nextStep.title}`);
        }
      );
    }
  }, [state.currentStepIndex, state.currentStep, routine.steps, stopRoutine, triggerTransition]);

  const completeCurrentStep = useCallback((actualDuration?: number, notes?: string) => {
    if (!state.currentStep || !state.execution) return;

    const stepExecution = createStepExecution(
      state.currentStep,
      actualDuration,
      notes,
      'completed'
    );

    // Update execution with step completion
    setState(prev => ({
      ...prev,
      execution: prev.execution ? {
        ...prev.execution,
        stepExecutions: [...prev.execution.stepExecutions, stepExecution],
        updatedAt: new Date().toISOString()
      } : null
    }));

    onStepComplete?.(state.currentStep, stepExecution);
    moveToNextStep();
  }, [state.currentStep, state.execution, createStepExecution, onStepComplete, moveToNextStep]);

  const skipCurrentStep = useCallback((reason?: string) => {
    if (!state.currentStep || !state.execution) return;

    const stepExecution = createStepExecution(
      state.currentStep,
      0,
      reason ? `Skipped: ${reason}` : 'Skipped',
      'skipped'
    );

    setState(prev => ({
      ...prev,
      execution: prev.execution ? {
        ...prev.execution,
        stepExecutions: [...prev.execution.stepExecutions, stepExecution],
        updatedAt: new Date().toISOString()
      } : null
    }));

    onStepComplete?.(state.currentStep, stepExecution);
    moveToNextStep();
  }, [state.currentStep, state.execution, createStepExecution, onStepComplete, moveToNextStep]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= routine.steps.length) return;

    const targetStep = routine.steps[stepIndex];
    setState(prev => ({
      ...prev,
      currentStepIndex: stepIndex,
      currentStep: targetStep
    }));
  }, [routine.steps]);

  const addInterruption = useCallback((type: string, description?: string) => {
    if (!state.execution) return;

    const interruptionId = `interruption-${Date.now()}`;
    activeInterruptionRef.current = interruptionId;

    // You would typically save this to the backend
    console.log('Interruption started:', { type, description });
  }, [state.execution]);

  const endInterruption = useCallback((impact: 'minor' | 'moderate' | 'major') => {
    if (!activeInterruptionRef.current) return;

    // You would typically save this to the backend
    console.log('Interruption ended:', { impact });
    activeInterruptionRef.current = null;
  }, []);

  // Calculate progress metrics
  const progress = useMemo(() => {
    const completedSteps = state.execution?.stepExecutions.filter(se => se.status === 'completed').length || 0;
    const totalSteps = routine.steps.length;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Calculate estimated time remaining
    const remainingSteps = routine.steps.slice(state.currentStepIndex + 1);
    const estimatedTimeRemaining = remainingSteps.reduce((sum, step) => sum + step.duration, 0);

    const actualTimeSpent = Math.ceil(state.totalElapsed / 60);

    return {
      completedSteps,
      totalSteps,
      estimatedTimeRemaining,
      actualTimeSpent,
      progressPercentage
    };
  }, [state.execution?.stepExecutions, routine.steps, state.currentStepIndex, state.totalElapsed]);

  return {
    state,
    actions: {
      startRoutine,
      pauseRoutine,
      resumeRoutine,
      stopRoutine,
      completeCurrentStep,
      skipCurrentStep,
      goToStep,
      addInterruption,
      endInterruption
    },
    progress
  };
};