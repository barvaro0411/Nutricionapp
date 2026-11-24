export type ExercisePresetId = "walk" | "gym" | "run" | "padel" | "bike";

export interface ExercisePreset {
  id: ExercisePresetId;
  label: string;
  emoji: string;
  met: number;
  stepsPerMin: number;
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  { id: "walk", label: "Caminata", emoji: "🚶", met: 3.8, stepsPerMin: 100 },
  { id: "gym", label: "Pesas / Gym", emoji: "🏋️", met: 5.0, stepsPerMin: 35 },
  { id: "run", label: "Trote", emoji: "🏃", met: 8.3, stepsPerMin: 155 },
  { id: "padel", label: "Pádel / Fútbol", emoji: "🎾", met: 7.0, stepsPerMin: 110 },
  { id: "bike", label: "Bicicleta", emoji: "🚴", met: 6.8, stepsPerMin: 0 },
];

export const EXERCISE_DURATIONS = [20, 30, 45, 60, 90] as const;

/**
 * Estima calorías activas quemadas con la ecuación estándar ACSM/Compendium:
 * kcal = (MET * 3.5 * peso_kg / 200) * minutos
 */
export function estimateExerciseBurn(params: {
  presetId: ExercisePresetId;
  durationMinutes: number;
  weightKg?: number | null;
}): { calories: number; estimatedSteps: number } {
  const preset =
    EXERCISE_PRESETS.find((p) => p.id === params.presetId) || EXERCISE_PRESETS[0];
  const safeWeight =
    typeof params.weightKg === "number" &&
    Number.isFinite(params.weightKg) &&
    params.weightKg >= 30 &&
    params.weightKg <= 300
      ? params.weightKg
      : 70;
  const safeMinutes =
    Number.isFinite(params.durationMinutes) && params.durationMinutes > 0
      ? Math.min(600, params.durationMinutes)
      : 30;

  const calories = Math.round(((preset.met * 3.5 * safeWeight) / 200) * safeMinutes);
  const estimatedSteps = Math.round(preset.stepsPerMin * safeMinutes);

  return { calories, estimatedSteps };
}
