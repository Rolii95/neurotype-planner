import { useState } from 'react';
import { DataExportImport } from '../components/DataExportImport';
import { NotificationSettingsPanel } from '../components/Notifications/NotificationSettingsPanel';

const MoonIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const SunIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const GlobalIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

type Theme = 'light' | 'dark' | 'auto';
type Language = 'en' | 'es' | 'fr';
type SettingsTab = 'general' | 'notifications' | 'data';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [theme, setTheme] = useState<Theme>('auto');
  const [language, setLanguage] = useState<Language>('en');
  const [accessibility, setAccessibility] = useState({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
  });
  const settingsTabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'general', label: 'General', icon: '[G]' },
    { id: 'notifications', label: 'Notifications', icon: '[N]' },
    { id: 'data', label: 'Data & Backup', icon: '[D]' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your experience and manage your preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <div className="flex gap-2">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="space-y-6">
        {/* Appearance */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              {theme === 'dark' ? (
                <MoonIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <SunIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Appearance
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize how the app looks
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'auto'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === t
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">
                        {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '🔄'}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {t}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Language & Region */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <GlobalIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Language & Region
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set your language preferences
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Display Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </section>

        {/* Accessibility (centralized via Quick Access) */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Accessibility
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Centralized accessibility controls are available from the <strong>Accessibility</strong> Quick Access panel in the top bar.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Manage accessibility settings</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Open the Quick Access panel to change high contrast, dyslexia font, reduced motion, and font size.</div>
              </div>
              <button
                onClick={() => { try { (window as any).__accessibility?.openPanel?.(); } catch (e) { console.debug('openPanel failed', e); } }}
                className="px-3 py-2 rounded-lg persona-ghost-button"
              >
                Open Quick Access
              </button>
            </div>
          </div>
        </section>

        {/* Neurotype Preferences */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
              <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Neurotype Preferences
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize based on your neurotype
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Neurotype
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>ADHD</option>
                <option>Autism</option>
                <option>Dyslexia</option>
                <option>Multiple</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Reminder Style
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Visual only</option>
                <option>Audio only</option>
                <option>Visual + Audio</option>
                <option>Gentle vibration</option>
              </select>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-2 border-red-200 dark:border-red-900">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Danger Zone
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Irreversible actions
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full px-4 py-3 text-left bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              <div className="font-medium">Clear all data</div>
              <div className="text-sm opacity-80">Remove all tasks, routines, and history</div>
            </button>
            <button className="w-full px-4 py-3 text-left bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              <div className="font-medium">Delete account</div>
              <div className="text-sm opacity-80">Permanently delete your account and all data</div>
            </button>
          </div>
        </section>
          </div>
        )}

        {activeTab === 'notifications' && <NotificationSettingsPanel />}

        {/* Data & Backup Tab */}
        {activeTab === 'data' && (
          <DataExportImport />
        )}

      </div>
    </div>
  );
}


