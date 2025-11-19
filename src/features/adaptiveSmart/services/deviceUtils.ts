import { UserActivity, SmartSuggestion, QuickEntry, DeviceInfo, CognitiveProfile } from '../types';

// Device detection utility
export function detectDevice(): DeviceInfo {
  const userAgent = navigator.userAgent;
  const screenWidth = window.screen.width;
  
  // Detect device type
  let deviceType: DeviceInfo['type'] = 'desktop';
  if (screenWidth <= 768) {
    deviceType = 'mobile';
  } else if (screenWidth <= 1024) {
    deviceType = 'tablet';
  }

  // Detect browser
  let browser = 'unknown';
  if (userAgent.includes('Chrome')) browser = 'chrome';
  else if (userAgent.includes('Firefox')) browser = 'firefox';
  else if (userAgent.includes('Safari')) browser = 'safari';
  else if (userAgent.includes('Edge')) browser = 'edge';

  // Check capabilities
  const capabilities = {
    speechRecognition: 'speechSynthesis' in window && 'SpeechRecognition' in window,
    speechSynthesis: 'speechSynthesis' in window,
    fileUpload: true, // Always available in modern browsers
    camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    geolocation: 'geolocation' in navigator,
  };

  return {
    type: deviceType,
    screenSize: `${screenWidth}x${window.screen.height}`,
    browser,
    userAgent,
    capabilities,
  };
}

// Cognitive profile management
export async function getCognitiveProfile(userId: string): Promise<CognitiveProfile | null> {
  try {
    // Try to load from localStorage first
    const stored = localStorage.getItem(`cognitiveProfile_${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }

    // If not found locally, create a default profile
    const defaultProfile: CognitiveProfile = {
      neurotype: 'general',
      preferences: {
        visualDensity: 'normal',
        colorScheme: 'auto',
        fontSize: 'normal',
        animations: 'normal',
        sounds: false,
        notifications: 'normal',
      },
      accommodations: {
        reduceDistraction: false,
        simplifyNavigation: false,
        provideContext: true,
        allowFlexibleTiming: true,
        offerAlternativeFormats: false,
      },
      triggers: {
        overwhelm: ['multiple-notifications', 'rapid-changes'],
        confusion: ['unclear-navigation', 'missing-context'],
        frustration: ['long-loading', 'complex-forms'],
      },
      strengths: {
        focus: 5,
        creativity: 5,
        attention: 5,
        memory: 5,
        processing: 5,
      },
    };

    // Save to localStorage
    localStorage.setItem(`cognitiveProfile_${userId}`, JSON.stringify(defaultProfile));
    
    return defaultProfile;
  } catch (error) {
    console.error('Error loading cognitive profile:', error);
    return null;
  }
}

export async function updateCognitiveProfile(userId: string, updates: Partial<CognitiveProfile>): Promise<void> {
  try {
    const current = await getCognitiveProfile(userId);
    if (current) {
      const updated = { ...current, ...updates };
      localStorage.setItem(`cognitiveProfile_${userId}`, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Error updating cognitive profile:', error);
    throw error;
  }
}

// Browser capability detection
export function getDeviceCapabilities() {
  return {
    supportsVoiceInput: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    supportsVoiceOutput: 'speechSynthesis' in window,
    supportsFileAPI: 'File' in window && 'FileReader' in window,
    supportsCamera: 'mediaDevices' in navigator,
    supportsNotifications: 'Notification' in window,
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsIndexedDB: 'indexedDB' in window,
    supportsWebGL: !!document.createElement('canvas').getContext('webgl'),
    supportsTouchEvents: 'ontouchstart' in window,
    supportsGeolocation: 'geolocation' in navigator,
  };
}

// Neurotype-specific adaptations
export function getNeuroAdaptations(neurotype: CognitiveProfile['neurotype']) {
  const adaptations = {
    adhd: {
      ui: {
        highlightFocus: true,
        reduceAnimation: false,
        immediatefeedback: true,
        colorCodeImportance: true,
        largerClickTargets: true,
      },
      behavior: {
        autoSave: true,
        frequentBreaks: true,
        gamification: true,
        visualProgress: true,
        timeEstimates: true,
      },
      suggestions: {
        breakReminders: 30, // minutes
        focusBoosts: true,
        taskPrioritization: true,
        timeBlocking: true,
      },
    },
    autism: {
      ui: {
        consistentLayout: true,
        predictableNavigation: true,
        statusIndicators: true,
        reduceUnexpectedChanges: true,
        customizableInterface: true,
      },
      behavior: {
        routineSupport: true,
        changeNotifications: true,
        detailedInstructions: true,
        alternativeFormats: true,
      },
      suggestions: {
        routineReminders: true,
        sensoryChecks: true,
        transitionWarnings: true,
        structuredPlanning: true,
      },
    },
    dyslexia: {
      ui: {
        dyslexiaFriendlyFont: true,
        highContrast: true,
        largerText: true,
        voiceOutput: true,
        visualSupports: true,
      },
      behavior: {
        voiceInput: true,
        spellingSupport: true,
        readingSupport: true,
        alternativeInput: true,
      },
      suggestions: {
        readingBreaks: true,
        comprehensionChecks: true,
        audioAlternatives: true,
        visualSummaries: true,
      },
    },
    general: {
      ui: {
        accessibleDesign: true,
        responsiveLayout: true,
        clearNavigation: true,
      },
      behavior: {
        helpContext: true,
        errorPrevention: true,
        undoSupport: true,
      },
      suggestions: {
        productivityTips: true,
        usageInsights: true,
      },
    },
    multiple: {
      // Combines all adaptations
      ui: {
        highlightFocus: true,
        consistentLayout: true,
        dyslexiaFriendlyFont: true,
        customizableInterface: true,
        accessibleDesign: true,
      },
      behavior: {
        autoSave: true,
        routineSupport: true,
        voiceInput: true,
        helpContext: true,
      },
      suggestions: {
        breakReminders: 45,
        routineReminders: true,
        readingBreaks: true,
        productivityTips: true,
      },
    },
  };

  return adaptations[neurotype] || adaptations.general;
}

// Performance monitoring
export function getPerformanceMetrics() {
  return {
    memoryUsage: (performance as any).memory ? {
      used: (performance as any).memory.usedJSHeapSize,
      total: (performance as any).memory.totalJSHeapSize,
      limit: (performance as any).memory.jsHeapSizeLimit,
    } : null,
    timing: performance.timing ? {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
    } : null,
    connection: (navigator as any).connection ? {
      effectiveType: (navigator as any).connection.effectiveType,
      downlink: (navigator as any).connection.downlink,
      rtt: (navigator as any).connection.rtt,
    } : null,
  };
}