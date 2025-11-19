import React, { useState, useEffect, useRef } from 'react';

interface HyperfocusSession {
  startTime: Date;
  lastBreakTime: Date;
  remindersSent: number;
  hydrationReminders: number;
  movementReminders: number;
}

export const HyperfocusProtection: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [session, setSession] = useState<HyperfocusSession | null>(null);
  const [timeInFocus, setTimeInFocus] = useState(0);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderType, setReminderType] = useState<'break' | 'hydration' | 'movement'>('break');
  
  // Settings
  const [breakInterval, setBreakInterval] = useState(60); // minutes
  const [hydrationInterval, setHydrationInterval] = useState(30);
  const [movementInterval, setMovementInterval] = useState(45);
  const [gentleReminders, setGentleReminders] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isMonitoring) {
      intervalRef.current = setInterval(() => {
        if (session) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - session.startTime.getTime()) / 1000 / 60);
          const timeSinceBreak = Math.floor((now.getTime() - session.lastBreakTime.getTime()) / 1000 / 60);
          
          setTimeInFocus(elapsed);

          // Check for break reminder
          if (timeSinceBreak >= breakInterval) {
            triggerReminder('break');
          }
          // Check for hydration reminder
          else if (timeSinceBreak % hydrationInterval === 0 && timeSinceBreak > 0) {
            triggerReminder('hydration');
          }
          // Check for movement reminder
          else if (timeSinceBreak % movementInterval === 0 && timeSinceBreak > 0) {
            triggerReminder('movement');
          }
        }
      }, 60000); // Check every minute
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMonitoring, session, breakInterval, hydrationInterval, movementInterval]);

  const startMonitoring = () => {
    const now = new Date();
    setSession({
      startTime: now,
      lastBreakTime: now,
      remindersSent: 0,
      hydrationReminders: 0,
      movementReminders: 0,
    });
    setIsMonitoring(true);
    setTimeInFocus(0);

    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    setSession(null);
    setTimeInFocus(0);
    setShowReminder(false);
  };

  const triggerReminder = (type: typeof reminderType) => {
    setReminderType(type);
    setShowReminder(true);

    if (session) {
      setSession({
        ...session,
        remindersSent: session.remindersSent + 1,
        hydrationReminders: type === 'hydration' ? session.hydrationReminders + 1 : session.hydrationReminders,
        movementReminders: type === 'movement' ? session.movementReminders + 1 : session.movementReminders,
      });
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const messages = {
        break: 'Time for a break! You\'ve been focused for a while.',
        hydration: '💧 Hydration check! Have you had water recently?',
        movement: '🚶 Movement break! Stretch and move your body.',
      };

      new Notification('Hyperfocus Protection 🛡️', {
        body: messages[type],
        icon: '/icons/icon-192x192.png',
      });
    }
  };

  const acknowledgeReminder = () => {
    if (session) {
      setSession({
        ...session,
        lastBreakTime: new Date(),
      });
    }
    setShowReminder(false);
  };

  const snoozeReminder = () => {
    setShowReminder(false);
    // Will show again in next check cycle
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Reminder Modal
  if (showReminder) {
    const reminderContent = {
      break: {
        icon: '☕',
        title: 'Time for a Break',
        message: 'You\'ve been in hyperfocus for a while. Taking breaks helps maintain productivity.',
        suggestions: [
          'Stand up and stretch',
          'Walk around for 5 minutes',
          'Look away from screen (20-20-20 rule)',
          'Have a healthy snack',
        ],
      },
      hydration: {
        icon: '💧',
        title: 'Hydration Reminder',
        message: 'Staying hydrated helps maintain focus and energy.',
        suggestions: [
          'Drink a glass of water',
          'Have some herbal tea',
          'Eat water-rich fruits',
          'Notice if you feel thirsty',
        ],
      },
      movement: {
        icon: '🚶',
        title: 'Movement Break',
        message: 'Your body needs movement. Even brief activity helps.',
        suggestions: [
          'Do 10 jumping jacks',
          'Walk to another room',
          'Do shoulder rolls',
          'Stretch your legs',
        ],
      },
    };

    const content = reminderContent[reminderType];

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{content.icon}</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {content.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {content.message}
            </p>
          </div>

          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick suggestions:
            </div>
            <ul className="space-y-2">
              {content.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={snoozeReminder}
              className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Snooze 5min
            </button>
            <button
              onClick={acknowledgeReminder}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Hyperfocus Protection 🛡️
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gentle reminders to take care of yourself during deep work
        </p>
      </div>

      {!isMonitoring ? (
        <div className="space-y-6">
          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Reminder Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Break reminder every:
                </label>
                <select
                  value={breakInterval}
                  onChange={(e) => setBreakInterval(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Hydration reminder every:
                </label>
                <select
                  value={hydrationInterval}
                  onChange={(e) => setHydrationInterval(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                >
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Movement reminder every:
                </label>
                <select
                  value={movementInterval}
                  onChange={(e) => setMovementInterval(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={gentleReminders}
                  onChange={(e) => setGentleReminders(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Use gentle, non-intrusive reminders
                </span>
              </label>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startMonitoring}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-lg transition-all shadow-lg"
          >
            🛡️ Start Protection
          </button>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              💡 Why Hyperfocus Protection?
            </h3>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <li>• Prevents burnout from extended focus periods</li>
              <li>• Ensures proper hydration and movement</li>
              <li>• Reduces eye strain and physical discomfort</li>
              <li>• Maintains sustainable productivity</li>
              <li>• Supports overall wellbeing during deep work</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Session */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Protection Active 🛡️</h2>
              <p className="text-blue-100">We're watching out for you</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center">
                <div className="text-4xl font-bold mb-1">{formatTime(timeInFocus)}</div>
                <div className="text-sm text-blue-100">In Focus</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center">
                <div className="text-4xl font-bold mb-1">{session?.remindersSent || 0}</div>
                <div className="text-sm text-blue-100">Reminders Sent</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => triggerReminder('break')}
                className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                ☕ Break Now
              </button>
              <button
                onClick={stopMonitoring}
                className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
              >
                ⏹️ Stop
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Session Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Hydration reminders:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {session?.hydrationReminders || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Movement reminders:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {session?.movementReminders || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
