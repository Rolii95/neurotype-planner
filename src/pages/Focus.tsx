import React, { useState } from 'react';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { FocusModeEnhanced } from '../components/FocusModeEnhanced';

const FocusPage: React.FC = () => {
  const [mode, setMode] = useState<'pomodoro' | 'focus'>('pomodoro');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mode Selector */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('pomodoro')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                mode === 'pomodoro'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🍅 Pomodoro Timer
            </button>
            <button
              onClick={() => setMode('focus')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                mode === 'focus'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🎯 Deep Focus Mode
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {mode === 'pomodoro' ? <PomodoroTimer /> : <FocusModeEnhanced />}
      </div>
    </div>
  );
};

export default FocusPage;
