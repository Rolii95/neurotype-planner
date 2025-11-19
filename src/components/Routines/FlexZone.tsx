import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoutineStep, FreeformData, TimerSettings } from '../../types/routine';
import RichTextEditor from './RichTextEditor';
import SketchCanvas from './SketchCanvas';
import useAccessibility from '../../hooks/useAccessibility';

interface FlexZoneProps {
  step: RoutineStep;
  isActive: boolean;
  onStepUpdate: (stepId: string, updates: Partial<RoutineStep>) => void;
  onStepComplete: (stepId: string, actualDuration?: number) => void;
  onStepSkip: (stepId: string) => void;
  className?: string;
}

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number; // seconds
  timeElapsed: number; // seconds
  showWarning: boolean;
}

const FlexZone: React.FC<FlexZoneProps> = ({
  step,
  isActive,
  onStepUpdate,
  onStepComplete,
  onStepSkip,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editableTitle, setEditableTitle] = useState(step.title);
  const [editableDuration, setEditableDuration] = useState(step.duration);
  const [freeformContent, setFreeformContent] = useState<FreeformData | undefined>(step.freeformData);
  const [activeTab, setActiveTab] = useState<'timer' | 'freeform'>('timer');
  const [isCompletingStep, setIsCompletingStep] = useState(false);
  
  // Accessibility hook
  const { 
    getAccessibilityClasses, 
    getAriaProps, 
    announceToScreenReader, 
    handleKeyboardNavigation 
  } = useAccessibility();
  
  // Load persisted timer state from executionState if available
  const getInitialTimerState = (): TimerState => {
    const executionState = step.executionState;
    if (executionState?.actualDuration) {
      const elapsedSeconds = (executionState.actualDuration || 0) * 60;
      return {
        isRunning: false,
        isPaused: false,
        timeRemaining: Math.max(0, (step.duration * 60) - elapsedSeconds),
        timeElapsed: elapsedSeconds,
        showWarning: false
      };
    }
    return {
      isRunning: false,
      isPaused: false,
      timeRemaining: step.duration * 60,
      timeElapsed: 0,
      showWarning: false
    };
  };
  
  // Timer state
  const [timerState, setTimerState] = useState<TimerState>(getInitialTimerState);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Timer settings with defaults
  const timerSettings: TimerSettings = {
    autoStart: false,
    showWarningAt: 2, // 2 minutes before end
    endNotification: {
      type: 'visual',
      intensity: 'normal'
    },
    allowOverrun: true,
    ...step.timerSettings
  };

  // Auto-save freeform content
  const debouncedSave = useCallback(
    debounce((content: FreeformData) => {
      onStepUpdate(step.stepId, {
        freeformData: {
          ...content,
          lastModified: new Date().toISOString(),
          autoSaved: true
        }
      });
    }, 1000),
    [step.stepId, onStepUpdate]
  );

  // Timer effect
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const deltaSeconds = Math.floor((now - lastTickRef.current) / 1000);
        lastTickRef.current = now;

        setTimerState(prev => {
          const newTimeElapsed = prev.timeElapsed + deltaSeconds;
          const newTimeRemaining = Math.max(0, (step.duration * 60) - newTimeElapsed);
          
          // Check for warning threshold
          const warningThreshold = (timerSettings.showWarningAt || 2) * 60;
          const showWarning = newTimeRemaining <= warningThreshold && newTimeRemaining > 0;
          
          // Check if timer completed
          if (newTimeRemaining === 0 && !timerSettings.allowOverrun) {
            handleTimerComplete(newTimeElapsed);
          }

          return {
            ...prev,
            timeElapsed: newTimeElapsed,
            timeRemaining: newTimeRemaining,
            showWarning
          };
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.isPaused, step.duration, step.stepId]);

  // Auto-start timer when step becomes active
  useEffect(() => {
    if (isActive && timerSettings.autoStart && !timerState.isRunning) {
      startTimer();
    }
  }, [isActive, timerSettings.autoStart]);

  // Sync local state with step prop changes (when switching steps)
  useEffect(() => {
    setEditableTitle(step.title);
    setEditableDuration(step.duration);
    setFreeformContent(step.freeformData);
    
    // Reset timer state to match the new step
    const newTimerState = getInitialTimerState();
    setTimerState(newTimerState);
  }, [step.stepId]); // Only run when step ID changes

  // Persist timer state when it changes (auto-save progress)
  useEffect(() => {
    if (timerState.timeElapsed > 0) {
      const actualMinutes = timerState.timeElapsed / 60;
      // Save current progress to execution state
      onStepUpdate(step.stepId, {
        executionState: {
          ...(step.executionState || {}),
          status: step.executionState?.status || 'pending',
          actualDuration: actualMinutes
        }
      });
    }
  }, [timerState.timeElapsed, step.stepId, onStepUpdate]);

  const handleTimerComplete = (actualDurationSeconds: number) => {
    setTimerState(prev => ({ ...prev, isRunning: false, isPaused: false }));
    
    // Trigger end notification
    if (timerSettings.endNotification) {
      triggerEndNotification(timerSettings.endNotification);
    }
    
    // Auto-complete step if not allowing overrun
    if (!timerSettings.allowOverrun) {
      onStepComplete(step.stepId, Math.ceil(actualDurationSeconds / 60));
    }
  };

  const triggerEndNotification = (notification: NonNullable<TimerSettings['endNotification']>) => {
    const { type, intensity } = notification;
    
    if (type === 'visual' || type === 'all') {
      // Visual notification - could be enhanced with more sophisticated UI
      setTimerState(prev => ({ ...prev, showWarning: true }));
      setTimeout(() => setTimerState(prev => ({ ...prev, showWarning: false })), 3000);
    }
    
    if (type === 'audio' || type === 'all') {
      // Play subtle audio cue - implement based on intensity
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(intensity === 'subtle' ? 0.1 : intensity === 'normal' ? 0.3 : 0.5, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    }
    
    if (type === 'vibration' || type === 'all') {
      // Vibration API (if supported)
      if ('vibrate' in navigator) {
        const pattern = intensity === 'subtle' ? [100] : intensity === 'normal' ? [200, 100, 200] : [300, 100, 300, 100, 300];
        navigator.vibrate(pattern);
      }
    }
  };

  const startTimer = () => {
    setTimerState(prev => ({ ...prev, isRunning: true, isPaused: false }));
    lastTickRef.current = Date.now();
  };

  const pauseTimer = () => {
    setTimerState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const stopTimer = () => {
    setTimerState(prev => ({ 
      ...prev, 
      isRunning: false, 
      isPaused: false,
      timeRemaining: step.duration * 60,
      timeElapsed: 0,
      showWarning: false
    }));
  };

  const skipTimer = () => {
    onStepSkip(step.stepId);
  };

  const completeStep = () => {
    if (isCompletingStep) {
      console.log('⚠️ Step completion already in progress, ignoring click');
      return;
    }
    
    setIsCompletingStep(true);
    const actualMinutes = Math.ceil(timerState.timeElapsed / 60);
    onStepComplete(step.stepId, actualMinutes);
    
    // Reset after a short delay to prevent rapid re-clicks
    setTimeout(() => {
      setIsCompletingStep(false);
    }, 500);
  };

  const handleTitleChange = (newTitle: string) => {
    setEditableTitle(newTitle);
    onStepUpdate(step.stepId, { title: newTitle });
  };

  const handleDurationChange = (newDuration: number) => {
    setEditableDuration(newDuration);
    setTimerState(prev => ({
      ...prev,
      timeRemaining: newDuration * 60 - prev.timeElapsed
    }));
    onStepUpdate(step.stepId, { duration: newDuration });
  };

  const handleFreeformContentChange = (content: string, type: 'note' | 'sketch') => {
    const newContent: FreeformData = {
      type,
      content,
      lastModified: new Date().toISOString(),
      autoSaved: false
    };
    setFreeformContent(newContent);
    debouncedSave(newContent);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFlexZoneStyles = () => {
    const baseStyles = 'border-2 border-dashed rounded-lg transition-all duration-200';
    const colorStyles = step.visualCues?.backgroundColor || 'bg-purple-50';
    const borderStyles = step.visualCues?.borderColor || 'border-purple-300';
    const activeStyles = isActive ? 'ring-2 ring-purple-500 ring-opacity-50' : '';
    const warningStyles = timerState.showWarning ? 'animate-pulse border-amber-400 bg-amber-50' : '';
    
    return `${baseStyles} ${colorStyles} ${borderStyles} ${activeStyles} ${warningStyles} ${className}`;
  };

  return (
    <div 
      className={`
        ${getFlexZoneStyles()}
        ${getAccessibilityClasses()}
      `}
      {...getAriaProps('step', {
        title: step.title,
        stepId: step.stepId,
        isExpanded: isExpanded
      })}
      onKeyDown={(e) => handleKeyboardNavigation(e.nativeEvent, 'step')}
      tabIndex={0}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-purple-500" aria-hidden="true" />
            <input
              type="text"
              value={editableTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none outline-none focus:bg-white focus:border-gray-300 rounded px-2 py-1"
              disabled={!isActive}
              aria-label="Flex zone title"
            />
          </div>
          
          {/* Duration Input */}
          <div className="flex items-center space-x-2">
            <label htmlFor={`duration-${step.stepId}`} className="text-sm text-gray-600">
              Duration:
            </label>
            <input
              id={`duration-${step.stepId}`}
              type="number"
              min="1"
              max="120"
              value={editableDuration}
              onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-purple-500"
              disabled={!isActive || timerState.isRunning}
              aria-label="Duration in minutes"
            />
            <span className="text-sm text-gray-600">min</span>
          </div>
          
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={isExpanded ? 'Collapse flex zone' : 'Expand flex zone'}
            aria-expanded={isExpanded}
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-4" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'timer'}
              aria-controls="timer-panel"
              id="timer-tab"
              onClick={() => setActiveTab('timer')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'timer'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Timer
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'freeform'}
              aria-controls="freeform-panel"
              id="freeform-tab"
              onClick={() => setActiveTab('freeform')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'freeform'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Free Space
            </button>
          </div>

          {/* Timer Panel */}
          {activeTab === 'timer' && (
            <div id="timer-panel" role="tabpanel" aria-labelledby="timer-tab">
              <div className="text-center">
                {/* Timer Display */}
                <div className="mb-6">
                  <div 
                    className={`text-4xl font-mono font-bold mb-2 ${timerState.showWarning ? 'text-amber-600' : 'text-gray-800'}`}
                    {...getAriaProps('timer', {
                      timeRemaining: formatTime(timerState.timeRemaining),
                      isRunning: timerState.isRunning,
                      isPaused: timerState.isPaused
                    })}
                  >
                    {formatTime(timerState.timeRemaining)}
                  </div>
                  <div className="text-sm text-gray-600" aria-label={`Time elapsed: ${formatTime(timerState.timeElapsed)}`}>
                    Elapsed: {formatTime(timerState.timeElapsed)}
                  </div>
                  {timerSettings.allowOverrun && timerState.timeRemaining === 0 && (
                    <div 
                      className="text-sm text-amber-600 mt-1"
                      aria-label={`Timer overrun: ${formatTime(timerState.timeElapsed - (step.duration * 60))}`}
                      role="alert"
                    >
                      Timer overrun: +{formatTime(timerState.timeElapsed - (step.duration * 60))}
                    </div>
                  )}
                </div>

                {/* Timer Controls */}
                <div className="flex justify-center space-x-3 mb-4" role="group" aria-label="Timer controls">
                  {!timerState.isRunning ? (
                    <button
                      onClick={startTimer}
                      disabled={!isActive}
                      className={`px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed ${getAccessibilityClasses()}`}
                      aria-label="Start timer"
                      onFocus={() => announceToScreenReader('Timer start button focused')}
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={pauseTimer}
                      className={`px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 ${getAccessibilityClasses()}`}
                      aria-label={timerState.isPaused ? 'Resume timer' : 'Pause timer'}
                      onFocus={() => announceToScreenReader(`${timerState.isPaused ? 'Resume' : 'Pause'} timer button focused`)}
                    >
                      {timerState.isPaused ? 'Resume' : 'Pause'}
                    </button>
                  )}
                  
                  <button
                    onClick={stopTimer}
                    disabled={!timerState.isRunning && timerState.timeElapsed === 0}
                    className={`px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed ${getAccessibilityClasses()}`}
                    aria-label="Stop timer"
                    onFocus={() => announceToScreenReader('Stop timer button focused')}
                  >
                    Stop
                  </button>
                  
                  <button
                    onClick={skipTimer}
                    disabled={!isActive}
                    className={`px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${getAccessibilityClasses()}`}
                    aria-label="Skip this step"
                    onFocus={() => announceToScreenReader('Skip step button focused')}
                  >
                    Skip
                  </button>
                </div>

                {/* Complete Button */}
                <button
                  onClick={completeStep}
                  disabled={!isActive || isCompletingStep}
                  className={`px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed ${getAccessibilityClasses()}`}
                  aria-label="Mark step as complete"
                  onFocus={() => announceToScreenReader('Complete step button focused')}
                >
                  {isCompletingStep ? 'Completing...' : 'Complete Step'}
                </button>
              </div>
            </div>
          )}

          {/* Freeform Panel */}
          {activeTab === 'freeform' && (
            <div id="freeform-panel" role="tabpanel" aria-labelledby="freeform-tab">
              <div className="space-y-4">
                {/* Freeform Type Selector */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFreeformContent(prev => ({ ...prev, type: 'note', content: prev?.content || '' }))}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      freeformContent?.type === 'note'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Notes
                  </button>
                  <button
                    onClick={() => setFreeformContent(prev => ({ ...prev, type: 'sketch', content: prev?.content || '' }))}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      freeformContent?.type === 'sketch'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Sketch
                  </button>
                </div>

                {/* Content Area */}
                {freeformContent?.type === 'note' ? (
                  <RichTextEditor
                    content={freeformContent.content || ''}
                    onChange={(content) => handleFreeformContentChange(content, 'note')}
                    placeholder="Write your thoughts, ideas, or notes here..."
                    disabled={!isActive}
                    className="w-full"
                  />
                ) : (
                  <SketchCanvas
                    content={freeformContent?.content || ''}
                    onChange={(content) => handleFreeformContentChange(content, 'sketch')}
                    disabled={!isActive}
                    className="w-full"
                    width={360}
                    height={240}
                  />
                )}

                {/* Auto-save indicator */}
                {freeformContent && (
                  <div className="text-xs text-gray-500 text-right">
                    {freeformContent.autoSaved ? (
                      <span className="text-green-600">✓ Auto-saved</span>
                    ) : (
                      <span className="text-amber-600">● Saving...</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export default FlexZone;