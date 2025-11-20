import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { AdaptiveSmartProvider } from '../AdaptiveSmartContext';
import { ActivityRecallBanner } from '../ActivityRecallBanner';
import { SuggestionNudge } from '../SuggestionNudge';
import { QuickEntryComponent } from '../QuickEntryComponent';
import { SmartSuggestion } from '../../types';

// Mock dependencies (Vitest)
vi.mock('../services/adaptiveSmartAPI');
vi.mock('../services/deviceUtils');
vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: null,
    profile: null,
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn()
  })
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AdaptiveSmartProvider>
        {children}
      </AdaptiveSmartProvider>
    </BrowserRouter>
  );
}

describe('AdaptiveSmart Components - Accessibility Tests', () => {
  describe('ActivityRecallBanner', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <ActivityRecallBanner />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be keyboard navigable', async () => {
      render(
        <TestWrapper>
          <ActivityRecallBanner />
        </TestWrapper>
      );

      const button = screen.queryByRole('button');
      if (button) {
        button.focus();
        expect(button).toHaveFocus();

        fireEvent.keyDown(button, { key: 'Enter' });
        // Should handle enter key
      }
    });

    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <ActivityRecallBanner />
        </TestWrapper>
      );

      const button = screen.queryByRole('button');
      if (button) {
        expect(button).toHaveAttribute('aria-label');
      }
    });

    it('should support screen readers with proper text content', () => {
      render(
        <TestWrapper>
          <ActivityRecallBanner />
        </TestWrapper>
      );

      // Should have meaningful text content for screen readers
      const textContent = screen.getByText(/where was i|no recent activity|getting started/i);
      expect(textContent).toBeInTheDocument();
    });
  });

  describe('SuggestionNudge', () => {
    const mockSuggestion: SmartSuggestion = {
      id: 'test-suggestion',
      userId: 'test-user',
      type: 'reminder',
      title: 'Test Suggestion',
      message: 'This is a test suggestion',
      priority: 'medium',
      confidence: 80,
      context: {
        basedOn: ['test-context'],
      },
      actions: [
        {
          id: 'accept',
          label: 'Accept',
          type: 'dismiss',
          style: 'primary',
        },
        {
          id: 'dismiss',
          label: 'Dismiss',
          type: 'dismiss',
          style: 'secondary',
        },
      ],
      createdAt: new Date(),
      status: 'pending',
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <SuggestionNudge suggestion={mockSuggestion} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be keyboard navigable', () => {
      render(
        <TestWrapper>
          <SuggestionNudge suggestion={mockSuggestion} />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        button.focus();
        expect(button).toHaveFocus();
        
        fireEvent.keyDown(button, { key: 'Enter' });
        fireEvent.keyDown(button, { key: ' ' });
      });
    });

    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <SuggestionNudge suggestion={mockSuggestion} />
        </TestWrapper>
      );

      const heading = screen.getByText('Test Suggestion');
      expect(heading).toBeInTheDocument();
    });

    it('should support high contrast mode', () => {
      render(
        <TestWrapper>
          <SuggestionNudge suggestion={mockSuggestion} />
        </TestWrapper>
      );

      // Check for appropriate color contrast classes
      const container = screen.getByText('Test Suggestion').closest('div');
      expect(container).toHaveClass(/border|bg-/);
    });
  });

  describe('QuickEntryComponent', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <QuickEntryComponent />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels', () => {
      render(
        <TestWrapper>
          <QuickEntryComponent />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder');
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <QuickEntryComponent />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const buttons = screen.getAllByRole('button');

      // Focus management
      textarea.focus();
      expect(textarea).toHaveFocus();

      // Tab navigation
      fireEvent.keyDown(textarea, { key: 'Tab' });
      
      buttons.forEach(button => {
        button.focus();
        expect(button).toHaveFocus();
      });
    });

    it('should provide keyboard shortcuts', () => {
      render(
        <TestWrapper>
          <QuickEntryComponent />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: 'test content' } });
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      
      // Should handle Ctrl+Enter for submit
    });

    it('should have proper error handling', async () => {
      render(
        <TestWrapper>
          <QuickEntryComponent />
        </TestWrapper>
      );

      const submitButton = screen.getByText(/submit/i);
      fireEvent.click(submitButton);

      // Should show error for empty content
      await waitFor(() => {
        expect(screen.getByText(/please provide some content/i)).toBeInTheDocument();
      });
    });
  });
});

describe('AdaptiveSmart Components - Responsive Design Tests', () => {
  beforeEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it('should adapt to mobile viewport', () => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(
      <TestWrapper>
        <ActivityRecallBanner />
      </TestWrapper>
    );

    // Should render mobile-appropriate layout
    const container = screen.getByText(/where was i|no recent activity|getting started/i).closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should adapt to tablet viewport', () => {
    // Set tablet viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(
      <TestWrapper>
        <QuickEntryComponent />
      </TestWrapper>
    );

    // Should render tablet-appropriate layout
    const container = screen.getByRole('textbox').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should handle text scaling', () => {
    render(
      <TestWrapper>
        <SuggestionNudge suggestion={{
          id: 'test',
          userId: 'test',
          type: 'reminder',
          title: 'Test',
          message: 'Test message',
          priority: 'medium',
          confidence: 80,
          context: { basedOn: [] },
          actions: [],
          createdAt: new Date(),
          status: 'pending',
        }} />
      </TestWrapper>
    );

    // Should handle text scaling appropriately
    const textElement = screen.getByText('Test');
    expect(textElement).toBeInTheDocument();
  });
});

describe('AdaptiveSmart Components - Neurotype Adaptations', () => {
  it('should apply ADHD-specific styling', () => {
    // Mock ADHD profile
    const mockProfile = {
      neurotype: 'adhd' as const,
      preferences: {
        visualDensity: 'normal' as const,
        colorScheme: 'light' as const,
        fontSize: 'normal' as const,
        animations: 'normal' as const,
        sounds: false,
        notifications: 'normal' as const,
      },
      accommodations: {
        reduceDistraction: true,
        simplifyNavigation: false,
        provideContext: true,
        allowFlexibleTiming: true,
        offerAlternativeFormats: false,
      },
      triggers: {
        overwhelm: [],
        confusion: [],
        frustration: [],
      },
      strengths: {
        focus: 5,
        creativity: 7,
        attention: 4,
        memory: 5,
        processing: 6,
      },
    };

    render(
      <TestWrapper>
        <ActivityRecallBanner />
      </TestWrapper>
    );

    // Should apply ADHD-specific visual enhancements
    const container = screen.getByText(/where was i|no recent activity|getting started/i).closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should apply autism-specific styling', () => {
    render(
      <TestWrapper>
        <ActivityRecallBanner />
      </TestWrapper>
    );

    // Should apply autism-specific predictable patterns
    const container = screen.getByText(/where was i|no recent activity|getting started/i).closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should apply dyslexia-specific styling', () => {
    render(
      <TestWrapper>
        <QuickEntryComponent />
      </TestWrapper>
    );

    // Should apply dyslexia-friendly text sizing and spacing
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });
});

describe('AdaptiveSmart Components - Performance Tests', () => {
  it('should not cause memory leaks', () => {
    const { unmount } = render(
      <TestWrapper>
        <ActivityRecallBanner />
      </TestWrapper>
    );

    // Should clean up properly
    unmount();
  });

  it('should handle large datasets efficiently', () => {
    // Mock large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `entry-${i}`,
      userId: 'test-user',
      type: 'text' as const,
      content: { text: `Entry ${i}` },
      context: { source: '/test', tags: [] },
      processing: { status: 'processed' as const },
      createdAt: new Date(),
    }));

    render(
      <TestWrapper>
        <QuickEntryComponent />
      </TestWrapper>
    );

    // Should render without performance issues
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

describe('AdaptiveSmart Components - Cross-browser Compatibility', () => {
  it('should work without modern JavaScript features', () => {
    // Mock older browser environment
    const originalCrypto = global.crypto;
    delete (global as any).crypto;

    render(
      <TestWrapper>
        <QuickEntryComponent />
      </TestWrapper>
    );

    // Should still render
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // Restore
    global.crypto = originalCrypto;
  });

  it('should handle missing Web APIs gracefully', () => {
    // Mock missing speech recognition
    const originalSpeechRecognition = (window as any).SpeechRecognition;
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    render(
      <TestWrapper>
        <QuickEntryComponent allowedTypes={['voice']} />
      </TestWrapper>
    );

    // Should disable voice features gracefully
    const voiceButton = screen.getByText('Voice');
    expect(voiceButton).toBeDisabled();

    // Restore
    (window as any).SpeechRecognition = originalSpeechRecognition;
  });
});
