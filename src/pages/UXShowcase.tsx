import React, { useState } from 'react';
import { useTheme, useHaptics, useSoundEffects } from '../contexts/ThemeContext';

const UXShowcase: React.FC = () => {
  const { isDark, animationSpeed } = useTheme();
  const haptics = useHaptics();
  const sounds = useSoundEffects();
  const [activeDemo, setActiveDemo] = useState('animations');

  const demos = [
    { id: 'animations', label: 'Animations', icon: '✨' },
    { id: 'interactions', label: 'Interactions', icon: '👆' },
    { id: 'feedback', label: 'Feedback', icon: '📳' },
    { id: 'hierarchy', label: 'Hierarchy', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            🎨 UX Feature Showcase
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Interactive demonstration of all UX refinements
          </p>
        </div>

        {/* Demo Selector */}
        <div className="tab-list">
          {demos.map((demo) => (
            <button
              key={demo.id}
              onClick={() => {
                setActiveDemo(demo.id);
                haptics.light();
                sounds.click();
              }}
              className={`tab-button ${activeDemo === demo.id ? 'active' : ''}`}
            >
              <span className="text-lg">{demo.icon}</span>
              <span>{demo.label}</span>
            </button>
          ))}
        </div>

        {/* Animations Demo */}
        {activeDemo === 'animations' && (
          <div className="space-y-6 animate-scale-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Animation Examples
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Current speed: <span className="font-semibold capitalize">{animationSpeed}</span>
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="animate-fade-in">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Fade In
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Smooth opacity transition
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <div className="animate-slide-up">
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      Slide Up
                    </h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Enters from bottom with fade
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <div className="animate-scale-in">
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Scale In
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Grows from center with fade
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg border-2 border-pink-200 dark:border-pink-800">
                  <div className="animate-bounce-subtle">
                    <h3 className="font-semibold text-pink-900 dark:text-pink-100 mb-2">
                      Bounce Subtle
                    </h3>
                    <p className="text-sm text-pink-700 dark:text-pink-300">
                      Gentle bounce animation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl shadow-sm p-6">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Note:</strong> All animations respect your animation speed preference and 
                the system's "reduce motion" setting. Toggle to "None" in settings to disable completely.
              </p>
            </div>
          </div>
        )}

        {/* Interactions Demo */}
        {activeDemo === 'interactions' && (
          <div className="space-y-6 animate-scale-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Interactive Elements
              </h2>

              <div className="space-y-4">
                {/* Card Hover */}
                <div className="card-hover p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    🎯 Card Hover Effect
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Hover over this card to see lift and shadow effects
                  </p>
                </div>

                {/* Button Press */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      haptics.light();
                      sounds.click();
                    }}
                    className="btn-press px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-all"
                  >
                    Press Me (Light)
                  </button>

                  <button
                    onClick={() => {
                      haptics.medium();
                      sounds.notify();
                    }}
                    className="btn-press px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-md transition-all"
                  >
                    Press Me (Medium)
                  </button>

                  <button
                    onClick={() => {
                      haptics.heavy();
                      sounds.success();
                    }}
                    className="btn-press px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-md transition-all"
                  >
                    Press Me (Heavy)
                  </button>
                </div>

                {/* Badges */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Badge Styles:</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-primary">Primary</span>
                    <span className="badge badge-success">Success</span>
                    <span className="badge badge-warning">Warning</span>
                    <span className="badge badge-error">Error</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Demo */}
        {activeDemo === 'feedback' && (
          <div className="space-y-6 animate-scale-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Haptic & Sound Feedback
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    haptics.success();
                    sounds.success();
                  }}
                  className="p-6 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all btn-press card-hover"
                >
                  <div className="text-3xl mb-2">✅</div>
                  <div className="font-bold mb-1">Success</div>
                  <div className="text-sm opacity-90">Pattern + Sound</div>
                </button>

                <button
                  onClick={() => {
                    haptics.warning();
                    sounds.notify();
                  }}
                  className="p-6 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-medium transition-all btn-press card-hover"
                >
                  <div className="text-3xl mb-2">⚠️</div>
                  <div className="font-bold mb-1">Warning</div>
                  <div className="text-sm opacity-90">Pattern + Sound</div>
                </button>

                <button
                  onClick={() => {
                    haptics.error();
                    sounds.error();
                  }}
                  className="p-6 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all btn-press card-hover"
                >
                  <div className="text-3xl mb-2">❌</div>
                  <div className="font-bold mb-1">Error</div>
                  <div className="text-sm opacity-90">Pattern + Sound</div>
                </button>

                <button
                  onClick={() => {
                    haptics.light();
                    sounds.complete();
                  }}
                  className="p-6 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all btn-press card-hover"
                >
                  <div className="text-3xl mb-2">🎉</div>
                  <div className="font-bold mb-1">Complete</div>
                  <div className="text-sm opacity-90">Light + Sound</div>
                </button>
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Tip:</strong> Haptic feedback requires a mobile device or compatible hardware. 
                  Sound effects can be enabled in Settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Visual Hierarchy Demo */}
        {activeDemo === 'hierarchy' && (
          <div className="space-y-6 animate-scale-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Visual Hierarchy
              </h2>

              <div className="space-y-6">
                {/* Heading Hierarchy */}
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    Heading 1
                  </h1>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Heading 2
                  </h2>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Heading 3
                  </h3>
                  <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Heading 4
                  </h4>
                  <p className="text-base text-gray-700 dark:text-gray-300">
                    Body text with proper contrast and readability
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Secondary text for supplementary information
                  </p>
                </div>

                {/* Color Hierarchy */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Color Importance:
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 rounded-lg border-l-4 border-red-500">
                      Urgent - Immediate attention required
                    </div>
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100 rounded-lg border-l-4 border-orange-500">
                      High - Important but not urgent
                    </div>
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 rounded-lg border-l-4 border-yellow-500">
                      Medium - Normal priority
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 rounded-lg border-l-4 border-green-500">
                      Low - Can wait
                    </div>
                  </div>
                </div>

                {/* Focus States */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Focus States (try Tab key):
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg focus:ring-4 focus:ring-blue-300">
                      Focus Me 1
                    </button>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg focus:ring-4 focus:ring-purple-300">
                      Focus Me 2
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg focus:ring-4 focus:ring-green-300">
                      Focus Me 3
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Accessibility Note:
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                All color combinations meet WCAG AA standards minimum. Enable High Contrast mode 
                in settings for AAA standard (7:1 ratio).
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Visit Settings to customize all these features ⚙️</p>
        </div>
      </div>
    </div>
  );
};

export default UXShowcase;
