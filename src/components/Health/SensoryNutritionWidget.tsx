import { FormEvent, useMemo, useState } from 'react';
import { BeakerIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useHealthPlannerStore } from '../../stores/healthPlannerStore';

const DEFAULT_ENTRY = {
  entryType: 'meal' as const,
  title: '',
  sensoryTags: '',
  hydrationScore: 3,
};

export const SensoryNutritionWidget: React.FC = () => {
  const [entry, setEntry] = useState(DEFAULT_ENTRY);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    nutritionEntries,
    logNutritionEntry,
    refreshInsights,
    hydrationReminder,
    isSyncing,
  } = useHealthPlannerStore((state) => ({
    nutritionEntries: state.nutritionEntries,
    logNutritionEntry: state.logNutritionEntry,
    refreshInsights: state.refreshInsights,
    hydrationReminder: state.hydrationReminder,
    isSyncing: state.isSyncing,
  }));

  const latestEntries = useMemo(() => nutritionEntries.slice(0, 4), [nutritionEntries]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!entry.title.trim()) return;
    setIsSubmitting(true);
    try {
      await logNutritionEntry({
        entryType: entry.entryType,
        title: entry.title.trim(),
        occurredAt: new Date().toISOString(),
        sensoryProfile: entry.sensoryTags
          ? {
              tags: entry.sensoryTags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            }
          : undefined,
        hydrationScore: entry.hydrationScore,
        aiContext: aiPrompt
          ? `Provide sensory-friendly snack suggestions. Context: ${aiPrompt}`
          : undefined,
      });
      setEntry(DEFAULT_ENTRY);
      setAiPrompt('');
    } catch (error) {
      console.error('Failed to log health entry', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    await refreshInsights('nutrition', 'Update nutrition + hydration suggestions');
  };

  return (
    <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-lime-50 to-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-500">Sensory Nutrition</p>
          <h3 className="text-xl font-semibold text-emerald-900">Health & Diet</h3>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-500"
          disabled={isSyncing}
        >
          <SparklesIcon className="mr-1 inline h-3.5 w-3.5" />
          Refresh AI
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/80 p-4 shadow-sm">
          <label className="block text-xs font-semibold text-emerald-600">Entry Title</label>
          <input
            className="w-full rounded-xl border border-emerald-100 px-3 py-2 text-sm"
            placeholder="e.g., crunchy breakfast"
            value={entry.title}
            onChange={(event) => setEntry((prev) => ({ ...prev, title: event.target.value }))}
          />
          <label className="block text-xs font-semibold text-emerald-600">Type</label>
          <select
            className="w-full rounded-xl border border-emerald-100 px-3 py-2 text-sm"
            value={entry.entryType}
            onChange={(event) =>
              setEntry((prev) => ({ ...prev, entryType: event.target.value as typeof prev.entryType }))
            }
          >
            <option value="meal">Meal</option>
            <option value="snack">Snack</option>
            <option value="drink">Drink</option>
            <option value="supplement">Supplement</option>
          </select>
          <label className="block text-xs font-semibold text-emerald-600">Sensory Tags</label>
          <input
            className="w-full rounded-xl border border-emerald-100 px-3 py-2 text-sm"
            placeholder="smooth, cold, low-chew"
            value={entry.sensoryTags}
            onChange={(event) =>
              setEntry((prev) => ({ ...prev, sensoryTags: event.target.value }))
            }
          />
        </div>
        <div className="space-y-3 rounded-2xl bg-white/80 p-4 shadow-sm">
          <label className="block text-xs font-semibold text-emerald-600">Hydration</label>
          <input
            type="range"
            min={1}
            max={5}
            value={entry.hydrationScore}
            onChange={(event) =>
              setEntry((prev) => ({ ...prev, hydrationScore: Number(event.target.value) }))
            }
            className="w-full accent-emerald-500"
          />
          <textarea
            className="w-full rounded-xl border border-emerald-100 px-3 py-2 text-sm"
            rows={2}
            placeholder="Optional AI request (e.g., 'Show fridge-ready options for low-spoon nights')"
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Log entry'}
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-1">
        <div className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
            <BeakerIcon className="h-4 w-4" />
            Hydration radar
          </div>
          <p className="mt-2 text-xs text-sky-600">{hydrationReminder ?? 'You are doing great!'}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-sky-800">
            {latestEntries.map((entryItem) => (
              <span
                key={entryItem.id}
                className="rounded-full bg-sky-50 px-3 py-1 font-medium"
              >
                {entryItem.entryType} · {entryItem.hydrationScore ?? '—'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SensoryNutritionWidget;
