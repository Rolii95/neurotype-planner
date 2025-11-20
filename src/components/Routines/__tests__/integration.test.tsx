import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import RoutineBuilder from '../RoutineBuilder';
import FlexZone from '../FlexZone';
import TransitionCue from '../TransitionCue';
import { useRoutineStore } from '../../../stores/routineStore';
import { EnhancedRoutine, RoutineStep } from '../../../types/routine';

// Mock the store
vi.mock('../../../stores/routineStore');

const createAccessibilityHelpers = () => ({
  getAccessibilityClasses: () => 'mock-accessibility-classes',
  getAriaProps: () => ({ 'aria-label': 'Mock label', role: 'region' }),
  announceToScreenReader: vi.fn(),
  handleKeyboardNavigation: vi.fn(),
  focusElement: vi.fn()
});

const mockUseAccessibility = vi.fn(createAccessibilityHelpers);

// Mock accessibility hook
vi.mock('../../../hooks/useAccessibility', () => ({
  __esModule: true,
  default: mockUseAccessibility,
  useAccessibility: mockUseAccessibility
}));

// Mock DnD kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => [])
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: 'vertical'
}));

// Mock sub-components
vi.mock('../SortableStepCard', () => ({
  default: ({ step, onEdit, onDelete }: any) => (
    <div data-testid={`step-card-${step.stepId}`}>
      <h3>{step.title}</h3>
      <button onClick={() => onEdit(step)}>Edit</button>
      <button onClick={() => onDelete(step.stepId)}>Delete</button>
    </div>
  )
}));

vi.mock('../StepCard', () => ({
  default: ({ step }: any) => (
    <div data-testid={`step-preview-${step.stepId}`}>
      <span>{step.title} ({step.duration}min)</span>
    </div>
  )
}));

vi.mock('../RichTextEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

describe('Flex Zones & Transition Support Integration', () => {
  const mockRoutine: EnhancedRoutine = {
    id: 'test-routine-1',
    title: 'Morning Routine with Flex Zones',
    description: 'A comprehensive morning routine with flexible timing and transitions',
    userId: 'test-user',
    steps: [],
    totalDuration: 30,
    flexibilityScore: 0.8,
    allowDynamicReordering: true,
    pausesBetweenSteps: 5,
    transitionStyle: 'gentle',
    schedule: {
      isScheduled: false
    },
    isActive: true,
    isTemplate: false,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const mockSteps: RoutineStep[] = [
    {
      stepId: 'step-1',
      type: 'routine',
      title: 'Wake Up',
      description: 'Get out of bed and stretch',
      duration: 5,
      order: 1
    },
    {
      stepId: 'step-2',
      type: 'flexZone',
      title: 'Flexible Morning Prep',
      description: 'Use this time for personal grooming, choosing clothes, or any morning preparation',
      duration: 15,
      order: 2,
      isFlexible: true,
      timerSettings: {
        autoStart: false,
        allowOverrun: true,
        showWarningAt: 3,
        endNotification: {
          type: 'visual',
          intensity: 'normal'
        }
      },
      transitionCue: {
        type: 'text',
        text: 'Great job! Time to move to breakfast preparation.',
        duration: 3,
        isRequired: false
      }
    },
    {
      stepId: 'step-3',
      type: 'routine',
      title: 'Breakfast',
      description: 'Prepare and eat breakfast',
      duration: 10,
      order: 3,
      transitionCue: {
        type: 'mixed',
        text: 'Breakfast time! Make sure to have your kitchen clean before starting.',
        audioUrl: '/audio/kitchen-bell.mp3',
        visualUrl: '/gifs/cooking.gif',
        isRequired: true
      }
    }
  ];

  const mockStore = {
    routines: [mockRoutine],
    currentRoutine: mockRoutine,
    currentStep: null,
    isExecuting: false,
    addStep: vi.fn(),
    updateStep: vi.fn(),
    deleteStep: vi.fn(),
    reorderSteps: vi.fn(),
    startExecution: vi.fn(),
    completeStep: vi.fn(),
    skipStep: vi.fn(),
    loadRoutines: vi.fn(),
    createRoutine: vi.fn()
  };

  beforeEach(() => {
    mockUseAccessibility.mockImplementation(createAccessibilityHelpers);
    vi.clearAllMocks();
    (useRoutineStore as any).mockReturnValue(mockStore);
    mockStore.currentRoutine = { ...mockRoutine, steps: [...mockSteps] };
  });

  describe('Routine Building Workflow', () => {
    it('creates a new flex zone step with all required properties', async () => {
      render(
        <RoutineBuilder
          routine={mockRoutine}
          onRoutineUpdate={vi.fn()}
          onStepUpdate={mockStore.updateStep}
          onStepDelete={mockStore.deleteStep}
          onStepAdd={mockStore.addStep}
        />
      );

      // Add a new step
      const addButton = screen.getByText(/add.*step/i);
      fireEvent.click(addButton);

      // Fill in flex zone details
      const titleInput = screen.getByLabelText(/step title/i);
      fireEvent.change(titleInput, { target: { value: 'New Flex Zone' } });

      const durationInput = screen.getByLabelText(/duration/i);
      fireEvent.change(durationInput, { target: { value: '20' } });

      const typeSelect = screen.getByLabelText(/step type/i);
      fireEvent.change(typeSelect, { target: { value: 'flexZone' } });

      const saveButton = screen.getByText(/save.*step/i);
      fireEvent.click(saveButton);

      expect(mockStore.addStep).toHaveBeenCalledWith(
        'test-routine-1',
        expect.objectContaining({
          title: 'New Flex Zone',
          duration: 20,
          type: 'flexZone',
          isFlexible: true
        })
      );
    });

    it('adds transition cues to steps', async () => {
      render(
        <RoutineBuilder
          routine={mockRoutine}
          onRoutineUpdate={vi.fn()}
          onStepUpdate={mockStore.updateStep}
          onStepDelete={mockStore.deleteStep}
          onStepAdd={mockStore.addStep}
        />
      );

      // Edit existing step
      const editButton = screen.getByTestId('step-card-step-2').querySelector('button[data-action="edit"]');
      fireEvent.click(editButton!);

      // Add transition cue
      const addTransitionButton = screen.getByText(/add transition cue/i);
      fireEvent.click(addTransitionButton);

      const transitionText = screen.getByLabelText(/transition text/i);
      fireEvent.change(transitionText, { 
        target: { value: 'Take a moment to breathe and prepare for the next activity.' } 
      });

      const saveButton = screen.getByText(/save.*step/i);
      fireEvent.click(saveButton);

      expect(mockStore.updateStep).toHaveBeenCalledWith(
        'step-2',
        expect.objectContaining({
          transitionCue: expect.objectContaining({
            text: 'Take a moment to breathe and prepare for the next activity.'
          })
        })
      );
    });

    it('validates step constraints', async () => {
      render(
        <RoutineBuilder
          routine={mockRoutine}
          onRoutineUpdate={vi.fn()}
          onStepUpdate={mockStore.updateStep}
          onStepDelete={mockStore.deleteStep}
          onStepAdd={mockStore.addStep}
        />
      );

      const addButton = screen.getByText(/add.*step/i);
      fireEvent.click(addButton);

      // Try to create step with invalid duration
      const durationInput = screen.getByLabelText(/duration/i);
      fireEvent.change(durationInput, { target: { value: '0' } });

      const saveButton = screen.getByText(/save.*step/i);
      fireEvent.click(saveButton);

      // Should show validation error
      expect(screen.getByText(/duration must be at least 1 minute/i)).toBeInTheDocument();
      expect(mockStore.addStep).not.toHaveBeenCalled();
    });
  });

  describe('Routine Execution Workflow', () => {
    it('executes routine with flex zones and transitions', async () => {
      // Mock FlexZone component for execution
      const FlexZoneExecutor = ({ step, isActive, onStepComplete, onStepSkip }: any) => (
        <div data-testid={`executing-step-${step.stepId}`}>
          <h2>{step.title}</h2>
          {isActive && (
            <>
              <button onClick={() => onStepComplete(step.stepId, step.duration)}>
                Complete Step
              </button>
              <button onClick={() => onStepSkip(step.stepId)}>
                Skip Step
              </button>
            </>
          )}
        </div>
      );

      // Mock TransitionCue for execution
      const TransitionCueExecutor = ({ cue, isVisible, onDismiss, onComplete }: any) => (
        isVisible && (
          <div data-testid="transition-cue">
            <p>{cue.text}</p>
            <button onClick={cue.isRequired ? onComplete : onDismiss}>
              {cue.isRequired ? 'I Understand' : 'Continue'}
            </button>
          </div>
        )
      );

      render(
        <div>
          {mockSteps.map((step, index) => (
            <FlexZoneExecutor
              key={step.stepId}
              step={step}
              isActive={index === 0}
              onStepComplete={mockStore.completeStep}
              onStepSkip={mockStore.skipStep}
            />
          ))}
          <TransitionCueExecutor
            cue={mockSteps[1].transitionCue}
            isVisible={false}
            onDismiss={vi.fn()}
            onComplete={vi.fn()}
          />
        </div>
      );

      // Complete first step
      const completeButton = screen.getByText('Complete Step');
      fireEvent.click(completeButton);

      expect(mockStore.completeStep).toHaveBeenCalledWith('step-1', 5);
    });

    it('handles flex zone timing and content updates', async () => {
      const flexStep = mockSteps[1]; // Flex zone step
      
      render(
        <FlexZone
          step={flexStep}
          isActive={true}
          onStepUpdate={mockStore.updateStep}
          onStepComplete={mockStore.completeStep}
          onStepSkip={mockStore.skipStep}
        />
      );

      // Expand the flex zone
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // Update the title
      const titleInput = screen.getByDisplayValue('Flexible Morning Prep');
      fireEvent.change(titleInput, { target: { value: 'Extended Morning Prep' } });

      expect(mockStore.updateStep).toHaveBeenCalledWith(
        'step-2',
        { title: 'Extended Morning Prep' }
      );

      // Switch to freeform and add content
      const freeformTab = screen.getByRole('button', { name: /free space/i });
      fireEvent.click(freeformTab);

      const notesButton = screen.getByRole('button', { name: /notes/i });
      fireEvent.click(notesButton);

      const richTextEditor = screen.getByTestId('rich-text-editor');
      fireEvent.change(richTextEditor, { 
        target: { value: 'Morning reflections and preparation notes...' } 
      });

      // Debounced save should trigger
      await waitFor(() => {
        expect(mockStore.updateStep).toHaveBeenCalledWith(
          'step-2',
          expect.objectContaining({
            freeformData: expect.objectContaining({
              content: 'Morning reflections and preparation notes...',
              type: 'note'
            })
          })
        );
      }, { timeout: 3000 });
    });

    it('shows transition cue between steps', async () => {
      const TransitionCueDisplay = () => {
        const [showTransition, setShowTransition] = React.useState(false);
        
        return (
          <div>
            <button onClick={() => setShowTransition(true)}>
              Trigger Transition
            </button>
            {showTransition && (
              <TransitionCue
                cue={mockSteps[1].transitionCue!}
                isVisible={true}
                onDismiss={() => setShowTransition(false)}
                onComplete={() => setShowTransition(false)}
              />
            )}
          </div>
        );
      };

      render(<TransitionCueDisplay />);

      const triggerButton = screen.getByText('Trigger Transition');
      fireEvent.click(triggerButton);

      // Should show transition cue
      expect(screen.getByText('Great job! Time to move to breakfast preparation.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();

      // Dismiss transition
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      // Transition should be gone
      await waitFor(() => {
        expect(screen.queryByText('Great job! Time to move to breakfast preparation.')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('provides comprehensive keyboard navigation', () => {
      const mockHandleKeyboard = vi.fn();
      
      // Mock accessibility hook with keyboard handler
      mockUseAccessibility.mockReturnValue({
        ...createAccessibilityHelpers(),
        handleKeyboardNavigation: mockHandleKeyboard
      });

      render(
        <FlexZone
          step={mockSteps[1]}
          isActive={true}
          onStepUpdate={vi.fn()}
          onStepComplete={vi.fn()}
          onStepSkip={vi.fn()}
        />
      );

      const flexZone = screen.getByRole('region');
      
      // Test keyboard interactions
      fireEvent.keyDown(flexZone, { key: 'Enter' });
      fireEvent.keyDown(flexZone, { key: ' ' });
      fireEvent.keyDown(flexZone, { key: 'Escape' });

      expect(mockHandleKeyboard).toHaveBeenCalledTimes(3);
    });

    it('announces important state changes to screen readers', () => {
      const mockAnnounce = vi.fn();
      
      mockUseAccessibility.mockReturnValue({
        ...createAccessibilityHelpers(),
        announceToScreenReader: mockAnnounce
      });

      render(
        <TransitionCue
          cue={{
            type: 'text',
            text: 'Transition to next activity',
            isRequired: false
          }}
          isVisible={true}
          onDismiss={vi.fn()}
          onComplete={vi.fn()}
        />
      );

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('Transition to next activity')
      );
    });
  });

  describe('Data Persistence and State Management', () => {
    it('debounces frequent updates to prevent excessive saves', async () => {
      render(
        <FlexZone
          step={mockSteps[1]}
          isActive={true}
          onStepUpdate={mockStore.updateStep}
          onStepComplete={vi.fn()}
          onStepSkip={vi.fn()}
        />
      );

      // Expand and add freeform content
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      const freeformTab = screen.getByRole('button', { name: /free space/i });
      fireEvent.click(freeformTab);

      const notesButton = screen.getByRole('button', { name: /notes/i });
      fireEvent.click(notesButton);

      const richTextEditor = screen.getByTestId('rich-text-editor');
      
      // Make rapid changes
      fireEvent.change(richTextEditor, { target: { value: 'A' } });
      fireEvent.change(richTextEditor, { target: { value: 'AB' } });
      fireEvent.change(richTextEditor, { target: { value: 'ABC' } });

      // Only the debounced final update should be called
      await waitFor(() => {
        expect(mockStore.updateStep).toHaveBeenCalledWith(
          'step-2',
          expect.objectContaining({
            freeformData: expect.objectContaining({
              content: 'ABC'
            })
          })
        );
      }, { timeout: 3000 });

      // Should not have been called for intermediate states
      expect(mockStore.updateStep).toHaveBeenCalledTimes(1);
    });

    it('handles offline state gracefully', async () => {
      // Mock offline state
      const originalOnline = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      render(
        <FlexZone
          step={mockSteps[1]}
          isActive={true}
          onStepUpdate={mockStore.updateStep}
          onStepComplete={vi.fn()}
          onStepSkip={vi.fn()}
        />
      );

      const titleInput = screen.getByDisplayValue('Flexible Morning Prep');
      fireEvent.change(titleInput, { target: { value: 'Offline Update' } });

      // Update should still be called (for local state)
      expect(mockStore.updateStep).toHaveBeenCalledWith(
        'step-2',
        { title: 'Offline Update' }
      );

      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: originalOnline
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed transition cue data gracefully', () => {
      const malformedStep = {
        ...mockSteps[1],
        transitionCue: {
          type: 'text' as const,
          // Missing required text property
          isRequired: false
        }
      };

      expect(() => {
        render(
          <TransitionCue
            cue={malformedStep.transitionCue}
            isVisible={true}
            onDismiss={vi.fn()}
            onComplete={vi.fn()}
          />
        );
      }).not.toThrow();

      // Should render without the missing text
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('recovers from timer state inconsistencies', async () => {
      const timerStep = {
        ...mockSteps[1],
        duration: 0.1 // Very short for testing
      };

      render(
        <FlexZone
          step={timerStep}
          isActive={true}
          onStepUpdate={vi.fn()}
          onStepComplete={mockStore.completeStep}
          onStepSkip={vi.fn()}
        />
      );

      // Expand to access timer
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      // Start timer
      const startButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(startButton);

      // Timer should handle the very short duration gracefully
      act(() => {
        vi.advanceTimersByTime(6000); // 6 seconds = 0.1 minutes
      });

      // Should auto-complete or handle completion properly
      await waitFor(() => {
        expect(mockStore.completeStep).toHaveBeenCalled();
      });
    });
  });
});
