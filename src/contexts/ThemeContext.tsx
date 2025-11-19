import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type FontSize = 'small' | 'medium' | 'large' | 'x-large';
export type AnimationSpeed = 'none' | 'reduced' | 'normal' | 'fast';

interface ThemeContextType {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
  
  // Colorblind mode
  colorblindMode: ColorblindMode;
  setColorblindMode: (mode: ColorblindMode) => void;
  
  // Typography
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  dyslexiaFont: boolean;
  setDyslexiaFont: (enabled: boolean) => void;
  readingMode: boolean;
  setReadingMode: (enabled: boolean) => void;
  
  // Interactions
  animationSpeed: AnimationSpeed;
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  hapticFeedback: boolean;
  setHapticFeedback: (enabled: boolean) => void;
  soundEffects: boolean;
  setSoundEffects: (enabled: boolean) => void;
  
  // Contrast
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  THEME: 'neurotype-theme',
  COLORBLIND_MODE: 'neurotype-colorblind-mode',
  FONT_SIZE: 'neurotype-font-size',
  DYSLEXIA_FONT: 'neurotype-dyslexia-font',
  READING_MODE: 'neurotype-reading-mode',
  ANIMATION_SPEED: 'neurotype-animation-speed',
  HAPTIC_FEEDBACK: 'neurotype-haptic-feedback',
  SOUND_EFFECTS: 'neurotype-sound-effects',
  HIGH_CONTRAST: 'neurotype-high-contrast',
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage or defaults
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved as ThemeMode) || 'auto';
  });
  
  const [colorblindMode, setColorblindModeState] = useState<ColorblindMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLORBLIND_MODE);
    return (saved as ColorblindMode) || 'none';
  });
  
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    return (saved as FontSize) || 'medium';
  });
  
  const [dyslexiaFont, setDyslexiaFontState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DYSLEXIA_FONT);
    return saved === 'true';
  });
  
  const [readingMode, setReadingModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.READING_MODE);
    return saved === 'true';
  });
  
  const [animationSpeed, setAnimationSpeedState] = useState<AnimationSpeed>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ANIMATION_SPEED);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return (saved as AnimationSpeed) || (prefersReduced ? 'reduced' : 'normal');
  });
  
  const [hapticFeedback, setHapticFeedbackState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HAPTIC_FEEDBACK);
    return saved !== 'false'; // Default to true
  });
  
  const [soundEffects, setSoundEffectsState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND_EFFECTS);
    return saved === 'true';
  });
  
  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST);
    return saved === 'true';
  });

  // Calculate if dark mode should be active
  const [isDark, setIsDark] = useState(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Update dark mode based on theme and system preference
  useEffect(() => {
    const updateDarkMode = () => {
      if (theme === 'dark') {
        setIsDark(true);
      } else if (theme === 'light') {
        setIsDark(false);
      } else {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    };

    updateDarkMode();

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateDarkMode();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  // Apply dark mode to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Apply colorblind mode
  useEffect(() => {
    document.documentElement.setAttribute('data-colorblind-mode', colorblindMode);
  }, [colorblindMode]);

  // Apply font size
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  // Apply dyslexia font
  useEffect(() => {
    if (dyslexiaFont) {
      document.documentElement.classList.add('dyslexia-font');
    } else {
      document.documentElement.classList.remove('dyslexia-font');
    }
  }, [dyslexiaFont]);

  // Apply reading mode
  useEffect(() => {
    if (readingMode) {
      document.documentElement.classList.add('reading-mode');
    } else {
      document.documentElement.classList.remove('reading-mode');
    }
  }, [readingMode]);

  // Apply animation speed
  useEffect(() => {
    document.documentElement.setAttribute('data-animation-speed', animationSpeed);
    
    if (animationSpeed === 'none') {
      document.documentElement.classList.add('no-animations');
    } else {
      document.documentElement.classList.remove('no-animations');
    }
  }, [animationSpeed]);

  // Apply high contrast
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Persist settings
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  };

  const setColorblindMode = (mode: ColorblindMode) => {
    setColorblindModeState(mode);
    localStorage.setItem(STORAGE_KEYS.COLORBLIND_MODE, mode);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);
  };

  const setDyslexiaFont = (enabled: boolean) => {
    setDyslexiaFontState(enabled);
    localStorage.setItem(STORAGE_KEYS.DYSLEXIA_FONT, String(enabled));
  };

  const setReadingMode = (enabled: boolean) => {
    setReadingModeState(enabled);
    localStorage.setItem(STORAGE_KEYS.READING_MODE, String(enabled));
  };

  const setAnimationSpeed = (speed: AnimationSpeed) => {
    setAnimationSpeedState(speed);
    localStorage.setItem(STORAGE_KEYS.ANIMATION_SPEED, speed);
  };

  const setHapticFeedback = (enabled: boolean) => {
    setHapticFeedbackState(enabled);
    localStorage.setItem(STORAGE_KEYS.HAPTIC_FEEDBACK, String(enabled));
  };

  const setSoundEffects = (enabled: boolean) => {
    setSoundEffectsState(enabled);
    localStorage.setItem(STORAGE_KEYS.SOUND_EFFECTS, String(enabled));
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, String(enabled));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        colorblindMode,
        setColorblindMode,
        fontSize,
        setFontSize,
        dyslexiaFont,
        setDyslexiaFont,
        readingMode,
        setReadingMode,
        animationSpeed,
        setAnimationSpeed,
        hapticFeedback,
        setHapticFeedback,
        soundEffects,
        setSoundEffects,
        highContrast,
        setHighContrast,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Utility hook for haptic feedback
export const useHaptics = () => {
  const { hapticFeedback } = useTheme();

  const vibrate = (pattern: number | number[]) => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return {
    light: () => vibrate(10),
    medium: () => vibrate(20),
    heavy: () => vibrate(30),
    success: () => vibrate([10, 50, 10]),
    warning: () => vibrate([20, 100, 20]),
    error: () => vibrate([30, 100, 30, 100, 30]),
  };
};

// Utility hook for sound effects
export const useSoundEffects = () => {
  const { soundEffects } = useTheme();

  const play = (soundName: string) => {
    if (!soundEffects) return;

    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Silently fail if sound doesn't exist or can't play
    });
  };

  return {
    success: () => play('success'),
    complete: () => play('complete'),
    notify: () => play('notify'),
    click: () => play('click'),
    error: () => play('error'),
  };
};
