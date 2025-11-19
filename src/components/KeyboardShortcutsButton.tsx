import { useState } from 'react';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

const KeyboardIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
);

export function KeyboardShortcutsButton() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 group"
        title="Keyboard Shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        <KeyboardIcon className="w-6 h-6" />
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">?</kbd> for shortcuts
        </span>
      </button>

      <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
