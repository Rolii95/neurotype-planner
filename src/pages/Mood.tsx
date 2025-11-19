import React, { useMemo, useState } from 'react';
import { Tab } from '@headlessui/react';
import {
  FaceSmileIcon,
  ChartBarIcon,
  PlusIcon,
  BoltIcon,
  HeartIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { MoodEnergyTracker } from '../features/visualSensoryTools/components/MoodEnergyTracker';
import { useToast } from '../contexts/ToastContext';
import { VisualSensoryProvider, useVisualSensory } from '../features/visualSensoryTools';
import { ENERGY_FACTORS, ENERGY_FACTOR_MAP } from '../constants/energyFactors';

const moodEmojis = [
  { value: 1, emoji: '😟', label: 'Very low' },
  { value: 2, emoji: '😕', label: 'Low' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😄', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Great' },
] as const;

const energyLevels = [
  { value: 1, icon: '🪫', label: 'Empty', color: 'text-red-500' },
  { value: 2, icon: '😴', label: 'Low', color: 'text-orange-500' },
  { value: 3, icon: '🙂', label: 'Medium', color: 'text-yellow-500' },
  { value: 4, icon: '⚡', label: 'Good', color: 'text-green-500' },
  { value: 5, icon: '🚀', label: 'Full', color: 'text-blue-500' },
] as const;

const MoodContent: React.FC = () => {
  const toast = useToast();
  const { moodEntries, currentMood, addMoodEntry, isLoading, error } = useVisualSensory();
  const [selectedTab, setSelectedTab] = useState(0);
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [todayEnergy, setTodayEnergy] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [selectedEnergyFactors, setSelectedEnergyFactors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const sortedHistory = useMemo(
    () =>
      [...moodEntries].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [moodEntries]
  );

  const historyStats = useMemo(() => {
    if (sortedHistory.length === 0) return null;
    const recent = sortedHistory.slice(0, Math.min(sortedHistory.length, 7));
    const totals = recent.reduce(
      (acc, entry) => {
        acc.mood += entry.mood;
        acc.energy += entry.energy;
        acc.focus += entry.focus ?? 0;
        entry.energyFactors?.forEach((factorId) => {
          acc.factorCounts[factorId] = (acc.factorCounts[factorId] ?? 0) + 1;
        });
        return acc;
      },
      { mood: 0, energy: 0, focus: 0, factorCounts: {} as Record<string, number> }
    );
    let topFactorId: string | null = null;
    let topFactorCount = 0;
    Object.entries(totals.factorCounts).forEach(([factorId, count]) => {
      if (count > topFactorCount) {
        topFactorCount = count;
        topFactorId = factorId;
      }
    });
    return {
      averageMood: totals.mood / recent.length,
      averageEnergy: totals.energy / recent.length,
      averageFocus: totals.focus / recent.length,
      totalEntries: sortedHistory.length,
      topFactorId,
      topFactorCount,
    };
  }, [sortedHistory]);

  const displayMoodValue = todayMood ?? sortedHistory[0]?.mood ?? currentMood?.mood ?? null;
  const displayEnergyValue =
    todayEnergy ?? sortedHistory[0]?.energy ?? currentMood?.energy ?? null;
  const topEnergyFactor =
    historyStats?.topFactorId ? ENERGY_FACTOR_MAP[historyStats.topFactorId] : null;

  const toggleEnergyFactor = (factorId: string) => {
    setSelectedEnergyFactors((prev) =>
      prev.includes(factorId) ? prev.filter((id) => id !== factorId) : [...prev, factorId]
    );
  };

  const handleSaveMood = async () => {
    if (!todayMood || !todayEnergy || isSaving) {
      return;
    }
    try {
      setIsSaving(true);
      const estimatedFocus = Math.min(
        5,
        Math.max(1, Math.round((todayMood + todayEnergy) / 2))
      );
      await addMoodEntry({
        mood: todayMood,
        energy: todayEnergy,
        focus: estimatedFocus,
        emoji: moodEmojis[todayMood - 1]?.emoji ?? '😐',
        notes: note.trim(),
        energyFactors: selectedEnergyFactors,
        tags: [],
        triggers: [],
        context: {},
      });
      toast.success('Mood and energy saved! 🎉');
      setNote('');
      setTodayMood(null);
      setTodayEnergy(null);
      setSelectedEnergyFactors([]);
    } catch (err) {
      console.error('Failed to save mood entry:', err);
      toast.error('Unable to save entry right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mood &amp; Energy</h1>
              <p className="text-gray-600 mt-1">Track your emotional and physical state throughout the day</p>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {displayMoodValue ? moodEmojis[displayMoodValue - 1].emoji : '—'}
                </div>
                <div className="text-sm text-gray-500">Today's Mood</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {displayEnergyValue ? energyLevels[displayEnergyValue - 1].icon : '—'}
                </div>
                <div className="text-sm text-gray-500">Energy Level</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
            {[
              { icon: PlusIcon, label: 'Log Entry' },
              { icon: ChartBarIcon, label: 'History' },
              { icon: SparklesIcon, label: 'Insights' },
            ].map((item, index) => (
              <Tab
                key={item.label}
                className={({ selected }) =>
                  `
                  w-full rounded-lg py-2.5 text-sm font-medium leading-5
                  ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                  ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/10 hover:text-white'}
                `
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            <Tab.Panel>
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    <FaceSmileIcon className="h-6 w-6 inline mr-2 text-blue-600" />
                    How are you feeling?
                  </label>
                  <div className="flex justify-between items-center space-x-4">
                    {moodEmojis.map((mood) => (
                      <button
                        key={mood.value}
                        onClick={() => setTodayMood(mood.value)}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                          todayMood === mood.value
                            ? 'border-blue-600 bg-blue-50 scale-110'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-4xl mb-2">{mood.emoji}</div>
                        <div className="text-sm text-gray-600">{mood.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    <BoltIcon className="h-6 w-6 inline mr-2 text-yellow-600" />
                    What's your energy level?
                  </label>
                  <div className="flex justify-between items-center space-x-4">
                    {energyLevels.map((energy) => (
                      <button
                        key={energy.value}
                        onClick={() => setTodayEnergy(energy.value)}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                          todayEnergy === energy.value
                            ? 'border-green-600 bg-green-50 scale-110'
                            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`text-4xl mb-2 ${energy.color}`}>{energy.icon}</div>
                        <div className="text-sm text-gray-600">{energy.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    What's affecting your energy? (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ENERGY_FACTORS.map((factor) => (
                      <button
                        key={factor.id}
                        type="button"
                        onClick={() => toggleEnergyFactor(factor.id)}
                        className={`px-3 py-2 rounded-full border text-sm transition ${
                          selectedEnergyFactors.includes(factor.id)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <span className="mr-1">{factor.icon}</span>
                        {factor.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    <HeartIcon className="h-6 w-6 inline mr-2 text-pink-600" />
                    Any notes? (Optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="What's on your mind? How's your day going?"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveMood}
                    disabled={!todayMood || !todayEnergy || isSaving}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      todayMood && todayEnergy && !isSaving
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              </div>
            </Tab.Panel>

            <Tab.Panel>
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <MoodEnergyTracker compact showChart showCheckIn={false} />
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Recent check-ins</h3>
                      {historyStats && (
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>
                            Avg mood {historyStats.averageMood.toFixed(1)}/5 • Avg energy{' '}
                            {historyStats.averageEnergy.toFixed(1)}/5 • {historyStats.totalEntries} total logs
                          </p>
                          {topEnergyFactor && historyStats.topFactorCount ? (
                            <p className="text-xs text-gray-500">
                              Most common energy influence:{' '}
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                                <span>{topEnergyFactor.icon}</span>
                                {topEnergyFactor.label} ({historyStats.topFactorCount}×)
                              </span>
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {sortedHistory.length > 0 && (
                      <div className="text-sm text-gray-500">
                        Last logged{' '}
                        {new Date(sortedHistory[0].timestamp).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
                      {error}
                    </div>
                  )}
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                    </div>
                  ) : sortedHistory.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                      No history yet. Log your first mood entry to unlock trends.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {sortedHistory.slice(0, 15).map((entry) => {
                        const date = new Date(entry.timestamp);
                        const moodMeta = moodEmojis[entry.mood - 1];
                        const energyMeta = energyLevels[entry.energy - 1];
                        return (
                          <li
                            key={entry.id}
                            className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {date.toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}{' '}
                                ·{' '}
                                {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                              </p>
                              {entry.notes && (
                                <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                              )}
                              {(entry.context?.activity || entry.context?.location) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {entry.context?.activity}
                              {entry.context?.activity && entry.context?.location ? ' · ' : ''}
                              {entry.context?.location}
                            </p>
                          )}
                          {entry.energyFactors?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entry.energyFactors.map((factorId) => {
                                const factor = ENERGY_FACTOR_MAP[factorId];
                                if (!factor) return null;
                                return (
                                  <span
                                    key={factorId}
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                                  >
                                    <span>{factor.icon}</span>
                                    {factor.label}
                                  </span>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span>
                                Mood {moodMeta?.emoji} {entry.mood}/5
                              </span>
                              <span>
                                Energy {energyMeta?.icon} {entry.energy}/5
                              </span>
                              <span>Focus {entry.focus ?? '—'}/5</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </Tab.Panel>

            <Tab.Panel>
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">✨ Your Patterns</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                      <SparklesIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Best Time of Day</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Your energy tends to peak between 10 AM - 12 PM. Schedule important tasks during this window.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                      <HeartIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Mood Boosters</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Your mood improves after completing routines and taking breaks. Keep up these habits!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                      <BoltIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Energy Drains</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Long meetings and context switching lower your energy. Try to batch similar tasks together.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommendations</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600">•</span>
                      <span className="text-gray-700">Take a 5-minute break every hour to maintain energy</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600">•</span>
                      <span className="text-gray-700">Practice mindfulness during afternoon dips</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600">•</span>
                      <span className="text-gray-700">Celebrate small wins to boost mood consistently</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

const MoodPage: React.FC = () => (
  <VisualSensoryProvider>
    <MoodContent />
  </VisualSensoryProvider>
);

export default MoodPage;


