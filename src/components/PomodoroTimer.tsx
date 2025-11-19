import React, { useState, useEffect, useRef } from 'react';
import { pomodoroService, PomodoroPreset, BreakActivity, PomodoroSession } from '../services/pomodoroService';
import { useTimer } from '../contexts/TimerContext';

type TimerPhase = 'idle' | 'work' | 'break' | 'long-break';

interface PomodoroTimerProps {
  taskId?: string;
  taskName?: string;
  onSessionComplete?: (session: PomodoroSession) => void;
  integrated?: boolean; // If true, show compact view for time blocking integration
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  taskId,
  taskName,
  onSessionComplete,
  integrated = false,
}) => {
  const { timerState, startTimer: startGlobalTimer, pauseTimer: pauseGlobalTimer, resumeTimer: resumeGlobalTimer, stopTimer: stopGlobalTimer } = useTimer();
  const [presets, setPresets] = useState<PomodoroPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PomodoroPreset | null>(null);
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);
  const [suggestedActivity, setSuggestedActivity] = useState<BreakActivity | null>(null);
  const [showBreakActivities, setShowBreakActivities] = useState(false);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);
  const [autoStartWork, setAutoStartWork] = useState(false);
  const [totalWorkTime, setTotalWorkTime] = useState(0);
  const [totalBreakTime, setTotalBreakTime] = useState(0);
  const [breakRequired, setBreakRequired] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [currentReward, setCurrentReward] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Neurodivergent-friendly rewards
  const rewards = [
    { text: "🎉 Amazing focus! You just completed a full session!", emoji: "⭐" },
    { text: "💪 You did it! Your brain worked hard - time to celebrate!", emoji: "🎊" },
    { text: "🌟 Focus session complete! You're building great habits!", emoji: "✨" },
    { text: "🚀 Incredible! Another session in the books!", emoji: "🏆" },
    { text: "🎯 Bulls-eye! You stayed focused the whole time!", emoji: "🎪" },
    { text: "🌈 Session complete! Your effort is paying off!", emoji: "💎" },
    { text: "⚡ Power move! You crushed that focus session!", emoji: "🔥" },
    { text: "🎨 Creative focus achieved! Time for a well-earned break!", emoji: "🌺" },
    { text: "🧠 Brain power activated! Excellent work!", emoji: "💫" },
    { text: "🎵 Rhythm mastered! Another session complete!", emoji: "🎶" }
  ];

  const getRandomReward = () => {
    const randomIndex = Math.floor(Math.random() * rewards.length);
    return rewards[randomIndex];
  };

  useEffect(() => {
    loadPresets();
  }, []);

  // Sync with global timer context
  useEffect(() => {
    if (timerState.type === 'pomodoro' || timerState.type === 'break' || timerState.type === 'long-break') {
      setTimeRemaining(timerState.timeRemaining);
      
      // Map timer type to phase
      if (timerState.type === 'pomodoro') {
        setPhase(timerState.phase === 'idle' ? 'idle' : 'work');
      } else if (timerState.type === 'break') {
        setPhase('break');
      } else if (timerState.type === 'long-break') {
        setPhase('long-break');
      }
    }
  }, [timerState]);

  // Detect timer completion
  useEffect(() => {
    if (timerState.timeRemaining === 0 && timerState.phase === 'idle' && phase !== 'idle') {
      // Timer just completed
      handlePhaseComplete(phase);
    }
  }, [timerState.timeRemaining, timerState.phase]);

  // Update timer display when preset changes (only when idle)
  useEffect(() => {
    if (selectedPreset && phase === 'idle') {
      setTimeRemaining(selectedPreset.workDuration * 60);
    }
  }, [selectedPreset, phase]);

  const loadPresets = async () => {
    const userPresets = await pomodoroService.getPresets('current-user');
    setPresets(userPresets);
    setSelectedPreset(userPresets[0]);
  };

  const startTimer = async (duration: number, timerPhase: TimerPhase) => {
    setPhase(timerPhase);

    if (timerPhase === 'work' && !currentSession) {
      const session = await pomodoroService.startSession(
        'current-user',
        selectedPreset?.id || 'classic',
        taskId,
        taskName
      );
      setCurrentSession(session);
    }

    // Use global timer context
    const timerType = timerPhase === 'work' ? 'pomodoro' : timerPhase === 'long-break' ? 'long-break' : 'break';
    startGlobalTimer({
      type: timerType,
      duration,
      taskName,
      taskId,
      sessionId: currentSession?.id,
      presetId: selectedPreset?.id,
    });
  };

  const handlePhaseComplete = (completedPhase: TimerPhase) => {
    // Play completion sound
    playSound();

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Complete! 🍅', {
        body: completedPhase === 'work' ? 'Time for a break!' : 'Ready to work again?',
        icon: '/icons/icon-192x192.png',
      });
    }

    if (completedPhase === 'work') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      setTotalWorkTime((prev) => prev + (selectedPreset?.workDuration || 25));

      // Show neurodivergent-friendly reward
      const reward = getRandomReward();
      setCurrentReward(reward.text);
      setShowReward(true);
      
      // Auto-hide reward after 5 seconds
      setTimeout(() => {
        setShowReward(false);
      }, 5000);

      // Require break before next work session
      setBreakRequired(true);

      // Update session in database
      if (currentSession) {
        pomodoroService.updateSession(currentSession.id, {
          completed_sessions: newCompletedSessions,
          total_work_time: totalWorkTime + (selectedPreset?.workDuration || 25),
        });
      }

      // Determine break type
      const isLongBreak =
        newCompletedSessions % (selectedPreset?.sessionsBeforeLongBreak || 4) === 0;
      const breakDuration = isLongBreak
        ? selectedPreset?.longBreakDuration || 15
        : selectedPreset?.breakDuration || 5;

      // Suggest break activity
      const activity = pomodoroService.getSuggestedBreakActivity(
        newCompletedSessions,
        isLongBreak
      );
      setSuggestedActivity(activity);

      if (autoStartBreaks) {
        startTimer(breakDuration, isLongBreak ? 'long-break' : 'break');
      } else {
        setPhase('idle');
      }
    } else {
      // Break completed - allow next work session
      setBreakRequired(false);
      setTotalBreakTime((prev) => prev + (selectedPreset?.breakDuration || 5));

      if (autoStartWork && selectedPreset) {
        startTimer(selectedPreset.workDuration, 'work');
      } else {
        setPhase('idle');
      }
    }
  };

  const playSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      // Use the same simple beep sound as TimerContext
      audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBz2X1vDMeTkHHm7A7+OZQQ8QV7Pl7KdaGAlMo+DzsGIhCkOU0/DEcikHJH/K7t+TTRAQXbbp66xaGg1Fndzwung0CTuM1vPJdSkFKYHJ8dyOOQcUZ7zr8KZgFg1Qp+T0s2ceCkSU2O/HcCQGMIvT8Mx8LgYlftDy2I03CA1Rs+fxrGEfCUOZ3PLKdiQHLYfP8tSHNAYSZ7vp7q1dHQtIot/0uW0jBz2T1/HJeCkHJIHO8N+ROQYRW7jo8KpfGAtMouDxtGcfCUGY2fC=';
      audioRef.current.volume = 0.3;
      void audioRef.current.play();
    } catch (error) {
      console.error('Error playing completion sound:', error);
    }
  };

  const startWork = () => {
    if (!selectedPreset) return;
    
    // Check if break is required before starting work
    if (breakRequired) {
      alert('⏸️ Take your break first! You must complete your rest period before starting another focus session.');
      return;
    }
    
    startTimer(selectedPreset.workDuration, 'work');
  };

  const startBreak = () => {
    if (!selectedPreset) return;
    const isLongBreak =
      completedSessions % (selectedPreset.sessionsBeforeLongBreak || 4) === 0;
    const breakDuration = isLongBreak
      ? selectedPreset.longBreakDuration
      : selectedPreset.breakDuration;
    startTimer(breakDuration, isLongBreak ? 'long-break' : 'break');
  };

  const pauseTimer = () => {
    pauseGlobalTimer();
  };

  const resumeTimer = () => {
    resumeGlobalTimer();
  };

  const stopTimer = () => {
    stopGlobalTimer();
    setPhase('idle');
    setTimeRemaining(0);

    if (currentSession) {
      pomodoroService.completeSession(currentSession.id);
      if (onSessionComplete) onSessionComplete(currentSession);
    }
  };

  const resetSession = () => {
    stopTimer();
    setCompletedSessions(0);
    setTotalWorkTime(0);
    setTotalBreakTime(0);
    setCurrentSession(null);
    setBreakRequired(false); // Clear break requirement on reset
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseLabel = (): string => {
    switch (phase) {
      case 'work':
        return 'Focus Time 🎯';
      case 'break':
        return 'Short Break ☕';
      case 'long-break':
        return 'Long Break 🌟';
      default:
        return 'Ready to Start';
    }
  };

  const getPhaseColor = (): string => {
    switch (phase) {
      case 'work':
        return 'bg-blue-500';
      case 'break':
        return 'bg-green-500';
      case 'long-break':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  const progress = selectedPreset
    ? ((selectedPreset.workDuration * 60 - timeRemaining) /
        (selectedPreset.workDuration * 60)) *
      100
    : 0;

  if (integrated) {
    // Compact view for time blocking integration
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${getPhaseColor()}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {getPhaseLabel()}
            </span>
            <span className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(timeRemaining)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {phase === 'idle' ? (
              <button
                onClick={startWork}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Start
              </button>
            ) : (
              <>
                {timerState.phase === 'running' ? (
                  <button
                    onClick={pauseTimer}
                    className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={resumeTimer}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Resume
                  </button>
                )}
                <button
                  onClick={stopTimer}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span>Sessions: {completedSessions}</span>
          <span>•</span>
          <span>Work: {totalWorkTime}m</span>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Preset Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Choose Your Rhythm
          {phase !== 'idle' && (
            <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
              (Stop timer to change rhythm)
            </span>
          )}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset)}
              disabled={phase !== 'idle'}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPreset?.id === preset.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              } ${
                phase !== 'idle'
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <div className="text-2xl mb-1">{preset.icon}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {preset.name}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {preset.workDuration}m / {preset.breakDuration}m
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Timer Display */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white mb-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">{getPhaseLabel()}</h2>
          {taskName && (
            <p className="text-blue-100 text-sm">Working on: {taskName}</p>
          )}
        </div>

        {/* Circular Progress */}
        <div className="relative w-64 h-64 mx-auto mb-6">
          <svg className="transform -rotate-90 w-64 h-64">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-white/20"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 120}`}
              strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
              className="text-white transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl font-mono font-bold">
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          {phase === 'idle' ? (
            <>
              {breakRequired && (
                <div className="bg-amber-500/20 backdrop-blur border-2 border-amber-400 rounded-lg px-6 py-3 text-center">
                  <p className="text-white font-semibold">⏸️ Break Required</p>
                  <p className="text-sm text-amber-100 mt-1">
                    Complete your rest period before starting another session
                  </p>
                </div>
              )}
              <div className="flex gap-4">
                <button
                  onClick={startWork}
                  disabled={!selectedPreset || breakRequired}
                  className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {breakRequired ? '🚫 Take Break First' : 'Start Focus Session'}
                </button>
                {breakRequired && (
                  <button
                    onClick={startBreak}
                    className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    ☕ Start Break
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {timerState.phase === 'running' ? (
                <button
                  onClick={pauseTimer}
                  className="px-6 py-3 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors"
                >
                  ⏸️ Pause
                </button>
              ) : (
                <button
                  onClick={resumeTimer}
                  className="px-6 py-3 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors"
                >
                  ▶️ Resume
                </button>
              )}
              <button
                onClick={stopTimer}
                className="px-6 py-3 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors"
              >
                ⏹️ Stop
              </button>
              <button
                onClick={resetSession}
                className="px-6 py-3 bg-red-500/20 backdrop-blur rounded-lg hover:bg-red-500/30 transition-colors"
              >
                🔄 Reset
              </button>
            </>
          )}
        </div>

        {/* Session Progress */}
        <div className="mt-6 flex justify-around text-center">
          <div>
            <div className="text-3xl font-bold">{completedSessions}</div>
            <div className="text-sm text-blue-100">Sessions</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{totalWorkTime}</div>
            <div className="text-sm text-blue-100">Minutes Worked</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{totalBreakTime}</div>
            <div className="text-sm text-blue-100">Minutes Rested</div>
          </div>
        </div>
      </div>

      {/* Reward Notification */}
      {showReward && currentReward && (
        <div className="mb-6 animate-bounce">
          <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-2xl p-6 text-white text-center shadow-2xl border-4 border-white">
            <div className="text-6xl mb-3 animate-pulse">🎉</div>
            <h3 className="text-2xl font-bold mb-2">{currentReward}</h3>
            <div className="flex justify-center gap-2 text-4xl mt-4">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>⭐</span>
              <span className="animate-bounce" style={{ animationDelay: '100ms' }}>✨</span>
              <span className="animate-bounce" style={{ animationDelay: '200ms' }}>🌟</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>💫</span>
            </div>
            <button
              onClick={() => setShowReward(false)}
              className="mt-4 px-6 py-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors text-sm"
            >
              ✓ Awesome, thanks!
            </button>
          </div>
        </div>
      )}

      {/* Break Activity Suggestion */}
      {suggestedActivity && phase !== 'work' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{suggestedActivity.icon}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Suggested Break: {suggestedActivity.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {suggestedActivity.description}
              </p>
              <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {suggestedActivity.instructions.map((instruction, index) => (
                  <li key={index}>
                    {index + 1}. {instruction}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <button
            onClick={() => setShowBreakActivities(!showBreakActivities)}
            className="mt-4 text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            {showBreakActivities ? 'Hide' : 'Show'} other activities
          </button>
        </div>
      )}

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={autoStartBreaks}
              onChange={(e) => setAutoStartBreaks(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-start breaks
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={autoStartWork}
              onChange={(e) => setAutoStartWork(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-start work sessions
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
