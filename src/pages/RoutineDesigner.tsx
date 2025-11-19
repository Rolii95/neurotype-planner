import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type {
  EnhancedRoutine,
  RoutineAnchor,
  RoutineStep,
  RoutineStepType,
  TransitionCueType,
} from '../types/routine';
import RoutineAnchorLibrary from '../components/Routines/RoutineAnchorLibrary';
import StepLibrary, { StepTemplate as LibraryStepTemplate } from '../components/Routines/StepLibrary';
import SortableStepCard from '../components/Routines/SortableStepCard';
import { useRoutineStore } from '../stores/routineStore';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

const generateLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const reindexSteps = (steps: RoutineStep[]): RoutineStep[] =>
  steps.map((step, index) => ({ ...step, order: index + 1 }));

const calculateTotalDuration = (steps: RoutineStep[]): number =>
  steps.reduce((sum, step) => sum + (step.duration ?? 0), 0);

const calculateFlexibilityScore = (steps: RoutineStep[]): number => {
  if (steps.length === 0) return 0;
  const flexible = steps.filter((step) => step.type === 'flexZone' || step.isFlexible).length;
  return Number((flexible / steps.length).toFixed(2));
};

const createEmptyRoutine = (userId?: string): EnhancedRoutine => ({
  id: `draft-${generateLocalId()}`,
  userId: userId ?? 'anonymous',
  title: 'Untitled routine',
  description: '',
  steps: [],
  totalDuration: 0,
  flexibilityScore: 0,
  allowDynamicReordering: true,
  pausesBetweenSteps: 0,
  transitionStyle: 'gentle',
  schedule: {
    isScheduled: false,
  },
  visualBoard: {
    layout: 'linear',
    theme: 'neutral',
    showProgress: true,
    showTimers: true,
    highlightTransitions: true,
  },
  analytics: {
    completionRate: 0,
    averageDuration: 0,
    mostSkippedSteps: [],
    userSatisfaction: 0,
    totalExecutions: 0,
  },
  isActive: true,
  isTemplate: false,
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

type AnchorSelection = {
  selectionId: string;
  anchorId: string;
  anchorName: string;
  stepIds: string[];
};

type AnchorFormStepDraft = {
  id: string;
  title: string;
  duration: string;
  description: string;
  type: RoutineStepType;
  includeTransition: boolean;
  transitionType: TransitionCueType | 'none';
  transitionText: string;
  transitionAudioUrl: string;
  transitionVisualUrl: string;
  transitionRequired: boolean;
  visualIcon: string;
};

const createDraftStep = (): AnchorFormStepDraft => ({
  id: `draft-step-${generateLocalId()}`,
  title: '',
  duration: '5',
  description: '',
  type: 'routine',
  includeTransition: false,
  transitionType: 'none',
  transitionText: '',
  transitionAudioUrl: '',
  transitionVisualUrl: '',
  transitionRequired: false,
  visualIcon: '',
});

const DESIGNER_STAGES = [
  {
    id: 'stage-anchors',
    title: 'Choose building blocks',
    description: 'Mix anchor templates that match your energy and goals.',
  },
  {
    id: 'stage-flow',
    title: 'Craft the flow',
    description: 'Drag preset steps or custom actions into the routine timeline.',
  },
  {
    id: 'stage-tune',
    title: 'Tune experience',
    description: 'Name the routine, set pacing, and preview analytics.',
  },
];

const BUILDER_TABS = [
  {
    id: 'anchors' as const,
    label: 'Anchor blocks',
    description: 'Drop in multi-step anchors tuned for neurotype needs.',
  },
  {
    id: 'steps' as const,
    label: 'Step snippets',
    description: 'Add single actions, cues, or flex zones one at a time.',
  },
  {
    id: 'insights' as const,
    label: 'Selections & stats',
    description: 'Review selected anchors and pacing snapshots.',
  },
];

const anchorStepToTemplate = (
  anchor: RoutineAnchor,
  step: RoutineAnchor['steps'][number],
  index: number
): LibraryStepTemplate => {
  const payload: Omit<RoutineStep, 'stepId' | 'order'> = {
    title: step.title,
    description: step.description,
    duration: Math.max(1, step.duration ?? 1),
    type: step.type ?? 'routine',
    transitionCue: step.transitionCue,
    freeformData: undefined,
    timerSettings: undefined,
    isFlexible: step.type === 'flexZone' ? true : undefined,
    visualCues: step.visualCues,
    neurotypeAdaptations: undefined,
    executionState: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    version: 1,
    extensions: undefined,
  };

  return {
    id: `${anchor.id}-${index}`,
    title: payload.title,
    description: payload.description,
    duration: payload.duration,
    type: payload.type,
    source: anchor.name,
    payload,
  };
};

const RoutineDesigner: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  const {
    anchors,
    isLoadingAnchors,
    anchorError,
    loadAnchors,
    addCustomAnchor,
    updateCustomAnchor,
    createRoutine,
    routines,
    updateRoutine,
    loadRoutines: loadRoutineList,
  } = useRoutineStore((state) => ({
    anchors: state.anchors,
    isLoadingAnchors: state.isLoadingAnchors,
    anchorError: state.anchorError,
    loadAnchors: state.loadAnchors,
    addCustomAnchor: state.addCustomAnchor,
    updateCustomAnchor: state.updateCustomAnchor,
    createRoutine: state.createRoutine,
    routines: state.routines,
    updateRoutine: state.updateRoutine,
    loadRoutines: state.loadRoutines,
  }));

  const [draftRoutine, setDraftRoutine] = useState<EnhancedRoutine>(createEmptyRoutine(user?.id));
  const [anchorSelections, setAnchorSelections] = useState<AnchorSelection[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnchorModalOpen, setIsAnchorModalOpen] = useState(false);
  const [anchorForm, setAnchorForm] = useState({
    name: '',
    category: '',
    description: '',
    tags: '',
    steps: [createDraftStep()],
    autoAdd: true,
  });
  const [editingAnchorId, setEditingAnchorId] = useState<string | null>(null);
  const [anchorFormError, setAnchorFormError] = useState<string | null>(null);
  const [paletteView, setPaletteView] = useState<'anchors' | 'steps' | 'insights'>('anchors');
  const paletteSectionRef = useRef<HTMLDivElement | null>(null);

  const editingRoutineId = searchParams.get('routineId');
  const existingRoutine = useMemo(
    () => routines.find((routine) => routine.id === editingRoutineId) ?? null,
    [routines, editingRoutineId]
  );
  const isEditMode = Boolean(editingRoutineId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { setNodeRef: setStepDropRef, isOver: isStepDropOver } = useDroppable({
    id: 'step-drop-zone',
  });

  useEffect(() => {
    loadAnchors();
  }, [loadAnchors]);

  useEffect(() => {
    if (editingRoutineId && !existingRoutine) {
      void loadRoutineList();
    }
  }, [editingRoutineId, existingRoutine, loadRoutineList]);

  useEffect(() => {
    if (editingRoutineId) {
      if (existingRoutine) {
        setDraftRoutine({
          ...existingRoutine,
          steps: existingRoutine.steps.map((step) => ({ ...step })),
        });
      }
    } else {
      setDraftRoutine(createEmptyRoutine(user?.id));
    }
  }, [editingRoutineId, existingRoutine, user?.id]);

  useEffect(() => {
    if (user?.id && draftRoutine.userId !== user.id) {
      setDraftRoutine((prev) => ({ ...prev, userId: user.id }));
    }
  }, [user?.id, draftRoutine.userId]);

  const selectedAnchorIds = useMemo(
    () => anchorSelections.map((selection) => selection.anchorId),
    [anchorSelections]
  );

  const stepLibraryItems = useMemo<LibraryStepTemplate[]>(() => {
    const unique = new Map<string, LibraryStepTemplate>();
    anchors.forEach((anchor) => {
      (anchor.steps ?? []).forEach((step, index) => {
        const template = anchorStepToTemplate(anchor, step, index);
        const key = `${template.title}-${template.description ?? ''}-${template.type}-${template.duration}`;
        if (!unique.has(key)) {
          unique.set(key, template);
        }
      });
    });
    return Array.from(unique.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [anchors]);

  const hasSteps = draftRoutine.steps.length > 0;
  const stageProgress = useMemo(() => {
    const hasStory = Boolean((draftRoutine.description ?? '').trim());
    const visualTheme = draftRoutine.visualBoard?.theme ?? 'neutral';
    const tuneReady =
      hasSteps &&
      (hasStory ||
        Boolean(draftRoutine.schedule?.isScheduled) ||
        draftRoutine.transitionStyle !== 'gentle' ||
        visualTheme !== 'neutral');
    const completionMap: Record<string, boolean> = {
      'stage-anchors': anchorSelections.length > 0,
      'stage-flow': hasSteps,
      'stage-tune': tuneReady,
    };
    let pendingMarked = false;
    return DESIGNER_STAGES.map((stage) => {
      const done = completionMap[stage.id] ?? false;
      let status: 'done' | 'current' | 'pending';
      if (done) {
        status = 'done';
      } else if (!pendingMarked) {
        status = 'current';
        pendingMarked = true;
      } else {
        status = 'pending';
      }
      return { ...stage, status };
    });
  }, [
    anchorSelections.length,
    hasSteps,
    draftRoutine.description,
    draftRoutine.schedule?.isScheduled,
    draftRoutine.transitionStyle,
    draftRoutine.visualBoard?.theme,
  ]);

  const focusPalette = (view: typeof paletteView) => {
    setPaletteView(view);
    requestAnimationFrame(() => {
      paletteSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const activePaletteTab = BUILDER_TABS.find((tab) => tab.id === paletteView) ?? BUILDER_TABS[0];

  const updateRoutineSteps = (updater: (steps: RoutineStep[]) => RoutineStep[]) => {
    setDraftRoutine((prev) => {
      const updatedSteps = reindexSteps(updater(prev.steps));
      return {
        ...prev,
        steps: updatedSteps,
        totalDuration: calculateTotalDuration(updatedSteps),
        flexibilityScore: calculateFlexibilityScore(updatedSteps),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleAddAnchor = (anchor: RoutineAnchor) => {
    const newSteps = anchor.steps.map((step) => ({
      stepId: generateLocalId(),
      title: step.title,
      description: step.description,
      duration: Math.max(1, Math.round(step.duration)),
      type: step.type ?? 'routine',
      order: 0,
      transitionCue: step.transitionCue,
      visualCues: step.visualCues,
      executionState: undefined,
      isFlexible: step.type === 'flexZone',
    }));

    updateRoutineSteps((steps) => [...steps, ...newSteps]);

    setAnchorSelections((prev) => [
      ...prev,
      {
        selectionId: `selection-${anchor.id}-${generateLocalId()}`,
        anchorId: anchor.id,
        anchorName: anchor.name,
        stepIds: newSteps.map((step) => step.stepId),
      },
    ]);

    toast.info(`Added ${anchor.name} to the routine.`, 2500);
  };

  const handleRemoveAnchorSelection = (selectionId: string) => {
    const selection = anchorSelections.find((item) => item.selectionId === selectionId);
    if (!selection) return;

    updateRoutineSteps((steps) => steps.filter((step) => !selection.stepIds.includes(step.stepId)));

    setAnchorSelections((prev) => prev.filter((item) => item.selectionId !== selectionId));
  };

  const handleAddManualStep = () => {
    const newStep: RoutineStep = {
      stepId: generateLocalId(),
      title: 'New step',
      description: undefined,
      duration: 5,
      type: 'routine',
      order: draftRoutine.steps.length + 1,
    };
    updateRoutineSteps((steps) => [...steps, newStep]);
  };

  const handleStepUpdate = (stepId: string, updates: Partial<RoutineStep>) => {
    updateRoutineSteps((steps) =>
      steps.map((step) =>
        step.stepId === stepId
          ? {
              ...step,
              ...updates,
              duration: updates.duration ? Math.max(1, Math.round(updates.duration)) : step.duration,
            }
          : step
      )
    );
  };

  const handleStepDelete = (stepId: string) => {
    updateRoutineSteps((steps) => steps.filter((step) => step.stepId !== stepId));
    setAnchorSelections((prev) =>
      prev
        .map((selection) => ({
          ...selection,
          stepIds: selection.stepIds.filter((id) => id !== stepId),
        }))
        .filter((selection) => selection.stepIds.length > 0)
    );
  };

  const handleStepDuplicate = (stepId: string) => {
    updateRoutineSteps((steps) => {
      const index = steps.findIndex((step) => step.stepId === stepId);
      if (index === -1) return steps;
      const source = steps[index];
      const duplicated: RoutineStep = {
        ...source,
        stepId: generateLocalId(),
        title: `${source.title} (copy)`,
        executionState: undefined,
      };
      const nextSteps = [...steps];
      nextSteps.splice(index + 1, 0, duplicated);
      return nextSteps;
    });
  };

  const handleAddStepFromTemplate = (template: LibraryStepTemplate, insertIndex?: number) => {
    updateRoutineSteps((steps) => {
      const newStep: RoutineStep = {
        ...template.payload,
        stepId: generateLocalId(),
        executionState: undefined,
        order: steps.length + 1,
      };
      const nextSteps = [...steps];
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= nextSteps.length) {
        nextSteps.splice(insertIndex, 0, newStep);
      } else {
        nextSteps.push(newStep);
      }
      return reindexSteps(nextSteps);
    });
    toast.success(`Added "${template.title}" to your routine.`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active) return;

    const template = active.data.current?.stepTemplate as LibraryStepTemplate | undefined;
    if (template) {
      if (!over) return;
      if (over.id === 'step-drop-zone') {
        handleAddStepFromTemplate(template);
      } else {
        const insertIndex = draftRoutine.steps.findIndex((step) => step.stepId === over.id);
        handleAddStepFromTemplate(template, insertIndex >= 0 ? insertIndex : undefined);
      }
      return;
    }

    if (!over || over.id === 'step-drop-zone' || active.id === over.id) return;

    updateRoutineSteps((steps) => {
      const oldIndex = steps.findIndex((step) => step.stepId === active.id);
      const newIndex = steps.findIndex((step) => step.stepId === over.id);
      if (oldIndex === -1 || newIndex === -1) return steps;
      return arrayMove(steps, oldIndex, newIndex);
    });
  };

  const resetAnchorForm = () => {
    setAnchorForm({
      name: '',
      category: '',
      description: '',
      tags: '',
      steps: [createDraftStep()],
      autoAdd: true,
    });
    setEditingAnchorId(null);
    setAnchorFormError(null);
  };

  const handleStartCreateAnchor = () => {
    resetAnchorForm();
    setIsAnchorModalOpen(true);
  };

  const handleEditAnchor = (anchor: RoutineAnchor) => {
    setEditingAnchorId(anchor.id);
    setAnchorForm({
      name: anchor.name,
      category: anchor.category,
      description: anchor.description ?? '',
      tags: anchor.tags?.join(', ') ?? '',
      steps:
        anchor.steps.length > 0
          ? anchor.steps.map((step) => ({
              id: `draft-step-${generateLocalId()}`,
              title: step.title,
              duration: String(step.duration ?? 5),
              description: step.description ?? '',
              type: step.type ?? 'routine',
              includeTransition: Boolean(step.transitionCue),
              transitionType: step.transitionCue?.type ?? 'none',
              transitionText: step.transitionCue?.text ?? '',
              transitionAudioUrl: step.transitionCue?.audioUrl ?? '',
              transitionVisualUrl: step.transitionCue?.visualUrl ?? '',
              transitionRequired: step.transitionCue?.isRequired ?? false,
              visualIcon: step.visualCues?.icon ?? '',
            }))
          : [createDraftStep()],
      autoAdd: false,
    });
    setAnchorFormError(null);
    setIsAnchorModalOpen(true);
  };

  const handleDuplicateAnchor = async (anchor: RoutineAnchor) => {
    try {
      const tagsArray = anchor.tags ?? [];
      const duplicatedSteps = anchor.steps.map((step) => ({
        title: step.title,
        description: step.description,
        duration: Math.max(1, Math.round(step.duration ?? 1)),
        type: step.type ?? 'routine',
        transitionCue: step.transitionCue
          ? {
              ...step.transitionCue,
              text: step.transitionCue.text ?? undefined,
              audioUrl: step.transitionCue.audioUrl ?? undefined,
              visualUrl: step.transitionCue.visualUrl ?? undefined,
              isRequired: step.transitionCue.isRequired ?? undefined,
            }
          : undefined,
        visualCues: step.visualCues,
      }));

      const durationTotal = duplicatedSteps.reduce((sum, step) => sum + Math.max(1, Math.round(step.duration)), 0);

      const baseName = `${anchor.name} copy`;
      let safeName = baseName;
      let counter = 2;
      while (anchors.some((existing) => existing.name === safeName)) {
        safeName = `${baseName} ${counter}`;
        counter += 1;
      }

      await addCustomAnchor({
        name: safeName,
        category: anchor.category,
        description: anchor.description,
        tags: tagsArray,
        icon: anchor.icon ?? 'custom',
        estimatedDuration: durationTotal,
        steps: duplicatedSteps,
        benefits: anchor.benefits ?? [],
        createdBy: user?.id,
      });

      toast.success('Anchor duplicated.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to duplicate anchor right now.';
      toast.error(message);
    }
  };

  const handleAnchorFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAnchorFormError(null);

    if (!anchorForm.name.trim()) {
      setAnchorFormError('Anchor name is required.');
      return;
    }

    if (!anchorForm.category.trim()) {
      setAnchorFormError('Please choose a category for this anchor.');
      return;
    }

    const preparedSteps = anchorForm.steps
      .map((step) => {
        const trimmedTitle = step.title.trim();
        const durationValue = Number(step.duration);
        const normalizedDuration = Math.max(1, Math.round(Number.isFinite(durationValue) ? durationValue : 1));
        const transitionTypeActive = step.includeTransition && step.transitionType !== 'none';
        const trimmedTransitionText = step.transitionText.trim();
        const trimmedAudioUrl = step.transitionAudioUrl.trim();
        const trimmedVisualUrl = step.transitionVisualUrl.trim();

        const transitionCue = transitionTypeActive
          ? {
              type: step.transitionType as TransitionCueType,
              text: trimmedTransitionText || undefined,
              audioUrl: trimmedAudioUrl || undefined,
              visualUrl: trimmedVisualUrl || undefined,
              isRequired: step.transitionRequired || undefined,
            }
          : undefined;

        const visualCues = step.visualIcon.trim()
          ? {
              icon: step.visualIcon.trim(),
            }
          : undefined;

        return {
          title: trimmedTitle,
          durationValue,
          anchorStep: {
            title: trimmedTitle,
            description: step.description.trim() || undefined,
            duration: normalizedDuration,
            type: step.type,
            transitionCue,
            visualCues,
          },
        };
      })
      .filter((step) => step.title);

    if (preparedSteps.length === 0) {
      setAnchorFormError('Add at least one step to save this anchor.');
      return;
    }

    if (preparedSteps.some((step) => !Number.isFinite(step.durationValue) || step.durationValue <= 0)) {
      setAnchorFormError('Each step needs a duration of at least one minute.');
      return;
    }

    const anchorSteps = preparedSteps.map((step) => step.anchorStep);
    const estimatedDuration = anchorSteps.reduce((acc, step) => acc + step.duration, 0);
    const tagsArray = anchorForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const baseDetails = {
      name: anchorForm.name.trim(),
      category: anchorForm.category.trim(),
      description: anchorForm.description.trim() || undefined,
      tags: tagsArray,
      estimatedDuration,
      steps: anchorSteps,
    } as const;

    const shouldAutoAdd = anchorForm.autoAdd;

    try {
      if (editingAnchorId) {
        const existingAnchor = anchors.find((anchor) => anchor.id === editingAnchorId);
        await updateCustomAnchor(editingAnchorId, {
          ...baseDetails,
          icon: existingAnchor?.icon ?? 'custom',
          benefits: existingAnchor?.benefits ?? [],
          updatedAt: new Date().toISOString(),
        });

        toast.success('Custom anchor updated.');
      } else {
        const newAnchorId = await addCustomAnchor({
          ...baseDetails,
          icon: 'custom',
          benefits: [],
          createdBy: user?.id,
        });

        toast.success('Custom anchor saved.');

        if (shouldAutoAdd) {
          const latestAnchors = useRoutineStore.getState().anchors;
          const createdAnchor = latestAnchors.find((anchor) => anchor.id === newAnchorId);
          if (createdAnchor) {
            handleAddAnchor(createdAnchor);
          }
        }
      }

      setIsAnchorModalOpen(false);
      resetAnchorForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save anchor right now.';
      setAnchorFormError(message);
    }
  };

  const handleSaveRoutine = async () => {
    if (!draftRoutine.title.trim()) {
      toast.error('Give your routine a title before saving.');
      return;
    }

    if (!hasSteps) {
      toast.error('Add at least one step to create a routine.');
      return;
    }

    setIsSaving(true);

    const normalizedSteps = reindexSteps(
      draftRoutine.steps.map((step) => ({
        ...step,
        duration: Math.max(1, Math.round(step.duration)),
        executionState: undefined,
        createdAt: step.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    );

    try {
      const basePayload = {
        userId: draftRoutine.userId,
        title: draftRoutine.title.trim(),
        description: draftRoutine.description?.trim() || undefined,
        steps: normalizedSteps,
        totalDuration: calculateTotalDuration(normalizedSteps),
        flexibilityScore: calculateFlexibilityScore(normalizedSteps),
        allowDynamicReordering: draftRoutine.allowDynamicReordering,
        pausesBetweenSteps: draftRoutine.pausesBetweenSteps,
        transitionStyle: draftRoutine.transitionStyle,
        schedule: draftRoutine.schedule,
        visualBoard: draftRoutine.visualBoard,
        analytics: draftRoutine.analytics,
        isActive: true,
        isTemplate: false,
      };

      if (editingRoutineId) {
        if (!existingRoutine) {
          throw new Error('Routine not found.');
        }
        await updateRoutine(editingRoutineId, basePayload);
        toast.success('Routine updated successfully.');
      } else {
        await createRoutine({
          ...basePayload,
          version: draftRoutine.version ?? 1,
        });
        toast.success('Routine created successfully.');
      }
      navigate('/routines');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save routine. Please try again.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (editingRoutineId && !existingRoutine) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            onClick={() => navigate(-1)}
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back
          </button>
          <div className="text-right">
            <button
              type="button"
              onClick={handleSaveRoutine}
              disabled={isSaving || !hasSteps}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSaving ? 'Saving...' : isEditMode ? 'Update routine' : 'Save routine'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[32px] persona-gradient p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                {isEditMode ? 'Edit routine' : 'Guided routine builder'}
              </p>
              <div>
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                  {isEditMode ? 'Refine your existing flow' : 'Create a calm, repeatable flow'}
                </h1>
                <p className="mt-3 text-base text-white/85">
                  {isEditMode
                    ? 'Reorder steps, tweak sensory cues, or adjust anchors. Every change stays synced with your dashboard.'
                    : 'Start with anchor blocks, then layer micro-steps, flex zones, or sensory cues. We keep the interface lightweight so beginners can move step-by-step.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/15 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/70">Duration</p>
                  <p className="mt-1 text-2xl font-semibold">{calculateTotalDuration(draftRoutine.steps)}m</p>
                </div>
                <div className="rounded-2xl bg-white/15 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/70">Steps added</p>
                  <p className="mt-1 text-2xl font-semibold">{draftRoutine.steps.length}</p>
                </div>
                <div className="rounded-2xl bg-white/15 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/70">Flex score</p>
                  <p className="mt-1 text-2xl font-semibold">{draftRoutine.flexibilityScore.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 p-5 text-sm text-white/95">
              <p className="font-semibold uppercase tracking-wide text-white">How it works</p>
              <ol className="mt-3 space-y-2 text-white/90">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-white/30 text-center text-xs font-semibold leading-5">
                    1
                  </span>
                  Browse anchor blocks that feel familiar.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-white/30 text-center text-xs font-semibold leading-5">
                    2
                  </span>
                  Drag or tap steps into the outline.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-white/30 text-center text-xs font-semibold leading-5">
                    3
                  </span>
                  Name it, set pacing, and save.
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Name your routine</h2>
                <p className="text-sm text-gray-500">
                  Give it a short title and note any sensory supports or accommodations.
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Stage 3 of 3</span>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="routine-title" className="text-sm font-medium text-gray-700">
                  Routine title
                </label>
                <input
                  id="routine-title"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  value={draftRoutine.title}
                  onChange={(event) =>
                    setDraftRoutine((prev) => ({
                      ...prev,
                      title: event.target.value,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  placeholder="Example: Morning regulation routine"
                />
              </div>
              <div>
                <label htmlFor="routine-description" className="text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  id="routine-description"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={3}
                  value={draftRoutine.description ?? ''}
                  onChange={(event) =>
                    setDraftRoutine((prev) => ({
                      ...prev,
                      description: event.target.value,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  placeholder="Share the purpose, sensory considerations, or accommodations."
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Pacing & feel</h3>
            <p className="text-sm text-gray-500">
              Choose how flexible the routine should be while someone is running it.
            </p>
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draftRoutine.allowDynamicReordering}
                  onChange={(event) =>
                    setDraftRoutine((prev) => ({
                      ...prev,
                      allowDynamicReordering: event.target.checked,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                />
                Allow drag reordering during execution
              </label>
              <div>
                <label className="text-sm font-medium text-gray-700">Pause between steps (sec)</label>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  value={draftRoutine.pausesBetweenSteps}
                  onChange={(event) =>
                    setDraftRoutine((prev) => ({
                      ...prev,
                      pausesBetweenSteps: Math.max(0, Number(event.target.value) || 0),
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Transition feel</label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  value={draftRoutine.transitionStyle}
                  onChange={(event) =>
                    setDraftRoutine((prev) => ({
                      ...prev,
                      transitionStyle: event.target.value as EnhancedRoutine['transitionStyle'],
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                >
                  <option value="gentle">Gentle</option>
                  <option value="structured">Structured</option>
                  <option value="immediate">Immediate</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {stageProgress.map((stage, index) => (
            <div
              key={stage.id}
              className={`rounded-2xl border p-4 shadow-sm ${
                stage.status === 'done'
                  ? 'border-emerald-200 bg-emerald-50'
                  : stage.status === 'current'
                  ? 'border-blue-200 bg-white'
                  : 'border-gray-200 bg-white/70'
              }`}
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                <span className="font-semibold text-gray-500">Step {index + 1}</span>
                {stage.status === 'done' && <span className="text-emerald-600">Complete</span>}
                {stage.status === 'current' && <span className="text-blue-600">In progress</span>}
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900">{stage.title}</p>
              <p className="mt-1 text-sm text-gray-600">{stage.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={handleAddManualStep}
            className="rounded-2xl border border-transparent bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <p className="text-sm font-semibold text-gray-800">Start from scratch</p>
            <p className="mt-1 text-sm text-gray-500">Add a blank step to begin outlining.</p>
          </button>
          <button
            type="button"
            onClick={() => focusPalette('anchors')}
            className="rounded-2xl border border-transparent bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <p className="text-sm font-semibold text-gray-800">Browse anchor blocks</p>
            <p className="mt-1 text-sm text-gray-500">Drop in medication, regulation, or transition anchors.</p>
          </button>
          <button
            type="button"
            onClick={handleStartCreateAnchor}
            className="rounded-2xl border border-transparent bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <p className="text-sm font-semibold text-gray-800">Capture a custom anchor</p>
            <p className="mt-1 text-sm text-gray-500">Save repeatable routines once, reuse everywhere.</p>
          </button>
        </section>

        {anchorError && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {anchorError}
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-6" ref={paletteSectionRef}>
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {BUILDER_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPaletteView(tab.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        paletteView === tab.id
                          ? 'bg-slate-900 text-white shadow'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                      {tab.id === 'insights' && anchorSelections.length > 0 && (
                        <span className="ml-2 rounded-full bg-slate-200 px-2 text-xs text-slate-700">
                          {anchorSelections.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-gray-500">{activePaletteTab.description}</p>
                <div className="mt-6 space-y-4">
                  {paletteView === 'anchors' && (
                    <RoutineAnchorLibrary
                      anchors={anchors}
                      isLoading={isLoadingAnchors}
                      onRefresh={loadAnchors}
                      onSelect={handleAddAnchor}
                      selectedAnchorIds={selectedAnchorIds}
                      onCreateAnchor={handleStartCreateAnchor}
                      onEditAnchor={handleEditAnchor}
                      onDuplicateAnchor={handleDuplicateAnchor}
                    />
                  )}

                  {paletteView === 'steps' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        Drag or tap any snippet to drop it at the cursor. All preset steps support keyboard navigation.
                      </p>
                      <StepLibrary items={stepLibraryItems} onAdd={handleAddStepFromTemplate} />
                    </div>
                  )}

                  {paletteView === 'insights' && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-gray-900">Selected anchors</h3>
                          <span className="text-xs text-gray-500">{anchorSelections.length} added</span>
                        </div>
                        {anchorSelections.length === 0 ? (
                          <p className="mt-3 text-sm text-gray-500">
                            Add anchors from the palette first. They appear here so you can remove or review them.
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-3">
                            {anchorSelections.map((selection) => {
                              const anchor = anchors.find((item) => item.id === selection.anchorId);
                              return (
                                <li
                                  key={selection.selectionId}
                                  className="rounded-xl border border-gray-200/70 p-3 text-sm text-gray-700"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-medium text-gray-900">{selection.anchorName}</p>
                                      <p className="text-xs text-gray-500">{selection.stepIds.length} steps linked</p>
                                      {anchor?.description && (
                                        <p className="mt-1 text-xs text-gray-500">{anchor.description}</p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="text-xs font-medium text-red-500 hover:text-red-600"
                                      onClick={() => handleRemoveAnchorSelection(selection.selectionId)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Total anchors</p>
                          <p className="mt-1 text-2xl font-semibold text-gray-900">{anchorSelections.length}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Manual steps</p>
                          <p className="mt-1 text-2xl font-semibold text-gray-900">
                            {Math.max(draftRoutine.steps.length - anchorSelections.reduce((sum, item) => sum + item.stepIds.length, 0), 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Routine outline</h2>
                    <p className="text-sm text-gray-500">Drag to reorder. Click any step to edit details inline.</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600"
                    onClick={handleAddManualStep}
                  >
                    <PlusIcon className="h-4 w-4" /> Add custom step
                  </button>
                </div>

                <div
                  ref={setStepDropRef}
                  className={`rounded-2xl border ${
                    isStepDropOver ? 'border-blue-300 bg-blue-50/50' : 'border-dashed border-gray-200'
                  } p-1`}
                >
                  {hasSteps ? (
                    <SortableContext
                      items={draftRoutine.steps.map((step) => step.stepId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {draftRoutine.steps.map((step) => (
                          <SortableStepCard
                            key={step.stepId}
                            step={step}
                            isEditable
                            onUpdate={(updates) => handleStepUpdate(step.stepId, updates)}
                            onDelete={() => handleStepDelete(step.stepId)}
                            onDuplicate={() => handleStepDuplicate(step.stepId)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                      Start by adding an anchor or drag a step from the palette into this area.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DndContext>
      </div>

      <Transition appear show={isAnchorModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsAnchorModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {editingAnchorId ? 'Edit custom anchor' : 'Create custom anchor'}
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-gray-500">
                    {editingAnchorId
                      ? 'Update the anchor details, transition cues, and media prompts.'
                      : 'Capture repeatable sequences once and reuse them across routines.'}
                  </p>

                  <form className="mt-4 space-y-4" onSubmit={handleAnchorFormSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Anchor name</label>
                        <input
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                          value={anchorForm.name}
                          onChange={(event) =>
                            setAnchorForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Category</label>
                        <input
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                          value={anchorForm.category}
                          onChange={(event) =>
                            setAnchorForm((prev) => ({ ...prev, category: event.target.value }))
                          }
                          placeholder="Morning, regulation, focus..."
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        rows={3}
                        value={anchorForm.description}
                        onChange={(event) =>
                          setAnchorForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        placeholder="How does this anchor help? Include sensory or support notes."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Tags</label>
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        value={anchorForm.tags}
                        onChange={(event) =>
                          setAnchorForm((prev) => ({ ...prev, tags: event.target.value }))
                        }
                        placeholder="Separate tags with commas"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Steps</h3>
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-md border border-blue-600 px-3 py-1 text-sm font-medium text-blue-600"
                          onClick={() =>
                            setAnchorForm((prev) => ({
                              ...prev,
                              steps: [...prev.steps, createDraftStep()],
                            }))
                          }
                        >
                          <PlusIcon className="h-4 w-4" /> Add step
                        </button>
                      </div>

                      {anchorForm.steps.map((step, index) => (
                        <div key={step.id} className="rounded-md border border-gray-200 p-3">
                          <div className="flex items-start gap-3">
                            <div className="text-sm font-medium text-gray-500">{index + 1}</div>
                            <div className="flex-1 space-y-3">
                              <input
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                                value={step.title}
                                onChange={(event) =>
                                  setAnchorForm((prev) => ({
                                    ...prev,
                                    steps: prev.steps.map((item) =>
                                      item.id === step.id ? { ...item, title: event.target.value } : item
                                    ),
                                  }))
                                }
                                placeholder="Step title"
                                required
                              />

                              <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Duration (minutes)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                    value={step.duration}
                                    onChange={(event) =>
                                      setAnchorForm((prev) => ({
                                        ...prev,
                                        steps: prev.steps.map((item) =>
                                          item.id === step.id ? { ...item, duration: event.target.value } : item
                                        ),
                                      }))
                                    }
                                    placeholder="Duration"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Description</label>
                                  <input
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                    value={step.description}
                                    onChange={(event) =>
                                      setAnchorForm((prev) => ({
                                        ...prev,
                                        steps: prev.steps.map((item) =>
                                          item.id === step.id
                                            ? { ...item, description: event.target.value }
                                            : item
                                        ),
                                      }))
                                    }
                                    placeholder="Optional description"
                                  />
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Step type</label>
                                  <select
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                    value={step.type}
                                    onChange={(event) =>
                                      setAnchorForm((prev) => ({
                                        ...prev,
                                        steps: prev.steps.map((item) =>
                                          item.id === step.id
                                            ? { ...item, type: event.target.value as RoutineStepType }
                                            : item
                                        ),
                                      }))
                                    }
                                  >
                                    <option value="routine">Routine</option>
                                    <option value="flexZone">Flex zone</option>
                                    <option value="note">Note</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Visual cue (emoji or icon)</label>
                                  <input
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                    value={step.visualIcon}
                                    onChange={(event) =>
                                      setAnchorForm((prev) => ({
                                        ...prev,
                                        steps: prev.steps.map((item) =>
                                          item.id === step.id ? { ...item, visualIcon: event.target.value } : item
                                        ),
                                      }))
                                    }
                                    placeholder="e.g. ☀️ or focus"
                                  />
                                </div>
                              </div>

                              <div className="rounded-md bg-gray-50 p-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={step.includeTransition}
                                    onChange={(event) =>
                                      setAnchorForm((prev) => ({
                                        ...prev,
                                        steps: prev.steps.map((item) => {
                                          if (item.id !== step.id) {
                                            return item;
                                          }
                                          if (event.target.checked) {
                                            return {
                                              ...item,
                                              includeTransition: true,
                                              transitionType: item.transitionType === 'none' ? 'text' : item.transitionType,
                                            };
                                          }
                                          return {
                                            ...item,
                                            includeTransition: false,
                                            transitionType: 'none',
                                            transitionText: '',
                                            transitionAudioUrl: '',
                                            transitionVisualUrl: '',
                                            transitionRequired: false,
                                          };
                                        }),
                                      }))
                                    }
                                  />
                                  Include transition cues
                                </label>

                                {step.includeTransition && (
                                  <div className="mt-3 space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-[180px_auto]">
                                      <div>
                                        <label className="text-xs font-medium text-gray-600">Transition type</label>
                                        <select
                                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                          value={step.transitionType}
                                          onChange={(event) =>
                                            setAnchorForm((prev) => ({
                                              ...prev,
                                              steps: prev.steps.map((item) =>
                                                item.id === step.id
                                                  ? {
                                                      ...item,
                                                      transitionType: event.target.value as TransitionCueType,
                                                    }
                                                  : item
                                              ),
                                            }))
                                          }
                                        >
                                          <option value="text">Text</option>
                                          <option value="audio">Audio</option>
                                          <option value="visual">Visual</option>
                                          <option value="mixed">Mixed</option>
                                        </select>
                                      </div>
                                      <label className="mt-6 flex items-center gap-2 text-xs text-gray-600">
                                        <input
                                          type="checkbox"
                                          checked={step.transitionRequired}
                                          onChange={(event) =>
                                            setAnchorForm((prev) => ({
                                              ...prev,
                                              steps: prev.steps.map((item) =>
                                                item.id === step.id
                                                  ? { ...item, transitionRequired: event.target.checked }
                                                  : item
                                              ),
                                            }))
                                          }
                                        />
                                        Require acknowledgement before next step
                                      </label>
                                    </div>

                                    <div>
                                      <label className="text-xs font-medium text-gray-600">Transition prompt</label>
                                      <input
                                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                        value={step.transitionText}
                                        onChange={(event) =>
                                          setAnchorForm((prev) => ({
                                            ...prev,
                                            steps: prev.steps.map((item) =>
                                              item.id === step.id
                                                ? { ...item, transitionText: event.target.value }
                                                : item
                                            ),
                                          }))
                                        }
                                        placeholder="What should happen before moving on?"
                                      />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="text-xs font-medium text-gray-600">Audio cue URL</label>
                                        <input
                                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                          value={step.transitionAudioUrl}
                                          onChange={(event) =>
                                            setAnchorForm((prev) => ({
                                              ...prev,
                                              steps: prev.steps.map((item) =>
                                                item.id === step.id
                                                  ? { ...item, transitionAudioUrl: event.target.value }
                                                  : item
                                              ),
                                            }))
                                          }
                                          placeholder="Optional audio URL"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-medium text-gray-600">Visual cue URL</label>
                                        <input
                                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                                          value={step.transitionVisualUrl}
                                          onChange={(event) =>
                                            setAnchorForm((prev) => ({
                                              ...prev,
                                              steps: prev.steps.map((item) =>
                                                item.id === step.id
                                                  ? { ...item, transitionVisualUrl: event.target.value }
                                                  : item
                                              ),
                                            }))
                                          }
                                          placeholder="Optional visual URL"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {anchorForm.steps.length > 1 && (
                              <button
                                type="button"
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                                onClick={() =>
                                  setAnchorForm((prev) => ({
                                    ...prev,
                                    steps: prev.steps.filter((item) => item.id !== step.id),
                                  }))
                                }
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {!editingAnchorId && (
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={anchorForm.autoAdd}
                          onChange={(event) =>
                            setAnchorForm((prev) => ({ ...prev, autoAdd: event.target.checked }))
                          }
                        />
                        Automatically add this anchor to the routine after saving
                      </label>
                    )}

                    {anchorFormError && (
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {anchorFormError}
                      </div>
                    )}

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600"
                        onClick={() => {
                          resetAnchorForm();
                          setIsAnchorModalOpen(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        {editingAnchorId ? 'Save changes' : 'Save anchor'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default RoutineDesigner;


