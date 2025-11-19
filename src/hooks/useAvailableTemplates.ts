import { useMemo } from 'react';
import { buildDefaultTemplates, TaskTemplate } from '../constants/taskTemplates';
import { useMatrixStore } from '../stores/useMatrixStore';

export const useAvailableTemplates = (): TaskTemplate[] => {
  const customTemplates = useMatrixStore((state) => state.templates);

  return useMemo(() => {
    const defaults = buildDefaultTemplates();
    if (!customTemplates || customTemplates.length === 0) {
      return defaults;
    }

    // Merge defaults with custom templates, preserving order (defaults first)
    return [...defaults, ...customTemplates];
  }, [customTemplates]);
};
