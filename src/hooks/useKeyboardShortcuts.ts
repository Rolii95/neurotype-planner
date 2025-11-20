import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  category: 'Navigation' | 'Actions' | 'Tools';
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  // Define all keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: 'd',
      ctrlKey: true,
      description: 'Go to Dashboard',
      action: () => navigate('/dashboard'),
      category: 'Navigation',
    },
    {
      key: 't',
      ctrlKey: true,
      description: 'Go to Tasks',
      action: () => navigate('/tasks'),
      category: 'Navigation',
    },
    {
      key: 'r',
      ctrlKey: true,
      description: 'Go to Routines',
      action: () => navigate('/routines'),
      category: 'Navigation',
    },
    {
      key: 'm',
      ctrlKey: true,
      description: 'Go to Mood',
      action: () => navigate('/mood'),
      category: 'Navigation',
    },
    {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      description: 'Go to Collaboration',
      action: () => navigate('/collaboration'),
      category: 'Navigation',
    },
    {
      key: 'p',
      ctrlKey: true,
      shiftKey: true,
      description: 'Go to Profile',
      action: () => navigate('/profile'),
      category: 'Navigation',
    },
    {
      key: ',',
      ctrlKey: true,
      description: 'Go to Settings',
      action: () => navigate('/settings'),
      category: 'Navigation',
    },
    // Action shortcuts
    {
      key: 'n',
      ctrlKey: true,
      description: 'New Task',
      action: () => {
        navigate('/tasks');
        // Trigger new task creation
        window.dispatchEvent(new CustomEvent('keyboard-shortcut:new-task'));
      },
      category: 'Actions',
    },
    {
      key: 'n',
      ctrlKey: true,
      shiftKey: true,
      description: 'New Routine',
      action: () => {
        navigate('/routines');
        window.dispatchEvent(new CustomEvent('keyboard-shortcut:new-routine'));
      },
      category: 'Actions',
    },
    {
      key: 'l',
      ctrlKey: true,
      description: 'Log Mood',
      action: () => {
        navigate('/mood');
        window.dispatchEvent(new CustomEvent('keyboard-shortcut:log-mood'));
      },
      category: 'Actions',
    },
    // Tool shortcuts (handled by other components)
    // Ctrl+K for command palette
    // / for search
    // ? for help
    // Accessibility quick access: Ctrl+Alt+A
    {
      key: 'a',
      ctrlKey: true,
      altKey: true,
      description: 'Open Accessibility Quick Access',
      action: () => {
        try {
          (window as any).__accessibility?.openPanel?.();
        } catch (e) {
          console.debug('openPanel failed', e);
        }
        // Signal other parts of the app (e.g., QuickAccessPanel) that the shortcut opened accessibility
        try {
          window.dispatchEvent(new CustomEvent('keyboard-shortcut:open-accessibility'));
        } catch (e) {
          // ignore
        }
      },
      category: 'Tools',
    },
  ];

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find(
        (shortcut) =>
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === (event.ctrlKey || event.metaKey) &&
          !!shortcut.shiftKey === event.shiftKey &&
          !!shortcut.altKey === event.altKey
      );

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return { shortcuts };
}

// Hook to get all available shortcuts for help display
export function useAvailableShortcuts() {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    { key: 'd', ctrlKey: true, description: 'Dashboard', action: () => navigate('/dashboard'), category: 'Navigation' },
    { key: 't', ctrlKey: true, description: 'Tasks', action: () => navigate('/tasks'), category: 'Navigation' },
    { key: 'r', ctrlKey: true, description: 'Routines', action: () => navigate('/routines'), category: 'Navigation' },
    { key: 'm', ctrlKey: true, description: 'Mood Tracker', action: () => navigate('/mood'), category: 'Navigation' },
    { key: 'c', ctrlKey: true, shiftKey: true, description: 'Collaboration', action: () => navigate('/collaboration'), category: 'Navigation' },
    { key: 'p', ctrlKey: true, shiftKey: true, description: 'Profile', action: () => navigate('/profile'), category: 'Navigation' },
    { key: ',', ctrlKey: true, description: 'Settings', action: () => navigate('/settings'), category: 'Navigation' },
    
    // Actions
    { key: 'n', ctrlKey: true, description: 'New Task', action: () => {}, category: 'Actions' },
    { key: 'n', ctrlKey: true, shiftKey: true, description: 'New Routine', action: () => {}, category: 'Actions' },
    { key: 'l', ctrlKey: true, description: 'Log Mood', action: () => {}, category: 'Actions' },
    
    // Tools
    { key: 'k', ctrlKey: true, description: 'Command Palette', action: () => {}, category: 'Tools' },
    { key: 'a', ctrlKey: true, altKey: true, description: 'Open Accessibility Quick Access', action: () => {}, category: 'Tools' },
    { key: '/', description: 'Search', action: () => {}, category: 'Tools' },
    { key: '?', shiftKey: true, description: 'Show Help', action: () => {}, category: 'Tools' },
    { key: 'Escape', description: 'Close Modal/Dialog', action: () => {}, category: 'Tools' },
  ];

  return shortcuts;
}

// Format shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(isMac ? '' : '+');
}
