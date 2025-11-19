import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CommandIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
  category: 'Navigation' | 'Actions' | 'Tools';
  icon?: string;
}

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CommandPalette({ isOpen: externalIsOpen, onClose }: CommandPaletteProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onClose ? (value: boolean) => { if (!value) onClose(); } : setInternalIsOpen;

  const commands: Command[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', category: 'Navigation', shortcut: 'G D', action: () => navigate('/dashboard'), icon: '🏠' },
    { id: 'nav-tasks', label: 'Go to Tasks', category: 'Navigation', shortcut: 'G T', action: () => navigate('/tasks'), icon: '✓' },
    { id: 'nav-routines', label: 'Go to Routines', category: 'Navigation', shortcut: 'G R', action: () => navigate('/routines'), icon: '📅' },
    { id: 'nav-mood', label: 'Go to Mood Tracker', category: 'Navigation', shortcut: 'G M', action: () => navigate('/mood'), icon: '😊' },
    { id: 'nav-visual', label: 'Go to Visual Tools', category: 'Navigation', shortcut: 'G V', action: () => navigate('/demo'), icon: '🎨' },
    { id: 'nav-collab', label: 'Go to Collaboration', category: 'Navigation', shortcut: 'G C', action: () => navigate('/collaboration'), icon: '👥' },
    { id: 'nav-profile', label: 'Go to Profile', category: 'Navigation', action: () => navigate('/profile'), icon: '👤' },
    { id: 'nav-settings', label: 'Go to Settings', category: 'Navigation', action: () => navigate('/settings'), icon: '⚙️' },
    
    // Actions
    { id: 'new-task', label: 'New Task', description: 'Create a new task', category: 'Actions', shortcut: 'N', action: () => { navigate('/tasks'); console.log('New task'); }, icon: '➕' },
    { id: 'new-routine', label: 'New Routine', description: 'Create a new routine', category: 'Actions', action: () => { navigate('/routines'); console.log('New routine'); }, icon: '➕' },
    { id: 'log-mood', label: 'Log Mood', description: 'Record your current mood', category: 'Actions', shortcut: 'M', action: () => { navigate('/mood'); }, icon: '😊' },
    
    // Tools
    { id: 'search', label: 'Search Everything', description: 'Search across all content', category: 'Tools', shortcut: '/', action: () => console.log('Search'), icon: '🔍' },
    { id: 'toggle-theme', label: 'Toggle Theme', description: 'Switch between light and dark mode', category: 'Tools', action: () => console.log('Toggle theme'), icon: '🌓' },
  ];

  const filteredCommands = query
    ? commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Open with Ctrl+K or Cmd+K or / key
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    // Open with / key (unless typing in input)
    if (e.key === '/' && !isOpen) {
      const target = e.target as HTMLElement;
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        !target.isContentEditable
      ) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
    }

    // Close with Escape
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    if (!isOpen) return;

    // Navigation
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedCommand = filteredCommands[selectedIndex];
      if (selectedCommand) {
        selectedCommand.action();
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
      }
    }
  }, [isOpen, filteredCommands, selectedIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <SearchIcon className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500"
          />
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category} className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                {category}
              </div>
              {cmds.map((cmd, index) => {
                const globalIndex = filteredCommands.indexOf(cmd);
                const isSelected = globalIndex === selectedIndex;
                
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      setIsOpen(false);
                      setQuery('');
                      setSelectedIndex(0);
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cmd.icon && <span className="text-xl">{cmd.icon}</span>}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {cmd.description}
                        </div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 rounded">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
              to select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">K</kbd>
            to open
          </span>
        </div>
      </div>
    </div>
  );
}
