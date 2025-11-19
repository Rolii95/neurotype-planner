import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgeGroup, Neurotype, OnboardingPreferences, ExperiencePreferences } from '../types/onboarding';
import { getPersonaLookAndFeel, PersonaLookAndFeel, buildExperienceFromLookAndFeel, PERSONA_THEME_MAP } from '../config/personaThemes';

interface PersonaStatsConfig {
  showTasks?: boolean;
  tasksLabel?: string;
  showCompletion?: boolean;
  completionLabel?: string;
  showStreak?: boolean;
  streakLabel?: string;
  showNextBlock?: boolean;
  nextBlockLabel?: string;
}

interface PersonaSectionsConfig {
  showPriorityPulse: boolean;
  showHealthInsights: boolean;
  showSmartInsights: boolean;
  showToolbox: boolean;
  showActivityInsights: boolean;
}

interface PersonaConfig {
  heroTitle: string;
  heroSubtitle: string;
  quickTip: string;
  stats: PersonaStatsConfig;
  quickActions: string[];
  sections: PersonaSectionsConfig;
}

interface PersonaAccessibilityConfig {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  dyslexiaFont: boolean;
  audioSupport: boolean;
}

type PersonaRuntimeConfig = PersonaConfig & {
  lookAndFeel: PersonaLookAndFeel;
  experience: ExperiencePreferences;
  accessibility: PersonaAccessibilityConfig;
  themeKey: string;
};

const DEFAULT_PERSONA: PersonaConfig = {
  heroTitle: "{greeting}! Here’s your executive snapshot.",
  heroSubtitle: 'Adaptive insights from routines, tasks, and energy cycles help you focus on what matters now.',
  quickTip: 'Use Quick Capture to empty your head before diving into the next block.',
  stats: {
    showTasks: true,
    tasksLabel: 'Total tasks',
    showCompletion: true,
    completionLabel: 'Completion rate',
    showStreak: true,
    streakLabel: 'Streak',
    showNextBlock: true,
    nextBlockLabel: 'Upcoming block',
  },
  quickActions: ['capture', 'templates', 'matrix'],
  sections: {
    showPriorityPulse: true,
    showHealthInsights: true,
    showSmartInsights: true,
    showToolbox: true,
    showActivityInsights: true,
  },
};

const AGE_PERSONA_CONFIG: Record<AgeGroup, PersonaConfig> = {
  child: {
    heroTitle: '{greeting}! Ready for a playful focus burst?',
    heroSubtitle: 'Short steps, color cues, and sensory breaks keep routines fun and safe.',
    quickTip: 'Drop a Sensory Regulation anchor before homework to ease transitions.',
    stats: {
      showTasks: true,
      tasksLabel: 'Play plans',
      showCompletion: false,
      showStreak: false,
      showNextBlock: true,
      nextBlockLabel: 'Next fun block',
    },
    quickActions: ['capture', 'assistant', 'templates'],
    sections: {
      showPriorityPulse: false,
      showHealthInsights: false,
      showSmartInsights: true,
      showToolbox: false,
      showActivityInsights: false,
    },
  },
  teen: {
    heroTitle: '{greeting}! Keep school, clubs, and rest in balance.',
    heroSubtitle: 'See academics, social life, and recovery time in one glance.',
    quickTip: 'Pin your Matrix during exam weeks so surprises don�?Tt steal energy.',
    stats: {
      showTasks: true,
      tasksLabel: 'Assignments',
      showCompletion: true,
      completionLabel: 'On-time rate',
      showStreak: true,
      streakLabel: 'Habit streak',
      showNextBlock: true,
      nextBlockLabel: 'Next class / event',
    },
    quickActions: ['capture', 'matrix', 'assistant'],
    sections: {
      showPriorityPulse: true,
      showHealthInsights: false,
      showSmartInsights: true,
      showToolbox: true,
      showActivityInsights: true,
    },
  },
  adult: DEFAULT_PERSONA,
  senior: {
    heroTitle: '{greeting}! Gentle structure for your care plan.',
    heroSubtitle: 'Blend medication reminders, routines, and calm focus windows.',
    quickTip: 'Log each Medication Orbit entry so clinicians see accurate streaks.',
    stats: {
      showTasks: true,
      tasksLabel: 'Focus items',
      showCompletion: false,
      showStreak: false,
      showNextBlock: true,
      nextBlockLabel: 'Next care block',
    },
    quickActions: ['capture', 'assistant', 'time-blocking'],
    sections: {
      showPriorityPulse: true,
      showHealthInsights: true,
      showSmartInsights: false,
      showToolbox: true,
      showActivityInsights: false,
    },
  },
};

export const PERSONA_UPDATED_EVENT = 'neurotype-persona-updated';
const STORAGE_KEY = 'neurotype-planner-onboarding';
const DEFAULT_LOOK_AND_FEEL = getPersonaLookAndFeel('adult', 'Other');
const DEFAULT_EXPERIENCE = buildExperienceFromLookAndFeel(DEFAULT_LOOK_AND_FEEL);

export const useUserPersona = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('adult');
  const [neurotype, setNeurotype] = useState<Neurotype>('Other');
  const [storedPreferences, setStoredPreferences] = useState<OnboardingPreferences | null>(null);

  const loadStoredPersona = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setStoredPreferences(null);
        return;
      }
      const parsed = JSON.parse(raw) as OnboardingPreferences;
      if (parsed?.ageGroup) {
        setAgeGroup(parsed.ageGroup as AgeGroup);
      }
      if (parsed?.neurotype) {
        setNeurotype(parsed.neurotype as Neurotype);
      }
      setStoredPreferences(parsed);
    } catch (error) {
      console.warn('Failed to parse onboarding preferences for persona:', error);
    }
  }, []);

  useEffect(() => {
    loadStoredPersona();
  }, [loadStoredPersona]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEY) {
        loadStoredPersona();
      }
    };
    const handlePersonaUpdated = () => loadStoredPersona();

    window.addEventListener('storage', handleStorage);
    window.addEventListener(PERSONA_UPDATED_EVENT, handlePersonaUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(PERSONA_UPDATED_EVENT, handlePersonaUpdated);
    };
  }, [loadStoredPersona]);

  const personaBase = useMemo(() => {
    return AGE_PERSONA_CONFIG[ageGroup] ?? DEFAULT_PERSONA;
  }, [ageGroup]);

  const lookAndFeel = useMemo(() => getPersonaLookAndFeel(ageGroup, neurotype), [ageGroup, neurotype]);
  const themePreference = storedPreferences?.theme;
  const resolvedThemeKey = themePreference ?? lookAndFeel.themeKey;

  const themedLookAndFeel = useMemo<PersonaLookAndFeel>(() => {
    const override = PERSONA_THEME_MAP[resolvedThemeKey];
    if (!override) {
      return { ...lookAndFeel, themeKey: resolvedThemeKey ?? lookAndFeel.themeKey };
    }
    return {
      ...lookAndFeel,
      themeKey: resolvedThemeKey,
      palette: {
        ...lookAndFeel.palette,
        ...override,
      },
    };
  }, [lookAndFeel, resolvedThemeKey]);

  const experience = useMemo<ExperiencePreferences>(() => {
    const defaults = buildExperienceFromLookAndFeel(lookAndFeel);
    const stored = storedPreferences?.experience;
    return {
      navigationMode: stored?.navigationMode ?? defaults.navigationMode ?? DEFAULT_EXPERIENCE.navigationMode,
      transitionStyle: stored?.transitionStyle ?? defaults.transitionStyle ?? DEFAULT_EXPERIENCE.transitionStyle,
      animationLevel: stored?.animationLevel ?? defaults.animationLevel ?? DEFAULT_EXPERIENCE.animationLevel,
    };
  }, [lookAndFeel, storedPreferences]);

  const accessibility = useMemo<PersonaAccessibilityConfig>(() => {
    const recommended = lookAndFeel.recommendedAccessibility;
    return {
      reducedMotion: storedPreferences?.reducedMotion ?? recommended.reducedMotion,
      highContrast: storedPreferences?.highContrast ?? recommended.highContrast,
      largeText: storedPreferences?.largeText ?? recommended.largeText,
      dyslexiaFont: storedPreferences?.dyslexiaFont ?? recommended.dyslexiaFont,
      audioSupport: storedPreferences?.audioSupport ?? recommended.audioSupport,
    };
  }, [lookAndFeel, storedPreferences]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const palette = themedLookAndFeel.palette;
    root.style.setProperty('--persona-primary', palette.primary);
    root.style.setProperty('--persona-secondary', palette.secondary);
    root.style.setProperty('--persona-accent', palette.accent);
    root.style.setProperty('--persona-background', palette.background);
    root.style.setProperty('--persona-surface', palette.surface);
    root.style.setProperty('--persona-muted', palette.muted);
    root.style.setProperty('--persona-text', palette.text);
    root.style.setProperty('--persona-hero-gradient', palette.heroGradient);
  }, [themedLookAndFeel]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-persona-nav', experience.navigationMode);
    root.setAttribute('data-persona-transition', experience.transitionStyle);
    root.setAttribute('data-persona-animation', experience.animationLevel);
    root.setAttribute('data-persona-age', ageGroup);
    root.setAttribute('data-persona-theme', resolvedThemeKey);
  }, [ageGroup, experience, resolvedThemeKey]);

  const persona = useMemo<PersonaRuntimeConfig>(() => {
    return {
      ...personaBase,
      lookAndFeel: themedLookAndFeel,
      experience,
      accessibility,
      themeKey: resolvedThemeKey,
    };
  }, [accessibility, experience, personaBase, resolvedThemeKey, themedLookAndFeel]);

  return { ageGroup, neurotype, persona, experience, accessibility, themeKey: resolvedThemeKey };
};
