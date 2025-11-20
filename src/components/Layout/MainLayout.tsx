import React, { ReactNode, useState, useEffect, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp';
import { NotificationCenter } from '../NotificationCenter';
import { RecallButton } from '../RecallButton';
import { FloatingAIAssistant } from '../FloatingAIAssistant';
const QuickAccessPanel = React.lazy(() => import('../QuickAccess/QuickAccessPanel'));
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Listen for ? key to open help
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if target is input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setIsHelpOpen(true);
      } else if (e.key === 'Escape' && isHelpOpen) {
        setIsHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isHelpOpen]);

  return (
    <div className="min-h-screen persona-app-shell transition-colors">
      {/* Sidebar */}
      <Sidebar />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar with Breadcrumbs */}
        <div className="sticky top-0 z-50 persona-surface-glass">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <Breadcrumbs />

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {/* Notification Center */}
                <NotificationCenter />

                {/* Quick Access Accessibility Panel (lazy-loaded) */}
                <Suspense fallback={<button className="p-2 rounded-lg persona-ghost-button" aria-hidden>Accessibility</button>}>
                  <QuickAccessPanel />
                </Suspense>

                {/* Keyboard Shortcuts */}
                <button
                  onClick={() => setIsHelpOpen(true)}
                  className="p-2 rounded-lg persona-ghost-button"
                  title="Keyboard Shortcuts (?)"
                  aria-label="Show keyboard shortcuts"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>

                {/* Command Palette */}
                <button
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="px-4 py-2 text-sm rounded-lg persona-ghost-button flex items-center gap-3 w-[220px]"
                  title="Open Command Palette (Ctrl+K)"
                  aria-label="Open command palette"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">Search</span>
                  <kbd className="hidden md:inline px-1.5 py-0.5 text-xs rounded persona-ghost-button">⌘K</kbd>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-73px)]">
          {children}
        </main>
      </div>

      {/* Floating AI Assistant - Always accessible */}
      <FloatingAIAssistant />

      {/* Alternative: Traditional "Where Was I?" button
      <RecallButton />
      */}
    </div>
  );
};

export default MainLayout;
