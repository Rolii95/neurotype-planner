import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  EnhancedRoutine,
  RoutineAnchor,
  RoutineExecution,
  RoutineStep,
} from '../types/routine';
import { routinesApi, ensureUuid } from '../services/routinesApi';
import { isSupabaseDemoMode } from '../services/supabase';

interface PendingChange {
  routineId: string;
  changes: Partial<EnhancedRoutine>;
  timestamp: number;
}

interface RoutineState {
  routines: EnhancedRoutine[];
  activeRoutine: EnhancedRoutine | null;
  currentExecution: RoutineExecution | null;
  anchors: RoutineAnchor[];
  isLoading: boolean;
  isLoadingAnchors: boolean;
  isSaving: boolean;
  error: string | null;
  anchorError: string | null;
  lastSaved: Date | null;
  pendingChanges: PendingChange[];
  isOnline: boolean;
}

interface RoutineActions {
  loadRoutines: () => Promise<void>;
  createRoutine: (
    routine: Omit<EnhancedRoutine, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>;
  updateRoutine: (routineId: string, updates: Partial<EnhancedRoutine>) => Promise<void>;
  deleteRoutine: (routineId: string) => Promise<void>;
  duplicateRoutine: (routineId: string) => Promise<string>;
  addStep: (
    routineId: string,
    step: Omit<RoutineStep, 'stepId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateStep: (routineId: string, stepId: string, updates: Partial<RoutineStep>) => Promise<void>;
  deleteStep: (routineId: string, stepId: string) => Promise<void>;
  reorderSteps: (routineId: string, orderedStepIds: string[]) => Promise<void>;
  setActiveRoutine: (routine: EnhancedRoutine | null) => void;
  setCurrentExecution: (execution: RoutineExecution | null) => void;
  loadAnchors: () => Promise<void>;
  addCustomAnchor: (
    anchor: Omit<RoutineAnchor, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>;
  updateCustomAnchor: (
    anchorId: string,
    updates: Partial<Omit<RoutineAnchor, 'id' | 'isCustom' | 'createdAt'>>
  ) => Promise<void>;
  deleteCustomAnchor: (anchorId: string) => Promise<void>;
  saveChanges: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

type RoutineStore = RoutineState & RoutineActions;

const computeFlexibilityScore = (steps: RoutineStep[]) => {
  if (steps.length === 0) return 0;
  const flexible = steps.filter((step) => step.type === 'flexZone' || step.isFlexible).length;
  return Number((flexible / steps.length).toFixed(2));
};

const normalizeSteps = (steps: RoutineStep[]): RoutineStep[] =>
  steps
    .map((step, index) => ({
      ...step,
      stepId: ensureUuid(step.stepId),
      order: index + 1,
      duration: Math.max(1, Math.round(step.duration || 1)),
      executionState: undefined,
    }))
    .sort((a, b) => a.order - b.order);

const applyRoutineUpdates = (
  original: EnhancedRoutine,
  updates: Partial<EnhancedRoutine>
): EnhancedRoutine => {
  const mergedSteps = normalizeSteps(updates.steps ?? original.steps);
  const now = new Date().toISOString();

  return {
    ...original,
    ...updates,
    steps: mergedSteps,
    totalDuration: mergedSteps.reduce((sum, step) => sum + (step.duration || 0), 0),
    flexibilityScore: updates.flexibilityScore ?? computeFlexibilityScore(mergedSteps),
    updatedAt: now,
    version: (original.version ?? 1) + 1,
  };
};

const buildRoutine = (
  input: Omit<EnhancedRoutine, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  }
): EnhancedRoutine => {
  const now = new Date().toISOString();
  const steps = normalizeSteps(input.steps);

  return {
    ...input,
    id: ensureUuid(input.id),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    steps,
    totalDuration: steps.reduce((sum, step) => sum + (step.duration || 0), 0),
    flexibilityScore: input.flexibilityScore ?? computeFlexibilityScore(steps),
    version: input.version ?? 1,
  };
};

const mergeAnchors = (defaults: RoutineAnchor[], custom: RoutineAnchor[]): RoutineAnchor[] => {
  const map = new Map<string, RoutineAnchor>();
  defaults.forEach((anchor) => {
    map.set(anchor.id, {
      ...anchor,
      steps: anchor.steps.map((step) => ({ ...step })),
    });
  });

  custom.forEach((anchor) => {
    map.set(anchor.id, {
      ...anchor,
      isCustom: true,
      steps: anchor.steps.map((step) => ({ ...step })),
    });
  });

  return Array.from(map.values());
};

export const useRoutineStore = create<RoutineStore>()(
  subscribeWithSelector((set, get) => ({
    routines: [],
    activeRoutine: null,
    currentExecution: null,
    anchors: routinesApi.getDefaultAnchors(),
    isLoading: false,
    isLoadingAnchors: false,
    isSaving: false,
    error: null,
    anchorError: null,
    lastSaved: null,
    pendingChanges: [],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

    loadRoutines: async () => {
      set({ isLoading: true, error: null });
      try {
        const routines = await routinesApi.fetchRoutines();
        set({ routines, isLoading: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load routines';
        set({ error: message, isLoading: false });
      }
    },

    createRoutine: async (routineData) => {
      set({ isSaving: true, error: null });
      try {
        const draft = buildRoutine(routineData);
        const created = await routinesApi.createRoutine(draft);
        set((state) => ({
          routines: [...state.routines, created],
          isSaving: false,
          lastSaved: new Date(),
        }));
        return created.id;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create routine';
        set({ error: message, isSaving: false });
        throw error;
      }
    },

      updateRoutine: async (routineId, updates) => {
        const existing = get().routines.find((routine) => routine.id === routineId);
        if (!existing) {
          throw new Error('Routine not found');
        }

        const updatedRoutine = applyRoutineUpdates(existing, updates);

        set((state) => {
          const routines = state.routines.map((routine) =>
            routine.id === routineId ? updatedRoutine : routine
          );
          const activeRoutine =
            state.activeRoutine?.id === routineId ? updatedRoutine : state.activeRoutine;

          return {
            routines,
            activeRoutine,
            lastSaved: new Date(),
          };
        });

      try {
        await routinesApi.updateRoutine(routineId, updatedRoutine);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update routine';
        set({ error: message });
        if (!isSupabaseDemoMode) {
          void get().loadRoutines();
        }
        throw error;
      }
    },

    deleteRoutine: async (routineId) => {
      set({ isSaving: true, error: null });
      try {
        await routinesApi.deleteRoutine(routineId);
        set((state) => ({
          routines: state.routines.filter((routine) => routine.id !== routineId),
          isSaving: false,
          activeRoutine:
            state.activeRoutine?.id === routineId ? null : state.activeRoutine,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete routine';
        set({ error: message, isSaving: false });
        throw error;
      }
    },

    duplicateRoutine: async (routineId) => {
      const existing = get().routines.find((routine) => routine.id === routineId);
      if (!existing) {
        throw new Error('Routine not found');
      }

      try {
        const duplicated = await routinesApi.duplicateRoutine(existing);
        set((state) => ({
          routines: [...state.routines, duplicated],
          lastSaved: new Date(),
        }));
        return duplicated.id;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to duplicate routine';
        set({ error: message });
        throw error;
      }
    },

    addStep: async (routineId, stepData) => {
      const routine = get().routines.find((item) => item.id === routineId);
      if (!routine) {
        throw new Error('Routine not found');
      }

      const newStep: RoutineStep = {
        ...stepData,
        stepId: ensureUuid(undefined),
        order: routine.steps.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        executionState: undefined,
      };

      await get().updateRoutine(routineId, {
        steps: [...routine.steps, newStep],
      });
    },

    updateStep: async (routineId, stepId, updates) => {
      const routine = get().routines.find((item) => item.id === routineId);
      if (!routine) {
        throw new Error('Routine not found');
      }

      const updatedSteps = routine.steps.map((step) =>
        step.stepId === stepId
          ? {
              ...step,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : step
      );

      await get().updateRoutine(routineId, { steps: updatedSteps });
    },

    deleteStep: async (routineId, stepId) => {
      const routine = get().routines.find((item) => item.id === routineId);
      if (!routine) {
        throw new Error('Routine not found');
      }

      const filteredSteps = routine.steps.filter((step) => step.stepId !== stepId);
      await get().updateRoutine(routineId, { steps: filteredSteps });
    },

    reorderSteps: async (routineId, orderedStepIds) => {
      const routine = get().routines.find((item) => item.id === routineId);
      if (!routine) {
        throw new Error('Routine not found');
      }

      const reorderedSteps = orderedStepIds
        .map((id) => routine.steps.find((step) => step.stepId === id))
        .filter((step): step is RoutineStep => Boolean(step));

      await get().updateRoutine(routineId, { steps: reorderedSteps });
    },

    setActiveRoutine: (routine) => {
      set({ activeRoutine: routine });
    },

    setCurrentExecution: (execution) => {
      set({ currentExecution: execution });
    },

    loadAnchors: async () => {
      set({ isLoadingAnchors: true, anchorError: null });
      try {
        const defaults = routinesApi.getDefaultAnchors();
        let customAnchors: RoutineAnchor[] = [];
        try {
          customAnchors = await routinesApi.fetchCustomAnchors();
        } catch (error) {
          if (!isSupabaseDemoMode) {
            throw error;
          }
        }

        set({
          anchors: mergeAnchors(defaults, customAnchors),
          isLoadingAnchors: false,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load routine anchors';
        set({ anchorError: message, isLoadingAnchors: false });
      }
    },

    addCustomAnchor: async (anchorInput) => {
      set({ anchorError: null });
      try {
        const anchor: RoutineAnchor = {
          ...anchorInput,
          id: ensureUuid(undefined),
          isCustom: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          steps: anchorInput.steps.map((step) => ({
            ...step,
            type: step.type ?? 'routine',
          })),
        };

        const stored = await routinesApi.createCustomAnchor(anchor);
        const defaults = routinesApi.getDefaultAnchors();
        const customAnchors = get()
          .anchors.filter((item) => item.isCustom)
          .concat(stored);
        set({ anchors: mergeAnchors(defaults, customAnchors) });
        return stored.id;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create custom anchor';
        set({ anchorError: message });
        throw error;
      }
    },

    updateCustomAnchor: async (anchorId, updates) => {
      const existing = get().anchors.find((anchor) => anchor.id === anchorId);
      if (!existing) {
        throw new Error('Anchor not found');
      }
      if (!existing.isCustom) {
        throw new Error('Default anchors cannot be updated');
      }

      const updatedAnchor: RoutineAnchor = {
        ...existing,
        ...updates,
        steps: (updates.steps ?? existing.steps).map((step) => ({
          ...step,
          type: step.type ?? 'routine',
        })),
        updatedAt: new Date().toISOString(),
      };

      try {
        await routinesApi.updateCustomAnchor(anchorId, updatedAnchor);
        set((state) => ({
          anchors: state.anchors.map((anchor) =>
            anchor.id === anchorId ? { ...updatedAnchor, isCustom: true } : anchor
          ),
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update custom anchor';
        set({ anchorError: message });
        throw error;
      }
    },

    deleteCustomAnchor: async (anchorId) => {
      const existing = get().anchors.find((anchor) => anchor.id === anchorId);
      if (!existing) {
        throw new Error('Anchor not found');
      }
      if (!existing.isCustom) {
        throw new Error('Default anchors cannot be deleted');
      }

      try {
        await routinesApi.deleteCustomAnchor(anchorId);
        set((state) => ({
          anchors: state.anchors.filter((anchor) => anchor.id !== anchorId),
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to delete custom anchor';
        set({ anchorError: message });
        throw error;
      }
    },

    saveChanges: async () => {
      if (isSupabaseDemoMode) {
        set({ pendingChanges: [], lastSaved: new Date() });
        return;
      }
      await get().loadRoutines();
      set({ pendingChanges: [], lastSaved: new Date() });
    },

    syncWithServer: async () => {
      await get().loadRoutines();
    },

    setOnlineStatus: (isOnline) => {
      set({ isOnline });
    },

    clearError: () => {
      set({ error: null, anchorError: null });
    },

    reset: () => {
      set({
        routines: [],
        activeRoutine: null,
        currentExecution: null,
        anchors: routinesApi.getDefaultAnchors(),
        isLoading: false,
        isLoadingAnchors: false,
        isSaving: false,
        error: null,
        anchorError: null,
        lastSaved: null,
        pendingChanges: [],
      });
    },
  }))
);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useRoutineStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useRoutineStore.getState().setOnlineStatus(false);
  });
}

export default useRoutineStore;
