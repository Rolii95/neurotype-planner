import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  dyslexiaFont: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
}

const defaultSettings: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium',
  dyslexiaFont: false
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const raw = localStorage.getItem('accessibilitySettings');
      if (raw) return { ...defaultSettings, ...JSON.parse(raw) } as AccessibilitySettings;
    } catch (e) {
      // ignore
    }
    return defaultSettings;
  });

  // Apply settings to document root (CSS variables / attributes / classes)
  const applyToDocument = useCallback((s: AccessibilitySettings) => {
    try {
      const root = document.documentElement;

      // Reduced motion -> data-animation-speed
      if (s.reducedMotion) {
        root.setAttribute('data-animation-speed', 'none');
        root.classList.add('no-animations');
      } else {
        root.removeAttribute('data-animation-speed');
        root.classList.remove('no-animations');
      }

      // Font size
      root.setAttribute('data-font-size', s.fontSize === 'small' ? 'small' : s.fontSize === 'large' ? 'large' : 'medium');

      // Dyslexia font
      if (s.dyslexiaFont) {
        root.classList.add('dyslexia-font');
      } else {
        root.classList.remove('dyslexia-font');
      }

      // High contrast
      if (s.highContrast) {
        root.classList.add('high-contrast');
      } else {
        root.classList.remove('high-contrast');
      }
    } catch (e) {
      // Ignore errors in non-browser environments
      // console.warn('Failed to apply accessibility settings to document', e);
    }
  }, []);

  // Initialize effect: apply settings on mount
  React.useEffect(() => {
    applyToDocument(settings);
  }, [settings, applyToDocument]);

  const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
    setSettings((prev: AccessibilitySettings) => {
      const next = { ...prev, ...updates } as AccessibilitySettings;
      try {
        localStorage.setItem('accessibilitySettings', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      applyToDocument(next);
      return next;
    });
  }, [applyToDocument]);

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);
  // Expose API hook so provider can attach global methods
  useExposeAccessibilityAPI(updateSettings);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

// Attach the imperative API when provider mounts (so updateSettings is available)
export const useExposeAccessibilityAPI = (setter: (u: Partial<AccessibilitySettings>) => void) => {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__accessibility = window.__accessibility || {};
    window.__accessibility.set = setter;
    window.__accessibility.openPanel = () => {
      const el = document.getElementById('quick-access-panel-summary');
      if (el && (el as HTMLElement).click) (el as HTMLElement).click();
    };

    return () => {
      try {
        if (window.__accessibility) {
          delete window.__accessibility.set;
          delete window.__accessibility.openPanel;
        }
      } catch (e) {
        // ignore
      }
    };
  }, [setter]);
};

// Expose a small imperative API for integration / tests
declare global {
  interface Window {
    __accessibility?: {
      set?: (updates: Partial<AccessibilitySettings>) => void;
      openPanel?: () => void;
    };
  }
}

// Attach the API to window when running in browser
if (typeof window !== 'undefined') {
  // We'll attach in a safe, lazy manner inside an effect in a small helper
  const attachGlobal = () => {
    // noop - real attach happens in provider mount to get the latest updateSettings reference
  };
  attachGlobal();
}
