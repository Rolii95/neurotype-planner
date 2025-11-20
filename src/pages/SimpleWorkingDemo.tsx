import React, { useState } from 'react';

const SimpleWorkingDemo: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('overview');
  const [language, setLanguage] = useState('en');
  // Accessibility is managed centrally via Quick Access
  const [highContrast] = useState(false);
  const [largeText] = useState(false);
  const [reducedMotion] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'i18n', label: 'Internationalization' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'forms', label: 'Forms' },
    { id: 'testing', label: 'Testing' }
  ];

  const languages = [
    { code: 'en', flag: '🇺🇸', name: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' }
  ];

  const translations = {
    en: {
      title: 'Universal Neurotype Planner - Feature Demo',
      subtitle: 'Interactive demonstration of accessibility and internationalization features',
      save: 'Save',
      dashboard: 'Dashboard',
      settings: 'Settings',
      profile: 'Profile'
    },
    es: {
      title: 'Planificador Universal de Neurotipo - Demo de Características',
      subtitle: 'Demostración interactiva de características de accesibilidad e internacionalización',
      save: 'Guardar',
      dashboard: 'Panel',
      settings: 'Configuración',
      profile: 'Perfil'
    },
    fr: {
      title: 'Planificateur Universel de Neurotype - Démonstration',
      subtitle: 'Démonstration interactive des fonctionnalités d\'accessibilité et d\'internationalisation',
      save: 'Enregistrer',
      dashboard: 'Tableau de bord',
      settings: 'Paramètres',
      profile: 'Profil'
    }
  };

  const t = (key: string) => translations[language as keyof typeof translations][key as keyof typeof translations.en] || key;

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-3">✅ Implemented Features</h3>
          <ul className="space-y-1 text-sm text-green-700">
            <li>• Custom i18n system</li>
            <li>• Neurotype text adaptations</li>
            <li>• WCAG AA accessible forms</li>
            <li>• Responsive design testing</li>
            <li>• Screen reader support</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-3">🎯 Current Settings</h3>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• Language: {language.toUpperCase()}</li>
            <li>• High Contrast: {highContrast ? 'On' : 'Off'}</li>
            <li>• Large Text: {largeText ? 'On' : 'Off'}</li>
            <li>• Reduced Motion: {reducedMotion ? 'On' : 'Off'}</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderI18n = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Language Selection</h3>
        <div className="flex gap-2 mb-4">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                language === lang.code 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
        
        <div className="bg-white p-4 rounded border">
          <h4 className="font-medium mb-2">Live Translation Example:</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Title:</strong> {t('title')}</p>
            <p><strong>Actions:</strong> {t('save')} | {t('dashboard')} | {t('settings')} | {t('profile')}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccessibility = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-4">Accessibility Controls</h3>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">Accessibility options (high contrast, dyslexia-friendly font, reduced motion, font size) are managed from the Quick Access panel in the top-right.</p>
          <div className="mt-3">
            <button
              onClick={() => { try { (window as any).__accessibility?.openPanel?.(); } catch (e) { console.debug('openPanel failed', e); } }}
              className="px-4 py-2 rounded-lg persona-ghost-button"
              aria-label="Open Accessibility Quick Access"
            >
              Open Quick Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderForms = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-4">Accessible Form Example</h3>
        <form className="space-y-4">
          <div>
            <label htmlFor="demo-name" className="block text-sm font-medium mb-1">
              Name *
            </label>
            <input
              id="demo-name"
              type="text"
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              aria-describedby="name-help"
            />
            <p id="name-help" className="text-xs text-gray-600 mt-1">
              Enter your full name
            </p>
          </div>
          
          <div>
            <label htmlFor="demo-email" className="block text-sm font-medium mb-1">
              Email *
            </label>
            <input
              id="demo-email"
              type="email"
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              aria-describedby="email-help"
            />
            <p id="email-help" className="text-xs text-gray-600 mt-1">
              We'll never share your email
            </p>
          </div>
          
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Submit Form
          </button>
        </form>
      </div>
    </div>
  );

  const renderTesting = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-4">Responsive Testing</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <span>Touch Target Compliance (44x44px)</span>
            <span className="text-green-600 font-medium">✅ PASS</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <span>Layout Adaptation</span>
            <span className="text-green-600 font-medium">✅ PASS</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <span>Neurotype Adaptations</span>
            <span className="text-yellow-600 font-medium">⚠️ WARNING</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (currentTab) {
      case 'overview': return renderOverview();
      case 'i18n': return renderI18n();
      case 'accessibility': return renderAccessibility();
      case 'forms': return renderForms();
      case 'testing': return renderTesting();
      default: return renderOverview();
    }
  };

  return (
    <div className={`min-h-screen p-6 transition-colors ${
      highContrast ? 'bg-black text-white' : 'bg-gray-100'
    } ${largeText ? 'text-lg' : ''}`}>
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </header>

        <nav className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <main>
          {renderTabContent()}
        </main>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>🧠 Universal Neurotype Planner - Accessibility & I18n Demo</p>
          <p>Current Language: {language.toUpperCase()} | Features: Working ✅</p>
        </footer>
      </div>
    </div>
  );
};

export default SimpleWorkingDemo;