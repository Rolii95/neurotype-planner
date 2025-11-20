import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import FlexZone from '../FlexZone';
import { RoutineStep } from '../../../types/routine';

const createAccessibilityHelpers = () => ({
  getAccessibilityClasses: () => 'mock-accessibility-classes',
  getAriaProps: (type: string) => ({
    'aria-label': `Mock ${type} label`,
    role: type === 'timer' ? 'timer' : 'region'
  }),
  announceToScreenReader: vi.fn(),
  handleKeyboardNavigation: vi.fn()
});

const mockUseAccessibility = vi.fn(createAccessibilityHelpers);

// Mock the accessibility hook
vi.mock('../../../hooks/useAccessibility', () => ({
  __esModule: true,
  default: mockUseAccessibility,
  useAccessibility: mockUseAccessibility
}));

// Mock rich text and sketch components
vi.mock('../RichTextEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

vi.mock('../SketchCanvas', () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <canvas
      data-testid="sketch-canvas"
      onClick={() => onChange('mock-sketch-data')}
    />
  )
}));

describe('FlexZone Component', () => {
  const mockStep: RoutineStep = {
    stepId: 'test-step-1',
    title: 'Test Flex Zone',
    description: 'Test description',
    duration: 5, // 5 minutes
    type: 'flexZone',
    order: 1,
    timerSettings: {
      autoStart: false,
      allowOverrun: true,
      showWarningAt: 1,
      endNotification: {
        type: 'visual',
        intensity: 'normal'
      }
    },
    freeformData: undefined,
    transitionCue: undefined,
    visualCues: {
      backgroundColor: 'bg-blue-50',
      borderColor: 'border-blue-300'
    },
    neurotypeAdaptations: {
      autism: {
        sensoryConsiderations: 'Use calmer colors',
        changeWarnings: true,
        routineRigidity: 'flexible'
      },
      adhd: {
        shortBreakReminders: true,
        hyperFocusWarning: false,
        timeAwareness: 'high'
      }
    }
  };

  const mockCallbacks = {
    onStepUpdate: vi.fn(),
    onStepComplete: vi.fn(),
    onStepSkip: vi.fn()
  };

  beforeEach(() => {
    mockUseAccessibility.mockImplementation(createAccessibilityHelpers);
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders flex zone with title and duration', () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByDisplayValue('Test Flex Zone')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByText('05:00')).toBeInTheDocument();
    });

    it('applies correct accessibility classes and attributes', () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const container = screen.getByRole('region');
      expect(container).toHaveClass('mock-accessibility-classes');
      expect(container).toHaveAttribute('aria-label', expect.stringContaining('Test Flex Zone'));
    });

    it('shows visual cues when active', () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const container = screen.getByRole('region');
      expect(container).toHaveClass('ring-2', 'ring-purple-500');
    });
  });

  describe('Timer Functionality', () => {
    it('starts timer when start button is clicked', async () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause timer/i })).toBeInTheDocument();
      });
    });

    it('counts down timer correctly', async () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(startButton);

      // Advance timer by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('04:59')).toBeInTheDocument();
        expect(screen.getByText(/Elapsed: 00:01/)).toBeInTheDocument();
      });
    });

    it('shows warning when threshold is reached', async () => {
      const warningStep = {
        ...mockStep,
        duration: 2, // 2 minutes
        timerSettings: {
          ...mockStep.timerSettings,
          showWarningAt: 1 // 1 minute warning
        }
      };

      render(
        <FlexZone
          step={warningStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(startButton);

      // Advance to warning threshold (60 seconds remaining)
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        const timerDisplay = screen.getByText('01:00');
        expect(timerDisplay).toHaveClass('text-amber-600');
      });
    });

    it('pauses and resumes timer correctly', async () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      // Start timer
      const startButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(startButton);

      // Pause timer
      const pauseButton = await screen.findByRole('button', { name: /pause timer/i });
      fireEvent.click(pauseButton);

      // Advance time while paused
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Timer should not have advanced
      expect(screen.getByText('05:00')).toBeInTheDocument();

      // Resume timer
      const resumeButton = screen.getByRole('button', { name: /resume timer/i });
      fireEvent.click(resumeButton);

      // Now timer should advance
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('04:59')).toBeInTheDocument();
      });
    });

    it('handles timer completion with overrun allowed', async () => {
      const shortStep = {
        ...mockStep,
        duration: 0.1, // 6 seconds for testing
        timerSettings: {
          ...mockStep.timerSettings,
          allowOverrun: true
        }
      };

      render(
        <FlexZone
          step={shortStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(startButton);

      // Complete the timer
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Timer overrun/)).toBeInTheDocument();
      });
    });

    it('auto-completes step when overrun not allowed', async () => {
      const strictStep = {
        ...mockStep,
        duration: 0.1, // 6 seconds for testing
        timerSettings: {
          ...mockStep.timerSettings,
          allowOverrun: false
        }
      };

      render(
        <FlexZone
          step={strictStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const startButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(startButton);

      // Complete the timer
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      await waitFor(() => {
        expect(mockCallbacks.onStepComplete).toHaveBeenCalledWith('test-step-1', 1);
      });
    });
  });

  describe('Freeform Content', () => {
    it('switches to freeform tab correctly', async () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      // Expand the flex zone first
      const expandButton = screen.getByRole('button', { name: /expand flex zone/i });
      fireEvent.click(expandButton);

      // Switch to freeform tab
      const freeformTab = screen.getByRole('button', { name: /free space/i });
      fireEvent.click(freeformTab);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel', { name: /freeform/i })).toBeInTheDocument();
      });
    });

    it('handles rich text content changes', async () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      // Expand and switch to freeform
      const expandButton = screen.getByRole('button', { name: /expand flex zone/i });
      fireEvent.click(expandButton);

      const freeformTab = screen.getByRole('button', { name: /free space/i });
      fireEvent.click(freeformTab);

      // Select notes mode
      const notesButton = screen.getByRole('button', { name: /notes/i });
      fireEvent.click(notesButton);

      // Type in rich text editor
      const textEditor = screen.getByTestId('rich-text-editor');
      fireEvent.change(textEditor, { target: { value: 'Test note content' } });

      // Check if debounced save is called after delay
      await waitFor(() => {
        expect(mockCallbacks.onStepUpdate).toHaveBeenCalledWith(
          'test-step-1',
          expect.objectContaining({
            freeformData: expect.objectContaining({
              type: 'note',
              content: 'Test note content'
            })
          })
        );
      }, { timeout: 3000 });
    });

    it('handles sketch content changes', async () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      // Expand and switch to freeform
      const expandButton = screen.getByRole('button', { name: /expand flex zone/i });
      fireEvent.click(expandButton);

      const freeformTab = screen.getByRole('button', { name: /free space/i });
      fireEvent.click(freeformTab);

      // Select sketch mode
      const sketchButton = screen.getByRole('button', { name: /sketch/i });
      fireEvent.click(sketchButton);

      // Click on sketch canvas
      const sketchCanvas = screen.getByTestId('sketch-canvas');
      fireEvent.click(sketchCanvas);

      // Check if debounced save is called
      await waitFor(() => {
        expect(mockCallbacks.onStepUpdate).toHaveBeenCalledWith(
          'test-step-1',
          expect.objectContaining({
            freeformData: expect.objectContaining({
              type: 'sketch',
              content: 'mock-sketch-data'
            })
          })
        );
      }, { timeout: 3000 });
    });
  });

  describe('Step Management', () => {
    it('updates step title when changed', () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const titleInput = screen.getByDisplayValue('Test Flex Zone');
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

      expect(mockCallbacks.onStepUpdate).toHaveBeenCalledWith(
        'test-step-1',
        { title: 'Updated Title' }
      );
    });

    it('updates step duration when changed', () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const durationInput = screen.getByDisplayValue('5');
      fireEvent.change(durationInput, { target: { value: '10' } });

      expect(mockCallbacks.onStepUpdate).toHaveBeenCalledWith(
        'test-step-1',
        { duration: 10 }
      );
    });

    it('calls onStepComplete when complete button is clicked', () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      // Expand to show timer panel
      const expandButton = screen.getByRole('button', { name: /expand flex zone/i });
      fireEvent.click(expandButton);

      const completeButton = screen.getByRole('button', { name: /complete step/i });
      fireEvent.click(completeButton);

      expect(mockCallbacks.onStepComplete).toHaveBeenCalledWith('test-step-1', 0);
    });

    it('calls onStepSkip when skip button is clicked', () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      // Expand to show timer panel
      const expandButton = screen.getByRole('button', { name: /expand flex zone/i });
      fireEvent.click(expandButton);

      const skipButton = screen.getByRole('button', { name: /skip this step/i });
      fireEvent.click(skipButton);

      expect(mockCallbacks.onStepSkip).toHaveBeenCalledWith('test-step-1');
    });

    it('disables controls when not active', () => {
      render(
        <FlexZone
          step={mockStep}
          isActive={false}
          {...mockCallbacks}
        />
      );

      const titleInput = screen.getByDisplayValue('Test Flex Zone');
      const durationInput = screen.getByDisplayValue('5');

      expect(titleInput).toBeDisabled();
      expect(durationInput).toBeDisabled();

      // Expand to check timer controls
      const expandButton = screen.getByRole('button', { name: /expand flex zone/i });
      fireEvent.click(expandButton);

      const startButton = screen.getByRole('button', { name: /start timer/i });
      const skipButton = screen.getByRole('button', { name: /skip this step/i });
      const completeButton = screen.getByRole('button', { name: /complete step/i });

      expect(startButton).toBeDisabled();
      expect(skipButton).toBeDisabled();
      expect(completeButton).toBeDisabled();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('responds to Enter key to expand/collapse', () => {
      const mockHandleKeyboard = vi.fn();
      
      // Mock the accessibility hook to capture keyboard events
      mockUseAccessibility.mockReturnValue({
        ...createAccessibilityHelpers(),
        handleKeyboardNavigation: mockHandleKeyboard
      });

      render(
        <FlexZone
          step={mockStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      const container = screen.getByRole('region');
      fireEvent.keyDown(container, { key: 'Enter' });

      expect(mockHandleKeyboard).toHaveBeenCalled();
    });
  });

  describe('Auto-start Timer', () => {
    it('auto-starts timer when step becomes active with autoStart enabled', () => {
      const autoStartStep = {
        ...mockStep,
        timerSettings: {
          ...mockStep.timerSettings,
          autoStart: true
        }
      };

      render(
        <FlexZone
          step={autoStartStep}
          isActive={true}
          {...mockCallbacks}
        />
      );

      // Should automatically show pause button instead of start
      expect(screen.getByRole('button', { name: /pause timer/i })).toBeInTheDocument();
    });
  });
});
