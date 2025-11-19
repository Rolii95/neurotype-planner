// i18n configuration for Universal Neurotype Planner
// This is a simplified version that can work without external dependencies initially

import React, { useState, useEffect, createContext, useContext, useCallback, useMemo, ReactNode } from 'react';

// Import translation files directly
import enCommon from './locales/en/common.json';
import enRoutines from './locales/en/routines.json';
import enAccessibility from './locales/en/accessibility.json';
import enFlexZones from './locales/en/flexZones.json';

import esCommon from './locales/es/common.json';
import esRoutines from './locales/es/routines.json';
import esAccessibility from './locales/es/accessibility.json';
import esFlexZones from './locales/es/flexZones.json';

import frCommon from './locales/fr/common.json';
import frRoutines from './locales/fr/routines.json';
import frAccessibility from './locales/fr/accessibility.json';
import frFlexZones from './locales/fr/flexZones.json';

const resources = {
  en: {
    common: enCommon,
    routines: enRoutines,
    accessibility: enAccessibility,
    flexZones: enFlexZones
  },
  es: {
    common: esCommon,
    routines: esRoutines,
    accessibility: esAccessibility,
    flexZones: esFlexZones
  },
  fr: {
    common: frCommon,
    routines: frRoutines,
    accessibility: frAccessibility,
    flexZones: frFlexZones
  }
};

export type SupportedLanguage = keyof typeof resources;
export type Namespace = 'common' | 'routines' | 'accessibility' | 'flexZones';

interface I18nContextType {
  language: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, namespace?: Namespace, options?: { count?: number; [key: string]: any }) => string;
  getNeuroText: (key: string, options?: {
    simplified?: boolean;
    concise?: boolean;
    dyslexiaFriendly?: boolean;
  }) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

// Simple translation function
const getTranslation = (
  language: SupportedLanguage, 
  key: string, 
  namespace: Namespace = 'common',
  options: { count?: number; [key: string]: any } = {}
): string => {
  const keys = key.split('.');
  let value: any = resources[language][namespace];
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      break;
    }
  }
  
  if (typeof value !== 'string') {
    // Fallback to English if not found
    if (language !== 'en') {
      return getTranslation('en', key, namespace, options);
    }
    return key; // Return key if no translation found
  }
  
  // Handle pluralization
  if (options.count !== undefined) {
    const pluralKey = options.count === 1 ? value : `${value}_plural`;
    if (typeof pluralKey === 'string') {
      value = pluralKey;
    }
  }
  
  // Simple interpolation
  return value.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
    return options[key] !== undefined ? String(options[key]) : match;
  });
};

// Detect browser language
const detectLanguage = (): SupportedLanguage => {
  // Check localStorage first
  const stored = localStorage.getItem('neurotype-planner-language');
  if (stored && Object.keys(resources).includes(stored)) {
    return stored as SupportedLanguage;
  }
  
  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (Object.keys(resources).includes(browserLang)) {
    return browserLang as SupportedLanguage;
  }
  
  return 'en'; // Default fallback
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<SupportedLanguage>(() => detectLanguage());
  
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('neurotype-planner-language', language);
  }, [language]);
  
  const changeLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguage(lang);
  }, []);
  
  const t = useCallback((key: string, namespace: Namespace = 'common', options: { count?: number; [key: string]: any } = {}) => {
    return getTranslation(language, key, namespace, options);
  }, [language]);
  
  const getNeuroText = useCallback((key: string, options: {
    simplified?: boolean;
    concise?: boolean;
    dyslexiaFriendly?: boolean;
  } = {}) => {
    const baseText = t(key);
    
    // Apply neurotype-specific modifications
    if (options.simplified) {
      const simplifiedText = t(`${key}_simplified`);
      return simplifiedText !== `${key}_simplified` ? simplifiedText : baseText;
    }
    
    if (options.concise) {
      const conciseText = t(`${key}_concise`);
      return conciseText !== `${key}_concise` ? conciseText : baseText;
    }
    
    if (options.dyslexiaFriendly) {
      const dyslexiaText = t(`${key}_dyslexia`);
      return dyslexiaText !== `${key}_dyslexia` ? dyslexiaText : baseText;
    }
    
    return baseText;
  }, [t]);
  
  const value = useMemo(() => ({ 
    language, 
    changeLanguage, 
    t, 
    getNeuroText 
  }), [language, changeLanguage, t, getNeuroText]);
  
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

// Custom hook for using i18n
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Neurotype-specific translation hook
export const useNeuroI18n = () => {
  const { t, getNeuroText, language, changeLanguage } = useI18n();
  
  const announceToScreenReader = (key: string, namespace?: Namespace, options = {}) => {
    const text = getNeuroText(key, options);
    // This would integrate with the accessibility hook
    return text;
  };
  
  return {
    t,
    getNeuroText,
    announceToScreenReader,
    currentLanguage: language,
    changeLanguage
  };
};

// Language selector component
export const LanguageSelector = ({ className = '' }: { className?: string }) => {
  const { language, changeLanguage, t } = useI18n();
  
  const languages = [
    { code: 'en' as SupportedLanguage, name: 'English', nativeName: 'English' },
    { code: 'es' as SupportedLanguage, name: 'Spanish', nativeName: 'Español' },
    { code: 'fr' as SupportedLanguage, name: 'French', nativeName: 'Français' }
  ];
  
  return (
    <div className={`language-selector ${className}`}>
      <label htmlFor="language-select" className="sr-only">
        {t('app.selectLanguage', 'common')}
      </label>
      <select
        id="language-select"
        value={language}
        onChange={(e) => changeLanguage(e.target.value as SupportedLanguage)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
};

export default {
  I18nProvider,
  useI18n,
  useNeuroI18n,
  LanguageSelector
};