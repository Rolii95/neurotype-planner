import {
  supabase,
  isSupabaseDemoMode,
  isSupabaseNetworkError,
  getCurrentUserId,
} from './supabase';
import { openAIService } from './openaiService';
import type {
  HealthInsightSnapshot,
  HealthNutritionEntry,
  MedicationDose,
  MedicationRegimen,
  MedicationRegimenInput,
  NutritionEntryInput,
  TreatmentCheckIn,
  TreatmentCheckInInput,
  TreatmentSession,
  TreatmentSessionInput,
} from '../types/health';
import type { ConversationContext } from './openaiService';

type HealthPlannerBundle = {
  medicationRegimens: MedicationRegimen[];
  treatmentSessions: TreatmentSession[];
  nutritionEntries: HealthNutritionEntry[];
  insights: HealthInsightSnapshot[];
};

const DEMO_STORAGE_KEY = 'neurotype-health-planner';

const demoDefaults: HealthPlannerBundle = {
  medicationRegimens: [],
  treatmentSessions: [],
  nutritionEntries: [],
  insights: [],
};

const getDemoState = (): HealthPlannerBundle => {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return demoDefaults;
    return { ...demoDefaults, ...JSON.parse(raw) };
  } catch (error) {
    console.warn('Failed to load demo health planner data', error);
    return demoDefaults;
  }
};

const setDemoState = (data: HealthPlannerBundle) => {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
};

const mapRegimenRow = (row: any): MedicationRegimen => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  description: row.description ?? undefined,
  providerName: row.provider_name ?? undefined,
  colorToken: row.color_token ?? undefined,
  sensoryConsiderations: row.sensory_considerations ?? undefined,
  adherenceGoal: row.adherence_goal ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
  doses: (row.medication_doses ?? []).map(mapDoseRow),
});

const mapDoseRow = (row: any): MedicationDose => ({
  id: row.id,
  regimenId: row.regimen_id,
  label: row.label,
  dosage: row.dosage,
  instructions: row.instructions ?? undefined,
  requiresFood: row.requires_food ?? undefined,
  intakeWindow: row.intake_window ?? 'morning',
  scheduledTime: row.scheduled_time ?? null,
  prn: row.prn ?? undefined,
  reminders: row.reminders ?? undefined,
  sideEffectWatchlist: row.side_effect_watchlist ?? undefined,
  lastTakenAt: row.last_taken_at ?? undefined,
  streak: row.streak ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
});

const mapTreatmentRow = (row: any): TreatmentSession => ({
  id: row.id,
  userId: row.user_id,
  routineId: row.routine_id ?? undefined,
  channel: row.channel,
  focusAreas: row.focus_areas ?? undefined,
  provider: row.provider ?? undefined,
  cadence: row.cadence ?? undefined,
  meetingLink: row.meeting_link ?? undefined,
  prepTemplate: row.prep_template ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
  checkIns: (row.treatment_check_ins ?? []).map(mapCheckInRow),
});

const mapCheckInRow = (row: any): TreatmentCheckIn => ({
  id: row.id,
  sessionId: row.session_id,
  occurredAt: row.occurred_at,
  moodBefore: row.mood_before ?? undefined,
  moodAfter: row.mood_after ?? undefined,
  energyBefore: row.energy_before ?? undefined,
  energyAfter: row.energy_after ?? undefined,
  highlights: row.highlights ?? undefined,
  blockers: row.blockers ?? undefined,
  homework: row.homework ?? undefined,
  aiSummary: row.ai_summary ?? undefined,
});

const mapNutritionRow = (row: any): HealthNutritionEntry => ({
  id: row.id,
  userId: row.user_id,
  entryType: row.entry_type,
  title: row.title,
  description: row.description ?? undefined,
  occurredAt: row.occurred_at,
  sensoryProfile: row.sensory_profile ?? undefined,
  energyBefore: row.energy_before ?? undefined,
  energyAfter: row.energy_after ?? undefined,
  moodShift: row.mood_shift ?? undefined,
  hydrationScore: row.hydration_score ?? undefined,
  tags: row.tags ?? undefined,
  aiRecommendation: row.ai_recommendation ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
});

const mapInsightRow = (row: any): HealthInsightSnapshot => ({
  id: row.id,
  userId: row.user_id,
  windowStart: row.window_start,
  windowEnd: row.window_end,
  adherence: row.adherence ?? {},
  correlations: row.correlations ?? {},
  nextActions: row.next_actions ?? {},
  generatedAt: row.generated_at,
});

const ensureUser = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('You must be signed in to manage medication & health data.');
  }
  return userId;
};

const parseAiJson = (content: string) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    console.warn('Failed to parse AI response as JSON. Returning fallback text.', error);
    return {
      adherence: { summary: content },
      correlations: {},
      nextActions: { recommendations: [content] },
    };
  }
};

export const healthPlannerService = {
  async loadAll(): Promise<HealthPlannerBundle> {
    if (isSupabaseDemoMode || !supabase) {
      return getDemoState();
    }

    try {
      const userId = await ensureUser();

      const [{ data: regimens, error: regimenError }, { data: treatments, error: treatmentError }] =
        await Promise.all([
          supabase
            .from('medication_regimens')
            .select('*, medication_doses(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: true }),
          supabase
            .from('treatment_sessions')
            .select('*, treatment_check_ins(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: true }),
        ]);

      const [{ data: nutritionRows, error: nutritionError }, { data: insightRows, error: insightError }] =
        await Promise.all([
          supabase
            .from('health_nutrition_entries')
            .select('*')
            .eq('user_id', userId)
            .order('occurred_at', { ascending: false })
            .limit(50),
          supabase
            .from('health_insight_snapshots')
            .select('*')
            .eq('user_id', userId)
            .order('generated_at', { ascending: false })
            .limit(10),
        ]);

      const networkError =
        [regimenError, treatmentError, nutritionError, insightError].find(
          (err) => err && isSupabaseNetworkError(err)
        ) ?? null;

      if (networkError) {
        console.warn('Health planner data unavailable—falling back to cached entries.', networkError);
        return getDemoState();
      }

      if (regimenError) {
        console.error('Failed to load medication regimens', regimenError);
        throw regimenError;
      }
      if (treatmentError) {
        console.error('Failed to load treatment sessions', treatmentError);
        throw treatmentError;
      }
      if (nutritionError) {
        console.error('Failed to load nutrition entries', nutritionError);
        throw nutritionError;
      }
      if (insightError) {
        console.error('Failed to load health insights', insightError);
        throw insightError;
      }

      return {
        medicationRegimens: (regimens ?? []).map(mapRegimenRow),
        treatmentSessions: (treatments ?? []).map(mapTreatmentRow),
        nutritionEntries: (nutritionRows ?? []).map(mapNutritionRow),
        insights: (insightRows ?? []).map(mapInsightRow),
      };
    } catch (error) {
      if (isSupabaseNetworkError(error)) {
        console.warn('Health planner load failed due to connectivity—serving cached data.', error);
        return getDemoState();
      }
      throw error;
    }
  },

  async upsertRegimen(regimen: MedicationRegimenInput): Promise<MedicationRegimen> {
    if (isSupabaseDemoMode || !supabase) {
      const existing = getDemoState();
      const id = regimen.id ?? crypto.randomUUID();
      const newRegimen: MedicationRegimen = {
        id,
        userId: 'demo-user',
        name: regimen.name,
        description: regimen.description,
        providerName: regimen.providerName,
        colorToken: regimen.colorToken,
        sensoryConsiderations: regimen.sensoryConsiderations,
        adherenceGoal: regimen.adherenceGoal ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        doses: regimen.doses.map((dose) => ({
          ...dose,
          id: crypto.randomUUID(),
          regimenId: id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      };
      const next = {
        ...existing,
        medicationRegimens: [...existing.medicationRegimens.filter((item) => item.id !== id), newRegimen],
      };
      setDemoState(next);
      return newRegimen;
    }

    const userId = await ensureUser();

    const regimenPayload = {
      id: regimen.id,
      user_id: userId,
      name: regimen.name,
      description: regimen.description ?? null,
      provider_name: regimen.providerName ?? null,
      color_token: regimen.colorToken ?? null,
      sensory_considerations: regimen.sensoryConsiderations ?? null,
      adherence_goal: regimen.adherenceGoal ?? 0,
    };

    const { data, error } = await supabase
      .from('medication_regimens')
      .upsert(regimenPayload, { onConflict: 'id' })
      .select('*, medication_doses(*)')
      .single();

    if (error) {
      console.error('Failed to upsert medication regimen', error);
      throw error;
    }

    await supabase.from('medication_doses').delete().eq('regimen_id', data.id);

    if (regimen.doses.length > 0) {
      const dosePayload = regimen.doses.map((dose) => {
        const payload: Record<string, unknown> = {
          regimen_id: data.id,
          label: dose.label,
          dosage: dose.dosage,
          instructions: dose.instructions ?? null,
          requires_food: dose.requiresFood ?? null,
          intake_window: dose.intakeWindow,
          scheduled_time: dose.scheduledTime ?? null,
          prn: dose.prn ?? null,
          reminders: dose.reminders ?? null,
          side_effect_watchlist: dose.sideEffectWatchlist ?? null,
        };
        if (dose.id) {
          payload.id = dose.id;
        }
        return payload;
      });
      const { error: doseError } = await supabase.from('medication_doses').upsert(dosePayload, {
        onConflict: 'id',
      });
      if (doseError) {
        console.error('Failed to upsert medication doses', doseError);
        throw doseError;
      }
    }

    return mapRegimenRow(data);
  },

  async recordDoseIntake(doseId: string): Promise<MedicationDose | null> {
    if (isSupabaseDemoMode || !supabase) {
      const demo = getDemoState();
      const updated: MedicationRegimen[] = demo.medicationRegimens.map((regimen) => ({
        ...regimen,
        doses: regimen.doses.map((dose) =>
          dose.id === doseId
            ? {
                ...dose,
                lastTakenAt: new Date().toISOString(),
                streak: (dose.streak ?? 0) + 1,
              }
            : dose
        ),
      }));
      setDemoState({ ...demo, medicationRegimens: updated });
      return updated.flatMap((regimen) => regimen.doses).find((dose) => dose.id === doseId) ?? null;
    }

    const { data: existing, error: fetchError } = await supabase
      .from('medication_doses')
      .select('streak')
      .eq('id', doseId)
      .single();

    if (fetchError) {
      console.error('Failed to load dose before intake logging', fetchError);
      throw fetchError;
    }

    const newStreak = (existing?.streak ?? 0) + 1;

    const { data, error } = await supabase
      .from('medication_doses')
      .update({
        last_taken_at: new Date().toISOString(),
        streak: newStreak,
      })
      .eq('id', doseId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to log medication intake', error);
      throw error;
    }

    return mapDoseRow(data);
  },

  async logNutritionEntry(entry: NutritionEntryInput): Promise<HealthNutritionEntry> {
    const saveLocally = (): HealthNutritionEntry => {
      const demo = getDemoState();
      const newEntry: HealthNutritionEntry = {
        id: crypto.randomUUID(),
        userId: 'demo-user',
        entryType: entry.entryType,
        title: entry.title,
        description: entry.description,
        occurredAt: entry.occurredAt,
        sensoryProfile: entry.sensoryProfile,
        energyBefore: entry.energyBefore,
        energyAfter: entry.energyAfter,
        moodShift: entry.moodShift,
        hydrationScore: entry.hydrationScore,
        tags: entry.tags,
        aiRecommendation: entry.aiContext ? { note: entry.aiContext } : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDemoState({
        ...demo,
        nutritionEntries: [newEntry, ...demo.nutritionEntries].slice(0, 50),
      });
      return newEntry;
    };

    if (isSupabaseDemoMode || !supabase) {
      return saveLocally();
    }

    const userId = await ensureUser();
    const payload = {
      user_id: userId,
      entry_type: entry.entryType,
      title: entry.title,
      description: entry.description ?? null,
      occurred_at: entry.occurredAt,
      sensory_profile: entry.sensoryProfile ?? null,
      energy_before: entry.energyBefore ?? null,
      energy_after: entry.energyAfter ?? null,
      mood_shift: entry.moodShift ?? null,
      hydration_score: entry.hydrationScore ?? null,
      tags: entry.tags ?? null,
    };

    try {
      const { data, error } = await supabase
        .from('health_nutrition_entries')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        if (isSupabaseNetworkError(error)) {
          console.warn('Falling back to local nutrition log due to connectivity.', error);
          return saveLocally();
        }
        console.error('Failed to log nutrition entry', error);
        throw error;
      }

      let aiRecommendation: Record<string, unknown> | undefined;
      if (entry.aiContext && openAIService.isEnabled()) {
        try {
          const aiResponse = await openAIService.chat(entry.aiContext, {
            conversationType: 'nutrition_support',
            contextData: { entry: payload },
          });
          aiRecommendation = { summary: aiResponse.content, conversationId: aiResponse.conversationId };
          const { error: aiUpdateError } = await supabase
            .from('health_nutrition_entries')
            .update({ ai_recommendation: aiRecommendation })
            .eq('id', data.id);
          if (aiUpdateError && !isSupabaseNetworkError(aiUpdateError)) {
            console.warn('Failed to backfill nutrition AI recommendation', aiUpdateError);
          }
        } catch (aiError) {
          console.warn('Nutrition AI suggestion failed', aiError);
        }
      }

      return mapNutritionRow({ ...data, ai_recommendation: aiRecommendation ?? data.ai_recommendation });
    } catch (error) {
      if (isSupabaseNetworkError(error)) {
        console.warn('Offline nutrition entry saved locally.', error);
        return saveLocally();
      }
      throw error;
    }
  },

  async logTreatmentSession(session: TreatmentSessionInput): Promise<TreatmentSession> {
    if (isSupabaseDemoMode || !supabase) {
      const demo = getDemoState();
      const newSession: TreatmentSession = {
        id: crypto.randomUUID(),
        userId: 'demo-user',
        routineId: session.routineId,
        channel: session.channel,
        focusAreas: session.focusAreas,
        provider: session.provider,
        cadence: session.cadence,
        meetingLink: session.meetingLink,
        prepTemplate: session.prepTemplate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        checkIns: [],
      };
      setDemoState({
        ...demo,
        treatmentSessions: [...demo.treatmentSessions, newSession],
      });
      return newSession;
    }

    const userId = await ensureUser();
    const payload = {
      user_id: userId,
      routine_id: session.routineId ?? null,
      channel: session.channel,
      focus_areas: session.focusAreas ?? null,
      provider: session.provider ?? null,
      cadence: session.cadence ?? null,
      meeting_link: session.meetingLink ?? null,
      prep_template: session.prepTemplate ?? null,
    };

    const { data, error } = await supabase
      .from('treatment_sessions')
      .insert(payload)
      .select('*, treatment_check_ins(*)')
      .single();

    if (error) {
      console.error('Failed to create treatment session', error);
      throw error;
    }

    return mapTreatmentRow(data);
  },

  async logTreatmentCheckIn(input: TreatmentCheckInInput): Promise<TreatmentCheckIn> {
    if (isSupabaseDemoMode || !supabase) {
      const demo = getDemoState();
      const newCheckIn: TreatmentCheckIn = {
        id: crypto.randomUUID(),
        sessionId: input.sessionId,
        occurredAt: input.occurredAt ?? new Date().toISOString(),
        moodBefore: input.moodBefore,
        moodAfter: input.moodAfter,
        energyBefore: input.energyBefore,
        energyAfter: input.energyAfter,
        highlights: input.highlights,
        blockers: input.blockers,
        homework: input.homework,
        aiSummary: input.reflection,
      };
      setDemoState({
        ...demo,
        treatmentSessions: demo.treatmentSessions.map((session) =>
          session.id === input.sessionId
            ? { ...session, checkIns: [...session.checkIns, newCheckIn] }
            : session
        ),
      });
      return newCheckIn;
    }

    const payload = {
      session_id: input.sessionId,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      mood_before: input.moodBefore ?? null,
      mood_after: input.moodAfter ?? null,
      energy_before: input.energyBefore ?? null,
      energy_after: input.energyAfter ?? null,
      highlights: input.highlights ?? null,
      blockers: input.blockers ?? null,
      homework: input.homework ?? null,
    };

    const { data, error } = await supabase
      .from('treatment_check_ins')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create treatment check-in', error);
      throw error;
    }

    let aiSummary: string | undefined;
    if (input.reflection && openAIService.isEnabled()) {
      try {
        const response = await openAIService.chat(input.reflection, {
          conversationType: 'health_support',
          contextData: { payload },
        });
        aiSummary = response.content;
        await supabase
          .from('treatment_check_ins')
          .update({ ai_summary: aiSummary })
          .eq('id', data.id);
      } catch (error) {
        console.warn('Treatment AI summary failed', error);
      }
    }

    return mapCheckInRow({ ...data, ai_summary: aiSummary ?? data.ai_summary });
  },

  async refreshInsights(context: { focus: 'medication' | 'treatment' | 'nutrition'; summary?: string }) {
    if (isSupabaseDemoMode || !supabase) {
      const demo = getDemoState();
      const snapshot: HealthInsightSnapshot = {
        id: crypto.randomUUID(),
        userId: 'demo-user',
        windowStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        windowEnd: new Date().toISOString(),
        adherence: { demo: 'Consistent medication streak tracked.' },
        correlations: { focus: context.focus },
        nextActions: { recommendations: [context.summary ?? 'Keep listening to your body signals.'] },
        generatedAt: new Date().toISOString(),
      };
      setDemoState({
        ...demo,
        insights: [snapshot, ...demo.insights].slice(0, 10),
      });
      return snapshot;
    }

    if (!openAIService.isEnabled()) {
      throw new Error('AI services are disabled. Cannot generate insights.');
    }

    const userId = await ensureUser();
    const contextData: ConversationContext['contextData'] = {
      focus: context.focus,
      summary: context.summary,
    };

    const aiPrompt = `You are generating a structured health insight snapshot. Respond in JSON with keys "adherence", "correlations", and "nextActions" (arrays or objects).
Focus area: ${context.focus}
User summary: ${context.summary ?? 'n/a'}
Keep the tone supportive, concrete, and avoid medical directives.`;

    const aiResponse = await openAIService.chat(aiPrompt, {
      conversationType: 'health_support',
      contextData,
    });
    const parsed = parseAiJson(aiResponse.content);

    const payload = {
      user_id: userId,
      window_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      window_end: new Date().toISOString(),
      adherence: parsed.adherence ?? {},
      correlations: parsed.correlations ?? {},
      next_actions: parsed.nextActions ?? {},
    };

    const { data, error } = await supabase
      .from('health_insight_snapshots')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to store health insight snapshot', error);
      throw error;
    }

    return mapInsightRow(data);
  },
};

export type { HealthPlannerBundle };
