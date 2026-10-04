
export interface MasterPlanData {
  user: {
    fullName: string;
    email: string;
    heightCm: number;
    currentWeightKg: number;
    targetFatPct: string;
    targetWeightKg: number;
    weeklyPaceKg: string;
    bodyFatPct: number;
    skeletalMuscleKg: number;
    bmrKcal: number;
    objectiveTitle: string;
    objectiveDesc: string;
  };
  dailyGoals: {
    standard: {
      days: string;
      calories: number;
      caloriesRange: string;
      proteinG: number;
      proteinRange: string;
      carbsG: number;
      carbsRange: string;
      fatG: number;
      fatRange: string;
    };
    matchDay: {
      days: string;
      calories: number;
      caloriesRange: string;
      proteinG: number;
      carbsG: number;
      carbsRange: string;
      fatG: number;
      fatRange: string;
      focus: string;
    };
    waterMl: number;
    waterRangeL: string;
  };
  mealSchedule: Array<{
    time: string;
    block: string;
    detail: string;
    energyKcal: number;
    proteinG: string;
    notes?: string;
  }>;
  weeklyRoutine: Array<{
    day: string;
    activity: string;
    goal: string;
    intensity: string;
    exercises?: Array<{
      name: string;
      setsReps: string;
      rir: string;
      rest: string;
    }>;
  }>;
  supplements: Array<{
    name: string;
    dose: string;
    timing: string;
  }>;
  dailyChecklist: string[];
}

