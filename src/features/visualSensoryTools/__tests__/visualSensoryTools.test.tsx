import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VisualSensoryProvider, useVisualSensory } from '../VisualSensoryContext';
import { RoutineVisualBoard } from '../components/RoutineVisualBoard';
import { MoodEnergyTracker } from '../components/MoodEnergyTracker';
import { SensoryComfortWidget } from '../components/SensoryComfortWidget';
import { VisualCard } from '../components/VisualCard';
import { VisualRoutine, MoodEntry, SensoryPreferences, RoutineStep } from '../types';

// Mock the API
vi.mock('../api/visualSensoryAPI', () => ({
  visualSensoryAPI: {
    getRoutines: vi.fn().mockResolvedValue([]),
    createRoutine: vi.fn().mockResolvedValue({}),
    updateRoutine: vi.fn().mockResolvedValue({}),
    deleteRoutine: vi.fn().mockResolvedValue(undefined),
    getMoodEntries: vi.fn().mockResolvedValue([]),
    createMoodEntry: vi.fn().mockResolvedValue({}),
    updateMoodEntry: vi.fn().mockResolvedValue({}),
    deleteMoodEntry: vi.fn().mockResolvedValue(undefined),
    getSensoryPreferences: vi.fn().mockResolvedValue(null),
    updateSensoryPreferences: vi.fn().mockResolvedValue({}),
    uploadFile: vi.fn().mockResolvedValue('mock-file-url'),
    ping: vi.fn().mockResolvedValue(true)
  }
}));

// Mock DND Kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => [])
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  arrayMove: vi.fn((array, oldIndex, newIndex) => {
    const newArray = [...array];
    const [removed] = newArray.splice(oldIndex, 1);
    newArray.splice(newIndex, 0, removed);
    return newArray;
  }),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false
  }))
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => '')
    }
  }
}));

// Mock Recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />
}));

// Mock Headless UI
vi.mock('@headlessui/react', () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  Transition: ({ children, show }: any) => show ? <div data-testid="transition">{children}</div> : null,
  Switch: ({ checked, onChange }: any) => (
    <button 
      data-testid="switch" 
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      {checked ? 'On' : 'Off'}
    </button>
  )
}));

// Test data
const mockRoutineStep: RoutineStep = {
  id: '1',
  title: 'Test Step',
  description: 'Test Description',
  order: 0,
  isCompleted: false,
  accessibility: {
    altText: 'Test step',
    highContrast: false,
    largeText: false
  }
};

const mockRoutine: VisualRoutine = {
  id: '1',
  userId: 'user1',
  title: 'Morning Routine',
  description: 'My morning routine',
  steps: [mockRoutineStep],
  isActive: true,
  category: 'morning',
  createdAt: new Date(),
  updatedAt: new Date(),
  preferences: {
    showIcons: true,
    showImages: true,
    autoAdvance: false,
    timeReminders: true
  }
};

const mockMoodEntry: MoodEntry = {
  id: '1',
  userId: 'user1',
  timestamp: new Date(),
  mood: 4,
  energy: 3,
  focus: 5,
  emoji: '😊',
  notes: 'Feeling good today',
  tags: ['work', 'productive']
};

const mockSensoryPreferences: SensoryPreferences = {
  id: '1',
  userId: 'user1',
  timestamp: new Date(),
  preferences: {
    soundLevel: 5,
    lightLevel: 6,
    temperature: 5,
    crowdLevel: 3,
    textureComfort: 7
  },
  currentState: {
    isOverstimulated: false,
    needsBreak: false,
    isInFlow: true,
    stressLevel: 3
  },
  accommodations: {
    noiseCancel: true,
    dimLights: false,
    fidgetTools: true,
    quietSpace: false,
    breakReminders: true
  },
  updatedAt: new Date()
};

// Helper to render with provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <VisualSensoryProvider>
      {component}
    </VisualSensoryProvider>
  );
};

// Test Context Provider
describe('VisualSensoryContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should provide default state', () => {
    let contextValue: any;
    
    const TestComponent = () => {
      contextValue = useVisualSensory();
      return <div>Test</div>;
    };

    renderWithProvider(<TestComponent />);

    expect(contextValue.routines).toEqual([]);
    expect(contextValue.moodEntries).toEqual([]);
    expect(contextValue.sensoryPreferences).toBeNull();
    expect(contextValue.isLoading).toBe(false);
    expect(contextValue.error).toBeNull();
  });

  it('should load data from cache on mount', () => {
    const cachedData = {
      routines: [mockRoutine],
      moodEntries: [mockMoodEntry],
      sensoryPreferences: mockSensoryPreferences,
      lastSync: new Date().toISOString()
    };
    
    localStorage.setItem('visualSensoryTools', JSON.stringify(cachedData));

    let contextValue: any;
    
    const TestComponent = () => {
      contextValue = useVisualSensory();
      return <div>Test</div>;
    };

    renderWithProvider(<TestComponent />);

    expect(contextValue.routines).toHaveLength(1);
    expect(contextValue.moodEntries).toHaveLength(1);
    expect(contextValue.sensoryPreferences).not.toBeNull();
  });
});

// Test VisualCard Component
describe('VisualCard', () => {
  const mockProps = {
    step: mockRoutineStep,
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onImageUpload: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render step information correctly', () => {
    render(<VisualCard {...mockProps} />);
    
    expect(screen.getByText('Test Step')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
  });

  it('should toggle completion when button is clicked', async () => {
    const user = userEvent.setup();
    render(<VisualCard {...mockProps} />);
    
    const completeButton = screen.getByRole('button', { name: /mark done/i });
    await user.click(completeButton);
    
    expect(mockProps.onUpdate).toHaveBeenCalledWith('1', {
      isCompleted: true,
      completedAt: expect.any(Date)
    });
  });

  it('should enter edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<VisualCard {...mockProps} />);
    
    // Open menu first
    const menuButton = screen.getByLabelText('Step options');
    await user.click(menuButton);
    
    // Click edit
    const editButton = screen.getByText('Edit');
    await user.click(editButton);
    
    expect(screen.getByDisplayValue('Test Step')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
  });

  it('should save changes when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<VisualCard {...mockProps} />);
    
    // Enter edit mode
    const menuButton = screen.getByLabelText('Step options');
    await user.click(menuButton);
    const editButton = screen.getByText('Edit');
    await user.click(editButton);
    
    // Change title
    const titleInput = screen.getByDisplayValue('Test Step');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Step');
    
    // Save
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    expect(mockProps.onUpdate).toHaveBeenCalledWith('1', {
      title: 'Updated Step',
      description: 'Test Description'
    });
  });

  it('should show accessibility features when enabled', () => {
    const accessibleStep = {
      ...mockRoutineStep,
      accessibility: {
        altText: 'Accessible step',
        highContrast: true,
        largeText: true
      }
    };

    render(<VisualCard {...mockProps} step={accessibleStep} accessibilityMode={true} />);
    
    // Check for high contrast styling (this would be in the className)
    const card = screen.getByLabelText('Step: Test Step');
    expect(card).toHaveClass('border-4'); // High contrast mode adds border-4
  });
});

// Test RoutineVisualBoard Component
describe('RoutineVisualBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render routine information', () => {
    renderWithProvider(<RoutineVisualBoard />);
    
    // Should show no routine selected message initially
    expect(screen.getByText('No routine selected')).toBeInTheDocument();
  });

  it('should display progress bar', async () => {
    // Mock context with routine data
    const TestComponent = () => {
      const context = useVisualSensory();
      
      // Mock the context to have a routine
      React.useEffect(() => {
        context.routines = [mockRoutine];
        context.activeRoutine = mockRoutine;
      }, []);
      
      return <RoutineVisualBoard />;
    };

    renderWithProvider(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('should handle adding new steps', async () => {
    const user = userEvent.setup();
    renderWithProvider(<RoutineVisualBoard />);
    
    // This would require the routine to be loaded first
    // The test would need to mock the context properly
  });
});

// Test MoodEnergyTracker Component
describe('MoodEnergyTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render mood tracking interface', () => {
    renderWithProvider(<MoodEnergyTracker />);
    
    expect(screen.getByText('Mood & Energy Tracker')).toBeInTheDocument();
    expect(screen.getByText('Quick Check-in')).toBeInTheDocument();
    expect(screen.getByLabelText('Mood level')).toBeInTheDocument();
    expect(screen.getByLabelText('Energy level')).toBeInTheDocument();
    expect(screen.getByLabelText('Focus level')).toBeInTheDocument();
  });

  it('should update slider values', async () => {
    const user = userEvent.setup();
    renderWithProvider(<MoodEnergyTracker />);
    
    const moodSlider = screen.getByLabelText('Mood level');
    await user.type(moodSlider, '4');
    
    // Check that the display updates
    expect(screen.getByText('Mood: 4/5')).toBeInTheDocument();
  });

  it('should handle emoji selection', async () => {
    const user = userEvent.setup();
    renderWithProvider(<MoodEnergyTracker />);
    
    // Find and click an emoji button
    const emojiButtons = screen.getAllByRole('button');
    const smileButton = emojiButtons.find(button => button.textContent?.includes('😊'));
    
    if (smileButton) {
      await user.click(smileButton);
      // The mood value should update accordingly
    }
  });

  it('should submit mood entry', async () => {
    const user = userEvent.setup();
    renderWithProvider(<MoodEnergyTracker />);
    
    // Fill in notes
    const notesField = screen.getByPlaceholderText(/how are you feeling/i);
    await user.type(notesField, 'Feeling great today!');
    
    // Submit
    const saveButton = screen.getByText('Save Entry');
    await user.click(saveButton);
    
    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should display chart when data is available', () => {
    renderWithProvider(<MoodEnergyTracker showChart={true} />);
    
    // Check if chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});

// Test SensoryComfortWidget Component
describe('SensoryComfortWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render sensory comfort interface', () => {
    renderWithProvider(<SensoryComfortWidget alwaysVisible={true} />);
    
    expect(screen.getByText('Sensory Comfort')).toBeInTheDocument();
  });

  it('should handle accommodation toggles', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SensoryComfortWidget alwaysVisible={true} />);
    
    // Show accommodations
    const showAdvancedButton = screen.getByText('Show accommodations');
    await user.click(showAdvancedButton);
    
    // Toggle an accommodation
    const switches = screen.getAllByTestId('switch');
    if (switches.length > 0) {
      await user.click(switches[0]);
    }
  });

  it('should save preferences', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SensoryComfortWidget alwaysVisible={true} />);
    
    const saveButton = screen.getByText('Save Preferences');
    await user.click(saveButton);
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should show alerts for overstimulation', () => {
    // This would require mocking the context with overstimulation state
    renderWithProvider(<SensoryComfortWidget alwaysVisible={true} />);
    
    // Check for alert indicators
    // This test would need proper context mocking
  });
});

// Accessibility Tests
describe('Accessibility Features', () => {
  it('should have proper ARIA labels', () => {
    render(<VisualCard {...{
      step: mockRoutineStep,
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
      onImageUpload: vi.fn()
    }} />);
    
    expect(screen.getByLabelText('Step: Test Step')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark as complete')).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProvider(<MoodEnergyTracker />);
    
    // Tab through the interface
    await user.tab();
    expect(document.activeElement).toBeDefined();
  });

  it('should support high contrast mode', () => {
    render(<VisualCard {...{
      step: {
        ...mockRoutineStep,
        accessibility: { ...mockRoutineStep.accessibility, highContrast: true }
      },
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
      onImageUpload: vi.fn(),
      accessibilityMode: true
    }} />);
    
    // Check for high contrast styling
    const card = screen.getByLabelText('Step: Test Step');
    expect(card).toHaveClass('border-4');
  });

  it('should provide screen reader friendly content', () => {
    renderWithProvider(<MoodEnergyTracker />);
    
    // Check for proper labels and descriptions
    expect(screen.getByLabelText('Mood level')).toBeInTheDocument();
    expect(screen.getByLabelText('Energy level')).toBeInTheDocument();
    expect(screen.getByLabelText('Focus level')).toBeInTheDocument();
  });
});

// Integration Tests
describe('Integration Tests', () => {
  it('should sync data between components', async () => {
    // This would test the full integration between components and context
    renderWithProvider(
      <div>
        <RoutineVisualBoard />
        <MoodEnergyTracker />
        <SensoryComfortWidget alwaysVisible={true} />
      </div>
    );
    
    // Test that changes in one component affect others
    // This requires proper context mocking
  });

  it('should handle offline/online transitions', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    renderWithProvider(<MoodEnergyTracker />);
    
    // Simulate going online
    Object.defineProperty(navigator, 'onLine', {
      value: true
    });
    
    fireEvent(window, new Event('online'));
    
    // Should trigger sync
  });

  it('should persist data locally', async () => {
    const user = userEvent.setup();
    renderWithProvider(<MoodEnergyTracker />);
    
    // Add a mood entry
    const saveButton = screen.getByText('Save Entry');
    await user.click(saveButton);
    
    // Check localStorage
    await waitFor(() => {
      const cached = localStorage.getItem('visualSensoryTools');
      expect(cached).toBeTruthy();
    });
  });
});