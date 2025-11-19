import { create } from 'zustand';
import { healthPlannerService } from '../services/healthPlannerService';
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

interface HealthPlannerState {
  medicationRegimens: MedicationRegimen[];
  treatmentSessions: TreatmentSession[];
  nutritionEntries: HealthNutritionEntry[];
  insights: HealthInsightSnapshot[];
  aiSuggestions: string[];
  hydrationReminder?: string;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSynced?: string;
}

interface HealthPlannerActions {
  initialize: () => Promise<void>;
  saveRegimen: (regimen: MedicationRegimenInput) => Promise<void>;
  logDoseIntake: (doseId: string) => Promise<MedicationDose | null>;
  logNutritionEntry: (entry: NutritionEntryInput) => Promise<void>;
  logTreatmentSession: (session: TreatmentSessionInput) => Promise<void>;
  logTreatmentCheckIn: (input: TreatmentCheckInInput) => Promise<void>;
  refreshInsights: (focus: 'medication' | 'treatment' | 'nutrition', summary?: string) => Promise<void>;
  clearError: () => void;
}

const extractSuggestions = (insights: HealthInsightSnapshot[]): string[] => {
  const latest = insights[0];
  if (!latest) return [];
  const nextActions = latest.nextActions ?? {};
  if (Array.isArray(nextActions)) {
    return nextActions.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
  }
  if (Array.isArray(nextActions.recommendations)) {
    return nextActions.recommendations.map((item: unknown) =>
      typeof item === 'string' ? item : JSON.stringify(item)
    );
  }
  return Object.values(nextActions).map((value) =>
    typeof value === 'string' ? value : JSON.stringify(value)
  );
};

const buildHydrationReminder = (entries: HealthNutritionEntry[]): string | undefined => {
  if (entries.length === 0) return undefined;
  const hydrationScores = entries
    .map((entry) => entry.hydrationScore)
    .filter((score): score is number => typeof score === 'number');
  if (hydrationScores.length === 0) return undefined;
  const avg = hydrationScores.reduce((sum, score) => sum + score, 0) / hydrationScores.length;
  if (avg >= 3) return undefined;
  if (avg < 1.5) {
    return 'Hydration is trending low. Consider adding a preferred drink block today.';
  }
  return 'A gentle reminder to log hydration�+"tiny sips count.';
};

export const useHealthPlannerStore = create<HealthPlannerState & HealthPlannerActions>((set, get) => ({
  medicationRegimens: [],
  treatmentSessions: [],
  nutritionEntries: [],
  insights: [],
  aiSuggestions: [],
  hydrationReminder: undefined,
  isLoading: false,
  isSyncing: false,
  error: null,
  lastSynced: undefined,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await healthPlannerService.loadAll();
      set({
        medicationRegimens: data.medicationRegimens,
        treatmentSessions: data.treatmentSessions,
        nutritionEntries: data.nutritionEntries,
        insights: data.insights,
        aiSuggestions: extractSuggestions(data.insights),
        hydrationReminder: buildHydrationReminder(data.nutritionEntries),
        isLoading: false,
        lastSynced: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load health data';
      set({ error: message, isLoading: false });
    }
  },

  saveRegimen: async (regimen) => {
    set({ isSyncing: true, error: null });
    try {
      const saved = await healthPlannerService.upsertRegimen(regimen);
      set((state) => ({
        medicationRegimens: [
          ...state.medicationRegimens.filter((item) => item.id !== saved.id),
          saved,
        ].sort((a, b) => a.name.localeCompare(b.name)),
        isSyncing: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save regimen';
      set({ error: message, isSyncing: false });
      throw error;
    }
  },

  logDoseIntake: async (doseId) => {
    try {
      const updatedDose = await healthPlannerService.recordDoseIntake(doseId);
      if (!updatedDose) {
        return null;
      }
      set((state) => ({
        medicationRegimens: state.medicationRegimens.map((regimen) => ({
          ...regimen,
          doses: regimen.doses.map((dose) => (dose.id === updatedDose.id ? updatedDose : dose)),
        })),
      }));
      return updatedDose;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log medication intake';
      set({ error: message });
      throw error;
    }
  },

  logNutritionEntry: async (entry) => {
    set({ isSyncing: true, error: null });
    try {
      const saved = await healthPlannerService.logNutritionEntry(entry);
      set((state) => {
        const entries = [saved, ...state.nutritionEntries].slice(0, 50);
        return {
          nutritionEntries: entries,
          hydrationReminder: buildHydrationReminder(entries),
          isSyncing: false,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record nutrition entry';
      set({ error: message, isSyncing: false });
      throw error;
    }
  },

  logTreatmentSession: async (session) => {
    set({ isSyncing: true, error: null });
    try {
      const saved = await healthPlannerService.logTreatmentSession(session);
      set((state) => ({
        treatmentSessions: [...state.treatmentSessions, saved],
        isSyncing: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save treatment session';
      set({ error: message, isSyncing: false });
      throw error;
    }
  },

  logTreatmentCheckIn: async (input) => {
    set({ isSyncing: true, error: null });
    try {
      const saved = await healthPlannerService.logTreatmentCheckIn(input);
      set((state) => ({
        treatmentSessions: state.treatmentSessions.map((session) =>
          session.id === saved.sessionId
            ? { ...session, checkIns: [...session.checkIns, saved] }
            : session
        ),
        isSyncing: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save treatment reflection';
      set({ error: message, isSyncing: false });
      throw error;
    }
  },

  refreshInsights: async (focus, summary) => {
    set({ isSyncing: true, error: null });
    try {
      const snapshot = await healthPlannerService.refreshInsights({ focus, summary });
      set((state) => ({
        insights: [snapshot, ...state.insights].slice(0, 10),
        aiSuggestions: extractSuggestions([snapshot, ...state.insights]),
        isSyncing: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh insights';
      set({ error: message, isSyncing: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
