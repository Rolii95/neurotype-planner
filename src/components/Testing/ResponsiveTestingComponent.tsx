import React, { useState, useEffect } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';
import { useI18n } from '../../i18n/index';

interface ResponsiveTestSuite {
  id: string;
  name: string;
  description: string;
  tests: ResponsiveTest[];
}

interface ResponsiveTest {
  id: string;
  name: string;
  criterion: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  result?: string;
  details?: string;
}

interface BreakpointInfo {
  name: string;
  min: number;
  max?: number;
  current: boolean;
}

export const ResponsiveTestingComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<Map<string, ResponsiveTest>>(new Map());
  const [currentBreakpoint, setCurrentBreakpoint] = useState<BreakpointInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  const { announceToScreenReader, getAccessibilityClasses } = useAccessibility();
  const { t } = useI18n();

  // Define responsive breakpoints
  const breakpoints: BreakpointInfo[] = [
    { name: 'Mobile (Small)', min: 320, max: 479, current: false },
    { name: 'Mobile (Medium)', min: 480, max: 767, current: false },
    { name: 'Tablet', min: 768, max: 1023, current: false },
    { name: 'Desktop (Small)', min: 1024, max: 1279, current: false },
    { name: 'Desktop (Large)', min: 1280, max: 1535, current: false },
    { name: 'Desktop (XL)', min: 1536, current: false }
  ];

  // Define test suites
  const testSuites: ResponsiveTestSuite[] = [
    {
      id: 'touch-targets',
      name: 'Touch Target Compliance',
      description: 'Verify all interactive elements meet minimum touch target size (44x44px)',
      tests: [
        {
          id: 'button-size',
          name: 'Button Touch Targets',
          criterion: 'All buttons must be at least 44x44px',
          status: 'pending'
        },
        {
          id: 'link-size',
          name: 'Link Touch Targets',
          criterion: 'All clickable links must be at least 44x44px',
          status: 'pending'
        },
        {
          id: 'input-size',
          name: 'Form Input Touch Targets',
          criterion: 'All form inputs must be at least 44px tall',
          status: 'pending'
        },
        {
          id: 'spacing',
          name: 'Touch Target Spacing',
          criterion: 'Minimum 8px spacing between touch targets',
          status: 'pending'
        }
      ]
    },
    {
      id: 'layout-adaptation',
      name: 'Layout Adaptation',
      description: 'Verify layout adapts properly across breakpoints',
      tests: [
        {
          id: 'navigation',
          name: 'Navigation Responsiveness',
          criterion: 'Navigation collapses to hamburger menu on mobile',
          status: 'pending'
        },
        {
          id: 'content-flow',
          name: 'Content Flow',
          criterion: 'Content stacks vertically on mobile, flows horizontally on desktop',
          status: 'pending'
        },
        {
          id: 'grid-system',
          name: 'Grid System',
          criterion: 'Grid columns adapt: 1 (mobile), 2-3 (tablet), 4+ (desktop)',
          status: 'pending'
        },
        {
          id: 'font-scaling',
          name: 'Font Scaling',
          criterion: 'Font sizes scale appropriately across breakpoints',
          status: 'pending'
        }
      ]
    },
    {
      id: 'neurotype-adaptations',
      name: 'Neurotype-Specific Adaptations',
      description: 'Test mobile adaptations for neurodivergent users',
      tests: [
        {
          id: 'visual-clarity',
          name: 'Visual Clarity on Small Screens',
          criterion: 'High contrast and clear visual hierarchy maintained',
          status: 'pending'
        },
        {
          id: 'cognitive-load',
          name: 'Reduced Cognitive Load',
          criterion: 'Simplified layouts and progressive disclosure on mobile',
          status: 'pending'
        },
        {
          id: 'focus-management',
          name: 'Mobile Focus Management',
          criterion: 'Focus indicators visible and functional on touch devices',
          status: 'pending'
        },
        {
          id: 'gesture-support',
          name: 'Alternative Gesture Support',
          criterion: 'All gestures have button alternatives',
          status: 'pending'
        }
      ]
    }
  ];

  // Detect current breakpoint
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const current = breakpoints.find(bp => 
        width >= bp.min && (bp.max === undefined || width <= bp.max)
      );
      
      if (current) {
        setCurrentBreakpoint({ ...current, current: true });
      }

      // Detect orientation
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    window.addEventListener('orientationchange', updateBreakpoint);

    return () => {
      window.removeEventListener('resize', updateBreakpoint);
      window.removeEventListener('orientationchange', updateBreakpoint);
    };
  }, []);

  // Touch target testing function
  const testTouchTargets = (): Promise<ResponsiveTest[]> => {
    return new Promise((resolve) => {
      const results: ResponsiveTest[] = [];
      
      // Test buttons
      const buttons = document.querySelectorAll('button, [role="button"]');
      let failedButtons = 0;
      
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          failedButtons++;
        }
      });

      results.push({
        id: 'button-size',
        name: 'Button Touch Targets',
        criterion: 'All buttons must be at least 44x44px',
        status: failedButtons === 0 ? 'pass' : 'fail',
        result: `${buttons.length - failedButtons}/${buttons.length} buttons pass`,
        details: failedButtons > 0 ? `${failedButtons} buttons are too small` : undefined
      });

      // Test links
      const links = document.querySelectorAll('a, [role="link"]');
      let failedLinks = 0;
      
      links.forEach(link => {
        const rect = link.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          failedLinks++;
        }
      });

      results.push({
        id: 'link-size',
        name: 'Link Touch Targets',
        criterion: 'All clickable links must be at least 44x44px',
        status: failedLinks === 0 ? 'pass' : 'fail',
        result: `${links.length - failedLinks}/${links.length} links pass`,
        details: failedLinks > 0 ? `${failedLinks} links are too small` : undefined
      });

      // Test form inputs
      const inputs = document.querySelectorAll('input, select, textarea');
      let failedInputs = 0;
      
      inputs.forEach(input => {
        const rect = input.getBoundingClientRect();
        if (rect.height < 44) {
          failedInputs++;
        }
      });

      results.push({
        id: 'input-size',
        name: 'Form Input Touch Targets',
        criterion: 'All form inputs must be at least 44px tall',
        status: failedInputs === 0 ? 'pass' : 'fail',
        result: `${inputs.length - failedInputs}/${inputs.length} inputs pass`,
        details: failedInputs > 0 ? `${failedInputs} inputs are too short` : undefined
      });

      // Test spacing (simplified)
      results.push({
        id: 'spacing',
        name: 'Touch Target Spacing',
        criterion: 'Minimum 8px spacing between touch targets',
        status: 'warning',
        result: 'Manual verification required',
        details: 'Spacing should be manually verified with developer tools'
      });

      setTimeout(() => resolve(results), 100);
    });
  };

  // Layout adaptation testing function
  const testLayoutAdaptation = (): Promise<ResponsiveTest[]> => {
    return new Promise((resolve) => {
      const results: ResponsiveTest[] = [];
      const isMobile = window.innerWidth < 768;

      // Test navigation
      const nav = document.querySelector('nav');
      const hamburger = document.querySelector('[aria-label*="menu"], [aria-label*="navigation"]');
      
      results.push({
        id: 'navigation',
        name: 'Navigation Responsiveness',
        criterion: 'Navigation collapses to hamburger menu on mobile',
        status: isMobile ? (hamburger ? 'pass' : 'fail') : 'pass',
        result: isMobile ? 
          (hamburger ? 'Hamburger menu found' : 'No hamburger menu found') :
          'Desktop navigation active',
        details: isMobile && !hamburger ? 'Consider adding a hamburger menu for mobile' : undefined
      });

      // Test content flow (simplified check)
      const containers = document.querySelectorAll('[class*="grid"], [class*="flex"]');
      
      results.push({
        id: 'content-flow',
        name: 'Content Flow',
        criterion: 'Content stacks vertically on mobile, flows horizontally on desktop',
        status: 'warning',
        result: `Found ${containers.length} layout containers`,
        details: 'Manual verification recommended for content flow'
      });

      // Test grid system
      const gridContainers = document.querySelectorAll('[class*="grid-cols"]');
      
      results.push({
        id: 'grid-system',
        name: 'Grid System',
        criterion: 'Grid columns adapt: 1 (mobile), 2-3 (tablet), 4+ (desktop)',
        status: gridContainers.length > 0 ? 'pass' : 'warning',
        result: `Found ${gridContainers.length} responsive grid containers`,
        details: gridContainers.length === 0 ? 'No responsive grids detected' : undefined
      });

      // Test font scaling
      const rootFontSize = parseInt(getComputedStyle(document.documentElement).fontSize);
      
      results.push({
        id: 'font-scaling',
        name: 'Font Scaling',
        criterion: 'Font sizes scale appropriately across breakpoints',
        status: rootFontSize >= 16 ? 'pass' : 'warning',
        result: `Root font size: ${rootFontSize}px`,
        details: rootFontSize < 16 ? 'Consider increasing base font size for mobile accessibility' : undefined
      });

      setTimeout(() => resolve(results), 100);
    });
  };

  // Neurotype adaptations testing function
  const testNeuroAdaptations = (): Promise<ResponsiveTest[]> => {
    return new Promise((resolve) => {
      const results: ResponsiveTest[] = [];

      // Test visual clarity
      const highContrastElements = document.querySelectorAll('[class*="contrast"], [class*="focus"]');
      
      results.push({
        id: 'visual-clarity',
        name: 'Visual Clarity on Small Screens',
        criterion: 'High contrast and clear visual hierarchy maintained',
        status: highContrastElements.length > 0 ? 'pass' : 'warning',
        result: `Found ${highContrastElements.length} high-contrast elements`,
        details: 'Verify color contrast ratios meet WCAG AA standards'
      });

      // Test cognitive load reduction
      const collapsibleElements = document.querySelectorAll('[aria-expanded], details, [class*="collapse"]');
      
      results.push({
        id: 'cognitive-load',
        name: 'Reduced Cognitive Load',
        criterion: 'Simplified layouts and progressive disclosure on mobile',
        status: collapsibleElements.length > 0 ? 'pass' : 'warning',
        result: `Found ${collapsibleElements.length} progressive disclosure elements`,
        details: 'Consider adding more collapsible sections for mobile'
      });

      // Test focus management
      const focusableElements = document.querySelectorAll('button, [tabindex], input, select, textarea, a');
      let visibleFocusElements = 0;
      
      focusableElements.forEach(el => {
        const styles = getComputedStyle(el);
        if (styles.outline !== 'none' || styles.boxShadow.includes('focus')) {
          visibleFocusElements++;
        }
      });

      results.push({
        id: 'focus-management',
        name: 'Mobile Focus Management',
        criterion: 'Focus indicators visible and functional on touch devices',
        status: visibleFocusElements > 0 ? 'pass' : 'warning',
        result: `${visibleFocusElements}/${focusableElements.length} elements have visible focus`,
        details: 'Ensure focus indicators work with touch and keyboard navigation'
      });

      // Test gesture alternatives
      const gestureElements = document.querySelectorAll('[class*="swipe"], [class*="drag"], [class*="pinch"]');
      
      results.push({
        id: 'gesture-support',
        name: 'Alternative Gesture Support',
        criterion: 'All gestures have button alternatives',
        status: gestureElements.length === 0 ? 'pass' : 'warning',
        result: gestureElements.length === 0 ? 'No gesture-only interactions found' : `${gestureElements.length} gesture interactions need alternatives`,
        details: gestureElements.length > 0 ? 'Ensure all gestures have button or menu alternatives' : undefined
      });

      setTimeout(() => resolve(results), 100);
    });
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    announceToScreenReader('Starting responsive design tests');

    try {
      const touchResults = await testTouchTargets();
      const layoutResults = await testLayoutAdaptation();
      const neuroResults = await testNeuroAdaptations();

      const allResults = [...touchResults, ...layoutResults, ...neuroResults];
      const resultMap = new Map();
      
      allResults.forEach(result => {
        resultMap.set(result.id, result);
      });

      setTestResults(resultMap);
      
      const passed = allResults.filter(r => r.status === 'pass').length;
      const total = allResults.length;
      
      announceToScreenReader(`Testing complete: ${passed} of ${total} tests passed`);
    } catch (error) {
      announceToScreenReader('Testing failed due to an error');
    } finally {
      setIsRunning(false);
    }
  };

  // Get test result for a specific test
  const getTestResult = (testId: string): ResponsiveTest | null => {
    return testResults.get(testId) || null;
  };

  // Render test status icon
  const renderStatusIcon = (status: ResponsiveTest['status']) => {
    const iconClasses = "w-5 h-5";
    
    switch (status) {
      case 'pass':
        return (
          <svg className={`${iconClasses} text-green-600`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        );
      case 'fail':
        return (
          <svg className={`${iconClasses} text-red-600`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconClasses} text-yellow-600`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return (
          <svg className={`${iconClasses} text-gray-400`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
          </svg>
        );
    }
  };

  return (
    <div className={`responsive-testing p-6 bg-white rounded-lg shadow-lg ${getAccessibilityClasses()}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Mobile-First Responsive Testing
        </h2>
        <p className="text-gray-600">
          Comprehensive testing for responsive design and mobile accessibility compliance
        </p>
      </div>

      {/* Current Breakpoint Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Environment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Breakpoint:</span> {currentBreakpoint?.name || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Screen Size:</span> {window.innerWidth}x{window.innerHeight}px
          </div>
          <div>
            <span className="font-medium">Orientation:</span> {orientation}
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      {/* Test Suites */}
      <div className="space-y-6">
        {testSuites.map((suite) => (
          <div key={suite.id} className="border border-gray-200 rounded-lg">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{suite.name}</h3>
              <p className="text-sm text-gray-600">{suite.description}</p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {suite.tests.map((test) => {
                const result = getTestResult(test.id);
                const status = result?.status || test.status;
                
                return (
                  <div key={test.id} className="px-4 py-3 flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {renderStatusIcon(status)}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{test.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          status === 'pass' ? 'bg-green-100 text-green-800' :
                          status === 'fail' ? 'bg-red-100 text-red-800' :
                          status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">{test.criterion}</p>
                      
                      {result?.result && (
                        <p className="text-sm text-blue-600 mt-1">
                          <span className="font-medium">Result:</span> {result.result}
                        </p>
                      )}
                      
                      {result?.details && (
                        <p className="text-sm text-orange-600 mt-1">
                          <span className="font-medium">Details:</span> {result.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {testResults.size > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Test Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-green-600">Passed:</span> {
                Array.from(testResults.values()).filter(r => r.status === 'pass').length
              }
            </div>
            <div>
              <span className="font-medium text-red-600">Failed:</span> {
                Array.from(testResults.values()).filter(r => r.status === 'fail').length
              }
            </div>
            <div>
              <span className="font-medium text-yellow-600">Warnings:</span> {
                Array.from(testResults.values()).filter(r => r.status === 'warning').length
              }
            </div>
            <div>
              <span className="font-medium text-gray-600">Total:</span> {testResults.size}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveTestingComponent;