import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';
import {
  AdjustmentsHorizontalIcon,
  SpeakerWaveIcon,
  SunIcon,
  FireIcon,
  UserGroupIcon,
  HandRaisedIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  CheckCircleIcon,
  XMarkIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useVisualSensory } from '../VisualSensoryContext';
import { SensoryPreferences, SensoryAlert } from '../types';

interface SensoryComfortWidgetProps {
  compact?: boolean;
  showAsModal?: boolean;
  alwaysVisible?: boolean;
}

const SENSORY_FACTORS = [
  {
    key: 'soundLevel' as const,
    label: 'Sound Level',
    icon: SpeakerWaveIcon,
    lowLabel: 'Quiet',
    highLabel: 'Loud',
    color: 'blue',
    description: 'How noisy is your environment?'
  },
  {
    key: 'lightLevel' as const,
    label: 'Light Level',
    icon: SunIcon,
    lowLabel: 'Dim',
    highLabel: 'Bright',
    color: 'yellow',
    description: 'How bright is your environment?'
  },
  {
    key: 'temperature' as const,
    label: 'Temperature',
    icon: FireIcon,
    lowLabel: 'Cold',
    highLabel: 'Hot',
    color: 'red',
    description: 'How comfortable is the temperature?'
  },
  {
    key: 'crowdLevel' as const,
    label: 'Crowd Level',
    icon: UserGroupIcon,
    lowLabel: 'Alone',
    highLabel: 'Crowded',
    color: 'purple',
    description: 'How many people are around?'
  },
  {
    key: 'textureComfort' as const,
    label: 'Texture Comfort',
    icon: HandRaisedIcon,
    lowLabel: 'Uncomfortable',
    highLabel: 'Comfortable',
    color: 'green',
    description: 'How do textures feel (clothes, surfaces)?'
  }
];

const ACCOMMODATIONS = [
  {
    key: 'noiseCancel' as const,
    label: 'Noise-Canceling Headphones',
    description: 'Use headphones to reduce auditory input'
  },
  {
    key: 'dimLights' as const,
    label: 'Dim Lights',
    description: 'Reduce bright lighting when possible'
  },
  {
    key: 'fidgetTools' as const,
    label: 'Fidget Tools',
    description: 'Use fidget tools for sensory regulation'
  },
  {
    key: 'quietSpace' as const,
    label: 'Quiet Space Access',
    description: 'Have access to a quiet space when needed'
  },
  {
    key: 'breakReminders' as const,
    label: 'Break Reminders',
    description: 'Get reminders to take sensory breaks'
  }
];

export const SensoryComfortWidget: React.FC<SensoryComfortWidgetProps> = ({
  compact = false,
  showAsModal = false,
  alwaysVisible = false
}) => {
  const {
    sensoryPreferences,
    updateSensoryPreferences,
    getSensoryRecommendations,
    checkOverstimulation,
    isLoading
  } = useVisualSensory();

  const [isOpen, setIsOpen] = useState(alwaysVisible);
  const [currentPrefs, setCurrentPrefs] = useState<SensoryPreferences | null>(sensoryPreferences);
  const [alerts, setAlerts] = useState<SensoryAlert[]>([]);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [largeTextMode, setLargeTextMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize preferences if none exist
  useEffect(() => {
    if (!sensoryPreferences) {
      const defaultPrefs: Omit<SensoryPreferences, 'id' | 'userId' | 'timestamp' | 'updatedAt'> = {
        preferences: {
          soundLevel: 5,
          lightLevel: 5,
          temperature: 5,
          crowdLevel: 5,
          textureComfort: 5
        },
        currentState: {
          isOverstimulated: false,
          needsBreak: false,
          isInFlow: false,
          stressLevel: 3
        },
        accommodations: {
          noiseCancel: false,
          dimLights: false,
          fidgetTools: false,
          quietSpace: false,
          breakReminders: false
        }
      };
      setCurrentPrefs(defaultPrefs as SensoryPreferences);
    } else {
      setCurrentPrefs(sensoryPreferences);
    }
  }, [sensoryPreferences]);

  // Check for overstimulation and generate alerts
  useEffect(() => {
    if (!currentPrefs) return;

    const newAlerts: SensoryAlert[] = [];
    const isOverstimulated = checkOverstimulation();
    const recommendations = getSensoryRecommendations();

    if (isOverstimulated) {
      newAlerts.push({
        id: crypto.randomUUID(),
        type: 'warning',
        title: 'Overstimulation Detected',
        message: 'Your sensory inputs may be overwhelming. Consider taking a break.',
        action: {
          label: 'Take Break',
          callback: () => handleTakeBreak()
        },
        timestamp: new Date(),
        dismissed: false
      });
    }

    recommendations.forEach(rec => {
      newAlerts.push({
        id: crypto.randomUUID(),
        type: 'suggestion',
        title: 'Sensory Suggestion',
        message: rec,
        timestamp: new Date(),
        dismissed: false
      });
    });

    // Check for break reminders
    if (currentPrefs.accommodations.breakReminders) {
      const lastBreak = localStorage.getItem('lastSensoryBreak');
      const now = Date.now();
      const twoHours = 2 * 60 * 60 * 1000;
      
      if (!lastBreak || now - parseInt(lastBreak) > twoHours) {
        newAlerts.push({
          id: crypto.randomUUID(),
          type: 'reminder',
          title: 'Break Reminder',
          message: 'It\'s been a while since your last sensory break.',
          action: {
            label: 'Take Break',
            callback: () => handleTakeBreak()
          },
          timestamp: new Date(),
          dismissed: false
        });
      }
    }

    setAlerts(newAlerts);
  }, [currentPrefs, checkOverstimulation, getSensoryRecommendations]);

  // Load accessibility settings
  useEffect(() => {
    const saved = localStorage.getItem('accessibilitySettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setHighContrastMode(settings.highContrast || false);
        setLargeTextMode(settings.largeText || false);
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      }
    }
  }, []);

  const handlePreferenceChange = (key: keyof SensoryPreferences['preferences'], value: number) => {
    if (!currentPrefs) return;

    const updatedPrefs = {
      ...currentPrefs,
      preferences: {
        ...currentPrefs.preferences,
        [key]: value
      }
    };

    setCurrentPrefs(updatedPrefs);
  };

  const handleStateChange = (key: keyof SensoryPreferences['currentState'], value: number | boolean) => {
    if (!currentPrefs) return;

    const updatedPrefs = {
      ...currentPrefs,
      currentState: {
        ...currentPrefs.currentState,
        [key]: value
      }
    };

    setCurrentPrefs(updatedPrefs);
  };

  const handleAccommodationToggle = (key: keyof SensoryPreferences['accommodations']) => {
    if (!currentPrefs) return;

    const updatedPrefs = {
      ...currentPrefs,
      accommodations: {
        ...currentPrefs.accommodations,
        [key]: !currentPrefs.accommodations[key]
      }
    };

    setCurrentPrefs(updatedPrefs);
  };

  const handleSave = async () => {
    if (!currentPrefs) return;

    try {
      await updateSensoryPreferences(currentPrefs);
      if (showAsModal) {
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to save sensory preferences:', error);
    }
  };

  const handleTakeBreak = () => {
    localStorage.setItem('lastSensoryBreak', Date.now().toString());
    // Dismiss related alerts
    setAlerts(prev => prev.map(alert => 
      alert.type === 'reminder' || alert.title === 'Overstimulation Detected'
        ? { ...alert, dismissed: true }
        : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  const getComfortLevel = () => {
    if (!currentPrefs) return 'unknown';
    
    const { preferences, currentState } = currentPrefs;
    const comfortScore = (
      preferences.soundLevel +
      preferences.lightLevel +
      preferences.temperature +
      preferences.crowdLevel +
      preferences.textureComfort
    ) / 5;

    if (currentState.isOverstimulated || currentState.stressLevel > 7) {
      return 'uncomfortable';
    } else if (comfortScore >= 7 && currentState.isInFlow) {
      return 'optimal';
    } else if (comfortScore >= 5) {
      return 'comfortable';
    } else {
      return 'uncomfortable';
    }
  };

  const comfortLevel = getComfortLevel();
  const comfortColors = {
    optimal: 'bg-green-100 text-green-800 border-green-200',
    comfortable: 'bg-blue-100 text-blue-800 border-blue-200',
    uncomfortable: 'bg-red-100 text-red-800 border-red-200',
    unknown: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  // Floating widget for non-modal mode
  if (!showAsModal && !alwaysVisible) {
    return (
      <>
        {/* Floating Button */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-3 rounded-full shadow-lg transition-all ${
              comfortLevel === 'uncomfortable' 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : comfortLevel === 'optimal'
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
            aria-label="Open sensory comfort widget"
          >
            <AdjustmentsHorizontalIcon className="h-6 w-6" />
          </button>

          {/* Alert Badges */}
          {alerts.filter(a => !a.dismissed).length > 0 && (
            <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {alerts.filter(a => !a.dismissed).length}
            </div>
          )}
        </div>

        {/* Slide-out Panel */}
        <Transition appear show={isOpen} as={Fragment}>
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute inset-0 bg-black bg-opacity-25" onClick={() => setIsOpen(false)} />
              </Transition.Child>

              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <div className="w-screen max-w-md">
                    <div className={`h-full flex flex-col py-6 ${
                      highContrastMode ? 'bg-yellow-50' : 'bg-white'
                    } shadow-xl overflow-y-scroll`}>
                      <SensoryWidgetContent
                        currentPrefs={currentPrefs}
                        alerts={alerts}
                        highContrastMode={highContrastMode}
                        largeTextMode={largeTextMode}
                        showAdvanced={showAdvanced}
                        comfortLevel={comfortLevel}
                        comfortColors={comfortColors}
                        onPreferenceChange={handlePreferenceChange}
                        onStateChange={handleStateChange}
                        onAccommodationToggle={handleAccommodationToggle}
                        onSave={handleSave}
                        onClose={() => setIsOpen(false)}
                        onDismissAlert={dismissAlert}
                        onSetShowAdvanced={setShowAdvanced}
                        onSetHighContrast={setHighContrastMode}
                        onSetLargeText={setLargeTextMode}
                        isLoading={isLoading}
                        compact={compact}
                      />
                    </div>
                  </div>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Transition>
      </>
    );
  }

  // Modal mode
  if (showAsModal) {
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className={`w-full max-w-2xl transform overflow-hidden rounded-2xl ${
                  highContrastMode ? 'bg-yellow-50' : 'bg-white'
                } p-6 text-left align-middle shadow-xl transition-all`}>
                  <SensoryWidgetContent
                    currentPrefs={currentPrefs}
                    alerts={alerts}
                    highContrastMode={highContrastMode}
                    largeTextMode={largeTextMode}
                    showAdvanced={showAdvanced}
                    comfortLevel={comfortLevel}
                    comfortColors={comfortColors}
                    onPreferenceChange={handlePreferenceChange}
                    onStateChange={handleStateChange}
                    onAccommodationToggle={handleAccommodationToggle}
                    onSave={handleSave}
                    onClose={() => setIsOpen(false)}
                    onDismissAlert={dismissAlert}
                    onSetShowAdvanced={setShowAdvanced}
                    onSetHighContrast={setHighContrastMode}
                    onSetLargeText={setLargeTextMode}
                    isLoading={isLoading}
                    compact={compact}
                  />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

  // Always visible mode
  return (
    <div className={`${highContrastMode ? 'bg-yellow-50' : 'bg-white'} rounded-lg border shadow-sm`}>
      <SensoryWidgetContent
        currentPrefs={currentPrefs}
        alerts={alerts}
        highContrastMode={highContrastMode}
        largeTextMode={largeTextMode}
        showAdvanced={showAdvanced}
        comfortLevel={comfortLevel}
        comfortColors={comfortColors}
        onPreferenceChange={handlePreferenceChange}
        onStateChange={handleStateChange}
        onAccommodationToggle={handleAccommodationToggle}
        onSave={handleSave}
        onClose={() => {}}
        onDismissAlert={dismissAlert}
        onSetShowAdvanced={setShowAdvanced}
        onSetHighContrast={setHighContrastMode}
        onSetLargeText={setLargeTextMode}
        isLoading={isLoading}
        compact={compact}
      />
    </div>
  );
};

// Extracted content component to avoid duplication
interface SensoryWidgetContentProps {
  currentPrefs: SensoryPreferences | null;
  alerts: SensoryAlert[];
  highContrastMode: boolean;
  largeTextMode: boolean;
  showAdvanced: boolean;
  comfortLevel: string;
  comfortColors: Record<string, string>;
  onPreferenceChange: (key: keyof SensoryPreferences['preferences'], value: number) => void;
  onStateChange: (key: keyof SensoryPreferences['currentState'], value: number | boolean) => void;
  onAccommodationToggle: (key: keyof SensoryPreferences['accommodations']) => void;
  onSave: () => void;
  onClose: () => void;
  onDismissAlert: (id: string) => void;
  onSetShowAdvanced: (show: boolean) => void;
  onSetHighContrast: (enabled: boolean) => void;
  onSetLargeText: (enabled: boolean) => void;
  isLoading: boolean;
  compact: boolean;
}

const SensoryWidgetContent: React.FC<SensoryWidgetContentProps> = ({
  currentPrefs,
  alerts,
  highContrastMode,
  largeTextMode,
  showAdvanced,
  comfortLevel,
  comfortColors,
  onPreferenceChange,
  onStateChange,
  onAccommodationToggle,
  onSave,
  onClose,
  onDismissAlert,
  onSetShowAdvanced,
  onSetHighContrast,
  onSetLargeText,
  isLoading,
  compact
}) => {
  if (!currentPrefs) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-medium ${largeTextMode ? 'text-xl' : 'text-lg'} text-gray-900`}>
            Sensory Comfort
          </h3>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${
            comfortColors[comfortLevel]
          }`}>
            {comfortLevel === 'optimal' && <CheckCircleIcon className="h-4 w-4 mr-1" />}
            {comfortLevel === 'uncomfortable' && <ExclamationTriangleIcon className="h-4 w-4 mr-1" />}
            {comfortLevel.charAt(0).toUpperCase() + comfortLevel.slice(1)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Accessibility Controls */}
          <button
            onClick={() => onSetHighContrast(!highContrastMode)}
            className={`p-2 rounded ${
              highContrastMode ? 'bg-yellow-200' : 'bg-gray-100'
            } hover:bg-gray-200`}
            aria-label="Toggle high contrast"
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100"
              aria-label="Close widget"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.filter(a => !a.dismissed).map((alert) => (
        <div
          key={alert.id}
          className={`p-3 rounded-lg border ${
            alert.type === 'warning' 
              ? 'bg-red-50 border-red-200 text-red-800'
              : alert.type === 'suggestion'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{alert.title}</h4>
              <p className="text-sm mt-1">{alert.message}</p>
              {alert.action && (
                <button
                  onClick={alert.action.callback}
                  className="mt-2 px-3 py-1 bg-white rounded text-sm hover:bg-gray-50"
                >
                  {alert.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismissAlert(alert.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Quick State Indicators */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="overstimulated"
            checked={currentPrefs.currentState.isOverstimulated}
            onChange={(e) => onStateChange('isOverstimulated', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="overstimulated" className={`text-sm ${largeTextMode ? 'text-base' : ''}`}>
            Overstimulated
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="needsBreak"
            checked={currentPrefs.currentState.needsBreak}
            onChange={(e) => onStateChange('needsBreak', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="needsBreak" className={`text-sm ${largeTextMode ? 'text-base' : ''}`}>
            Needs Break
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="inFlow"
            checked={currentPrefs.currentState.isInFlow}
            onChange={(e) => onStateChange('isInFlow', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="inFlow" className={`text-sm ${largeTextMode ? 'text-base' : ''}`}>
            In Flow State
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <label className={`text-sm ${largeTextMode ? 'text-base' : ''}`}>
            Stress: {currentPrefs.currentState.stressLevel}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={currentPrefs.currentState.stressLevel}
            onChange={(e) => onStateChange('stressLevel', parseInt(e.target.value))}
            className="flex-1"
          />
        </div>
      </div>

      {/* Sensory Factors */}
      {!compact && (
        <div className="space-y-3">
          <h4 className={`font-medium ${largeTextMode ? 'text-lg' : 'text-base'} text-gray-900`}>
            Current Environment
          </h4>
          {SENSORY_FACTORS.map((factor) => {
            const IconComponent = factor.icon;
            return (
              <div key={factor.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-gray-500" />
                    <label className={`text-sm ${largeTextMode ? 'text-base' : ''} font-medium`}>
                      {factor.label}
                    </label>
                  </div>
                  <span className={`text-sm ${largeTextMode ? 'text-base' : ''} text-gray-600`}>
                    {currentPrefs.preferences[factor.key]}/10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentPrefs.preferences[factor.key]}
                  onChange={(e) => onPreferenceChange(factor.key, parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{factor.lowLabel}</span>
                  <span>{factor.highLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advanced Options */}
      {!compact && (
        <div>
          <button
            onClick={() => onSetShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAdvanced ? 'Hide' : 'Show'} accommodations
          </button>
          
          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <h4 className={`font-medium ${largeTextMode ? 'text-lg' : 'text-base'} text-gray-900`}>
                Available Accommodations
              </h4>
              {ACCOMMODATIONS.map((accommodation) => (
                <div key={accommodation.key} className="flex items-start gap-3">
                  <Switch
                    checked={currentPrefs.accommodations[accommodation.key]}
                    onChange={() => onAccommodationToggle(accommodation.key)}
                    className={`${
                      currentPrefs.accommodations[accommodation.key] ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        currentPrefs.accommodations[accommodation.key] ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                  <div>
                    <div className={`text-sm ${largeTextMode ? 'text-base' : ''} font-medium`}>
                      {accommodation.label}
                    </div>
                    <div className={`text-xs ${largeTextMode ? 'text-sm' : ''} text-gray-500`}>
                      {accommodation.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onSave}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};