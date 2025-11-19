import React, { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { RoutineStep, RoutineStepType } from '../../types/routine';

export interface StepTemplate {
  id: string;
  title: string;
  description?: string;
  duration: number;
  type: RoutineStepType;
  source?: string;
  payload: Omit<RoutineStep, 'stepId' | 'order'>;
}

interface StepLibraryProps {
  items: StepTemplate[];
  onAdd: (template: StepTemplate) => void;
}

const StepLibrary: React.FC<StepLibraryProps> = ({ items, onAdd }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | RoutineStepType>('all');

  const stepTypes: RoutineStepType[] = ['routine', 'flexZone', 'note', 'medication', 'health'];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesSearch =
        !search ||
        `${item.title} ${item.description ?? ''} ${item.source ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [items, search, typeFilter]);

  return (
    <section aria-label="Step library" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="step-library-search" className="sr-only">
            Search step library
          </label>
          <input
            id="step-library-search"
            type="search"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Search steps"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`rounded-full px-3 py-1 text-sm ${
              typeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            All types
          </button>
          {stepTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`rounded-full px-3 py-1 text-sm capitalize ${
                typeFilter === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
          No steps match your filters yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredItems.map((item) => (
            <StepLibraryCard key={item.id} template={item} onAdd={onAdd} />
          ))}
        </ul>
      )}
    </section>
  );
};

interface StepCardProps {
  template: StepTemplate;
  onAdd: (template: StepTemplate) => void;
}

const StepLibraryCard: React.FC<StepCardProps> = ({ template, onAdd }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `step-library-${template.id}`,
    data: {
      type: 'library-step',
      stepTemplate: template,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-gray-900">{template.title}</p>
          {template.source && <p className="text-xs text-gray-500">{template.source}</p>}
        </div>
        <button
          type="button"
          onClick={() => onAdd(template)}
          className="rounded-md border border-blue-600 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
        >
          Add
        </button>
      </div>
      {template.description && <p className="mt-2 text-sm text-gray-600">{template.description}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-gray-100 px-2 py-0.5">{template.duration} min</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 capitalize">{template.type}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5">Drag to routine</span>
      </div>
      <button
        type="button"
        className="mt-3 rounded-md border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500 hover:border-gray-400"
        {...attributes}
        {...listeners}
      >
        Drag me into your routine
      </button>
    </li>
  );
};

export default StepLibrary;
