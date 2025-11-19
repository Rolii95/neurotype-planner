import React, { useEffect, useMemo, useState } from 'react';
import {
  SparklesIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import type { AgeGroup, Neurotype, ExperiencePreferences } from '../types/onboarding';
import { PERSONA_THEME_OPTIONS, EXPERIENCE_CONTROL_OPTIONS, getPersonaLookAndFeel, buildExperienceFromLookAndFeel } from '../config/personaThemes';
import { PERSONA_UPDATED_EVENT } from '../hooks/useUserPersona';
import { useTheme } from '../contexts/ThemeContext';

const DEFAULT_LOOK_AND_FEEL = getPersonaLookAndFeel('adult', 'Other');
const DEFAULT_EXPERIENCE_SETTINGS = buildExperienceFromLookAndFeel(DEFAULT_LOOK_AND_FEEL);

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedNeurotype, setSelectedNeurotype] = useState<Neurotype | null>(null);
  const [multipleNeurotypes, setMultipleNeurotypes] = useState<string[]>([]);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('calming-blue');
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    dyslexiaFont: false,
    audioSupport: false
  });
  const [experienceSettings, setExperienceSettings] = useState<ExperiencePreferences>(DEFAULT_EXPERIENCE_SETTINGS);
  const [hasCustomizedExperience, setHasCustomizedExperience] = useState(false);
  const [hasCustomizedAccessibility, setHasCustomizedAccessibility] = useState(false);
  const [hasCustomizedTheme, setHasCustomizedTheme] = useState(false);
  const { setAnimationSpeed, setHighContrast, setFontSize, setDyslexiaFont, setSoundEffects } = useTheme();
  const personaPreview = useMemo(() => {
    const base = getPersonaLookAndFeel(selectedAgeGroup ?? 'adult', selectedNeurotype ?? 'Other');
    const themeOverride = PERSONA_THEME_OPTIONS.find((theme) => theme.value === selectedTheme)?.palette;
    if (!themeOverride) {
      return base;
    }
    return {
      ...base,
      palette: {
        ...base.palette,
        ...themeOverride,
      },
    };
  }, [selectedAgeGroup, selectedNeurotype, selectedTheme]);
  const accessibilityOptions = [
    { key: 'reducedMotion', label: 'Reduced Motion', description: 'Minimize animations' },
    { key: 'highContrast', label: 'High Contrast', description: 'Increase color contrast' },
    { key: 'largeText', label: 'Large Text', description: 'Increase font size' },
    { key: 'dyslexiaFont', label: 'Dyslexia Font', description: 'Use OpenDyslexic font' },
    { key: 'audioSupport', label: 'Audio Support', description: 'Enable audio cues' },
  ] as const;

  useEffect(() => {
    if (!personaPreview) return;

    if (!hasCustomizedTheme) {
      setSelectedTheme(personaPreview.themeKey);
    }

    if (!hasCustomizedExperience) {
      setExperienceSettings(buildExperienceFromLookAndFeel(personaPreview));
    }

    if (!hasCustomizedAccessibility) {
      setPreferences((prev) => ({
        ...prev,
        reducedMotion: personaPreview.recommendedAccessibility.reducedMotion,
        highContrast: personaPreview.recommendedAccessibility.highContrast,
        largeText: personaPreview.recommendedAccessibility.largeText,
        dyslexiaFont: personaPreview.recommendedAccessibility.dyslexiaFont,
        audioSupport: personaPreview.recommendedAccessibility.audioSupport,
      }));
    }
  }, [personaPreview, hasCustomizedAccessibility, hasCustomizedExperience, hasCustomizedTheme]);

  const applyExperienceSetting = (patch: Partial<ExperiencePreferences>) => {
    setExperienceSettings((prev) => ({
      ...prev,
      ...patch,
    }));
    setHasCustomizedExperience(true);
  };

  const updatePreference = (key: keyof typeof preferences, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasCustomizedAccessibility(true);
  };

  const neurotypes = [
    {
      value: 'ADHD' as Neurotype,
      label: 'ADHD',
      description: 'Time management, focus support, and transition help',
      icon: '⚡',
      color: 'bg-yellow-100 border-yellow-300 hover:border-yellow-500'
    },
    {
      value: 'Autism' as Neurotype,
      label: 'Autism',
      description: 'Structured routines, sensory support, and predictability',
      icon: '🧩',
      color: 'bg-blue-100 border-blue-300 hover:border-blue-500'
    },
    {
      value: 'Dyslexia' as Neurotype,
      label: 'Dyslexia',
      description: 'Visual organization, dyslexia-friendly fonts, and audio support',
      icon: '📖',
      color: 'bg-purple-100 border-purple-300 hover:border-purple-500'
    },
    {
      value: 'Multiple' as Neurotype,
      label: 'Multiple',
      description: 'Combined support for multiple neurotypes',
      icon: '🌈',
      color: 'bg-pink-100 border-pink-300 hover:border-pink-500'
    },
    {
      value: 'Other' as Neurotype,
      label: 'Other / Not Sure',
      description: 'General executive function support',
      icon: '💡',
      color: 'bg-gray-100 border-gray-300 hover:border-gray-500'
    }
  ];

  const ageGroups = [
    { value: 'child' as AgeGroup, label: 'Child (6-12)', icon: '🎈' },
    { value: 'teen' as AgeGroup, label: 'Teen (13-17)', icon: '🎮' },
    { value: 'adult' as AgeGroup, label: 'Adult (18+)', icon: '💼' },
    { value: 'senior' as AgeGroup, label: 'Senior (65+)', icon: '🌟' }
  ];

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Save preferences and complete onboarding
      const userPreferences = {
        neurotype: selectedNeurotype,
        multipleNeurotypes: selectedNeurotype === 'Multiple' ? multipleNeurotypes : undefined,
        ageGroup: selectedAgeGroup,
        theme: selectedTheme,
        ...preferences,
        experience: experienceSettings
      };
      localStorage.setItem('neurotype-planner-onboarding', JSON.stringify(userPreferences));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(PERSONA_UPDATED_EVENT));
      }

       // Apply preferences to theme context immediately
      const animationPreset = experienceSettings.animationLevel;
      if (preferences.reducedMotion || animationPreset === 'calm') {
        setAnimationSpeed('reduced');
      } else if (animationPreset === 'dynamic') {
        setAnimationSpeed('fast');
      } else {
        setAnimationSpeed('normal');
      }
      setHighContrast(preferences.highContrast || selectedTheme === 'high-contrast');
      setFontSize(preferences.largeText ? 'large' : 'medium');
      setDyslexiaFont(preferences.dyslexiaFont);
      setSoundEffects(preferences.audioSupport);

      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true; // Welcome step
      case 2:
        // If "Multiple" is selected, need at least 2 specific neurotypes checked
        if (selectedNeurotype === 'Multiple') {
          return multipleNeurotypes.length >= 2;
        }
        return selectedNeurotype !== null;
      case 3:
        return selectedAgeGroup !== null;
      case 4:
        return true; // Preferences are optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6 animate-fadeIn">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                <SparklesIcon className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">
                Welcome to Universal Neurotype Planner
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Let's personalize your experience to match your unique needs. This will only take a minute!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-left">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-2">🎯</div>
                  <h3 className="font-semibold text-gray-900">Personalized</h3>
                  <p className="text-sm text-gray-600">Adapted to your neurotype</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl mb-2">♿</div>
                  <h3 className="font-semibold text-gray-900">Accessible</h3>
                  <p className="text-sm text-gray-600">Built with inclusivity in mind</p>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg">
                  <div className="text-2xl mb-2">🔒</div>
                  <h3 className="font-semibold text-gray-900">Private</h3>
                  <p className="text-sm text-gray-600">Your data stays yours</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Neurotype Selection */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <UserCircleIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Tell us about yourself
                </h2>
                <p className="text-gray-600">
                  This helps us customize the interface and features for your needs
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {neurotypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setSelectedNeurotype(type.value);
                      // Reset multiple selections when switching away from "Multiple"
                      if (type.value !== 'Multiple') {
                        setMultipleNeurotypes([]);
                      }
                    }}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      selectedNeurotype === type.value
                        ? 'border-blue-600 bg-blue-50 scale-105 shadow-lg'
                        : type.color
                    }`}
                  >
                    <div className="text-4xl mb-3">{type.icon}</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {type.label}
                    </h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </button>
                ))}
              </div>

              {/* Multiple Neurotypes Selection */}
              {selectedNeurotype === 'Multiple' && (
                <div className="mt-8 p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border-2 border-pink-300 animate-fadeIn">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Select your specific challenges (choose at least 2):
                  </h3>
                  <div className="space-y-3">
                    {neurotypes
                      .filter((type) => type.value !== 'Multiple' && type.value !== 'Other')
                      .map((type) => {
                        const isSelected = multipleNeurotypes.includes(type.value);
                        return (
                          <label
                            key={type.value}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="text-3xl">{type.icon}</div>
                              <div>
                                <div className="font-semibold text-gray-900">{type.label}</div>
                                <div className="text-sm text-gray-600">{type.description}</div>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMultipleNeurotypes([...multipleNeurotypes, type.value]);
                                } else {
                                  setMultipleNeurotypes(
                                    multipleNeurotypes.filter((nt) => nt !== type.value)
                                  );
                                }
                              }}
                              className="w-6 h-6 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </label>
                        );
                      })}
                  </div>
                  <p className="mt-4 text-sm text-gray-600 text-center">
                    {multipleNeurotypes.length === 0 && '👆 Please select at least 2 challenges'}
                    {multipleNeurotypes.length === 1 && '👆 Please select at least 1 more challenge'}
                    {multipleNeurotypes.length >= 2 && `✅ ${multipleNeurotypes.length} challenges selected`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Age Group */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  What's your age group?
                </h2>
                <p className="text-gray-600">
                  This helps us adjust language and complexity
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ageGroups.map((age) => (
                  <button
                    key={age.value}
                    onClick={() => setSelectedAgeGroup(age.value)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      selectedAgeGroup === age.value
                        ? 'border-blue-600 bg-blue-50 scale-110 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="text-4xl mb-2">{age.icon}</div>
                    <div className="text-sm font-medium text-gray-900">{age.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-8">
                <Cog6ToothIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Customize your experience
                </h2>
                <p className="text-gray-600">
                  Choose your preferences (you can change these anytime)
                </p>
              </div>

              {personaPreview && (
                <div className="rounded-3xl border border-slate-200 overflow-hidden shadow-inner">
                  <div
                    className="p-6 text-white"
                    style={{ backgroundImage: personaPreview.palette.heroGradient }}
                  >
                    <p className="text-xs uppercase tracking-wide text-white/80">Persona preset</p>
                    <h3 className="text-2xl font-semibold mt-2">{personaPreview.name}</h3>
                    <p className="mt-2 text-sm text-white/90 max-w-2xl">{personaPreview.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {personaPreview.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 text-xs bg-white/15 border border-white/30 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Theme Selection */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-900">
                  Color theme
                </label>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {PERSONA_THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => {
                        setSelectedTheme(theme.value);
                        setHasCustomizedTheme(true);
                      }}
                      className={`p-4 rounded-xl border-2 bg-white text-left transition-all ${
                        selectedTheme === theme.value
                          ? 'border-blue-600 shadow-lg scale-105'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {theme.swatch.map((color) => (
                          <span
                            key={`${theme.value}-${color}`}
                            className="h-6 w-6 rounded-full border border-white/40"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className={`mt-3 text-sm font-semibold ${theme.textClass}`}>{theme.label}</div>
                      <p className="text-xs text-slate-500 mt-1">{theme.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience tuning */}
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-3">Experience tuning</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Navigation</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {EXPERIENCE_CONTROL_OPTIONS.navigationModes.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => applyExperienceSetting({ navigationMode: option.value })}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              experienceSettings.navigationMode === option.value
                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                : 'border-slate-200 hover:border-blue-300 bg-white'
                            }`}
                          >
                            <div className="font-semibold text-slate-900">{option.title}</div>
                            <p className="text-sm text-slate-600 mt-1">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Transitions</p>
                      <div className="grid gap-3 md:grid-cols-3">
                        {EXPERIENCE_CONTROL_OPTIONS.transitionStyles.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => applyExperienceSetting({ transitionStyle: option.value })}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              experienceSettings.transitionStyle === option.value
                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                : 'border-slate-200 hover:border-blue-300 bg-white'
                            }`}
                          >
                            <div className="font-semibold text-slate-900">{option.title}</div>
                            <p className="text-sm text-slate-600 mt-1">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Animation personality</p>
                      <div className="grid gap-3 md:grid-cols-3">
                        {EXPERIENCE_CONTROL_OPTIONS.animationLevels.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => applyExperienceSetting({ animationLevel: option.value })}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              experienceSettings.animationLevel === option.value
                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                : 'border-slate-200 hover:border-blue-300 bg-white'
                            }`}
                          >
                            <div className="font-semibold text-slate-900">{option.title}</div>
                            <p className="text-sm text-slate-600 mt-1">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accessibility Options */}
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-gray-900">
                    Accessibility options
                  </label>
                  {accessibilityOptions.map((option) => (
                    <label
                      key={option.key}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences[option.key]}
                        onChange={(e) => updatePreference(option.key, e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                step === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Back</span>
            </button>

            <div className="text-sm text-gray-500">
              Step {step} of 4
            </div>

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                canProceed()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>{step === 4 ? 'Get Started' : 'Next'}</span>
              {step === 4 ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <ArrowRightIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
