import React, { useMemo, useState } from 'react';
import type { RoutineAnchor } from '../../types/routine';

interface RoutineAnchorLibraryProps {
  anchors: RoutineAnchor[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onSelect: (anchor: RoutineAnchor) => void;
  selectedAnchorIds?: string[];
  onCreateAnchor?: () => void;
  onEditAnchor?: (anchor: RoutineAnchor) => void;
  onDuplicateAnchor?: (anchor: RoutineAnchor) => void;
}

const categoriesFromAnchors = (anchors: RoutineAnchor[]): string[] => {
  const seen = new Set<string>();
  anchors.forEach((anchor) => {
    if (anchor.category) {
      seen.add(anchor.category);
    }
  });
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
};

const matchesSearch = (anchor: RoutineAnchor, search: string) => {
  if (!search) return true;
  const candidate = `${anchor.name} ${anchor.category} ${anchor.description ?? ''} ${
    anchor.tags?.join(' ') ?? ''
  }`.toLowerCase();
  return candidate.includes(search.toLowerCase());
};

export const RoutineAnchorLibrary: React.FC<RoutineAnchorLibraryProps> = ({
  anchors,
  isLoading = false,
  onRefresh,
  onSelect,
  selectedAnchorIds = [],
  onCreateAnchor,
  onEditAnchor,
  onDuplicateAnchor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = useMemo(() => categoriesFromAnchors(anchors), [anchors]);

  const filteredAnchors = useMemo(() => {
    return anchors.filter((anchor) => {
      const categoryMatch = activeCategory === 'all' || anchor.category === activeCategory;
      return categoryMatch && matchesSearch(anchor, searchTerm);
    });
  }, [anchors, activeCategory, searchTerm]);

  return (
    <section aria-label="Routine anchors" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="anchor-search" className="sr-only">
            Search anchor library
          </label>
          <input
            id="anchor-search"
            type="search"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Search anchors"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        {onCreateAnchor && (
          <button
            type="button"
            className="rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600"
            onClick={onCreateAnchor}
          >
            + New custom anchor
          </button>
        )}
        {onRefresh && (
          <button
            type="button"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600"
            onClick={onRefresh}
          >
            Refresh
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-sm ${
            activeCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setActiveCategory('all')}
        >
          All anchors
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${
              activeCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-md border border-gray-200 bg-white p-6 text-center text-gray-600">
          Loading anchors...
        </div>
      ) : filteredAnchors.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600">
          No anchors match your filters yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredAnchors.map((anchor) => {
            const isSelected = selectedAnchorIds.includes(anchor.id);
            return (
              <article
                key={anchor.id}
                className={`rounded-lg border p-4 transition-shadow ${
                  isSelected
                    ? 'border-blue-500 shadow-lg shadow-blue-100'
                    : 'border-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{anchor.name}</h3>
                    <p className="text-sm text-gray-500">{anchor.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {anchor.isCustom && (
                      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                        Custom
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {(anchor.isCustom && onEditAnchor) && (
                        <button
                          type="button"
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                          onClick={() => onEditAnchor(anchor)}
                        >
                          Edit
                        </button>
                      )}
                      {onDuplicateAnchor && (
                        <button
                          type="button"
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                          onClick={() => onDuplicateAnchor(anchor)}
                        >
                          Duplicate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {anchor.description && (
                  <p className="mt-2 text-sm text-gray-600">{anchor.description}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2 py-1">
                    ~{anchor.estimatedDuration} min
                  </span>
                  {anchor.tags?.map((tag) => (
                    <span key={tag} className="rounded-full bg-gray-100 px-2 py-1">
                      {tag}
                    </span>
                  ))}
                </div>

                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {anchor.steps.map((step, index) => (
                    <li key={`${anchor.id}-step-${index}`} className="flex gap-2">
                      <span className="text-gray-400">{index + 1}.</span>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">{step.title}</span>
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
                            {step.type ?? 'routine'}
                          </span>
                          <span className="text-xs text-gray-500">{step.duration} min</span>
                          {step.transitionCue && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                              Transition
                            </span>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-xs text-gray-500">{step.description}</p>
                        )}
                        {step.transitionCue?.text && (
                          <p className="text-xs text-blue-600">"{step.transitionCue.text}"</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">
                    Steps: {anchor.steps.length}
                  </div>
                  <button
                    type="button"
                    className={`rounded-md px-4 py-2 text-sm font-medium ${
                      isSelected
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    onClick={() => onSelect(anchor)}
                  >
                    {isSelected ? 'Added' : 'Add to routine'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RoutineAnchorLibrary;
