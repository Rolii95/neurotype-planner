/**
 * AI Assistant Page
 * Main interface for AI-powered features
 */

import { useState } from 'react';
import { AIChat } from '../components/AI/AIChat';
import { aiBoardService, type BoardSuggestion } from '../services/aiBoardService';
import { openAIService } from '../services/openaiService';
import type { ConversationType } from '../config/aiConfig';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

type AssistantMode =
  | 'general'
  | 'board_suggestion'
  | 'task_breakdown'
  | 'mood_insight'
  | 'context_recall'
  | 'routine_creation'
  | 'energy_management'
  | 'habit_formation'
  | 'focus_support'
  | 'transition_help';

interface ModeOption {
  id: AssistantMode;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const MODES: ModeOption[] = [
  {
    id: 'general',
    name: 'General Chat',
    description: 'Ask anything about neurodivergent life',
    icon: '💬',
    color: 'bg-blue-500',
  },
  {
    id: 'board_suggestion',
    name: 'Create Routine Board',
    description: 'AI designs a visual routine board for you',
    icon: '📋',
    color: 'bg-green-500',
  },
  {
    id: 'task_breakdown',
    name: 'Break Down Task',
    description: 'Turn overwhelming tasks into tiny steps',
    icon: '✅',
    color: 'bg-purple-500',
  },
  {
    id: 'mood_insight',
    name: 'Mood Patterns',
    description: 'Understand your mood triggers and cycles',
    icon: '🎭',
    color: 'bg-pink-500',
  },
  {
    id: 'context_recall',
    name: 'Where Was I?',
    description: 'Recover lost context and get back on track',
    icon: '🧭',
    color: 'bg-yellow-500',
  },
  {
    id: 'routine_creation',
    name: 'Design Routine',
    description: 'Create personalized daily routines',
    icon: '🌅',
    color: 'bg-orange-500',
  },
  {
    id: 'energy_management',
    name: 'Energy Management',
    description: 'Track and manage your spoons wisely',
    icon: '🔋',
    color: 'bg-cyan-500',
  },
  {
    id: 'habit_formation',
    name: 'Build Habits',
    description: 'Create sustainable neurodivergent-friendly habits',
    icon: '🌱',
    color: 'bg-emerald-500',
  },
  {
    id: 'focus_support',
    name: 'Focus Help',
    description: 'Real-time support to maintain or regain focus',
    icon: '🎯',
    color: 'bg-red-500',
  },
  {
    id: 'transition_help',
    name: 'Transition Support',
    description: 'Navigate difficult transitions between tasks',
    icon: '🌉',
    color: 'bg-indigo-500',
  },
];

export default function AIAssistant() {
  const toast = useToast();
  const [selectedMode, setSelectedMode] = useState<AssistantMode | null>(null);
  const [suggestion, setSuggestion] = useState<BoardSuggestion | null>(null);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const navigate = useNavigate();

  const handleModeSelect = (mode: AssistantMode) => {
    setSelectedMode(mode);
    setSuggestion(null);
  };

  const handleSuggestion = (boardSuggestion: BoardSuggestion) => {
    if (selectedMode === 'board_suggestion') {
      setSuggestion(boardSuggestion);
    }
  };

  const handleCreateBoard = async () => {
    if (!suggestion) return;

    setCreatingBoard(true);
    try {
      // For now, create board directly since we don't have suggestion ID yet
      // In production, this would use the suggestion service
      toast.info('Board creation coming soon! The AI has generated a great suggestion for you.');
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error('Failed to create board. Please try again.');
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleBackToModes = () => {
    setSelectedMode(null);
    setSuggestion(null);
  };

  if (!selectedMode) {
    return (
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🤖 AI Assistant
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose how the AI can help you today. Specialized for neurodivergent brains.
          </p>
        </div>

        {/* AI Status */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            {openAIService.isEnabled() ? (
              <>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-blue-900 dark:text-blue-100">
                  AI is ready and configured
                </span>
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm text-blue-900 dark:text-blue-100">
                  AI is not configured. Add VITE_OPENAI_API_KEY to your .env file.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mode Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleModeSelect(mode.id)}
              disabled={!openAIService.isEnabled()}
              className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-lg text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700"
            >
              <div className={`w-12 h-12 ${mode.color} rounded-lg flex items-center justify-center text-2xl mb-3`}>
                {mode.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {mode.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {mode.description}
              </p>
            </button>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-900 dark:text-yellow-100">
            <strong>⚠️ Important:</strong> This AI assistant is designed to support you, not replace professional care.
            If you're in crisis, please contact emergency services or call 988 (Suicide & Crisis Lifeline).
          </p>
        </div>
      </div>
    );
  }

  // Chat Interface
  return (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={handleBackToModes}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
        >
          <span>←</span>
          <span>Back to modes</span>
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {MODES.find((m) => m.id === selectedMode)?.name}
        </h2>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden">
        <AIChat
          conversationType={selectedMode as ConversationType}
          onSuggestion={handleSuggestion}
          className="h-full border-0 shadow-none"
        />
      </div>

      {/* Suggestion Panel (for board suggestions) */}
      {suggestion && selectedMode === 'board_suggestion' && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              ✨ Board Suggestion Ready
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {suggestion.title} - {suggestion.steps.length} steps
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateBoard}
              disabled={creatingBoard}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {creatingBoard ? 'Creating...' : 'Create This Board'}
            </button>
            <button
              onClick={() => setSuggestion(null)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
