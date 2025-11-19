import { useState, useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';

const PlayIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

const StopIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 6h12v12H6z" />
  </svg>
);

const TimerIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MicIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

type FocusMode = 'pomodoro' | 'custom' | 'flow';
type AmbientSound = 'none' | 'rain' | 'forest' | 'waves' | 'cafe' | 'whitenoise';

interface FocusSession {
  mode: FocusMode;
  duration: number;
  breakDuration: number;
  sessionsCompleted: number;
}

export function FocusMode() {
  const toast = useToast();
  const [mode, setMode] = useState<FocusMode>('pomodoro');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [breakTime, setBreakTime] = useState(5 * 60); // 5 minutes
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  
  // Audio settings
  const [ambientSound, setAmbientSound] = useState<AmbientSound>('none');
  const [volume, setVolume] = useState(50);
  const [isRecording, setIsRecording] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const presets = {
    pomodoro: { focus: 25 * 60, break: 5 * 60 },
    short: { focus: 15 * 60, break: 3 * 60 },
    long: { focus: 50 * 60, break: 10 * 60 },
  };

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused]);

  useEffect(() => {
    // Update ambient sound audio
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      if (ambientSound !== 'none' && isActive) {
        audioRef.current.play().catch(e => console.warn('Could not play audio:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [ambientSound, volume, isActive]);

  const handleTimerComplete = () => {
    playCompletionSound();
    
    if (isBreak) {
      // Break finished, start new focus session
      setIsBreak(false);
      setTimeLeft(mode === 'pomodoro' ? presets.pomodoro.focus : 25 * 60);
      setSessionsCompleted(prev => prev + 1);
      showNotification('Break Complete!', 'Time to focus again 🎯');
    } else {
      // Focus session finished, start break
      setIsBreak(true);
      setTimeLeft(breakTime);
      showNotification('Focus Session Complete!', 'Great work! Time for a break 🌟');
    }
  };

  const playCompletionSound = () => {
    const audio = new Audio('/sounds/completion-chime.mp3');
    audio.volume = volume / 100;
    audio.play().catch(e => console.warn('Could not play sound:', e));
  };

  const showNotification = (title: string, message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, icon: '/icon-192.png' });
    }
  };

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    setIsBreak(false);
    setTimeLeft(mode === 'pomodoro' ? presets.pomodoro.focus : 25 * 60);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVoiceTask = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.warning('Speech recognition is not supported in your browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice input:', transcript);
      // Dispatch event for task creation
      window.dispatchEvent(new CustomEvent('voice-task-create', {
        detail: { text: transcript }
      }));
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const progress = ((mode === 'pomodoro' ? presets.pomodoro.focus : 25 * 60) - timeLeft) / (mode === 'pomodoro' ? presets.pomodoro.focus : 25 * 60) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Focus Mode
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Stay focused with Pomodoro timer and ambient sounds
        </p>
      </div>

      {/* Timer Display */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-700 p-8">
        <div className="text-center mb-6">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {isBreak ? '☕ Break Time' : '🎯 Focus Time'}
          </div>
          <div className="text-7xl font-bold text-gray-900 dark:text-white mb-4 font-mono">
            {formatTime(timeLeft)}
          </div>
          
          {/* Progress Ring */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="transform -rotate-90 w-48 h-48">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                className="text-blue-600 dark:text-blue-400 transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <TimerIcon className="w-16 h-16 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {/* Session Counter */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Sessions Completed:</span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-semibold">
              {sessionsCompleted}
            </span>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isActive ? (
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <PlayIcon className="w-5 h-5" />
              <span>Start Focus</span>
            </button>
          ) : (
            <>
              <button
                onClick={handlePause}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                onClick={handleStop}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <StopIcon className="w-5 h-5" />
                <span>Stop</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Presets */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Presets</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(presets).map(([key, { focus, break: breakDur }]) => (
            <button
              key={key}
              onClick={() => {
                setMode(key as FocusMode);
                setTimeLeft(focus);
                setBreakTime(breakDur);
                setIsActive(false);
                setIsPaused(false);
              }}
              className={`p-4 rounded-lg border-2 transition-colors ${
                mode === key
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white capitalize">{key}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {focus / 60}m / {breakDur / 60}m
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ambient Sounds */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ambient Sounds</h3>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          {(['none', 'rain', 'forest', 'waves', 'cafe', 'whitenoise'] as AmbientSound[]).map((sound) => (
            <button
              key={sound}
              onClick={() => setAmbientSound(sound)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                ambientSound === sound
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">
                {sound === 'none' && '🔇'}
                {sound === 'rain' && '🌧️'}
                {sound === 'forest' && '🌲'}
                {sound === 'waves' && '🌊'}
                {sound === 'cafe' && '☕'}
                {sound === 'whitenoise' && '📻'}
              </div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                {sound === 'whitenoise' ? 'White Noise' : sound}
              </div>
            </button>
          ))}
        </div>

        {/* Volume Control */}
        {ambientSound !== 'none' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Volume: {volume}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        )}
      </div>

      {/* Voice Input */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg border border-green-200 dark:border-green-700 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              🎤 Voice Task Creation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Speak to create tasks hands-free. Perfect for capturing ideas during focus sessions.
            </p>
            <button
              onClick={handleVoiceTask}
              disabled={isRecording}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isRecording
                  ? 'bg-red-600 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <MicIcon className="w-5 h-5" />
              <span>{isRecording ? 'Listening...' : 'Start Voice Input'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audio element for ambient sounds */}
      <audio ref={audioRef} loop>
        <source src={`/sounds/${ambientSound}.mp3`} type="audio/mpeg" />
      </audio>
    </div>
  );
}
