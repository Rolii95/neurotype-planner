import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { boardService, Board, BoardStep, BoardExecution } from '../services/boardService';
import { useToast } from '../contexts/ToastContext';

export default function BoardExecutionView() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [board, setBoard] = useState<Board | null>(null);
  const [steps, setSteps] = useState<BoardStep[]>([]);
  const [execution, setExecution] = useState<BoardExecution | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [notes, setNotes] = useState('');
  const [satisfactionRating, setSatisfactionRating] = useState(3);
  const [difficultyRating, setDifficultyRating] = useState(3);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadBoardAndStart();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [boardId]);

  useEffect(() => {
    if (!isPaused && timeRemaining > 0 && !isCompleted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleStepComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, timeRemaining, isCompleted, currentStepIndex]);

  const loadBoardAndStart = async () => {
    if (!boardId) return;
    
    const result = await boardService.getBoard(boardId);
    if (result) {
      setBoard(result.board);
      setSteps(result.steps);
      
      if (result.steps.length > 0) {
        setTimeRemaining(result.steps[0].duration * 60);
      }
      
      const newExecution = await boardService.startExecution(boardId);
      setExecution(newExecution);
    } else {
      toast.error('Board not found');
      navigate('/boards');
    }
  };

  const handleStepComplete = () => {
    if (currentStepIndex < steps.length - 1) {
      // Move to next step
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setTimeRemaining(steps[nextIndex].duration * 60);
      playNotification();
    } else {
      // All steps complete
      setIsCompleted(true);
      playNotification();
    }
  };

  const handleSkipStep = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setTimeRemaining(steps[nextIndex].duration * 60);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleCompleteExecution = async () => {
    if (!execution || !boardId) return;

    await boardService.completeExecution(
      execution.id,
      satisfactionRating,
      difficultyRating,
      notes || undefined
    );

    navigate(`/boards/${boardId}`);
  };

  const playNotification = () => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep?.timer_settings?.endNotification) return;

    const { type, intensity } = currentStep.timer_settings.endNotification;

    // Visual notification
    if (type === 'visual' || type === 'all') {
      document.body.classList.add('flash-notification');
      setTimeout(() => document.body.classList.remove('flash-notification'), 500);
    }

    // Audio notification
    if (type === 'audio' || type === 'all') {
      // Play a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = intensity === 'subtle' ? 440 : intensity === 'prominent' ? 880 : 660;
      gainNode.gain.value = intensity === 'subtle' ? 0.1 : intensity === 'prominent' ? 0.3 : 0.2;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    }

    // Vibration (mobile)
    if (type === 'vibration' || type === 'all') {
      if ('vibrate' in navigator) {
        const pattern = intensity === 'subtle' ? [100] : intensity === 'prominent' ? [200, 100, 200] : [150];
        navigator.vibrate(pattern);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = steps.length > 0 ? (currentStepIndex / steps.length) * 100 : 0;
  const currentStep = steps[currentStepIndex];

  if (!board || steps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Board Complete!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Great job completing "{board.title}"
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How satisfied are you? (1-5)
              </label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setSatisfactionRating(rating)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      satisfactionRating === rating
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 scale-110'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
                    }`}
                  >
                    {rating === 1 ? '😞' : rating === 2 ? '😕' : rating === 3 ? '😐' : rating === 4 ? '🙂' : '😄'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How difficult was it? (1-5)
              </label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setDifficultyRating(rating)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      difficultyRating === rating
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 scale-110'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-400'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>Very Easy</span>
                <span>Very Hard</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Any thoughts or reflections?"
              />
            </div>

            <button
              onClick={handleCompleteExecution}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium"
            >
              Finish & Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700 z-50">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto pt-8">
        {/* Board Title */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{board.title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Step {currentStepIndex + 1} of {steps.length}
          </p>
        </div>

        {/* Current Step Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center">
            {/* Step Icon */}
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center text-4xl"
              style={{ backgroundColor: currentStep.visual_cues?.color + '20' }}
            >
              {currentStep.visual_cues?.icon || '•'}
            </div>

            {/* Step Title */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {currentStep.title}
            </h2>

            {/* Step Description */}
            {currentStep.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {currentStep.description}
              </p>
            )}

            {/* Timer */}
            <div className="mb-8">
              <div
                className={`text-7xl font-bold mb-2 transition-colors ${
                  timeRemaining < 60
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {isPaused ? 'Paused' : 'Remaining'}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handlePauseResume}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <button
                onClick={handleStepComplete}
                className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium text-lg"
              >
                ✓ Complete
              </button>
              {currentStep.is_optional && (
                <button
                  onClick={handleSkipStep}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">All Steps</h3>
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  idx === currentStepIndex
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                    : idx < currentStepIndex
                    ? 'bg-green-50 dark:bg-green-900/20 opacity-75'
                    : 'bg-gray-50 dark:bg-gray-700/50 opacity-60'
                }`}
              >
                <span className="text-2xl">
                  {idx < currentStepIndex ? '✓' : step.visual_cues?.icon || '•'}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {step.duration} min
                  </div>
                </div>
                {idx === currentStepIndex && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Exit Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to exit? Progress will be lost.')) {
                navigate(`/boards/${boardId}`);
              }
            }}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
          >
            Exit Execution
          </button>
        </div>
      </div>

      <style>{`
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .flash-notification {
          animation: flash 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
