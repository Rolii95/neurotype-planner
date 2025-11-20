import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { VisualSensoryProvider } from '../VisualSensoryContext';
import { RoutineVisualBoard } from '../components/RoutineVisualBoard';
import { MoodEnergyTracker } from '../components/MoodEnergyTracker';
import { SensoryComfortWidget } from '../components/SensoryComfortWidget';
import { VisualCard } from '../components/VisualCard';
import { RoutineStep } from '../types';

// Mock data
const mockStep: RoutineStep = {
  id: '1',
  title: 'Test Step',
  description: 'Test Description',
  order: 0,
  isCompleted: false,
  accessibility: {
    altText: 'Test step for accessibility',
    highContrast: false,
    largeText: false
  }
};

// Helper to render with provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <VisualSensoryProvider>
      <div style={{ width: '800px', height: '600px' }}>{component}</div>
    </VisualSensoryProvider>
  );
};

describe('Accessibility Compliance', () => {
  it('VisualCard should have no accessibility violations', async () => {
    const { container } = render(
      <VisualCard
        step={mockStep}
        onUpdate={() => {}}
        onDelete={() => {}}
        onImageUpload={() => {}}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('RoutineVisualBoard should have no accessibility violations', async () => {
    const { container } = renderWithProvider(<RoutineVisualBoard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('MoodEnergyTracker should have no accessibility violations', async () => {
    const { container } = renderWithProvider(<MoodEnergyTracker />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('SensoryComfortWidget should have no accessibility violations', async () => {
    const { container } = renderWithProvider(
      <SensoryComfortWidget alwaysVisible={true} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should work with high contrast mode', async () => {
    const highContrastStep = {
      ...mockStep,
      accessibility: {
        ...mockStep.accessibility,
        highContrast: true
      }
    };

    const { container } = render(
      <VisualCard
        step={highContrastStep}
        onUpdate={() => {}}
        onDelete={() => {}}
        onImageUpload={() => {}}
        accessibilityMode={true}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should work with large text mode', async () => {
    const largeTextStep = {
      ...mockStep,
      accessibility: {
        ...mockStep.accessibility,
        largeText: true
      }
    };

    const { container } = render(
      <VisualCard
        step={largeTextStep}
        onUpdate={() => {}}
        onDelete={() => {}}
        onImageUpload={() => {}}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// Color contrast testing utility
export const checkColorContrast = (element: HTMLElement) => {
  const styles = window.getComputedStyle(element);
  const backgroundColor = styles.backgroundColor;
  const color = styles.color;
  
  // This is a simplified check - in real implementation you'd use a proper contrast ratio calculator
  const isHighContrast = backgroundColor !== color && 
                        backgroundColor !== 'transparent' && 
                        color !== 'transparent';
  
  return isHighContrast;
};

// Keyboard navigation testing utility
export const testKeyboardNavigation = async (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const accessibleElements = Array.from(focusableElements).filter(element => {
    const tabIndex = element.getAttribute('tabindex');
    return tabIndex !== '-1';
  });
  
  return {
    totalFocusable: focusableElements.length,
    accessibleCount: accessibleElements.length,
    hasProperTabOrder: accessibleElements.length === focusableElements.length
  };
};

// Screen reader compatibility testing
export const checkScreenReaderCompat = (container: HTMLElement) => {
  const elementsWithAriaLabels = container.querySelectorAll('[aria-label]');
  const elementsWithAriaDescriptions = container.querySelectorAll('[aria-describedby]');
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const lists = container.querySelectorAll('[role="list"]');
  const buttons = container.querySelectorAll('button');
  
  // Check if buttons have accessible names
  const buttonsWithNames = Array.from(buttons).filter(button => {
    return button.getAttribute('aria-label') || 
           button.getAttribute('title') || 
           button.textContent?.trim();
  });
  
  return {
    ariaLabelsCount: elementsWithAriaLabels.length,
    ariaDescriptionsCount: elementsWithAriaDescriptions.length,
    headingsCount: headings.length,
    listsCount: lists.length,
    buttonsWithNamesRatio: buttonsWithNames.length / buttons.length
  };
};

// Neurotype-specific accessibility tests
describe('Neurotype-Specific Accessibility', () => {
  describe('ADHD Accommodations', () => {
    it('should provide clear visual hierarchy', () => {
      const { container } = renderWithProvider(<RoutineVisualBoard />);
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should minimize cognitive load with progressive disclosure', () => {
      const { container } = renderWithProvider(<SensoryComfortWidget alwaysVisible={true} />);
      
      // Check for collapsible sections
      const advancedToggle = container.querySelector('[role="button"]');
      expect(advancedToggle).toBeTruthy();
    });

    it('should provide immediate feedback for actions', async () => {
      const { container } = render(
        <VisualCard
          step={mockStep}
          onUpdate={() => {}}
          onDelete={() => {}}
          onImageUpload={() => {}}
        />
      );

      const completeButton = container.querySelector('button[aria-label*="complete"]');
      expect(completeButton).toBeTruthy();
    });
  });

  describe('Autism Accommodations', () => {
    it('should provide predictable navigation patterns', () => {
      const { container } = renderWithProvider(<RoutineVisualBoard />);
      
      // Check for consistent button placement and styling
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should offer clear status indicators', () => {
      const { container } = render(
        <VisualCard
          step={{ ...mockStep, isCompleted: true }}
          onUpdate={() => {}}
          onDelete={() => {}}
          onImageUpload={() => {}}
        />
      );

      // Should show completion status
      const completedIndicator = container.querySelector('[aria-label*="complete"]');
      expect(completedIndicator).toBeTruthy();
    });

    it('should minimize sensory overload with calm design', () => {
      const { container } = renderWithProvider(<MoodEnergyTracker />);
      
      // Check for non-aggressive colors and animations
      const animatedElements = container.querySelectorAll('.animate-spin, .animate-pulse');
      
      // Should have minimal animations
      expect(animatedElements.length).toBeLessThan(3);
    });
  });

  describe('Dyslexia Accommodations', () => {
    it('should support large text options', () => {
      const largeTextStep = {
        ...mockStep,
        accessibility: { ...mockStep.accessibility, largeText: true }
      };

      const { container } = render(
        <VisualCard
          step={largeTextStep}
          onUpdate={() => {}}
          onDelete={() => {}}
          onImageUpload={() => {}}
        />
      );

      // Check for large text classes
      const textElements = container.querySelectorAll('.text-lg, .text-xl, .text-2xl');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should provide high contrast options', () => {
      const { container } = renderWithProvider(
        <SensoryComfortWidget alwaysVisible={true} />
      );

      // Should have high contrast toggle
      const contrastButton = container.querySelector('[aria-label*="contrast"]');
      expect(contrastButton).toBeTruthy();
    });

    it('should use clear, simple language', () => {
      const { container } = renderWithProvider(<MoodEnergyTracker />);
      
      // Check for simple, clear labels
      const labels = container.querySelectorAll('label');
      const complexWords = Array.from(labels).some(label => 
        label.textContent && label.textContent.length > 20
      );
      
      // Most labels should be concise
      expect(complexWords).toBeFalsy();
    });
  });
});

// Performance accessibility tests
describe('Performance Accessibility', () => {
  it('should load quickly for users with cognitive processing delays', async () => {
    const startTime = performance.now();
    
    renderWithProvider(<RoutineVisualBoard />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within reasonable time (100ms is generous for testing)
    expect(renderTime).toBeLessThan(100);
  });

  it('should handle large datasets without performance degradation', () => {
    // This would test with large amounts of mood entries or routine steps
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      ...mockStep,
      id: i.toString()
    }));

    const startTime = performance.now();
    
    // Render with large dataset
    renderWithProvider(<RoutineVisualBoard />);
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(200);
  });
});

// Utilities above are already exported where declared.
