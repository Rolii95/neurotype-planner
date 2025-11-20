import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics, useSoundEffects } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

const Settings: React.FC = () => {
  const {
    theme,
    setTheme,
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
  } = useTheme();

  const haptics = useHaptics();
  const sounds = useSoundEffects();
  const toast = useToast();

  const handleThemeChange = (newTheme: typeof theme) => {
    setTheme(newTheme);
    haptics.light();
    sounds.click();
  };

  const handleToggle = (setter: (value: boolean) => void, currentValue: boolean) => {
    setter(!currentValue);
    haptics.light();
    sounds.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ⚙️ Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your Neurotype Planner experience
          </p>
        </div>

        {/* Theme Settings */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 card-hover">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🎨</span> Appearance
          </h2>

          <div className="space-y-6">
            {/* Theme Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Theme Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['light', 'dark', 'auto'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleThemeChange(mode as typeof theme)}
                    className={`p-4 rounded-lg border-2 transition-all btn-press ${
                      theme === mode
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">
                      {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '🔄'}
                    </div>
                    <div className="text-sm font-medium capitalize">{mode}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast (managed via Quick Access) */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  High Contrast Mode
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Manage accessibility options from the <strong>Accessibility</strong> Quick Access panel in the top bar.
                  <br />
                  <span className="text-xs text-gray-400">Tip: Press <kbd className="px-1.5 py-0.5 rounded border">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded border">Alt</kbd>+<kbd className="px-1.5 py-0.5 rounded border">A</kbd> to open Accessibility from anywhere.</span>
                </p>
              </div>
              <button
                onClick={() => {
                  try { (window as any).__accessibility?.openPanel?.(); } catch (e) { console.debug('openPanel failed', e); }
                  toast?.info('Opened Accessibility Quick Access');
                }}
                className="px-3 py-2 rounded-lg persona-ghost-button"
              >
                Open Quick Access
              </button>
            </div>

            {/* Colorblind Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Colorblind Mode
              </label>
              <select
                value={colorblindMode}
                onChange={(e) => {
                  setColorblindMode(e.target.value as typeof colorblindMode);
                  haptics.light();
                }}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="protanopia">Protanopia (Red-blind)</option>
                <option value="deuteranopia">Deuteranopia (Green-blind)</option>
                <option value="tritanopia">Tritanopia (Blue-blind)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Typography Settings */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 card-hover">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>📝</span> Typography
          </h2>

          <div className="space-y-6">
            {/* Font Size (managed via Quick Access) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Font Size
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Set base font size from the <strong>Accessibility</strong> Quick Access panel in the top bar.
              </p>
              <div className="mt-2">
                <button
                  onClick={() => { try { (window as any).__accessibility?.openPanel?.(); } catch (e) { console.debug('openPanel failed', e); } toast?.info('Opened Accessibility Quick Access'); }}
                  className="px-3 py-2 rounded-lg persona-ghost-button"
                >
                  Open Quick Access
                </button>
              </div>
            </div>

            {/* Dyslexia Font (managed via Quick Access) */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dyslexia-Friendly Font
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enable the dyslexia-friendly font from the <strong>Accessibility</strong> Quick Access panel in the top bar.
                </p>
              </div>
              <button
                onClick={() => { try { (window as any).__accessibility?.openPanel?.(); } catch (e) { console.debug('openPanel failed', e); } toast?.info('Opened Accessibility Quick Access'); }}
                className="px-3 py-2 rounded-lg persona-ghost-button"
              >
                Open Quick Access
              </button>
            </div>

            {/* Reading Mode (managed via Quick Access) */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reading Mode
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Toggle reading mode from the <strong>Accessibility</strong> Quick Access panel in the top bar.
                </p>
              </div>
              <button
                onClick={() => { try { (window as any).__accessibility?.openPanel?.(); } catch (e) { console.debug('openPanel failed', e); } toast?.info('Opened Accessibility Quick Access'); }}
                className="px-3 py-2 rounded-lg persona-ghost-button"
              >
                Open Quick Access
              </button>
            </div>
          </div>
        </section>

        {/* Interaction Settings */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 card-hover">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>✨</span> Interactions
          </h2>

          <div className="space-y-6">
            {/* Animation Speed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Animation Speed
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['none', 'reduced', 'normal', 'fast'].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setAnimationSpeed(speed as typeof animationSpeed);
                      haptics.light();
                    }}
                    className={`p-3 rounded-lg border-2 transition-all btn-press ${
                      animationSpeed === speed
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-xs font-medium capitalize">{speed}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Respects system "Reduce Motion" preference
              </p>
            </div>

            {/* Haptic Feedback */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Haptic Feedback
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Vibration feedback for touch interactions (mobile)
                </p>
              </div>
              <button
                onClick={() => {
                  handleToggle(setHapticFeedback, hapticFeedback);
                  if (!hapticFeedback) haptics.success();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors btn-press ${
                  hapticFeedback ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                role="switch"
                aria-checked={hapticFeedback}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hapticFeedback ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sound Effects */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sound Effects
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Audio feedback for task completion and notifications
                </p>
              </div>
              <button
                onClick={() => {
                  handleToggle(setSoundEffects, soundEffects);
                  if (!soundEffects) sounds.success();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors btn-press ${
                  soundEffects ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                role="switch"
                aria-checked={soundEffects}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEffects ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Test Section */}
        <section className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🧪</span> Test Your Settings
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                haptics.success();
                sounds.success();
              }}
              className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all btn-press card-hover"
            >
              ✓ Test Success Feedback
            </button>
            
            <button
              onClick={() => {
                haptics.warning();
                sounds.notify();
              }}
              className="p-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-all btn-press card-hover"
            >
              ⚠️ Test Warning Feedback
            </button>
            
            <button
              onClick={() => {
                haptics.light();
                sounds.click();
              }}
              className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all btn-press card-hover"
            >
              🔘 Test Button Click
            </button>
            
            <button
              onClick={() => {
                haptics.error();
                sounds.error();
              }}
              className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all btn-press card-hover"
            >
              ✕ Test Error Feedback
            </button>
          </div>
        </section>

        {/* Info */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>All settings are saved automatically and persist across sessions</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
