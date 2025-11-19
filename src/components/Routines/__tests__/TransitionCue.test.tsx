import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import TransitionCue from '../TransitionCue';
import { TransitionCue as TransitionCueType } from '../../../types/routine';

// Mock the accessibility hook
vi.mock('../../../hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    getAccessibilityClasses: () => 'mock-accessibility-classes',
    announceToScreenReader: vi.fn(),
    handleKeyboardNavigation: vi.fn(),
    focusElement: vi.fn()
  })
}));

// Mock HTMLAudioElement
const mockAudio = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 10,
  volume: 1
};

Object.defineProperty(window, 'HTMLAudioElement', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudio)
});

describe('TransitionCue Component', () => {
  const mockCallbacks = {
    onDismiss: vi.fn(),
    onComplete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Text-only Transition Cues', () => {
    const textCue: TransitionCueType = {
      type: 'text',
      text: 'Time to switch to the next task! Take a deep breath and get ready.',
      duration: 5,
      isRequired: false
    };

    it('renders text transition cue correctly', () => {
      render(
        <TransitionCue
          cue={textCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Transition')).toBeInTheDocument();
      expect(screen.getByText(textCue.text!)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    it('shows auto-dismiss countdown', async () => {
      render(
        <TransitionCue
          cue={textCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText(/Auto-dismiss in 5 seconds/)).toBeInTheDocument();

      // Advance timer by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Auto-dismiss in 4 seconds/)).toBeInTheDocument();
      });
    });

    it('auto-dismisses after countdown', async () => {
      render(
        <TransitionCue
          cue={textCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      // Fast-forward past the duration
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockCallbacks.onDismiss).toHaveBeenCalled();
      });
    });

    it('dismisses immediately when continue is clicked', () => {
      render(
        <TransitionCue
          cue={textCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      expect(mockCallbacks.onDismiss).toHaveBeenCalled();
    });
  });

  describe('Required Transition Cues', () => {
    const requiredCue: TransitionCueType = {
      type: 'text',
      text: 'Important: Make sure to save your work before continuing.',
      isRequired: true
    };

    it('requires acknowledgment before dismissal', () => {
      render(
        <TransitionCue
          cue={requiredCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByRole('button', { name: /i understand/i })).toBeInTheDocument();
      expect(screen.queryByText(/auto-dismiss/i)).not.toBeInTheDocument();
    });

    it('shows continue button after acknowledgment', async () => {
      render(
        <TransitionCue
          cue={requiredCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      const acknowledgeButton = screen.getByRole('button', { name: /i understand/i });
      fireEvent.click(acknowledgeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });
    });

    it('completes after acknowledgment and continue', async () => {
      render(
        <TransitionCue
          cue={requiredCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      // First acknowledge
      const acknowledgeButton = screen.getByRole('button', { name: /i understand/i });
      fireEvent.click(acknowledgeButton);

      // Then continue
      await waitFor(() => {
        const continueButton = screen.getByRole('button', { name: /continue/i });
        fireEvent.click(continueButton);
      });

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe('Audio Transition Cues', () => {
    const audioCue: TransitionCueType = {
      type: 'audio',
      text: 'Listen to this calming transition sound',
      audioUrl: '/audio/transition-bell.mp3',
      duration: 10,
      isRequired: false
    };

    it('renders audio controls', () => {
      render(
        <TransitionCue
          cue={audioCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByRole('button', { name: /play audio/i })).toBeInTheDocument();
    });

    it('loads audio when visible', () => {
      render(
        <TransitionCue
          cue={audioCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      expect(window.HTMLAudioElement).toHaveBeenCalledWith();
    });

    it('plays audio when play button is clicked', async () => {
      render(
        <TransitionCue
          cue={audioCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      // Simulate audio loaded
      act(() => {
        const audioElement = (window.HTMLAudioElement as any).mock.results[0].value;
        audioElement.addEventListener.mock.calls.forEach(([event, callback]: [string, Function]) => {
          if (event === 'canplaythrough') {
            callback();
          }
        });
      });

      await waitFor(() => {
        const playButton = screen.getByRole('button', { name: /play audio/i });
        expect(playButton).not.toBeDisabled();
      });

      const playButton = screen.getByRole('button', { name: /play audio/i });
      fireEvent.click(playButton);

      expect(mockAudio.play).toHaveBeenCalled();
    });
  });

  describe('Visual Transition Cues', () => {
    const visualCue: TransitionCueType = {
      type: 'visual',
      text: 'Watch this transition animation',
      visualUrl: '/gifs/transition-animation.gif',
      duration: 8,
      isRequired: false
    };

    it('renders visual content', () => {
      render(
        <TransitionCue
          cue={visualCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      const image = screen.getByRole('img', { name: /transition visual cue/i });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', visualCue.visualUrl);
    });

    it('handles image load errors gracefully', () => {
      render(
        <TransitionCue
          cue={visualCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      const image = screen.getByRole('img', { name: /transition visual cue/i });
      
      // Simulate image error
      fireEvent.error(image);

      // Image should be hidden but component should still work
      expect(screen.getByText(visualCue.text!)).toBeInTheDocument();
    });
  });

  describe('Mixed Media Transition Cues', () => {
    const mixedCue: TransitionCueType = {
      type: 'mixed',
      text: 'Multi-sensory transition with sound and visual',
      audioUrl: '/audio/transition-bell.mp3',
      visualUrl: '/gifs/transition-visual.gif',
      duration: 12,
      isRequired: true
    };

    it('renders both audio and visual elements', () => {
      render(
        <TransitionCue
          cue={mixedCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByRole('img', { name: /transition visual cue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /play audio/i })).toBeInTheDocument();
      expect(screen.getByText(mixedCue.text!)).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    const loadingCue: TransitionCueType = {
      type: 'audio',
      text: 'Loading audio...',
      audioUrl: '/audio/large-file.mp3',
      isRequired: false
    };

    it('shows loading state while media loads', () => {
      render(
        <TransitionCue
          cue={loadingCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      // Should show loading initially
      expect(screen.getByText(/loading transition cue/i)).toBeInTheDocument();
    });

    it('shows error state when media fails to load', async () => {
      render(
        <TransitionCue
          cue={loadingCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      // Simulate audio load error
      act(() => {
        const audioElement = (window.HTMLAudioElement as any).mock.results[0].value;
        audioElement.addEventListener.mock.calls.forEach(([event, callback]: [string, Function]) => {
          if (event === 'error') {
            callback(new Error('Audio failed to load'));
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to load audio/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    const accessibleCue: TransitionCueType = {
      type: 'text',
      text: 'Accessible transition cue for screen readers',
      isRequired: false
    };

    it('applies accessibility classes and attributes', () => {
      render(
        <TransitionCue
          cue={accessibleCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('mock-accessibility-classes');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'transition-cue-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'transition-cue-description');
    });

    it('announces cue to screen readers when visible', () => {
      const mockAnnounce = vi.fn();
      
      vi.mocked(require('../../../hooks/useAccessibility').useAccessibility).mockReturnValue({
        getAccessibilityClasses: () => 'mock-accessibility-classes',
        announceToScreenReader: mockAnnounce,
        handleKeyboardNavigation: vi.fn(),
        focusElement: vi.fn()
      });

      render(
        <TransitionCue
          cue={accessibleCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('Accessible transition cue for screen readers')
      );
    });

    it('focuses dialog for keyboard navigation', () => {
      const mockFocus = vi.fn();
      
      vi.mocked(require('../../../hooks/useAccessibility').useAccessibility).mockReturnValue({
        getAccessibilityClasses: () => 'mock-accessibility-classes',
        announceToScreenReader: vi.fn(),
        handleKeyboardNavigation: vi.fn(),
        focusElement: mockFocus
      });

      render(
        <TransitionCue
          cue={accessibleCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      // Focus should be called after a timeout
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockFocus).toHaveBeenCalledWith('[role="dialog"]');
    });

    it('provides keyboard accessibility information', () => {
      render(
        <TransitionCue
          cue={accessibleCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText(/press escape to dismiss/i)).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    const lifecycleCue: TransitionCueType = {
      type: 'text',
      text: 'Lifecycle test cue',
      duration: 5,
      isRequired: false
    };

    it('cleans up timers when unmounted', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <TransitionCue
          cue={lifecycleCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('stops timers when becoming invisible', () => {
      const { rerender } = render(
        <TransitionCue
          cue={lifecycleCue}
          isVisible={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText(/auto-dismiss in 5 seconds/)).toBeInTheDocument();

      rerender(
        <TransitionCue
          cue={lifecycleCue}
          isVisible={false}
          {...mockCallbacks}
        />
      );

      // Timers should be cleared when invisible
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // onDismiss should not be called since component became invisible
      expect(mockCallbacks.onDismiss).not.toHaveBeenCalled();
    });
  });
});