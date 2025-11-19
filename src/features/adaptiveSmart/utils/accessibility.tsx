/**
 * Accessibility utilities for Adaptive Smart Functions
 * Ensures WCAG 2.1 AA compliance and neurotype-specific accommodations
 */

import { useState, cloneElement, ReactElement } from 'react';

// Keyboard navigation helpers
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

// ARIA attributes helpers
export function getAriaAttributes(props: {
  label?: string;
  describedBy?: string;
  expanded?: boolean;
  controls?: string;
  hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: string;
}) {
  const attributes: Record<string, any> = {};

  if (props.label) attributes['aria-label'] = props.label;
  if (props.describedBy) attributes['aria-describedby'] = props.describedBy;
  if (props.expanded !== undefined) attributes['aria-expanded'] = props.expanded;
  if (props.controls) attributes['aria-controls'] = props.controls;
  if (props.hasPopup !== undefined) attributes['aria-haspopup'] = props.hasPopup;
  if (props.live) attributes['aria-live'] = props.live;
  if (props.atomic !== undefined) attributes['aria-atomic'] = props.atomic;
  if (props.relevant) attributes['aria-relevant'] = props.relevant;

  return attributes;
}

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  static pushFocus(element: HTMLElement) {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus && currentFocus !== document.body) {
      this.focusStack.push(currentFocus);
    }
    element.focus();
  }

  static popFocus() {
    const element = this.focusStack.pop();
    if (element) {
      element.focus();
    }
  }

  static trapFocus(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_KEYS.TAB) {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
}

// Keyboard event handlers
export function createKeyboardHandler(handlers: Record<string, () => void>) {
  return (event: React.KeyboardEvent) => {
    const handler = handlers[event.key];
    if (handler) {
      event.preventDefault();
      handler();
    }
  };
}

// Screen reader announcements
export class ScreenReaderAnnouncer {
  private static liveRegion: HTMLElement | null = null;

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.liveRegion) {
      this.createLiveRegion();
    }

    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, 1000);
    }
  }

  private static createLiveRegion() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.liveRegion);
  }
}

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd want to use a proper color library
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color: string): number {
  // Simplified luminance calculation
  // This would need proper implementation with color parsing
  return 0.5; // Placeholder
}

export function meetsContrastRequirement(
  foreground: string, 
  background: string, 
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
}

// Neurotype-specific accessibility enhancements
export function getNeuroAccessibilityStyles(neurotype: string) {
  const styles = {
    adhd: {
      // High contrast, reduced motion options, clear focus indicators
      focusRing: 'focus:ring-4 focus:ring-blue-500 focus:ring-opacity-75',
      highContrast: 'border-2',
      reducedMotion: 'motion-reduce:transition-none motion-reduce:animate-none',
      clearHierarchy: 'font-semibold text-lg',
    },
    autism: {
      // Predictable patterns, clear structure, status indicators
      consistentLayout: 'grid-cols-1 gap-4',
      statusIndicators: 'border-l-4',
      predictableNavigation: 'flex flex-col space-y-2',
      clearBoundaries: 'border border-gray-300 rounded-lg',
    },
    dyslexia: {
      // Readable fonts, high contrast, voice support
      readableFont: 'font-sans text-lg leading-relaxed',
      highContrast: 'bg-white text-black border-2 border-gray-900',
      spacedLayout: 'space-y-6 p-6',
      voiceSupport: 'group relative',
    },
    general: {
      // Standard accessibility features
      focus: 'focus:ring-2 focus:ring-blue-500',
      contrast: 'border border-gray-300',
      spacing: 'space-y-4 p-4',
      typography: 'text-base leading-normal',
    },
  };

  return styles[neurotype as keyof typeof styles] || styles.general;
}

// Skip link component for keyboard navigation
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
        bg-blue-600 text-white px-4 py-2 rounded-md z-50
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      "
    >
      {children}
    </a>
  );
}

// Accessible error boundary
export function AccessibleErrorMessage({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-red-50 border border-red-200 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="
                mt-3 inline-flex items-center px-3 py-1.5 border border-transparent
                text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              "
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading state with proper accessibility
export function AccessibleLoadingSpinner({ 
  size = 'medium',
  message = 'Loading...' 
}: {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8',
  };

  return (
    <div 
      role="status" 
      aria-live="polite"
      className="flex items-center justify-center gap-2"
    >
      <svg
        className={`animate-spin text-blue-600 ${sizeClasses[size]}`}
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{message}</span>
    </div>
  );
}

// Accessible tooltip
export function AccessibleTooltip({
  content,
  children,
  id,
}: {
  content: string;
  children: ReactElement;
  id: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      {cloneElement(children, {
        'aria-describedby': isVisible ? id : undefined,
        onMouseEnter: () => setIsVisible(true),
        onMouseLeave: () => setIsVisible(false),
        onFocus: () => setIsVisible(true),
        onBlur: () => setIsVisible(false),
      })}
      
      {isVisible && (
        <div
          id={id}
          role="tooltip"
          className="
            absolute z-10 px-3 py-1 text-sm text-white bg-gray-900 rounded-md
            bottom-full left-1/2 transform -translate-x-1/2 mb-2
            before:content-[''] before:absolute before:top-full before:left-1/2
            before:transform before:-translate-x-1/2 before:border-4
            before:border-transparent before:border-t-gray-900
          "
        >
          {content}
        </div>
      )}
    </div>
  );
}

// Export all utilities
export const AccessibilityUtils = {
  FocusManager,
  ScreenReaderAnnouncer,
  getAriaAttributes,
  createKeyboardHandler,
  getContrastRatio,
  meetsContrastRequirement,
  getNeuroAccessibilityStyles,
  KEYBOARD_KEYS,
};