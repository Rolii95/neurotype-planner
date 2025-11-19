import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { AIChat } from './AI/AIChat';
import { useContextRecall } from '../hooks/useContextRecall';

interface WhereWasIProps {
  isVisible: boolean;
  onClose: () => void;
}

export const WhereWasI: React.FC<WhereWasIProps> = ({ isVisible, onClose }) => {
  const [chatKey, setChatKey] = useState(0);
  const { contextData, initialPrompt, lastActionText } = useContextRecall(isVisible);

  // Restart the chat instance when the modal re-opens so the initial prompt is resent once
  useEffect(() => {
    if (isVisible) {
      setChatKey((prev) => prev + 1);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                dY- Where Was I?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                AI-powered context recall for ADHD time blindness
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Last Action Summary */}
          {contextData.lastAction && lastActionText && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <div className="text-2xl">dY"?</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Last Activity
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {lastActionText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!contextData.lastAction && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 text-sm text-yellow-900 dark:text-yellow-200">
              We haven&apos;t recorded any recent activity yet. Try navigating around the app so we can capture helpful context for you.
            </div>
          )}

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <AIChat
              key={chatKey}
              conversationType="context_recall"
              contextData={contextData}
              initialPrompt={initialPrompt}
              sessionId={`whereWasI-${chatKey}`}
              className="h-full"
            />
          </div>

          {/* Footer with Tips */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              <strong>Tip:</strong> Tell me fragments of what you remember - browser tabs, notes, meetings, time of day. I&apos;ll help piece it together!
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
