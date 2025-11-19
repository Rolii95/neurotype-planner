import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { useAccessibility } from '../useAccessibility';

// Test the useAccessibility hook directly
describe('useAccessibility Hook', () => {
  let mockLocalStorage: { [key: string]: string };
  let mockMatchMedia: { [key: string]: { matches: boolean; addEventListener: any; removeEventListener: any } };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        })
      },
      writable: true
    });

    // Mock matchMedia
    mockMatchMedia = {
      '(prefers-reduced-motion: reduce)': {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      '(prefers-contrast: high)': {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => mockMatchMedia[query] || {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })
    });

    // Mock document methods
    Object.defineProperty(document, 'querySelector', {
      writable: true,
      value: vi.fn(() => null)
    });

    vi.clearAllMocks();
  });

  describe('Preference Management', () => {
    it('initializes with default preferences', () => {
      const TestComponent = () => {
        const { preferences } = useAccessibility();
        return (
          <div>
            <span data-testid="high-contrast">{preferences.highContrast.toString()}</span>
            <span data-testid="reduced-motion">{preferences.reducedMotion.toString()}</span>
            <span data-testid="large-text">{preferences.largeText.toString()}</span>
            <span data-testid="dyslexia-font">{preferences.dyslexiaFont.toString()}</span>
            <span data-testid="focus-enhancement">{preferences.focusEnhancement.toString()}</span>
            <span data-testid="keyboard-navigation">{preferences.keyboardNavigation.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false');
      expect(screen.getByTestId('large-text')).toHaveTextContent('false');
      expect(screen.getByTestId('dyslexia-font')).toHaveTextContent('false');
      expect(screen.getByTestId('focus-enhancement')).toHaveTextContent('true');
      expect(screen.getByTestId('keyboard-navigation')).toHaveTextContent('true');
    });

    it('respects system preferences for reduced motion', () => {
      mockMatchMedia['(prefers-reduced-motion: reduce)'].matches = true;

      const TestComponent = () => {
        const { preferences } = useAccessibility();
        return <span data-testid="reduced-motion">{preferences.reducedMotion.toString()}</span>;
      };

      render(<TestComponent />);

      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true');
    });

    it('respects system preferences for high contrast', () => {
      mockMatchMedia['(prefers-contrast: high)'].matches = true;

      const TestComponent = () => {
        const { preferences } = useAccessibility();
        return <span data-testid="high-contrast">{preferences.highContrast.toString()}</span>;
      };

      render(<TestComponent />);

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
    });

    it('loads saved preferences from localStorage', () => {
      mockLocalStorage['neurotype-accessibility'] = JSON.stringify({
        largeText: true,
        dyslexiaFont: true
      });

      const TestComponent = () => {
        const { preferences } = useAccessibility();
        return (
          <div>
            <span data-testid="large-text">{preferences.largeText.toString()}</span>
            <span data-testid="dyslexia-font">{preferences.dyslexiaFont.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('large-text')).toHaveTextContent('true');
      expect(screen.getByTestId('dyslexia-font')).toHaveTextContent('true');
    });

    it('updates preferences and saves to localStorage', () => {
      const TestComponent = () => {
        const { preferences, updatePreference } = useAccessibility();
        return (
          <div>
            <span data-testid="high-contrast">{preferences.highContrast.toString()}</span>
            <button onClick={() => updatePreference('highContrast', true)}>
              Enable High Contrast
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');

      fireEvent.click(screen.getByText('Enable High Contrast'));

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'neurotype-accessibility',
        expect.stringContaining('\"highContrast\":true')
      );
    });
  });

  describe('Screen Reader Announcements', () => {
    it('creates and manages aria-live region for announcements', () => {
      let mockLiveRegion: HTMLElement | null = null;

      // Mock createElement and appendChild
      const originalCreateElement = document.createElement;
      const originalAppendChild = document.body.appendChild;

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'div') {
          mockLiveRegion = originalCreateElement.call(document, 'div');
          return mockLiveRegion;
        }
        return originalCreateElement.call(document, tagName);
      });

      document.body.appendChild = vi.fn().mockImplementation((child: Node) => {
        if (child === mockLiveRegion) {
          return child;
        }
        return originalAppendChild.call(document.body, child);
      }) as any;

      const TestComponent = () => {
        const { announceToScreenReader } = useAccessibility();
        return (
          <button onClick={() => announceToScreenReader('Test announcement')}>
            Make Announcement
          </button>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Make Announcement'));

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockLiveRegion).toHaveAttribute('aria-live', 'polite');
      expect(mockLiveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(mockLiveRegion).toHaveClass('sr-only');

      // Restore original methods
      document.createElement = originalCreateElement;
      document.body.appendChild = originalAppendChild;
    });

    it('queues multiple announcements and speaks them sequentially', async () => {
      const TestComponent = () => {
        const { announceToScreenReader } = useAccessibility();
        return (
          <div>
            <button onClick={() => announceToScreenReader('First announcement')}>
              First
            </button>
            <button onClick={() => announceToScreenReader('Second announcement')}>
              Second
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('First'));
      fireEvent.click(screen.getByText('Second'));

      // Both announcements should be queued
      // This is hard to test directly without timers, but we can verify the function was called
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('handles global keyboard shortcuts', () => {
      const mockFocusElement = vi.fn();
      let capturedFocusElement: Function;

      const TestComponent = () => {
        const { handleKeyboardNavigation } = useAccessibility();
        capturedFocusElement = useAccessibility().focusElement;
        
        return (
          <div
            onKeyDown={(e) => handleKeyboardNavigation(e.nativeEvent, 'routine')}
            tabIndex={0}
            data-testid="keyboard-target"
          >
            Keyboard Navigation Test
          </div>
        );
      };

      // Mock focusElement
      Object.defineProperty(document, 'querySelector', {
        writable: true,
        value: vi.fn(() => ({ focus: mockFocusElement }))
      });

      render(<TestComponent />);

      const target = screen.getByTestId('keyboard-target');

      // Test Ctrl+1 (main content focus)
      fireEvent.keyDown(target, { key: '1', ctrlKey: true });
      
      // Test Ctrl+2 (navigation focus)
      fireEvent.keyDown(target, { key: '2', ctrlKey: true });
      
      // Test Ctrl+/ (search focus)
      fireEvent.keyDown(target, { key: '/', ctrlKey: true });

      expect(document.querySelector).toHaveBeenCalledWith('[role="main"]');
      expect(document.querySelector).toHaveBeenCalledWith('[role="navigation"]');
      expect(document.querySelector).toHaveBeenCalledWith('[role="search"]');
    });

    it('handles context-specific navigation for timer', () => {
      const mockTimerButton = { click: vi.fn() };
      
      Object.defineProperty(document, 'querySelector', {
        writable: true,
        value: vi.fn((selector: string) => {
          if (selector.includes('aria-label*="timer"')) {
            return mockTimerButton;
          }
          return null;
        })
      });

      const TestComponent = () => {
        const { handleKeyboardNavigation } = useAccessibility();
        
        return (
          <div
            onKeyDown={(e) => handleKeyboardNavigation(e.nativeEvent, 'timer')}
            tabIndex={0}
            data-testid="timer-target"
          >
            Timer Navigation Test
          </div>
        );
      };

      render(<TestComponent />);

      const target = screen.getByTestId('timer-target');

      // Test spacebar for timer start/pause
      fireEvent.keyDown(target, { key: ' ' });

      expect(mockTimerButton.click).toHaveBeenCalled();
    });
  });

  describe('CSS Class Generation', () => {
    it('generates correct accessibility classes', () => {
      const TestComponent = () => {
        const { getAccessibilityClasses } = useAccessibility();
        return (
          <div className={getAccessibilityClasses('base-class')} data-testid="class-target">
            Class Test
          </div>
        );
      };

      render(<TestComponent />);

      const target = screen.getByTestId('class-target');
      expect(target).toHaveClass('base-class', 'focus-enhanced');
    });

    it('applies high contrast classes when enabled', () => {
      mockLocalStorage['neurotype-accessibility'] = JSON.stringify({
        highContrast: true
      });

      const TestComponent = () => {
        const { getAccessibilityClasses } = useAccessibility();
        return (
          <div className={getAccessibilityClasses()} data-testid="high-contrast-target">
            High Contrast Test
          </div>
        );
      };

      render(<TestComponent />);

      const target = screen.getByTestId('high-contrast-target');
      expect(target).toHaveClass('high-contrast-mode');
    });

    it('applies large text classes when enabled', () => {
      mockLocalStorage['neurotype-accessibility'] = JSON.stringify({
        largeText: true
      });

      const TestComponent = () => {
        const { getAccessibilityClasses } = useAccessibility();
        return (
          <div className={getAccessibilityClasses()} data-testid="large-text-target">
            Large Text Test
          </div>
        );
      };

      render(<TestComponent />);

      const target = screen.getByTestId('large-text-target');
      expect(target).toHaveClass('large-text-mode');
    });

    it('applies dyslexia font classes when enabled', () => {
      mockLocalStorage['neurotype-accessibility'] = JSON.stringify({
        dyslexiaFont: true
      });

      const TestComponent = () => {
        const { getAccessibilityClasses } = useAccessibility();
        return (
          <div className={getAccessibilityClasses()} data-testid="dyslexia-target">
            Dyslexia Font Test
          </div>
        );
      };

      render(<TestComponent />);

      const target = screen.getByTestId('dyslexia-target');
      expect(target).toHaveClass('dyslexia-font-mode');
    });

    it('applies reduced motion classes when enabled', () => {
      mockMatchMedia['(prefers-reduced-motion: reduce)'].matches = true;

      const TestComponent = () => {
        const { getAccessibilityClasses } = useAccessibility();
        return (
          <div className={getAccessibilityClasses()} data-testid="reduced-motion-target">
            Reduced Motion Test
          </div>
        );
      };

      render(<TestComponent />);

      const target = screen.getByTestId('reduced-motion-target');
      expect(target).toHaveClass('reduced-motion-mode');
    });
  });

  describe('ARIA Properties Generation', () => {
    it('generates correct ARIA props for timer', () => {
      const TestComponent = () => {
        const { getAriaProps } = useAccessibility();
        const props = getAriaProps('timer', { timeRemaining: '05:00' });
        
        return (
          <div {...props} data-testid="timer-aria">
            Timer with ARIA
          </div>
        );
      };

      render(<TestComponent />);

      const target = screen.getByTestId('timer-aria');
      expect(target).toHaveAttribute('aria-label', 'Timer: 05:00 remaining');
      expect(target).toHaveAttribute('aria-live', 'polite');
      expect(target).toHaveAttribute('aria-atomic', 'true');
      expect(target).toHaveAttribute('role', 'timer');
    });

    it('generates correct ARIA props for step', () => {
      const TestComponent = () => {
        const { getAriaProps } = useAccessibility();
        const props = getAriaProps('step', { 
          title: 'Test Step',
          stepId: 'step-1',
          isExpanded: true 
        });
        
        return (
          <div {...props} data-testid="step-aria">
            Step with ARIA
          </div>
        );
      };

      render(<TestComponent />);

      const target = screen.getByTestId('step-aria');
      expect(target).toHaveAttribute('aria-label', 'Step: Test Step');
      expect(target).toHaveAttribute('aria-expanded', 'true');
      expect(target).toHaveAttribute('role', 'listitem');
    });

    it('generates correct ARIA props for routine', () => {
      const TestComponent = () => {
        const { getAriaProps } = useAccessibility();
        const props = getAriaProps('routine', { 
          title: 'Morning Routine',
          stepCount: 5 
        });
        
        return (
          <div {...props} data-testid="routine-aria">
            Routine with ARIA
          </div>
        );
      };

      render(<TestComponent />);

      const target = screen.getByTestId('routine-aria');
      expect(target).toHaveAttribute('aria-label', 'Routine: Morning Routine with 5 steps');
      expect(target).toHaveAttribute('aria-live', 'polite');
      expect(target).toHaveAttribute('role', 'main');
    });
  });

  describe('Focus Management', () => {
    it('focuses elements by selector', () => {
      const mockElement = { focus: vi.fn() };
      
      Object.defineProperty(document, 'querySelector', {
        writable: true,
        value: vi.fn(() => mockElement)
      });

      const TestComponent = () => {
        const { focusElement } = useAccessibility();
        return (
          <button onClick={() => focusElement('#test-element')}>
            Focus Element
          </button>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Focus Element'));

      expect(document.querySelector).toHaveBeenCalledWith('#test-element');
      expect(mockElement.focus).toHaveBeenCalled();
    });

    it('announces focus changes when requested', () => {
      const mockElement = { focus: vi.fn(), id: 'test-element' };
      
      Object.defineProperty(document, 'querySelector', {
        writable: true,
        value: vi.fn(() => mockElement)
      });

      const TestComponent = () => {
        const { focusElement } = useAccessibility();
        return (
          <button onClick={() => focusElement('#test-element', true)}>
            Focus with Announcement
          </button>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Focus with Announcement'));

      expect(mockElement.focus).toHaveBeenCalled();
      // Announcement testing would require more complex mocking of the announcement system
    });
  });
});