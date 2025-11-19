import {
  AgeGroup,
  Neurotype,
  AnimationLevel,
  NavigationMode,
  TransitionStyle,
  ExperiencePreferences,
} from '../types/onboarding';

export interface PersonaPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  muted: string;
  text: string;
  heroGradient: string;
}

export interface PersonaThemeOption {
  value: string;
  label: string;
  description: string;
  swatch: string[];
  textClass: string;
  palette: PersonaPalette;
}

export interface PersonaLookAndFeel {
  id: string;
  name: string;
  description: string;
  tags: string[];
  themeKey: string;
  palette: PersonaPalette;
  animation: {
    motion: AnimationLevel;
    transition: TransitionStyle;
    microInteraction: 'glow' | 'pulse' | 'bounce';
  };
  navigation: {
    mode: NavigationMode;
    density: 'roomy' | 'balanced' | 'compact';
    emphasis: 'icon' | 'text';
  };
  transitions: {
    panel: TransitionStyle;
    highlight: 'glow' | 'underline' | 'pulse';
  };
  recommendedAccessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
    dyslexiaFont: boolean;
    audioSupport: boolean;
  };
}

type PersonaVariant = Partial<Omit<PersonaLookAndFeel, 'palette' | 'animation' | 'navigation' | 'transitions' | 'recommendedAccessibility'>> & {
  palette?: Partial<PersonaLookAndFeel['palette']>;
  animation?: Partial<PersonaLookAndFeel['animation']>;
  navigation?: Partial<PersonaLookAndFeel['navigation']>;
  transitions?: Partial<PersonaLookAndFeel['transitions']>;
  recommendedAccessibility?: Partial<PersonaLookAndFeel['recommendedAccessibility']>;
};

const THEME_PRESETS: Record<string, Omit<PersonaThemeOption, 'value'>> = {
  'calming-blue': {
    label: 'Calming Orbit',
    description: 'Soft blues with gentle gradients for executive calm.',
    swatch: ['#e0f2fe', '#38bdf8', '#312e81'],
    textClass: 'text-sky-900',
    palette: {
      primary: '#2563eb',
      secondary: '#38bdf8',
      accent: '#f472b6',
      background: '#eef2ff',
      surface: '#ffffff',
      muted: '#c7d2fe',
      text: '#0f172a',
      heroGradient: 'linear-gradient(120deg, #312e81 0%, #2563eb 50%, #38bdf8 100%)',
    },
  },
  'focus-green': {
    label: 'Focus Grove',
    description: 'Grounded greens that keep energy steady and centered.',
    swatch: ['#ecfccb', '#86efac', '#14532d'],
    textClass: 'text-emerald-900',
    palette: {
      primary: '#16a34a',
      secondary: '#0d9488',
      accent: '#facc15',
      background: '#f0fdf4',
      surface: '#ffffff',
      muted: '#bbf7d0',
      text: '#052e16',
      heroGradient: 'linear-gradient(120deg, #047857 0%, #16a34a 55%, #84cc16 100%)',
    },
  },
  'warm-earth': {
    label: 'Warm Ember',
    description: 'Sunset oranges and ambers for playful, cozy interactions.',
    swatch: ['#ffedd5', '#fb923c', '#9a3412'],
    textClass: 'text-amber-900',
    palette: {
      primary: '#ea580c',
      secondary: '#facc15',
      accent: '#f97316',
      background: '#fff7ed',
      surface: '#ffffff',
      muted: '#fed7aa',
      text: '#431407',
      heroGradient: 'linear-gradient(120deg, #f97316 0%, #fb923c 55%, #facc15 100%)',
    },
  },
  'high-contrast': {
    label: 'High Contrast',
    description: 'Maximum clarity for low-vision and focus needs.',
    swatch: ['#0f172a', '#f8fafc', '#38bdf8'],
    textClass: 'text-gray-900',
    palette: {
      primary: '#0f172a',
      secondary: '#1d4ed8',
      accent: '#38bdf8',
      background: '#f8fafc',
      surface: '#ffffff',
      muted: '#cbd5f5',
      text: '#0f172a',
      heroGradient: 'linear-gradient(120deg, #0f172a 0%, #1d4ed8 60%, #38bdf8 100%)',
    },
  },
};

export const PERSONA_THEME_OPTIONS: PersonaThemeOption[] = Object.entries(THEME_PRESETS).map(([value, option]) => ({
  value,
  ...option,
}));

export const PERSONA_THEME_MAP: Record<string, PersonaPalette> = PERSONA_THEME_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.palette;
    return acc;
  },
  {} as Record<string, PersonaPalette>
);

const AGE_LOOK_AND_FEEL: Record<AgeGroup, PersonaLookAndFeel> = {
  child: {
    id: 'child-playful',
    name: 'Playful Orbit',
    description: 'Rounded cards, sticker-like nav, and tactile cues for younger planners.',
    tags: ['Sensory safe', 'Visual cues'],
    themeKey: 'warm-earth',
    palette: {
      primary: '#f97316',
      secondary: '#facc15',
      accent: '#ec4899',
      background: '#fff7ed',
      surface: '#ffffff',
      muted: '#fed7aa',
      text: '#1f2937',
      heroGradient: 'linear-gradient(120deg, #f97316 0%, #f472b6 45%, #a855f7 100%)',
    },
    animation: {
      motion: 'dynamic',
      transition: 'slide',
      microInteraction: 'bounce',
    },
    navigation: {
      mode: 'card-grid',
      density: 'roomy',
      emphasis: 'icon',
    },
    transitions: {
      panel: 'slide',
      highlight: 'glow',
    },
    recommendedAccessibility: {
      reducedMotion: false,
      highContrast: false,
      largeText: true,
      dyslexiaFont: false,
      audioSupport: true,
    },
  },
  teen: {
    id: 'teen-hybrid',
    name: 'Momentum',
    description: 'Colorful streaks, pulse cues, and tabbed navigation for multi-context schedules.',
    tags: ['Momentum', 'Hybrid schedule'],
    themeKey: 'calming-blue',
    palette: {
      primary: '#7c3aed',
      secondary: '#22d3ee',
      accent: '#f472b6',
      background: '#f5f3ff',
      surface: '#ffffff',
      muted: '#ddd6fe',
      text: '#111827',
      heroGradient: 'linear-gradient(120deg, #7c3aed 0%, #22d3ee 50%, #0ea5e9 100%)',
    },
    animation: {
      motion: 'dynamic',
      transition: 'slide',
      microInteraction: 'pulse',
    },
    navigation: {
      mode: 'tabbed',
      density: 'compact',
      emphasis: 'text',
    },
    transitions: {
      panel: 'slide',
      highlight: 'underline',
    },
    recommendedAccessibility: {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      dyslexiaFont: false,
      audioSupport: false,
    },
  },
  adult: {
    id: 'adult-flow',
    name: 'Executive Calm',
    description: 'Balanced gradients with pill navigation and adaptive focus rails.',
    tags: ['Focus', 'Adaptive'],
    themeKey: 'calming-blue',
    palette: {
      primary: '#4f46e5',
      secondary: '#0ea5e9',
      accent: '#f472b6',
      background: '#f8fafc',
      surface: '#ffffff',
      muted: '#e2e8f0',
      text: '#0f172a',
      heroGradient: 'linear-gradient(120deg, #312e81 0%, #4f46e5 45%, #0ea5e9 100%)',
    },
    animation: {
      motion: 'balanced',
      transition: 'slide',
      microInteraction: 'glow',
    },
    navigation: {
      mode: 'guided-sidebar',
      density: 'balanced',
      emphasis: 'icon',
    },
    transitions: {
      panel: 'slide',
      highlight: 'underline',
    },
    recommendedAccessibility: {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      dyslexiaFont: false,
      audioSupport: false,
    },
  },
  senior: {
    id: 'senior-care',
    name: 'Calm Care',
    description: 'High legibility surfaces, slower motion, and linear navigation for clarity.',
    tags: ['High legibility', 'Gentle pacing'],
    themeKey: 'focus-green',
    palette: {
      primary: '#0ea5e9',
      secondary: '#14b8a6',
      accent: '#fbbf24',
      background: '#f5f5f4',
      surface: '#ffffff',
      muted: '#d9f99d',
      text: '#0f172a',
      heroGradient: 'linear-gradient(120deg, #0ea5e9 0%, #14b8a6 55%, #84cc16 100%)',
    },
    animation: {
      motion: 'calm',
      transition: 'fade',
      microInteraction: 'glow',
    },
    navigation: {
      mode: 'focus-strip',
      density: 'roomy',
      emphasis: 'text',
    },
    transitions: {
      panel: 'fade',
      highlight: 'glow',
    },
    recommendedAccessibility: {
      reducedMotion: true,
      highContrast: false,
      largeText: true,
      dyslexiaFont: false,
      audioSupport: true,
    },
  },
};

const NEUROTYPE_VARIANTS: Record<Neurotype, PersonaVariant> = {
  ADHD: {
    palette: {
      accent: '#f97316',
      heroGradient: 'linear-gradient(120deg, #4f46e5 0%, #f97316 70%, #f472b6 100%)',
    },
    animation: {
      motion: 'dynamic',
      transition: 'slide',
      microInteraction: 'pulse',
    },
    navigation: {
      mode: 'guided-sidebar',
      density: 'balanced',
      emphasis: 'icon',
    },
    recommendedAccessibility: {
      audioSupport: true,
    },
  },
  Autism: {
    palette: {
      background: '#eef2ff',
      surface: '#ffffff',
      heroGradient: 'linear-gradient(120deg, #312e81 0%, #0ea5e9 70%, #22d3ee 100%)',
    },
    animation: {
      motion: 'calm',
      transition: 'fade',
      microInteraction: 'glow',
    },
    navigation: {
      mode: 'focus-strip',
      density: 'roomy',
      emphasis: 'text',
    },
    recommendedAccessibility: {
      reducedMotion: true,
      highContrast: true,
    },
  },
  Dyslexia: {
    palette: {
      text: '#0b1120',
    },
    navigation: {
      mode: 'guided-sidebar',
      density: 'roomy',
      emphasis: 'text',
    },
    recommendedAccessibility: {
      largeText: true,
      dyslexiaFont: true,
    },
  },
  Multiple: {
    animation: {
      motion: 'balanced',
      transition: 'fade',
    },
    navigation: {
      mode: 'guided-sidebar',
      density: 'balanced',
      emphasis: 'text',
    },
    recommendedAccessibility: {
      reducedMotion: true,
      highContrast: true,
      largeText: true,
      dyslexiaFont: true,
      audioSupport: true,
    },
  },
  Other: {},
};

const mergeLookAndFeel = (base: PersonaLookAndFeel, override?: PersonaVariant): PersonaLookAndFeel => {
  if (!override) {
    return base;
  }

  return {
    id: override.id ?? base.id,
    name: override.name ?? base.name,
    description: override.description ?? base.description,
    tags: override.tags ?? base.tags,
    themeKey: override.themeKey ?? base.themeKey,
    palette: {
      ...base.palette,
      ...override.palette,
    },
    animation: {
      ...base.animation,
      ...override.animation,
    },
    navigation: {
      ...base.navigation,
      ...override.navigation,
    },
    transitions: {
      ...base.transitions,
      ...override.transitions,
    },
    recommendedAccessibility: {
      ...base.recommendedAccessibility,
      ...override.recommendedAccessibility,
    },
  };
};

export const getPersonaLookAndFeel = (
  ageGroup: AgeGroup = 'adult',
  neurotype: Neurotype = 'Other'
): PersonaLookAndFeel => {
  const base = AGE_LOOK_AND_FEEL[ageGroup] ?? AGE_LOOK_AND_FEEL.adult;
  const variant = NEUROTYPE_VARIANTS[neurotype] ?? NEUROTYPE_VARIANTS.Other;
  return mergeLookAndFeel(base, variant);
};

export const EXPERIENCE_CONTROL_OPTIONS = {
  navigationModes: [
    {
      value: 'guided-sidebar' as NavigationMode,
      title: 'Guided sidebar',
      description: 'Step-by-step navigation with progress cues.',
    },
    {
      value: 'card-grid' as NavigationMode,
      title: 'Card grid',
      description: 'Playful card launcher with large touch targets.',
    },
    {
      value: 'tabbed' as NavigationMode,
      title: 'Tabbed strip',
      description: 'Top tabs for fast context switching.',
    },
    {
      value: 'focus-strip' as NavigationMode,
      title: 'Focus strip',
      description: 'Linear ribbon for calm, sequential navigation.',
    },
  ],
  transitionStyles: [
    {
      value: 'slide' as TransitionStyle,
      title: 'Slide',
      description: 'Panel slides that reinforce spatial memory.',
    },
    {
      value: 'fade' as TransitionStyle,
      title: 'Fade',
      description: 'Gentle fades for sensitive nervous systems.',
    },
    {
      value: 'scale' as TransitionStyle,
      title: 'Scale',
      description: 'Zoom-and-settle transitions for dramatic focus.',
    },
  ],
  animationLevels: [
    {
      value: 'dynamic' as AnimationLevel,
      title: 'Lively',
      description: 'Expressive motion and strong cues.',
    },
    {
      value: 'balanced' as AnimationLevel,
      title: 'Balanced',
      description: 'Default pacing with subtle highlights.',
    },
    {
      value: 'calm' as AnimationLevel,
      title: 'Calm',
      description: 'Minimal motion and softened transitions.',
    },
  ],
};

export const buildExperienceFromLookAndFeel = (look: PersonaLookAndFeel): ExperiencePreferences => ({
  navigationMode: look.navigation.mode,
  transitionStyle: look.transitions.panel,
  animationLevel: look.animation.motion,
});
