import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { TransitionCue as TransitionCueType, RoutineStep } from '../../types/routine';
import TransitionCue from './TransitionCue';

interface TransitionState {
  isActive: boolean;
  currentCue: TransitionCueType | null;
  fromStep: RoutineStep | null;
  toStep: RoutineStep | null;
  queue: TransitionTrigger[];
}

interface TransitionTrigger {
  id: string;
  cue: TransitionCueType;
  fromStep: RoutineStep;
  toStep: RoutineStep;
  priority: 'low' | 'normal' | 'high';
  scheduledAt: number; // timestamp
  callbacks: {
    onComplete: () => void;
    onDismiss: () => void;
    onError?: (error: string) => void;
  };
}

interface TransitionContextValue {
  state: TransitionState;
  triggerTransition: (
    fromStep: RoutineStep,
    toStep: RoutineStep,
    onComplete: () => void,
    onDismiss?: () => void
  ) => void;
  dismissCurrentTransition: () => void;
  clearTransitionQueue: () => void;
  isTransitioning: boolean;
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

interface TransitionProviderProps {
  children: React.ReactNode;
  autoAdvance?: boolean; // Automatically show next transition in queue
  maxQueueSize?: number; // Maximum transitions to queue
}

export const TransitionProvider: React.FC<TransitionProviderProps> = ({
  children,
  autoAdvance = true,
  maxQueueSize = 5
}) => {
  const [state, setState] = useState<TransitionState>({
    isActive: false,
    currentCue: null,
    fromStep: null,
    toStep: null,
    queue: []
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentCallbacksRef = useRef<TransitionTrigger['callbacks'] | null>(null);

  const processNextTransition = useCallback(() => {
    setState(prevState => {
      if (prevState.queue.length === 0) {
        return {
          ...prevState,
          isActive: false,
          currentCue: null,
          fromStep: null,
          toStep: null
        };
      }

      // Get the highest priority transition or the oldest one
      const sortedQueue = [...prevState.queue].sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        
        // If same priority, sort by scheduled time (FIFO)
        return priorityDiff === 0 ? a.scheduledAt - b.scheduledAt : priorityDiff;
      });

      const nextTransition = sortedQueue[0];
      const remainingQueue = prevState.queue.filter(t => t.id !== nextTransition.id);

      // Store callbacks for current transition
      currentCallbacksRef.current = nextTransition.callbacks;

      return {
        ...prevState,
        isActive: true,
        currentCue: nextTransition.cue,
        fromStep: nextTransition.fromStep,
        toStep: nextTransition.toStep,
        queue: remainingQueue
      };
    });
  }, []);

  const triggerTransition = useCallback((
    fromStep: RoutineStep,
    toStep: RoutineStep,
    onComplete: () => void,
    onDismiss: () => void = () => {}
  ) => {
    // Only trigger if the toStep has a transition cue
    if (!toStep.transitionCue) {
      onComplete();
      return;
    }

    const transitionId = `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const trigger: TransitionTrigger = {
      id: transitionId,
      cue: toStep.transitionCue,
      fromStep,
      toStep,
      priority: toStep.transitionCue.isRequired ? 'high' : 'normal',
      scheduledAt: Date.now(),
      callbacks: {
        onComplete,
        onDismiss,
        onError: (error) => {
          console.error('Transition error:', error);
          onDismiss();
        }
      }
    };

    setState(prevState => {
      // Check queue size limit
      if (prevState.queue.length >= maxQueueSize) {
        console.warn('Transition queue is full, dropping oldest transition');
        // Remove oldest transition
        const sortedQueue = [...prevState.queue].sort((a, b) => a.scheduledAt - b.scheduledAt);
        const newQueue = sortedQueue.slice(1);
        return {
          ...prevState,
          queue: [...newQueue, trigger]
        };
      }

      const newQueue = [...prevState.queue, trigger];

      // If no transition is currently active and autoAdvance is enabled, start immediately
      if (!prevState.isActive && autoAdvance) {
        return prevState; // processNextTransition will be called by useEffect
      }

      return {
        ...prevState,
        queue: newQueue
      };
    });
  }, [maxQueueSize, autoAdvance]);

  const dismissCurrentTransition = useCallback(() => {
    if (currentCallbacksRef.current) {
      currentCallbacksRef.current.onDismiss();
      currentCallbacksRef.current = null;
    }

    // Clear any pending auto-dismiss timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (autoAdvance) {
      processNextTransition();
    } else {
      setState(prevState => ({
        ...prevState,
        isActive: false,
        currentCue: null,
        fromStep: null,
        toStep: null
      }));
    }
  }, [autoAdvance, processNextTransition]);

  const handleTransitionComplete = useCallback(() => {
    if (currentCallbacksRef.current) {
      currentCallbacksRef.current.onComplete();
      currentCallbacksRef.current = null;
    }

    if (autoAdvance) {
      processNextTransition();
    } else {
      setState(prevState => ({
        ...prevState,
        isActive: false,
        currentCue: null,
        fromStep: null,
        toStep: null
      }));
    }
  }, [autoAdvance, processNextTransition]);

  const clearTransitionQueue = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      queue: []
    }));
  }, []);

  // Auto-process transitions when queue changes and no active transition
  React.useEffect(() => {
    if (!state.isActive && state.queue.length > 0 && autoAdvance) {
      const timer = setTimeout(processNextTransition, 100); // Small delay to batch transitions
      return () => clearTimeout(timer);
    }
  }, [state.isActive, state.queue.length, autoAdvance, processNextTransition]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!state.isActive) return;

      switch (event.key) {
        case 'Escape':
          if (!state.currentCue?.isRequired) {
            dismissCurrentTransition();
          }
          break;
        case 'Enter':
        case ' ': // Space key
          handleTransitionComplete();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, state.currentCue?.isRequired, dismissCurrentTransition, handleTransitionComplete]);

  const contextValue: TransitionContextValue = {
    state,
    triggerTransition,
    dismissCurrentTransition,
    clearTransitionQueue,
    isTransitioning: state.isActive
  };

  return (
    <TransitionContext.Provider value={contextValue}>
      {children}
      
      {/* Render active transition cue */}
      {state.isActive && state.currentCue && (
        <TransitionCue
          cue={state.currentCue}
          isVisible={true}
          onDismiss={dismissCurrentTransition}
          onComplete={handleTransitionComplete}
        />
      )}
      
      {/* Queue indicator for development/debugging */}
      {process.env.NODE_ENV === 'development' && state.queue.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-40">
          <div className="text-xs">
            Transition Queue: {state.queue.length}
          </div>
        </div>
      )}
    </TransitionContext.Provider>
  );
};

// Hook to use transition context
export const useTransition = (): TransitionContextValue => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransition must be used within a TransitionProvider');
  }
  return context;
};

// Higher-order component for routine execution with automatic transitions
interface RoutineExecutorProps {
  routine: {
    steps: RoutineStep[];
    [key: string]: any;
  };
  currentStepIndex: number;
  onStepComplete: (stepIndex: number) => void;
  onStepSkip: (stepIndex: number) => void;
  children: React.ReactNode;
}

export const RoutineExecutor: React.FC<RoutineExecutorProps> = ({
  routine,
  currentStepIndex,
  onStepComplete,
  onStepSkip,
  children
}) => {
  const { triggerTransition } = useTransition();

  const handleStepTransition = useCallback((completedStepIndex: number) => {
    const nextStepIndex = completedStepIndex + 1;
    
    if (nextStepIndex < routine.steps.length) {
      const fromStep = routine.steps[completedStepIndex];
      const toStep = routine.steps[nextStepIndex];
      
      triggerTransition(
        fromStep,
        toStep,
        () => onStepComplete(completedStepIndex),
        () => onStepComplete(completedStepIndex) // Also complete on dismiss
      );
    } else {
      // Last step completed, no transition needed
      onStepComplete(completedStepIndex);
    }
  }, [routine.steps, triggerTransition, onStepComplete]);

  // Provide enhanced callbacks to children
  const enhancedProps = {
    onStepComplete: handleStepTransition,
    onStepSkip
  };

  return (
    <>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, enhancedProps);
        }
        return child;
      })}
    </>
  );
};

// Utility hook for manual transition triggering
export const useManualTransition = () => {
  const { triggerTransition } = useTransition();

  const createTransition = useCallback((
    text: string,
    options: {
      type?: TransitionCueType['type'];
      audioUrl?: string;
      visualUrl?: string;
      duration?: number;
      isRequired?: boolean;
    } = {}
  ) => {
    const dummyStep: RoutineStep = {
      stepId: 'manual-transition',
      type: 'routine',
      title: 'Manual Transition',
      duration: 1,
      order: 0
    };

    const cue: TransitionCueType = {
      type: options.type || 'text',
      text,
      audioUrl: options.audioUrl,
      visualUrl: options.visualUrl,
      duration: options.duration,
      isRequired: options.isRequired || false
    };

    const stepWithCue: RoutineStep = {
      ...dummyStep,
      transitionCue: cue
    };

    return (onComplete: () => void = () => {}, onDismiss: () => void = () => {}) => {
      triggerTransition(dummyStep, stepWithCue, onComplete, onDismiss);
    };
  }, [triggerTransition]);

  return { createTransition };
};

export default TransitionProvider;