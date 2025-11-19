export type EnergyFactor = {
  id: string;
  label: string;
  icon: string;
  impact: 'positive' | 'negative' | 'neutral';
};

export const ENERGY_FACTORS: EnergyFactor[] = [
  { id: 'slept_well', label: 'Slept Well', icon: '😴', impact: 'positive' },
  { id: 'slept_poorly', label: 'Poor Sleep', icon: '😪', impact: 'negative' },
  { id: 'exercised', label: 'Moved Body', icon: '🏃‍♀️', impact: 'positive' },
  { id: 'good_meal', label: 'Nutritious Meal', icon: '🥗', impact: 'positive' },
  { id: 'caffeine', label: 'Caffeine', icon: '☕', impact: 'positive' },
  { id: 'hydrated', label: 'Hydrated', icon: '💧', impact: 'positive' },
  { id: 'stressed', label: 'Stress', icon: '⚠️', impact: 'negative' },
  { id: 'social', label: 'Social Time', icon: '🗣️', impact: 'positive' },
  { id: 'outdoor_time', label: 'Outdoor Time', icon: '🌿', impact: 'positive' },
  { id: 'medication', label: 'Medication', icon: '💊', impact: 'neutral' },
];

export const ENERGY_FACTOR_MAP = ENERGY_FACTORS.reduce(
  (acc, factor) => {
    acc[factor.id] = factor;
    return acc;
  },
  {} as Record<string, EnergyFactor>
);
