/**
 * Floating AI Assistant Bubble
 * 
 * Always-accessible AI assistant that floats on screen
 * Provides quick access to all AI modes from anywhere in the app
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { AIChat } from './AI/AIChat';
import type { ConversationType } from '../config/aiConfig';
import { useContextRecall } from '../hooks/useContextRecall';

type QuickMode = {
  id: ConversationType;
  name: string;
  icon: string;
  description: string;
};

const QUICK_MODES: QuickMode[] = [
  {
    id: 'context_recall',
    name: 'Where Was I?',
    icon: 'ðŸ§­',
    description: 'Recover lost context'
  },
  {
    id: 'focus_support',
    name: 'Focus Help',
    icon: 'ðŸŽ¯',
    description: 'Get back on track'
  },
  {
    id: 'task_breakdown',
    name: 'Break Down Task',
    icon: 'âœ…',
    description: 'Make it manageable'
  },
  {
    id: 'energy_management',
    name: 'Energy Check',
    icon: 'ðŸ”‹',
    description: 'Assess your spoons'
  },
  {
    id: 'transition_help',
    name: 'Transition Help',
    icon: 'ðŸŒ‰',
    description: 'Switch tasks smoothly'
  },
  {
    id: 'general',
    name: 'General Chat',
    icon: 'ðŸ’¬',
    description: 'Ask anything'
  },
];

export const FloatingAIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ConversationType | null>(null);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const isContextRecallMode = selectedMode === 'context_recall';
  const { contextData, initialPrompt, lastActionText } = useContextRecall(isContextRecallMode);

  const handleModeSelect = (mode: ConversationType) => {
    setSelectedMode(mode);
    setShowModeMenu(false);
    setIsExpanded(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsExpanded(false);
    setSelectedMode(null);
    setShowModeMenu(false);
  };

  const toggleBubble = () => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
      setShowModeMenu(true);
    }
  };

  useEffect(() => {
    if (selectedMode) {
      setChatKey((prev) => prev + 1);
    }
  }, [selectedMode]);

  if (!isOpen) {
    return (
      <button
        onClick={toggleBubble}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 z-50 group"
        aria-label="Open AI Assistant"
      >
        <div className="relative">
          <SparklesIcon className="w-7 h-7" />
          
          {/* Pulse animation */}
          <span className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping" />
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          AI Assistant
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop for expanded view */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Floating Assistant Container */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'inset-4 md:inset-8 lg:inset-16 xl:inset-24'
            : 'bottom-6 right-6 w-80 sm:w-96 max-h-[500px]'
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border-2 border-purple-500/20">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" />
              <h3 className="font-semibold">
                {selectedMode 
                  ? QUICK_MODES.find(m => m.id === selectedMode)?.name 
                  : 'AI Assistant'}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedMode && (
                <button
                  onClick={() => {
                    setSelectedMode(null);
                    setShowModeMenu(true);
                    setIsExpanded(false);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Back to modes"
                  title="Back to modes"
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              )}
              
              {!isExpanded && selectedMode && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Expand"
                  title="Expand"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              )}
              
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {showModeMenu && !selectedMode ? (
              // Mode Selection Menu
              <div className="p-4 overflow-y-auto h-full">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  How can I help you right now?
                </p>
                
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.id)}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">
                        {mode.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {mode.name}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {mode.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    ðŸ’¡ <strong>Quick Access:</strong> This bubble is always here when you need help!
                  </p>
                </div>
              </div>
            ) : selectedMode ? (
              // Chat Interface
              <div className="flex flex-col h-full">
                {isContextRecallMode && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10">
                    <p className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-300 mb-1">
                      Context Snapshot
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-100">
                      {lastActionText ||
                        'We&apos;ll capture your activity as you move through the app so the AI can recall it here.'}
                    </p>
                  </div>
                )}
                <AIChat
                  key={`${selectedMode}-${chatKey}`}
                  conversationType={selectedMode}
                  className="flex-1"
                  contextData={isContextRecallMode ? contextData : undefined}
                  initialPrompt={isContextRecallMode ? initialPrompt : undefined}
                  sessionId={`${selectedMode}-${chatKey}`}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

