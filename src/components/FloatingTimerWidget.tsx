import React, { useState, useRef, useEffect } from 'react';
import { useTimer } from '../contexts/TimerContext';
import { useNavigate } from 'react-router-dom';

export const FloatingTimerWidget: React.FC = () => {
  const { timerState, pauseTimer, resumeTimer, stopTimer, isTimerActive } = useTimer();
  const navigate = useNavigate();
  const [position, setPosition] = useState({ x: window.innerWidth - 200, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerIcon = () => {
    switch (timerState.type) {
      case 'pomodoro':
      case 'focus':
        return '🍅';
      case 'break':
        return '☕';
      case 'long-break':
        return '🌴';
      default:
        return '⏱️';
    }
  };

  const getProgressPercentage = () => {
    if (timerState.totalDuration === 0) return 0;
    return ((timerState.totalDuration - timerState.timeRemaining) / timerState.totalDuration) * 100;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return; // Don't drag when clicking buttons
    }
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 180;
    const maxY = window.innerHeight - 100;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleNavigateToFocus = () => {
    navigate('/focus');
  };

  const handleTogglePause = () => {
    if (timerState.phase === 'running') {
      pauseTimer();
    } else if (timerState.phase === 'paused') {
      resumeTimer();
    }
  };

  const handleStop = () => {
    if (window.confirm('Are you sure you want to stop the timer?')) {
      stopTimer();
    }
  };

  // Don't render if no timer is active
  if (!isTimerActive) {
    return null;
  }

  return (
    <div
      ref={widgetRef}
      className={`fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 ${
        timerState.phase === 'running' 
          ? 'border-blue-500 dark:border-blue-400' 
          : 'border-yellow-500 dark:border-yellow-400'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '180px',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timerState.type === 'break' || timerState.type === 'long-break'
              ? 'bg-green-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      <div className="p-3">
        {/* Header with icon and type */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-xl">{getTimerIcon()}</span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
              {timerState.type.replace('-', ' ')}
            </span>
          </div>
          {timerState.phase === 'paused' && (
            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
              Paused
            </span>
          )}
        </div>

        {/* Time display */}
        <div 
          className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          onClick={handleNavigateToFocus}
          title="Click to open Focus page"
        >
          {formatTime(timerState.timeRemaining)}
        </div>

        {/* Task name if present */}
        {timerState.taskName && (
          <div className="text-xs text-gray-600 dark:text-gray-400 text-center mb-2 truncate">
            {timerState.taskName}
          </div>
        )}

        {/* Control buttons */}
        <div className="flex gap-1.5 justify-center">
          <button
            onClick={handleTogglePause}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
            title={timerState.phase === 'running' ? 'Pause' : 'Resume'}
          >
            {timerState.phase === 'running' ? '⏸' : '▶'}
          </button>
          <button
            onClick={handleStop}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
            title="Stop timer"
          >
            ⏹
          </button>
          <button
            onClick={handleNavigateToFocus}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
            title="Go to Focus page"
          >
            🎯
          </button>
        </div>
      </div>
    </div>
  );
};
