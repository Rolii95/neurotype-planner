// Test configuration for Flex Zones & Transition Support
// This file ensures proper test environment setup for comprehensive testing

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Extend expect with jest-dom matchers
expect.extend({});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test utilities and mocks

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}));

// Mock ResizeObserver for responsive components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock window.matchMedia for accessibility tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock AudioContext for audio-related tests
global.AudioContext = vi.fn().mockImplementation(() => ({
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 }
  })),
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 }
  })),
  destination: {},
  close: vi.fn()
}));

// Mock navigator.vibrate for haptic feedback tests
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn()
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock performance.now() for timer tests
Object.defineProperty(window.performance, 'now', {
  value: vi.fn(() => Date.now()),
  writable: true
});

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  setTimeout(callback, 16); // Simulate 60fps
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Custom test helpers for Flex Zones & Transition Support

export const testHelpers = {
  // Create a mock RoutineStep
  createMockStep: (overrides = {}) => ({
    stepId: 'test-step',
    type: 'flexZone' as const,
    title: 'Test Step',
    description: 'Test description',
    duration: 10,
    order: 1,
    timerSettings: {
      autoStart: false,
      allowOverrun: true,
      showWarningAt: 2
    },
    ...overrides
  }),

  // Create a mock TransitionCue
  createMockTransitionCue: (overrides = {}) => ({
    type: 'text' as const,
    text: 'Test transition cue',
    duration: 5,
    isRequired: false,
    ...overrides
  }),

  // Wait for debounced operations
  waitForDebounce: async (ms = 2000) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Simulate timer advance
  advanceTimers: (ms: number) => {
    vi.advanceTimersByTime(ms);
  },

  // Mock media element with common properties
  createMockMediaElement: () => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    currentTime: 0,
    duration: 100,
    volume: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }),

  // Simulate user preferences
  setAccessibilityPreferences: (preferences: any) => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'neurotype-accessibility') {
        return JSON.stringify(preferences);
      }
      return null;
    });
  },

  // Simulate system preferences
  setSystemPreferences: (preferences: { reducedMotion?: boolean; highContrast?: boolean }) => {
    const mockMatchMedia = window.matchMedia as any;
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: 
        (query.includes('prefers-reduced-motion') && preferences.reducedMotion) ||
        (query.includes('prefers-contrast: high') && preferences.highContrast) ||
        false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  }
};

// Export for use in test files
export { vi, expect };