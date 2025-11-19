export type MedicationIntakeContext = 'morning' | 'midday' | 'evening' | 'bedtime' | 'custom';

export interface MedicationDose {
  id: string;
  regimenId: string;
  label: string;
  dosage: string;
  instructions?: string;
  requiresFood?: boolean;
  intakeWindow: MedicationIntakeContext;
  scheduledTime?: string | null;
  prn?: boolean;
  reminders?: Record<string, unknown>;
  sideEffectWatchlist?: string[];
  lastTakenAt?: string | null;
  streak: number;
  createdAt: string;
  updatedAt?: string;
}

export interface MedicationRegimen {
  id: string;
  userId: string;
  name: string;
  description?: string;
  providerName?: string;
  colorToken?: string;
  sensoryConsiderations?: string;
  adherenceGoal: number;
  createdAt: string;
  updatedAt?: string;
  doses: MedicationDose[];
}

export type TreatmentChannel = 'therapy' | 'occupational' | 'pt' | 'coaching' | 'medical';

export interface TreatmentCheckIn {
  id: string;
  sessionId: string;
  occurredAt: string;
  moodBefore?: number;
  moodAfter?: number;
  energyBefore?: number;
  energyAfter?: number;
  highlights?: Record<string, unknown>;
  blockers?: Record<string, unknown>;
  homework?: Record<string, unknown>;
  aiSummary?: string;
}

export interface TreatmentSession {
  id: string;
  userId: string;
  routineId?: string | null;
  channel: TreatmentChannel;
  focusAreas?: string[];
  provider?: string;
  cadence?: string;
  meetingLink?: string;
  prepTemplate?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  checkIns: TreatmentCheckIn[];
}

export type NutritionEntryType = 'meal' | 'snack' | 'drink' | 'supplement';

export interface HealthNutritionEntry {
  id: string;
  userId: string;
  entryType: NutritionEntryType;
  title: string;
  description?: string;
  occurredAt: string;
  sensoryProfile?: Record<string, unknown>;
  energyBefore?: number;
  energyAfter?: number;
  moodShift?: number;
  hydrationScore?: number;
  tags?: string[];
  aiRecommendation?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface HealthInsightSnapshot {
  id: string;
  userId: string;
  windowStart: string;
  windowEnd: string;
  adherence: Record<string, unknown>;
  correlations: Record<string, unknown>;
  nextActions: Record<string, unknown>;
  generatedAt: string;
}

export interface MedicationRegimenInput
  extends Omit<MedicationRegimen, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'doses'> {
  id?: string;
  doses: Array<
    Omit<MedicationDose, 'regimenId' | 'createdAt' | 'updatedAt'> & {
      id?: string;
    }
  >;
}

export interface NutritionEntryInput
  extends Omit<
    HealthNutritionEntry,
    'id' | 'createdAt' | 'updatedAt' | 'userId' | 'aiRecommendation'
  > {
  aiContext?: string;
}

export interface TreatmentSessionInput
  extends Omit<TreatmentSession, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'checkIns'> {}

export interface TreatmentCheckInInput
  extends Omit<TreatmentCheckIn, 'id' | 'sessionId'> {
  sessionId: string;
  reflection?: string;
}
