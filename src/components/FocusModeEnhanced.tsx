import React, { useState, useEffect, useRef } from 'react';
import { focusService, AmbientSound, FocusSession, COMMON_DISTRACTING_SITES } from '../services/focusService';
import { useAdaptiveSmartFeatures } from '../features/adaptiveSmart';
import { useTimer } from '../contexts/TimerContext';

export const FocusModeEnhanced: React.FC = () => {
  const { timerState, startTimer: startGlobalTimer, pauseTimer: pauseGlobalTimer, resumeTimer: resumeGlobalTimer, stopTimer: stopGlobalTimer } = useTimer();
  const [isActive, setIsActive] = useState(false);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [ambientSounds, setAmbientSounds] = useState<AmbientSound[]>([]);
  const [selectedSound, setSelectedSound] = useState<AmbientSound | null>(null);
  const [volume, setVolume] = useState(50);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blockWebsites, setBlockWebsites] = useState(false);
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [taskName, setTaskName] = useState('');
  const [distractionCount, setDistractionCount] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { trackInteraction, trackCompletion } = useAdaptiveSmartFeatures();

  useEffect(() => {
    loadAmbientSounds();
    loadPreferences();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Sync with global timer context
  useEffect(() => {
    if (timerState.type === 'focus') {
      setTimeRemaining(timerState.timeRemaining);
      setIsActive(timerState.phase !== 'idle');
    }
  }, [timerState]);

  // Detect timer completion
  useEffect(() => {
    if (timerState.type === 'focus' && timerState.timeRemaining === 0 && timerState.phase === 'idle' && isActive) {
      handleSessionComplete();
    }
  }, [timerState.timeRemaining, timerState.phase]);

  useEffect(() => {
    // Update audio volume
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const loadAmbientSounds = () => {
    const sounds = focusService.getAmbientSounds();
    setAmbientSounds(sounds);
  };

  const loadPreferences = async () => {
    const prefs = await focusService.getPreferences('current-user');
    setSelectedDuration(prefs.default_duration);
    setVolume(prefs.ambient_volume);
    setBlockWebsites(prefs.block_websites);
    setBlockedSites(prefs.blocked_sites);

    if (prefs.default_ambient_sound) {
      const sound = focusService.getSoundById(prefs.default_ambient_sound);
      setSelectedSound(sound || null);
    }
  };

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
    void trackInteraction('FocusMode', 'select_duration', { duration });
  };

  const handleSoundSelect = (sound: AmbientSound | null) => {
    setSelectedSound(sound);
    void trackInteraction('FocusMode', 'select_soundscape', {
      soundId: sound?.id ?? 'silence',
    });
  };

  const startFocusSession = async () => {
    try {
      // Start session
      const newSession = await focusService.startSession(
        'current-user',
        selectedDuration,
        undefined,
        taskName,
        selectedSound?.id
      );

      setSession(newSession);
      setIsActive(true);
      setDistractionCount(0);
      await trackInteraction('FocusMode', 'start_session', {
        duration: selectedDuration,
        taskName: taskName || 'focus-session',
        soundscape: selectedSound?.id ?? 'silence',
        blockWebsites,
        blockedSitesCount: blockedSites.length,
      });

      // Start global timer
      startGlobalTimer({
        type: 'focus',
        duration: selectedDuration,
        taskName,
        sessionId: newSession.id,
        soundscapeId: selectedSound?.id,
      });

      // Play ambient sound
      if (selectedSound && audioRef.current) {
        audioRef.current.src = selectedSound.file;
        audioRef.current.loop = true;
        audioRef.current.volume = volume / 100;
        audioRef.current.play().catch((e) => console.error('Audio play failed:', e));
      }

      // Block notifications
      await focusService.blockNotifications();

      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus Session Started 🎯', {
          body: `You're in focus mode for ${selectedDuration} minutes`,
          icon: '/icons/icon-192x192.png',
        });
      }
    } catch (error) {
      console.error('Error starting focus session:', error);
    }
  };

  const endFocusSession = async (completed: boolean) => {
    try {
      const elapsedSeconds = Math.max(selectedDuration * 60 - timeRemaining, 0);

      stopGlobalTimer();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (session) {
        await focusService.endSession(session.id, completed);
        if (completed) {
          await trackCompletion('FocusMode', session.id, elapsedSeconds);
        } else {
          await trackInteraction('FocusMode', 'end_session', {
            completed: false,
            elapsedSeconds,
          });
        }
      }

      await focusService.unblockNotifications();

      if (isFullscreen) {
        await focusService.exitFullscreen();
        setIsFullscreen(false);
      }

      setIsActive(false);
      setSession(null);
      setTimeRemaining(0);

      // Show completion notification
      if (completed && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus Session Complete! 🎉', {
          body: `Great job! You stayed focused for ${selectedDuration} minutes with ${distractionCount} distractions.`,
          icon: '/icons/icon-192x192.png',
        });
      }
    } catch (error) {
      console.error('Error ending focus session:', error);
    }
  };

  const handleSessionComplete = () => {
    endFocusSession(true);
  };

  const recordDistraction = async () => {
    if (session) {
      await focusService.recordDistraction(session.id);
      const next = distractionCount + 1;
      setDistractionCount(next);
      await trackInteraction('FocusMode', 'record_distraction', { total: next });
    }
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await focusService.exitFullscreen();
      setIsFullscreen(false);
    } else {
      await focusService.enterFullscreen();
      setIsFullscreen(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = selectedDuration > 0 ? ((selectedDuration * 60 - timeRemaining) / (selectedDuration * 60)) * 100 : 0;

  if (isActive) {
    // Distraction-free focus view
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center z-50">
        <audio ref={audioRef} />

        {/* Ambient background animation */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ top: '10%', left: '20%' }} />
          <div className="absolute w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ bottom: '10%', right: '20%', animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 text-center text-white max-w-4xl px-8">
          {/* Timer Display */}
          <div className="mb-8">
            <h2 className="text-2xl font-light mb-4 text-purple-200">
              {taskName || 'Focus Session'}
            </h2>
            <div className="text-9xl font-bold font-mono mb-4 tracking-wider">
              {formatTime(timeRemaining)}
            </div>
            <div className="w-full max-w-2xl mx-auto h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Ambient Sound Control */}
          {selectedSound && (
            <div className="mb-8 bg-white/10 backdrop-blur-sm rounded-lg p-6 inline-block">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{selectedSound.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{selectedSound.name}</div>
                  <div className="text-sm text-purple-200">{selectedSound.description}</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm w-12">{volume}%</span>
              </div>
            </div>
          )}

          {/* Distractions Counter */}
          {distractionCount > 0 && (
            <div className="mb-8 text-orange-300">
              <div className="text-sm">Distractions noted: {distractionCount}</div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => recordDistraction()}
              className="px-6 py-3 bg-orange-500/20 hover:bg-orange-500/30 backdrop-blur-sm rounded-lg transition-all border border-orange-400/30"
            >
              🚨 Note Distraction
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all border border-white/30"
            >
              {isFullscreen ? '🪟 Exit Fullscreen' : '⛶ Fullscreen'}
            </button>
            <button
              onClick={() => endFocusSession(false)}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm rounded-lg transition-all border border-red-400/30"
            >
              ⏹️ End Session
            </button>
          </div>

          {/* Motivational Quote */}
          <div className="mt-12 text-purple-200 text-lg italic max-w-2xl mx-auto">
            "Deep work is the ability to focus without distraction on a cognitively demanding task."
          </div>
        </div>
      </div>
    );
  }

  // Setup view
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Enhanced Focus Mode 🎯
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Distraction-free deep work with ambient soundscapes
        </p>
      </div>

      {/* Task Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          What are you working on?
        </label>
        <input
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="e.g., Write project proposal"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Duration Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Focus Duration
        </label>
        <div className="grid grid-cols-4 gap-3">
          {[15, 25, 45, 60].map((duration) => (
            <button
              key={duration}
              onClick={() => handleDurationSelect(duration)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedDuration === duration
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {duration}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">minutes</div>
            </button>
          ))}
        </div>
      </div>

      {/* Ambient Sound Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Ambient Soundscape (Optional)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => handleSoundSelect(null)}
            className={`p-4 rounded-lg border-2 transition-all ${
              !selectedSound
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-1">🔇</div>
            <div className="text-xs text-gray-900 dark:text-white">Silence</div>
          </button>
          {ambientSounds.map((sound) => (
            <button
              key={sound.id}
              onClick={() => handleSoundSelect(sound)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedSound?.id === sound.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{sound.icon}</div>
              <div className="text-xs text-gray-900 dark:text-white">{sound.name}</div>
            </button>
          ))}
        </div>

        {selectedSound && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-700 dark:text-gray-300">Volume:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-900 dark:text-white w-12">{volume}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Website Blocking */}
      <div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start gap-3 mb-4">
          <input
            type="checkbox"
            id="block-websites"
            checked={blockWebsites}
            onChange={(e) => setBlockWebsites(e.target.checked)}
            className="mt-1 rounded"
          />
          <div className="flex-1">
            <label htmlFor="block-websites" className="font-medium text-gray-900 dark:text-white cursor-pointer">
              Block Distracting Websites
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              We'll remind you if you try to visit these sites during your focus session
            </p>
          </div>
        </div>

        {blockWebsites && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_DISTRACTING_SITES.map((site) => (
                <button
                  key={site}
                  onClick={() => {
                    if (blockedSites.includes(site)) {
                      setBlockedSites(blockedSites.filter((s) => s !== site));
                    } else {
                      setBlockedSites([...blockedSites, site]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    blockedSites.includes(site)
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {site} {blockedSites.includes(site) && '✓'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={startFocusSession}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
      >
        🎯 Start Focus Session
      </button>

      {/* Tips */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          💡 Focus Mode Tips
        </h3>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <li>• Clear your workspace of physical and digital clutter</li>
          <li>• Put your phone in another room or on Do Not Disturb</li>
          <li>• Use fullscreen mode for maximum immersion</li>
          <li>• Take breaks between focus sessions (try Pomodoro technique)</li>
          <li>• Ambient sounds can help mask distracting noises</li>
          <li>• Note distractions rather than acting on them immediately</li>
        </ul>
      </div>
    </div>
  );
};
