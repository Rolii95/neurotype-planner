/**
 * AI Chat Component
 * Interactive chat interface for AI assistance
 */

import { useState, useRef, useEffect } from 'react';
import { openAIService, type AIResponse } from '../../services/openaiService';
import type { ConversationType } from '../../config/aiConfig';

const sentInitialPromptSessions = new Set<string>();

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isCrisis?: boolean;
}

interface AIChatProps {
  conversationType: ConversationType;
  contextData?: Record<string, any>;
  onSuggestion?: (suggestion: any) => void;
  className?: string;
  initialPrompt?: string;
  sessionId?: string;
}

export function AIChat({
  conversationType,
  contextData,
  onSuggestion,
  className = '',
  initialPrompt,
  sessionId,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(crypto.randomUUID());
  const [showCrisisWarning, setShowCrisisWarning] = useState(false);
  const [initialPromptSent, setInitialPromptSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionKey = sessionId ?? conversationId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset initial prompt state when session changes
  useEffect(() => {
    setInitialPromptSent(false);
  }, [sessionKey]);

  // Send initial prompt if provided
  useEffect(() => {
    console.log('dY- AIChat useEffect triggered:', { 
      hasInitialPrompt: !!initialPrompt, 
      promptLength: initialPrompt?.length || 0,
      initialPromptSent, 
      loading,
      promptPreview: initialPrompt?.substring(0, 100) + '...',
      sessionKey,
    });
    
    if (initialPrompt && !initialPromptSent && !loading) {
      if (sentInitialPromptSessions.has(sessionKey)) {
        return;
      }

      sentInitialPromptSessions.add(sessionKey);
      if (sentInitialPromptSessions.size > 20) {
        const first = sentInitialPromptSessions.values().next().value;
        if (first) {
          sentInitialPromptSessions.delete(first);
        }
      }

      console.log('�o. Conditions met, sending initial prompt...');
      setInitialPromptSent(true);
      // Delay slightly to allow component to mount
      setTimeout(() => {
        console.log('dY" Executing handleSend with initial prompt');
        handleSend(initialPrompt);
      }, 100);
    } else {
      console.log('�?O Conditions not met:', {
        noPrompt: !initialPrompt,
        promptValue: initialPrompt,
        alreadySent: initialPromptSent,
        isLoading: loading
      });
    }
  }, [initialPrompt, initialPromptSent, loading, sessionKey]);

  const handleSend = async (messageOverride?: string) => {
    const messageToSend = messageOverride || input;
    if (!messageToSend.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!messageOverride) {
      setInput(''); // Only clear input if using the input field
    }
    setLoading(true);

    try {
      const response: AIResponse = await openAIService.chat(messageToSend, {
        conversationId,
        conversationType,
        contextData,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        isCrisis: response.isCrisis,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If crisis detected, show warning
      if (response.isCrisis && response.crisisResources) {
        setShowCrisisWarning(true);
      }

      // If there's a suggestion callback, try to extract suggestions
      if (onSuggestion) {
        // Look for JSON in the response
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const suggestion = JSON.parse(jsonMatch[0]);
            onSuggestion(suggestion);
          }
        } catch {
          // Not a suggestion, ignore
        }
      }
    } catch (error: any) {
      console.error('AI chat error:', error);
      
      const apiMessageRaw =
        error?.response?.data?.error?.message ??
        error?.error?.message ??
        error?.message ??
        (typeof error === 'string' ? error : '') ??
        '';
      const apiMessage = typeof apiMessageRaw === 'string' ? apiMessageRaw : String(apiMessageRaw);

      let errorMessage = 'I apologize, but I encountered an error. Please try again.';
      
      const normalized = apiMessage.toLowerCase();
      if (normalized.includes('rate limit')) {
        errorMessage = apiMessage;
      } else if (normalized.includes('quota') || normalized.includes('429')) {
        errorMessage =
          '⚠️ The AI assistant has exceeded its usage quota. To continue using AI features:\n\n' +
          '1. Check your OpenAI API account at platform.openai.com\n' +
          '2. Add billing details or upgrade your plan\n' +
          '3. Update the VITE_OPENAI_API_KEY in your .env file if needed\n\n' +
          'The app will continue working, but AI features will be unavailable until this is resolved.';
      } else if (apiMessage.includes('Content flagged')) {
        errorMessage = 'I cannot respond to that message. Please rephrase your question.';
      } else if (apiMessage) {
        errorMessage = apiMessage;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getConversationTypeLabel = () => {
    switch (conversationType) {
      case 'board_suggestion':
        return 'Board Creation Assistant';
      case 'task_breakdown':
        return 'Task Breakdown Helper';
      case 'mood_insight':
        return 'Mood Pattern Analyst';
      case 'context_recall':
        return 'Context Recovery Assistant';
      case 'routine_creation':
        return 'Routine Designer';
      default:
        return 'AI Assistant';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {getConversationTypeLabel()}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {conversationType === 'general' && 'Ask me anything about neurodivergent life'}
          {conversationType === 'board_suggestion' && 'Let me help you create a personalized routine board'}
          {conversationType === 'task_breakdown' && 'I can break down overwhelming tasks into manageable steps'}
          {conversationType === 'mood_insight' && 'I can help analyze your mood patterns and triggers'}
          {conversationType === 'context_recall' && 'I can help you remember where you were and what you were doing'}
          {conversationType === 'routine_creation' && 'Let\'s design a routine that works for your neurodivergent brain'}
        </p>
      </div>

      {/* Crisis Warning Banner */}
      {showCrisisWarning && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b-2 border-red-500">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                ðŸš¨ Crisis Resources Available
              </p>
              <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                If you're in immediate danger, please call emergency services (911 in US) or go to your nearest emergency room.
              </p>
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-semibold">988 Suicide & Crisis Lifeline:</p>
                <p>Call or text <strong>988</strong></p>
                <p>Text "HELLO" to <strong>741741</strong> (Crisis Text Line)</p>
                <p><a href="https://988lifeline.org" target="_blank" rel="noopener noreferrer" className="underline">988lifeline.org</a></p>
              </div>
            </div>
            <button
              onClick={() => setShowCrisisWarning(false)}
              className="ml-4 text-red-900 dark:text-red-100 hover:text-red-700 dark:hover:text-red-300"
              aria-label="Close crisis resources"
            >
              Ã—
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p className="text-lg mb-2">ðŸ‘‹ Hi there!</p>
            <p className="text-sm">How can I help you today?</p>
          </div>
        )}
        
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.isCrisis
                  ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-2 border-red-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            aria-label="Message input"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            aria-label="Send message"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          ðŸ’¡ Tip: Press Enter to send. This AI is designed specifically for neurodivergent support.
        </p>
      </div>
    </div>
  );
}

