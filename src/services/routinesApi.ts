import { supabase, getCurrentUserId, isSupabaseDemoMode } from './supabase';
import type {
  EnhancedRoutine,
  RoutineAnchor,
  RoutineAnchorStep,
  RoutineStep,
  RoutineStepType,
} from '../types/routine';
import { DEFAULT_ROUTINE_ANCHORS } from '../data/routineAnchors';

const ROUTINE_ANCHOR_TAG = 'routine-anchor';
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DbRoutine = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: string;
  is_active: boolean;
  is_template: boolean;
  flexibility: string;
  schedule: any;
  adaptive_rules: any;
  visual_board: any;
  created_at: string;
  updated_at: string;
};

type DbRoutineStep = {
  step_id: string;
  routine_id: string;
  step_type: RoutineStepType;
  title: string;
  description: string | null;
  duration: number;
  order_index: number;
  transition_cue: any;
  freeform_data: any;
  timer_settings: any;
  is_flexible: boolean | null;
  visual_cues: any;
  neurotype_adaptations: any;
  extensions: any;
  created_at: string | null;
  updated_at: string | null;
  version?: number | null;
};

type DbTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  estimated_duration: number;
  is_public: boolean;
  author_id: string | null;
  tags: string[] | null;
  difficulty: string | null;
  neurotype_optimized: string[] | null;
  created_at: string;
  updated_at: string;
  template_steps?: DbTemplateStep[];
};

type DbTemplateStep = {
  id: string;
  template_id: string;
  step_type: RoutineStepType;
  title: string;
  description: string | null;
  duration: number;
  order_index: number;
  transition_cue: any;
  freeform_data: any;
  timer_settings: any;
  is_flexible: boolean | null;
  visual_cues: any;
  neurotype_adaptations: any;
  extensions: any;
};

const generateFallbackUuid = (): string => {
  const random = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const segment = (size: number) =>
    Array.from({ length: size / 4 }, () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0'))
      .join('')
      .slice(0, size);

  return `${random().slice(0, 8)}-${segment(4)}-4${segment(3)}-a${segment(3)}-${random().padStart(12, '0').slice(0, 12)}`;
};

export const ensureUuid = (value?: string | null): string => {
  if (value && UUID_REGEX.test(value)) {
    return value;
  }

  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return generateFallbackUuid();
};

const calculateFlexibilityLevel = (score: number): string => {
  if (score >= 0.75) return 'adaptive';
  if (score >= 0.5) return 'flexible';
  if (score >= 0.25) return 'structured';
  return 'rigid';
};

const mapRoutineStepToDb = (step: RoutineStep, routineId: string, orderIndex: number) => ({
  step_id: ensureUuid(step.stepId),
  routine_id: routineId,
  step_type: step.type,
  title: step.title,
  description: step.description ?? null,
  duration: Math.max(1, Math.round(step.duration || 1)),
  order_index: orderIndex,
  transition_cue: step.transitionCue ?? null,
  freeform_data: step.freeformData ?? null,
  timer_settings: step.timerSettings ?? null,
  is_flexible: step.isFlexible ?? step.type === 'flexZone',
  visual_cues: step.visualCues ?? null,
  neurotype_adaptations: step.neurotypeAdaptations ?? null,
  extensions: step.extensions ?? null,
});

const mapDbStepToRoutineStep = (row: DbRoutineStep): RoutineStep => ({
  stepId: row.step_id,
  type: row.step_type,
  title: row.title,
  description: row.description ?? undefined,
  duration: row.duration,
  order: row.order_index,
  transitionCue: row.transition_cue ?? undefined,
  freeformData: row.freeform_data ?? undefined,
  timerSettings: row.timer_settings ?? undefined,
  isFlexible: row.is_flexible ?? false,
  visualCues: row.visual_cues ?? undefined,
  neurotypeAdaptations: row.neurotype_adaptations ?? undefined,
  extensions: row.extensions ?? undefined,
  executionState: undefined,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
  version: row.version ?? undefined,
});

const applyRoutineMetadata = (routine: EnhancedRoutine, db: DbRoutine, steps: RoutineStep[]): EnhancedRoutine => {
  const adaptive = (db.adaptive_rules ?? {}) as Record<string, any>;
  return {
    ...routine,
    allowDynamicReordering:
      typeof adaptive.allowDynamicReordering === 'boolean'
        ? adaptive.allowDynamicReordering
        : routine.allowDynamicReordering,
    pausesBetweenSteps: adaptive.pausesBetweenSteps ?? routine.pausesBetweenSteps,
    transitionStyle: adaptive.transitionStyle ?? routine.transitionStyle,
    flexibilityScore: adaptive.flexibilityScore ?? routine.flexibilityScore,
    analytics: adaptive.analytics ?? routine.analytics,
    steps,
    totalDuration: steps.reduce((sum, step) => sum + (step.duration || 0), 0),
    version: adaptive.version ?? routine.version,
  };
};

const mapDbRoutineToEnhanced = (dbRoutine: DbRoutine, dbSteps: DbRoutineStep[]): EnhancedRoutine => {
  const steps = [...dbSteps].sort((a, b) => a.order_index - b.order_index).map(mapDbStepToRoutineStep);

  const base: EnhancedRoutine = {
    id: dbRoutine.id,
    userId: dbRoutine.user_id,
    title: dbRoutine.name,
    description: dbRoutine.description ?? undefined,
    steps,
    totalDuration: steps.reduce((sum, step) => sum + (step.duration || 0), 0),
    flexibilityScore: 0,
    allowDynamicReordering: true,
    pausesBetweenSteps: 0,
    transitionStyle: 'gentle',
    schedule: dbRoutine.schedule ?? { isScheduled: false },
    visualBoard: dbRoutine.visual_board ?? undefined,
    analytics: {
      completionRate: 0,
      averageDuration: 0,
      mostSkippedSteps: [],
      userSatisfaction: 0,
      lastExecuted: undefined,
      totalExecutions: 0,
    },
    isActive: dbRoutine.is_active ?? true,
    isTemplate: dbRoutine.is_template ?? false,
    version: 1,
    createdAt: dbRoutine.created_at,
    updatedAt: dbRoutine.updated_at,
  };

  return applyRoutineMetadata(base, dbRoutine, steps);
};

const mapAnchorStepToDb = (step: RoutineAnchorStep, templateId: string, orderIndex: number) => ({
  template_id: templateId,
  step_type: step.type ?? 'routine',
  title: step.title,
  description: step.description ?? null,
  duration: Math.max(1, Math.round(step.duration || 1)),
  order_index: orderIndex,
  transition_cue: step.transitionCue ?? null,
  freeform_data: null,
  timer_settings: null,
  is_flexible: step.type === 'flexZone',
  visual_cues: step.visualCues ?? null,
  neurotype_adaptations: null,
  extensions: step.extensions ?? null,
});

const mapDbTemplateToAnchor = (template: DbTemplate): RoutineAnchor => {
  const steps = (template.template_steps ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map((step) => ({
      title: step.title,
      description: step.description ?? undefined,
      duration: step.duration,
      type: step.step_type,
      transitionCue: step.transition_cue ?? undefined,
      visualCues: step.visual_cues ?? undefined,
      extensions: step.extensions ?? undefined,
    }));

  return {
    id: template.id,
    name: template.name,
    category: template.category,
    description: template.description ?? undefined,
    icon: 'custom',
    tags: template.tags ?? undefined,
    estimatedDuration: template.estimated_duration,
    steps,
    benefits: undefined,
    isCustom: true,
    createdBy: template.author_id ?? undefined,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  };
};

const buildAdaptiveRules = (routine: EnhancedRoutine) => ({
  allowDynamicReordering: routine.allowDynamicReordering,
  pausesBetweenSteps: routine.pausesBetweenSteps,
  transitionStyle: routine.transitionStyle,
  flexibilityScore: routine.flexibilityScore,
  analytics: routine.analytics,
  version: routine.version,
});

const inferRoutineType = (routine: EnhancedRoutine): string => {
  const title = routine.title.toLowerCase();
  if (title.includes('morning')) return 'morning';
  if (title.includes('evening') || title.includes('bed')) return 'evening';
  if (title.includes('work')) return 'workday';
  return 'custom';
};

const createDemoRoutineId = () => `demo-routine-${Math.random().toString(36).slice(2, 10)}`;

export const routinesApi = {
  async fetchRoutines(): Promise<EnhancedRoutine[]> {
    if (isSupabaseDemoMode || !supabase) {
      return [];
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('routines')
      .select(
        `id, user_id, name, description, type, is_active, is_template, flexibility, schedule, adaptive_rules, visual_board, created_at, updated_at,
         routine_steps(step_id, routine_id, step_type, title, description, duration, order_index, transition_cue, freeform_data, timer_settings, is_flexible, visual_cues, neurotype_adaptations, created_at, updated_at)`
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('order_index', { foreignTable: 'routine_steps', ascending: true });

    if (error) {
      console.error('Failed to load routines:', error);
      throw error;
    }

    return (data || []).map((row: any) =>
      mapDbRoutineToEnhanced(row as DbRoutine, (row.routine_steps || []) as DbRoutineStep[])
    );
  },

  async createRoutine(routine: EnhancedRoutine): Promise<EnhancedRoutine> {
    if (isSupabaseDemoMode || !supabase) {
      const demoRoutine = { ...routine, id: routine.id || createDemoRoutineId() };
      return demoRoutine;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to create routines');
    }

    const payload = {
      user_id: userId,
      name: routine.title,
      description: routine.description ?? null,
      type: inferRoutineType(routine),
      is_active: routine.isActive,
      is_template: routine.isTemplate,
      flexibility: calculateFlexibilityLevel(routine.flexibilityScore ?? 0),
      schedule: routine.schedule ?? { isScheduled: false },
      adaptive_rules: buildAdaptiveRules(routine),
      visual_board: routine.visualBoard ?? null,
    };

    const { data, error } = await supabase
      .from('routines')
      .insert(payload)
      .select('id, created_at, updated_at')
      .single();

    if (error) {
      console.error('Failed to create routine:', error);
      throw error;
    }

    const routineId = data?.id as string;
    const stepsPayload = routine.steps.map((step, index) =>
      mapRoutineStepToDb({ ...step, stepId: ensureUuid(step.stepId) }, routineId, index + 1)
    );

    if (stepsPayload.length > 0) {
      const { error: stepError } = await supabase.from('routine_steps').insert(stepsPayload);
      if (stepError) {
        console.error('Failed to insert routine steps:', stepError);
        throw stepError;
      }
    }

    const refreshed: EnhancedRoutine = {
      ...routine,
      id: routineId,
      createdAt: data?.created_at,
      updatedAt: data?.updated_at,
      steps: routine.steps.map((step, index) => ({
        ...step,
        stepId: stepsPayload[index]?.step_id ?? ensureUuid(step.stepId),
        order: index + 1,
      })),
    };

    return refreshed;
  },

  async updateRoutine(routineId: string, routine: EnhancedRoutine): Promise<void> {
    if (isSupabaseDemoMode || !supabase) {
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to update routines');
    }

    const payload = {
      name: routine.title,
      description: routine.description ?? null,
      type: inferRoutineType(routine),
      is_active: routine.isActive,
      is_template: routine.isTemplate,
      flexibility: calculateFlexibilityLevel(routine.flexibilityScore ?? 0),
      schedule: routine.schedule ?? { isScheduled: false },
      adaptive_rules: buildAdaptiveRules(routine),
      visual_board: routine.visualBoard ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: routineError } = await supabase
      .from('routines')
      .update(payload)
      .eq('id', routineId)
      .eq('user_id', userId);

    if (routineError) {
      console.error('Failed to update routine:', routineError);
      throw routineError;
    }

    const stepsPayload = routine.steps.map((step, index) =>
      mapRoutineStepToDb({ ...step, stepId: ensureUuid(step.stepId) }, routineId, index + 1)
    );

    const { error: deleteError } = await supabase
      .from('routine_steps')
      .delete()
      .eq('routine_id', routineId);

    if (deleteError) {
      console.error('Failed to reset routine steps:', deleteError);
      throw deleteError;
    }

    if (stepsPayload.length > 0) {
      const { error: insertError } = await supabase.from('routine_steps').insert(stepsPayload);
      if (insertError) {
        console.error('Failed to insert routine steps:', insertError);
        throw insertError;
      }
    }
  },

  async deleteRoutine(routineId: string): Promise<void> {
    if (isSupabaseDemoMode || !supabase) {
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to delete routines');
    }

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete routine:', error);
      throw error;
    }
  },

  async duplicateRoutine(source: EnhancedRoutine): Promise<EnhancedRoutine> {
    const copy: EnhancedRoutine = {
      ...source,
      id: ensureUuid(undefined),
      title: `${source.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: source.steps.map((step) => ({
        ...step,
        stepId: ensureUuid(undefined),
        executionState: undefined,
      })),
    };

    return await this.createRoutine(copy);
  },

  async fetchCustomAnchors(): Promise<RoutineAnchor[]> {
    if (isSupabaseDemoMode || !supabase) {
      return [];
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('routine_templates')
      .select(
        `id, name, description, category, estimated_duration, is_public, author_id, tags, difficulty, neurotype_optimized, created_at, updated_at,
         template_steps(id, template_id, step_type, title, description, duration, order_index, transition_cue, visual_cues, timer_settings, is_flexible, freeform_data, neurotype_adaptations)`
      )
      .eq('author_id', userId)
      .contains('tags', [ROUTINE_ANCHOR_TAG])
      .order('created_at', { ascending: false })
      .order('order_index', { foreignTable: 'template_steps', ascending: true });

    if (error) {
      const loweredMessage = `${error.message ?? ''}`.toLowerCase();
      const isMissingTable =
        error.code === 'PGRST116' ||
        error.code === 'PGRST114' ||
        loweredMessage.includes('relation') ||
        loweredMessage.includes('not found');

      if (isMissingTable) {
        console.warn(
          '[routinesApi] routine_templates/template_steps tables not found. Ensure migrations are applied before using custom anchors.'
        );
        return [];
      }

      console.error('Failed to load custom anchors:', error);
      throw error;
    }

    const templates: DbTemplate[] = Array.isArray(data)
      ? (data as DbTemplate[])
      : [];

    return templates.map((row) => mapDbTemplateToAnchor(row));
  },

  async createCustomAnchor(anchor: RoutineAnchor, userId?: string): Promise<RoutineAnchor> {
    if (isSupabaseDemoMode || !supabase) {
      return {
        ...anchor,
        id: ensureUuid(anchor.id),
        isCustom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const resolvedUserId = userId || (await getCurrentUserId());
    if (!resolvedUserId) {
      throw new Error('User must be authenticated to create anchors');
    }

    const templatePayload = {
      name: anchor.name,
      description: anchor.description ?? null,
      category: anchor.category || 'custom',
      estimated_duration: anchor.estimatedDuration,
      is_public: false,
      author_id: resolvedUserId,
      tags: [...(anchor.tags ?? []), ROUTINE_ANCHOR_TAG],
      difficulty: null,
      neurotype_optimized: null,
    };

    const { data, error } = await supabase
      .from('routine_templates')
      .insert(templatePayload)
      .select('id, created_at, updated_at')
      .single();

    if (error) {
      console.error('Failed to create custom anchor:', error);
      throw error;
    }

    const templateId = data?.id as string;
    const stepsPayload = anchor.steps.map((step, index) => mapAnchorStepToDb(step, templateId, index + 1));

    if (stepsPayload.length > 0) {
      const { error: stepError } = await supabase.from('template_steps').insert(stepsPayload);
      if (stepError) {
        console.error('Failed to insert anchor steps:', stepError);
        throw stepError;
      }
    }

    return {
      ...anchor,
      id: templateId,
      isCustom: true,
      tags: [...(anchor.tags ?? []), ROUTINE_ANCHOR_TAG],
      createdBy: resolvedUserId,
      createdAt: data?.created_at,
      updatedAt: data?.updated_at,
    };
  },

  async updateCustomAnchor(anchorId: string, anchor: RoutineAnchor): Promise<void> {
    if (isSupabaseDemoMode || !supabase) {
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to update anchors');
    }

    const payload = {
      name: anchor.name,
      description: anchor.description ?? null,
      category: anchor.category || 'custom',
      estimated_duration: anchor.estimatedDuration,
      tags: [...(anchor.tags ?? []).filter((tag) => tag !== ROUTINE_ANCHOR_TAG), ROUTINE_ANCHOR_TAG],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('routine_templates')
      .update(payload)
      .eq('id', anchorId)
      .eq('author_id', userId);

    if (error) {
      console.error('Failed to update anchor:', error);
      throw error;
    }

    const { error: deleteError } = await supabase
      .from('template_steps')
      .delete()
      .eq('template_id', anchorId);

    if (deleteError) {
      console.error('Failed to reset anchor steps:', deleteError);
      throw deleteError;
    }

    const stepsPayload = anchor.steps.map((step, index) => mapAnchorStepToDb(step, anchorId, index + 1));
    if (stepsPayload.length > 0) {
      const { error: insertError } = await supabase.from('template_steps').insert(stepsPayload);
      if (insertError) {
        console.error('Failed to insert anchor steps:', insertError);
        throw insertError;
      }
    }
  },

  async deleteCustomAnchor(anchorId: string): Promise<void> {
    if (isSupabaseDemoMode || !supabase) {
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to delete anchors');
    }

    const { error } = await supabase
      .from('routine_templates')
      .delete()
      .eq('id', anchorId)
      .eq('author_id', userId);

    if (error) {
      console.error('Failed to delete anchor:', error);
      throw error;
    }
  },

  getDefaultAnchors(): RoutineAnchor[] {
    return DEFAULT_ROUTINE_ANCHORS.map((anchor) => ({
      ...anchor,
      isCustom: false,
      steps: anchor.steps.map((step) => ({ ...step })),
    }));
  },
};

export type RoutineApi = typeof routinesApi;
