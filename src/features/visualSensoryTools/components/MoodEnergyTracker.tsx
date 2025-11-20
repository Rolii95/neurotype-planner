import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  FaceSmileIcon,
  BoltIcon,
  EyeIcon,
  CalendarIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { useVisualSensory } from '../VisualSensoryContext';
import { MoodEntry, ChartData } from '../types';
import { format, subDays, startOfDay, eachDayOfInterval, isToday } from 'date-fns';
import { ENERGY_FACTOR_MAP } from '../../../constants/energyFactors';

interface MoodEnergyTrackerProps {
  showChart?: boolean;
  compact?: boolean;
  daysToShow?: number;
  showCheckIn?: boolean;
}

const MOOD_EMOJIS = [
  { value: 1, emoji: '😢', label: 'Very Low', color: '#dc2626' },
  { value: 2, emoji: '😕', label: 'Low', color: '#ea580c' },
  { value: 3, emoji: '😐', label: 'Okay', color: '#ca8a04' },
  { value: 4, emoji: '🙂', label: 'Good', color: '#65a30d' },
  { value: 5, emoji: '😊', label: 'Great', color: '#16a34a' }
];

const ENERGY_LEVELS = [
  { value: 1, label: 'Exhausted', color: '#dc2626' },
  { value: 2, label: 'Tired', color: '#ea580c' },
  { value: 3, label: 'Okay', color: '#ca8a04' },
  { value: 4, label: 'Energetic', color: '#65a30d' },
  { value: 5, label: 'High Energy', color: '#16a34a' }
];

const FOCUS_LEVELS = [
  { value: 1, label: 'Very Scattered', color: '#dc2626' },
  { value: 2, label: 'Distracted', color: '#ea580c' },
  { value: 3, label: 'Okay', color: '#ca8a04' },
  { value: 4, label: 'Focused', color: '#65a30d' },
  { value: 5, label: 'Deep Focus', color: '#16a34a' }
];

export const MoodEnergyTracker: React.FC<MoodEnergyTrackerProps> = ({
  showChart = true,
  compact = false,
  daysToShow = 7,
  showCheckIn = true,
}) => {
  const {
    moodEntries,
    currentMood,
    addMoodEntry,
    getMoodTrends,
    isLoading,
    error
  } = useVisualSensory();

  const [newEntry, setNewEntry] = useState({
    mood: 3,
    energy: 3,
    focus: 3,
    emoji: '😐',
    notes: '',
    tags: [] as string[],
    triggers: [] as string[],
    context: {
      location: '',
      activity: '',
      weather: ''
    }
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [currentTag, setCurrentTag] = useState('');
  const [currentTrigger, setCurrentTrigger] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get trend data
  const trendData = useMemo(() => {
    const days = selectedPeriod === 'day' ? 1 : selectedPeriod === 'week' ? 7 : 30;
    const trends = getMoodTrends(days);
    
    // Group by day and calculate averages
    const dayMap = new Map<string, { mood: number[]; energy: number[]; focus: number[] }>();
    
    trends.forEach(entry => {
      const day = format(startOfDay(entry.timestamp), 'yyyy-MM-dd');
      if (!dayMap.has(day)) {
        dayMap.set(day, { mood: [], energy: [], focus: [] });
      }
      const dayData = dayMap.get(day)!;
      dayData.mood.push(entry.mood);
      dayData.energy.push(entry.energy);
      dayData.focus.push(entry.focus);
    });

    // Create chart data for all days in range
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return allDays.map(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayData = dayMap.get(dayKey);
      
      return {
        date: format(day, 'MMM dd'),
        mood: dayData ? dayData.mood.reduce((a, b) => a + b, 0) / dayData.mood.length : 0,
        energy: dayData ? dayData.energy.reduce((a, b) => a + b, 0) / dayData.energy.length : 0,
        focus: dayData ? dayData.focus.reduce((a, b) => a + b, 0) / dayData.focus.length : 0,
        hasData: !!dayData
      };
    });
  }, [getMoodTrends, selectedPeriod]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (trendData.length === 0) {
      return { avgMood: 0, avgEnergy: 0, avgFocus: 0, trend: 'neutral' };
    }

    const validData = trendData.filter(d => d.hasData);
    if (validData.length === 0) {
      return { avgMood: 0, avgEnergy: 0, avgFocus: 0, trend: 'neutral' };
    }

    const avgMood = validData.reduce((sum, d) => sum + d.mood, 0) / validData.length;
    const avgEnergy = validData.reduce((sum, d) => sum + d.energy, 0) / validData.length;
    const avgFocus = validData.reduce((sum, d) => sum + d.focus, 0) / validData.length;

    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(validData.length / 2);
    const firstHalf = validData.slice(0, midPoint);
    const secondHalf = validData.slice(midPoint);

    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstAvg = firstHalf.reduce((sum, d) => sum + d.mood + d.energy + d.focus, 0) / (firstHalf.length * 3);
      const secondAvg = secondHalf.reduce((sum, d) => sum + d.mood + d.energy + d.focus, 0) / (secondHalf.length * 3);
      const trend = secondAvg > firstAvg + 0.2 ? 'up' : secondAvg < firstAvg - 0.2 ? 'down' : 'neutral';
      
      return { avgMood, avgEnergy, avgFocus, trend };
    }

    return { avgMood, avgEnergy, avgFocus, trend: 'neutral' };
  }, [trendData]);

  const topEnergyFactors = useMemo(() => {
    const counts = new Map<string, number>();
    moodEntries.forEach((entry) => {
      entry.energyFactors?.forEach((factorId) => {
        counts.set(factorId, (counts.get(factorId) ?? 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([factorId, count]) => ({
        factor: ENERGY_FACTOR_MAP[factorId],
        count,
      }))
      .filter((item) => item.factor);
  }, [moodEntries]);

  const handleSliderChange = (type: 'mood' | 'energy' | 'focus', value: number) => {
    setNewEntry(prev => ({
      ...prev,
      [type]: value,
      emoji: type === 'mood' ? MOOD_EMOJIS.find(e => e.value === value)?.emoji || '😐' : prev.emoji
    }));
  };

  const handleEmojiSelect = (emoji: string, value: number) => {
    setNewEntry(prev => ({
      ...prev,
      mood: value,
      emoji
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !newEntry.tags.includes(currentTag.trim())) {
      setNewEntry(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleAddTrigger = () => {
    if (currentTrigger.trim() && !newEntry.triggers.includes(currentTrigger.trim())) {
      setNewEntry(prev => ({
        ...prev,
        triggers: [...prev.triggers, currentTrigger.trim()]
      }));
      setCurrentTrigger('');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await addMoodEntry({
        mood: newEntry.mood,
        energy: newEntry.energy,
        focus: newEntry.focus,
        emoji: newEntry.emoji,
        notes: newEntry.notes || undefined,
        tags: newEntry.tags.length > 0 ? newEntry.tags : undefined,
        triggers: newEntry.triggers.length > 0 ? newEntry.triggers : undefined,
        context: {
          location: newEntry.context.location || undefined,
          activity: newEntry.context.activity || undefined,
          weather: newEntry.context.weather || undefined
        }
      });

      // Reset form
      setNewEntry({
        mood: 3,
        energy: 3,
        focus: 3,
        emoji: '😐',
        notes: '',
        tags: [],
        triggers: [],
        context: { location: '', activity: '', weather: '' }
      });
      setShowAdvanced(false);
    } catch (error) {
      console.error('Failed to save mood entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSliderKey = (
    field: 'mood' | 'energy' | 'focus',
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const value = Number(event.key);
    if (!Number.isNaN(value) && value >= 1 && value <= 5) {
      handleSliderChange(field, value);
    }
  };

  const getTodaysEntries = () => {
    return moodEntries.filter(entry => isToday(entry.timestamp));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto p-4 space-y-6 ${compact ? 'p-2 space-y-4' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
          Mood & Energy Tracker
        </h2>
        <div className="flex items-center gap-2">
          {/* Today's count */}
          <span className="text-sm text-gray-500">
            {getTodaysEntries().length} entries today
          </span>
          
          {/* Period selector */}
          {showChart && (
            <>
              <label htmlFor="trend-period" className="sr-only">
                Trend period
              </label>
              <select
                id="trend-period"
                aria-label="Select period for mood trends"
                value={selectedPeriod}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPeriod(e.target.value as 'day' | 'week' | 'month')}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="day">Today</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {showCheckIn && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="font-medium text-gray-900 mb-4">Quick Check-in</h3>
        
        {/* Emoji Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FaceSmileIcon className="h-4 w-4 inline mr-1" />
            How do you feel?
          </label>
          <div className="flex gap-2 justify-center">
            {MOOD_EMOJIS.map((item) => (
              <button
                key={item.value}
                onClick={() => handleEmojiSelect(item.emoji, item.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  newEntry.mood === item.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label={item.label}
                title={item.label}
              >
                <span className="text-2xl">{item.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Mood Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaceSmileIcon className="h-4 w-4 inline mr-1" />
              Mood: {newEntry.mood}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={newEntry.mood}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSliderChange('mood', parseInt(e.target.value))}
              onKeyDown={(event) => handleSliderKey('mood', event)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              aria-label="Mood level"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Energy Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BoltIcon className="h-4 w-4 inline mr-1" />
              Energy: {newEntry.energy}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={newEntry.energy}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSliderChange('energy', parseInt(e.target.value))}
              onKeyDown={(event) => handleSliderKey('energy', event)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              aria-label="Energy level"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Tired</span>
              <span>Energized</span>
            </div>
          </div>

          {/* Focus Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <EyeIcon className="h-4 w-4 inline mr-1" />
              Focus: {newEntry.focus}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={newEntry.focus}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSliderChange('focus', parseInt(e.target.value))}
              onKeyDown={(event) => handleSliderKey('focus', event)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              aria-label="Focus level"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Scattered</span>
              <span>Focused</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={newEntry.notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="How are you feeling? What's affecting your mood?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
            rows={2}
            aria-label="Additional notes about your mood"
          />
        </div>

        {/* Advanced Options Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAdvanced ? 'Hide' : 'Show'} advanced options
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="border-t pt-4 space-y-4">
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTag(e.target.value)}
                  placeholder="Add a tag (e.g., work, home, exercise)"
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {newEntry.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                  >
                    {tag}
                    <button
                      onClick={() => setNewEntry(prev => ({
                        ...prev,
                        tags: prev.tags.filter((_, i) => i !== index)
                      }))}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={newEntry.context.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(prev => ({
                  ...prev,
                  context: { ...prev.context, location: e.target.value }
                }))}
                placeholder="Location"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                value={newEntry.context.activity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(prev => ({
                  ...prev,
                  context: { ...prev.context, activity: e.target.value }
                }))}
                placeholder="Activity"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                value={newEntry.context.weather}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(prev => ({
                  ...prev,
                  context: { ...prev.context, weather: e.target.value }
                }))}
                placeholder="Weather"
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isLoading || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading || isSubmitting ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
      )}

      {/* Statistics */}
      {stats.avgMood > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4 text-center">
            <FaceSmileIcon className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats.avgMood.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">Avg Mood</div>
          </div>
          
          <div className="bg-white rounded-lg border p-4 text-center">
            <BoltIcon className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats.avgEnergy.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">Avg Energy</div>
          </div>
          
          <div className="bg-white rounded-lg border p-4 text-center">
            <EyeIcon className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {stats.avgFocus.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">Avg Focus</div>
          </div>
          
          <div className="bg-white rounded-lg border p-4 text-center">
            {stats.trend === 'up' ? (
              <ArrowTrendingUpIcon className="h-8 w-8 mx-auto text-green-600 mb-2" />
            ) : stats.trend === 'down' ? (
              <ArrowTrendingDownIcon className="h-8 w-8 mx-auto text-red-600 mb-2" />
            ) : (
              <ChartBarIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            )}
            <div className="text-2xl font-bold text-gray-900">
              {stats.trend === 'up' ? '↗' : stats.trend === 'down' ? '↘' : '→'}
            </div>
            <div className="text-sm text-gray-500">Trend</div>
          </div>
        </div>
      )}

      {topEnergyFactors.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-900 mb-3">Frequent energy influences</h3>
          <div className="flex flex-wrap gap-2">
            {topEnergyFactors.map(({ factor, count }) => (
              <span
                key={factor!.id}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
              >
                <span>{factor!.icon}</span>
                {factor!.label} ({count}×)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {showChart && trendData.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-900 mb-4">Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 5]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  name="Mood"
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ fill: '#eab308', strokeWidth: 2, r: 4 }}
                  name="Energy"
                />
                <Line
                  type="monotone"
                  dataKey="focus"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                  name="Focus"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Entries */}
      {!compact && moodEntries.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-medium text-gray-900">Recent Entries</h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {moodEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{entry.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Mood: {entry.mood}</span>
                      <span>Energy: {entry.energy}</span>
                      <span>Focus: {entry.focus}</span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-700 mt-1">{entry.notes}</p>
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
                </div>
                <div className="text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {format(entry.timestamp, 'MMM dd, h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};



