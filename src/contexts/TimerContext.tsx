import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

export type TimerType = 'pomodoro' | 'focus' | 'break' | 'long-break';
export type TimerPhase = 'idle' | 'running' | 'paused';

export interface TimerState {
  type: TimerType;
  phase: TimerPhase;
  timeRemaining: number; // in seconds
  totalDuration: number; // in seconds
  taskName?: string;
  taskId?: string;
  sessionId?: string;
  startedAt?: Date;
  soundscapeId?: string;
  presetId?: string;
}

interface TimerContextType {
  timerState: TimerState;
  startTimer: (config: {
    type: TimerType;
    duration: number; // in minutes
    taskName?: string;
    taskId?: string;
    sessionId?: string;
    soundscapeId?: string;
    presetId?: string;
  }) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  updateTimeRemaining: (seconds: number) => void;
  isTimerActive: boolean;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const initialTimerState: TimerState = {
  type: 'pomodoro',
  phase: 'idle',
  timeRemaining: 0,
  totalDuration: 0,
};

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [timerState, setTimerState] = useState<TimerState>(initialTimerState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Manage interval based on timer phase
  useEffect(() => {
    if (timerState.phase === 'running') {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start new interval
      intervalRef.current = setInterval(() => {
        setTimerState((prev) => {
          if (prev.timeRemaining <= 1) {
            // Timer completed
            playCompletionSound();
            return {
              ...prev,
              timeRemaining: 0,
              phase: 'idle',
            };
          }
          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1,
          };
        });
      }, 1000);
    } else {
      // Clear interval when not running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.phase]);

  const playCompletionSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      // Use a simple beep sound or bell
      audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBz2X1vDMeTkHHm7A7+OZQQ8QV7Pl7KdaGAlMo+DzsGIhCkOU0/DEcikHJH/K7t+TTRAQXbbp66xaGg1Fndzwung0CTuM1vPJdSkFKYHJ8dyOOQcUZ7zr8KZgFg1Qp+T0s2ceCkSU2O/HcCQGMIvT8Mx8LgYlftDy2I03CA1Rs+fxrGEfCUOZ3PLKdiQHLYfP8tSHNAYSZ7vp7q1dHQtIot/0uW0jBz2T1/HJeCkHJIHO8N+ROQYRW7jo8KpfGAtMouDxtGcfCUGY2fC=';
      audioRef.current.volume = 0.3;
      void audioRef.current.play();
    } catch (error) {
      console.error('Error playing completion sound:', error);
    }
  };

  const startTimer = useCallback((config: {
    type: TimerType;
    duration: number;
    taskName?: string;
    taskId?: string;
    sessionId?: string;
    soundscapeId?: string;
    presetId?: string;
  }) => {
    const durationInSeconds = config.duration * 60;
    setTimerState({
      type: config.type,
      phase: 'running',
      timeRemaining: durationInSeconds,
      totalDuration: durationInSeconds,
      taskName: config.taskName,
      taskId: config.taskId,
      sessionId: config.sessionId,
      soundscapeId: config.soundscapeId,
      presetId: config.presetId,
      startedAt: new Date(),
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      phase: prev.phase === 'running' ? 'paused' : prev.phase,
    }));
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      phase: prev.phase === 'paused' ? 'running' : prev.phase,
    }));
  }, []);

  const stopTimer = useCallback(() => {
    setTimerState(initialTimerState);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      timeRemaining: prev.totalDuration,
      phase: 'idle',
    }));
  }, []);

  const updateTimeRemaining = useCallback((seconds: number) => {
    setTimerState((prev) => ({
      ...prev,
      timeRemaining: seconds,
    }));
  }, []);

  const isTimerActive = timerState.phase === 'running' || timerState.phase === 'paused';

  const value: TimerContextType = {
    timerState,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    updateTimeRemaining,
    isTimerActive,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
