export type AgeGroup = 'child' | 'teen' | 'adult' | 'senior';

export type Neurotype = 'ADHD' | 'Autism' | 'Dyslexia' | 'Multiple' | 'Other';

export type NavigationMode = 'guided-sidebar' | 'card-grid' | 'tabbed' | 'focus-strip';
export type TransitionStyle = 'slide' | 'fade' | 'scale';
export type AnimationLevel = 'dynamic' | 'balanced' | 'calm';

export interface ExperiencePreferences {
  navigationMode: NavigationMode;
  transitionStyle: TransitionStyle;
  animationLevel: AnimationLevel;
}

export interface OnboardingPreferences {
  neurotype?: Neurotype | null;
  multipleNeurotypes?: string[];
  ageGroup?: AgeGroup | null;
  theme?: string;
  reducedMotion?: boolean;
  highContrast?: boolean;
  largeText?: boolean;
  dyslexiaFont?: boolean;
  audioSupport?: boolean;
  experience?: ExperiencePreferences;
}
