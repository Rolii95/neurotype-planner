import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import {
  RectangleGroupIcon,
  FaceSmileIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  WifiIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import { 
  VisualSensoryProvider, 
  useVisualSensory,
  RoutineVisualBoard, 
  MoodEnergyTracker, 
  SensoryComfortWidget 
} from '../features/visualSensoryTools';
import { useOfflineStorage, useOfflineSync } from '../features/visualSensoryTools/hooks/useOfflineStorage';

const VisualSensoryToolsPage: React.FC = () => {
  return (
    <VisualSensoryProvider>
      <VisualSensoryContent />
    </VisualSensoryProvider>
  );
};

const VisualSensoryContent: React.FC = () => {
  const {
    routines,
    activeRoutine,
    moodEntries,
    sensoryPreferences,
    isLoading,
    error,
    syncWithServer,
    clearError
  } = useVisualSensory();

  const { isOnline, isReady: storageReady } = useOfflineStorage();
  const { lastSync, isSyncing } = useOfflineSync(syncWithServer);

  const [selectedTab, setSelectedTab] = useState(0);
  const [showSensoryWidget, setShowSensoryWidget] = useState(false);

  const tabs = [
    {
      name: 'Visual Routines',
      icon: RectangleGroupIcon,
      description: 'Manage your visual routine boards'
    },
    {
      name: 'Mood Tracking',
      icon: FaceSmileIcon,
      description: 'Track mood, energy, and focus'
    },
    {
      name: 'Analytics',
      icon: ChartBarIcon,
      description: 'View trends and insights'
    }
  ];

  const classNames = (...classes: string[]) => {
    return classes.filter(Boolean).join(' ');
  };

  // Auto-open sensory widget if overstimulated
  useEffect(() => {
    if (sensoryPreferences?.currentState.isOverstimulated) {
      setShowSensoryWidget(true);
    }
  }, [sensoryPreferences]);

  if (!storageReady || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Visual & Sensory Tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Visual & Sensory Tools
              </h1>
              <p className="text-gray-600">
                Adaptive support for routine management, mood tracking, and sensory comfort
              </p>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
              {/* Sync Status */}
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <div className="flex items-center text-green-600">
                    <WifiIcon className="h-5 w-5 mr-1" />
                    <span className="text-sm">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center text-orange-600">
                    <CloudIcon className="h-5 w-5 mr-1" />
                    <span className="text-sm">Offline</span>
                  </div>
                )}
                
                {isSyncing && (
                  <div className="flex items-center text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                    <span className="text-sm">Syncing...</span>
                  </div>
                )}
                
                {lastSync && (
                  <span className="text-xs text-gray-500">
                    Last sync: {lastSync.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{routines.length}</div>
                  <div className="text-xs text-gray-500">Routines</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {moodEntries.filter(entry => 
                      new Date(entry.timestamp).toDateString() === new Date().toDateString()
                    ).length}
                  </div>
                  <div className="text-xs text-gray-500">Today's Mood Entries</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    sensoryPreferences?.currentState.isOverstimulated 
                      ? 'text-red-600' 
                      : sensoryPreferences?.currentState.isInFlow
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`}>
                    {sensoryPreferences?.currentState.isOverstimulated 
                      ? '⚠️' 
                      : sensoryPreferences?.currentState.isInFlow
                      ? '✨'
                      : '😐'
                    }
                  </div>
                  <div className="text-xs text-gray-500">Sensory State</div>
                </div>
              </div>

              {/* Sensory Widget Toggle */}
              <button
                onClick={() => setShowSensoryWidget(true)}
                className={`p-2 rounded-lg transition-colors ${
                  sensoryPreferences?.currentState.isOverstimulated
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 animate-pulse'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Open sensory comfort widget"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="text-sm text-red-700 underline hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          {/* Tab Navigation */}
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  classNames(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white text-blue-700 shadow'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  )
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{tab.name}</span>
                </div>
              </Tab>
            ))}
          </Tab.List>

          {/* Tab Panels */}
          <Tab.Panels>
            {/* Visual Routines Tab */}
            <Tab.Panel
              className={classNames(
                'rounded-xl p-3',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
              )}
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Visual Routine Boards</h2>
                <p className="text-gray-600">
                  Create and manage visual routine boards with drag-and-drop functionality
                </p>
              </div>

              {activeRoutine ? (
                <RoutineVisualBoard
                  routineId={activeRoutine.id}
                  showControls={true}
                />
              ) : routines.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {routines.map((routine) => (
                    <div
                      key={routine.id}
                      className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => window.location.href = `/routines/${routine.id}`}
                    >
                      <h3 className="font-medium text-gray-900 mb-2">{routine.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{routine.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{routine.steps.length} steps</span>
                        <span className={`px-2 py-1 rounded-full ${
                          routine.category === 'morning' ? 'bg-yellow-100 text-yellow-800' :
                          routine.category === 'work' ? 'bg-blue-100 text-blue-800' :
                          routine.category === 'evening' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {routine.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <RectangleGroupIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No routines yet</h3>
                  <p className="text-gray-600 mb-6">Create your first visual routine board to get started</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Create Routine
                  </button>
                </div>
              )}
            </Tab.Panel>

            {/* Mood Tracking Tab */}
            <Tab.Panel
              className={classNames(
                'rounded-xl p-3',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
              )}
            >
              <MoodEnergyTracker
                showChart={true}
                compact={false}
                daysToShow={7}
              />
            </Tab.Panel>

            {/* Analytics Tab */}
            <Tab.Panel
              className={classNames(
                'rounded-xl bg-white p-6',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
              )}
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Insights</h2>
                <p className="text-gray-600">
                  Track your progress and discover patterns in your routines and mood
                </p>
              </div>

              {/* Analytics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Routine Completion */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-blue-900">Routine Completion</h3>
                    <RectangleGroupIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-900 mb-2">
                    {routines.length > 0 
                      ? Math.round(routines.reduce((acc, routine) => {
                          const completed = routine.steps.filter(step => step.isCompleted).length;
                          return acc + (completed / routine.steps.length);
                        }, 0) / routines.length * 100)
                      : 0}%
                  </div>
                  <p className="text-sm text-blue-700">Average completion rate</p>
                </div>

                {/* Mood Trends */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-green-900">Mood Trends</h3>
                    <FaceSmileIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-900 mb-2">
                    {moodEntries.length > 0 
                      ? (moodEntries.reduce((acc, entry) => acc + entry.mood, 0) / moodEntries.length).toFixed(1)
                      : '0.0'}
                  </div>
                  <p className="text-sm text-green-700">Average mood score</p>
                </div>

                {/* Sensory Comfort */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-purple-900">Sensory Comfort</h3>
                    <AdjustmentsHorizontalIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-900 mb-2">
                    {sensoryPreferences ? (
                      Math.round(Object.values(sensoryPreferences.preferences).reduce((a, b) => a + b, 0) / 5)
                    ) : 'N/A'}
                  </div>
                  <p className="text-sm text-purple-700">Average comfort level</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mt-8">
                <h3 className="font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {/* Show recent mood entries */}
                  {moodEntries.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{entry.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Mood Entry</p>
                          <p className="text-xs text-gray-500">
                            Mood: {entry.mood}/5, Energy: {entry.energy}/5, Focus: {entry.focus}/5
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Sensory Comfort Widget */}
      <SensoryComfortWidget
        showAsModal={showSensoryWidget}
        compact={false}
        alwaysVisible={false}
      />

      {/* Floating Sensory Widget */}
      {!showSensoryWidget && (
        <SensoryComfortWidget
          showAsModal={false}
          compact={true}
          alwaysVisible={false}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-500">
                  Neurotype-adaptive visual and sensory support tools
                </span>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Offline-capable • Real-time sync • Accessibility optimized
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VisualSensoryToolsPage;