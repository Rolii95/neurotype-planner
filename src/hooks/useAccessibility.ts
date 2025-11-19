import { useState, useEffect, useCallback } from 'react';

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  dyslexiaFont: boolean;
  focusEnhancement: boolean;
  keyboardNavigation: boolean;
}

export interface AccessibilityState extends AccessibilityPreferences {
  isInitialized: boolean;
  currentFocus: string | null;
  announcements: string[];
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  dyslexiaFont: false,
  focusEnhancement: true,
  keyboardNavigation: true
};

export const useAccessibility = () => {
  const [state, setState] = useState<AccessibilityState>({
    ...DEFAULT_PREFERENCES,
    isInitialized: false,
    currentFocus: null,
    announcements: []
  });

  // Initialize from system preferences and localStorage
  useEffect(() => {
    const initializePreferences = () => {
      // Check system preferences
      const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const systemHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      // Load saved preferences
      const savedPreferences = localStorage.getItem('neurotype-accessibility');
      const userPreferences = savedPreferences ? JSON.parse(savedPreferences) : {};
      
      const preferences: AccessibilityPreferences = {
        ...DEFAULT_PREFERENCES,
        reducedMotion: systemReducedMotion,
        highContrast: systemHighContrast,
        ...userPreferences
      };

      setState(prev => ({
        ...prev,
        ...preferences,
        isInitialized: true
      }));

      // Apply theme to document
      applyTheme(preferences);
    };

    initializePreferences();
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (state.isInitialized) {
      const preferences: AccessibilityPreferences = {
        highContrast: state.highContrast,
        reducedMotion: state.reducedMotion,
        largeText: state.largeText,
        dyslexiaFont: state.dyslexiaFont,
        focusEnhancement: state.focusEnhancement,
        keyboardNavigation: state.keyboardNavigation
      };
      
      localStorage.setItem('neurotype-accessibility', JSON.stringify(preferences));
      applyTheme(preferences);
    }
  }, [state]);

  const applyTheme = (preferences: AccessibilityPreferences) => {
    const root = document.documentElement;
    
    // Apply theme classes
    root.classList.toggle('high-contrast', preferences.highContrast);
    root.classList.toggle('large-text', preferences.largeText);
    root.classList.toggle('dyslexia-font', preferences.dyslexiaFont);
    root.classList.toggle('reduced-motion', preferences.reducedMotion);
    
    // Set data attributes for CSS targeting
    root.setAttribute('data-high-contrast', preferences.highContrast.toString());
    root.setAttribute('data-large-text', preferences.largeText.toString());
    root.setAttribute('data-dyslexia-font', preferences.dyslexiaFont.toString());
    root.setAttribute('data-reduced-motion', preferences.reducedMotion.toString());
  };

  const updatePreference = useCallback((key: keyof AccessibilityPreferences, value: boolean) => {
    setState(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setState(prev => ({
      ...prev,
      announcements: [...prev.announcements, message]
    }));

    // Create or update live region
    let liveRegion = document.getElementById('accessibility-announcements');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'accessibility-announcements';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;

    // Clear announcement after delay
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        announcements: prev.announcements.filter(a => a !== message)
      }));
    }, 3000);
  }, []);

  const setCurrentFocus = useCallback((elementId: string | null) => {
    setState(prev => ({
      ...prev,
      currentFocus: elementId
    }));
  }, []);

  // Enhanced focus management
  const focusElement = useCallback((selector: string, announce = true) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      if (announce) {
        const elementText = element.textContent || element.getAttribute('aria-label') || 'Element';
        announceToScreenReader(`Focused on ${elementText}`);
      }
      setCurrentFocus(element.id || selector);
    }
  }, [announceToScreenReader, setCurrentFocus]);

  // Keyboard navigation helpers
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent, context: 'routine' | 'step' | 'timer') => {
    if (!state.keyboardNavigation) return;

    const { key, ctrlKey, shiftKey, altKey } = event;

    // Global shortcuts
    if (ctrlKey) {
      switch (key) {
        case '1':
          focusElement('[role="main"]', true);
          event.preventDefault();
          break;
        case '2':
          focusElement('[role="navigation"]', true);
          event.preventDefault();
          break;
        case '/':
          focusElement('[role="search"]', true);
          event.preventDefault();
          break;
      }
    }

    // Context-specific navigation
    switch (context) {
      case 'routine':
        if (key === 'ArrowDown' && altKey) {
          // Navigate to next step
          focusElement('.step-card:focus + .step-card', true);
          event.preventDefault();
        } else if (key === 'ArrowUp' && altKey) {
          // Navigate to previous step
          // Implementation would depend on DOM structure
          event.preventDefault();
        }
        break;
        
      case 'timer':
        if (key === ' ') {
          // Space to start/pause timer
          const timerButton = document.querySelector('[aria-label*="timer"]') as HTMLElement;
          if (timerButton) {
            timerButton.click();
            event.preventDefault();
          }
        }
        break;
    }
  }, [state.keyboardNavigation, focusElement]);

  // CSS classes for components
  const getAccessibilityClasses = useCallback((baseClasses = '') => {
    const classes = [baseClasses];
    
    if (state.focusEnhancement) {
      classes.push('focus-enhanced');
    }
    
    if (state.highContrast) {
      classes.push('high-contrast-mode');
    }
    
    if (state.largeText) {
      classes.push('large-text-mode');
    }
    
    if (state.dyslexiaFont) {
      classes.push('dyslexia-font-mode');
    }
    
    if (state.reducedMotion) {
      classes.push('reduced-motion-mode');
    }
    
    return classes.filter(Boolean).join(' ');
  }, [state]);

  // ARIA helpers
  const getAriaProps = useCallback((type: 'timer' | 'step' | 'routine', data?: any) => {
    switch (type) {
      case 'timer':
        return {
          'aria-label': `Timer: ${data?.timeRemaining || '00:00'} remaining`,
          'aria-live': 'polite' as const,
          'aria-atomic': true,
          role: 'timer'
        };
        
      case 'step':
        return {
          'aria-label': `Step: ${data?.title || 'Untitled'}`,
          'aria-describedby': data?.description ? `${data.stepId}-description` : undefined,
          'aria-expanded': data?.isExpanded,
          role: 'listitem'
        };
        
      case 'routine':
        return {
          'aria-label': `Routine: ${data?.title || 'Untitled'} with ${data?.stepCount || 0} steps`,
          'aria-live': 'polite' as const,
          role: 'main'
        };
        
      default:
        return {};
    }
  }, []);

  return {
    preferences: state,
    updatePreference,
    announceToScreenReader,
    setCurrentFocus,
    focusElement,
    handleKeyboardNavigation,
    getAccessibilityClasses,
    getAriaProps,
    isInitialized: state.isInitialized
  };
};

export default useAccessibility;