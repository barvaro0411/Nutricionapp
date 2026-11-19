import { z } from "zod";

export interface MasterPlanData {
  user: {
    fullName: string;
    email?: string | null;
    heightCm: number;
    currentWeightKg: number;
    targetFatPct?: string | null;
    targetWeightKg: number;
    weeklyPaceKg?: string | null;
    bodyFatPct?: number | null;
    skeletalMuscleKg?: number | null;
    bmrKcal?: number | null;
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
      weekdays?: number[];
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

const StandardGoalSchema = z
  .object({
    days: z.string().trim().min(1).max(80),
    calories: z.number().finite().min(800).max(8000),
    caloriesRange: z.string().trim().min(1).max(60),
    proteinG: z.number().finite().min(10).max(400),
    proteinRange: z.string().trim().min(1).max(60),
    carbsG: z.number().finite().min(10).max(1600),
    carbsRange: z.string().trim().min(1).max(60),
    fatG: z.number().finite().min(5).max(300),
    fatRange: z.string().trim().min(1).max(60),
  })
  .passthrough();

const MatchDayGoalSchema = z
  .object({
    days: z.string().trim().min(1).max(80),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    calories: z.number().finite().min(800).max(8000),
    caloriesRange: z.string().trim().min(1).max(60),
    proteinG: z.number().finite().min(10).max(400),
    carbsG: z.number().finite().min(10).max(1600),
    carbsRange: z.string().trim().min(1).max(60),
    fatG: z.number().finite().min(5).max(300),
    fatRange: z.string().trim().min(1).max(60),
    focus: z.string().trim().min(1).max(160),
  })
  .passthrough();

export const MasterPlanSchema = z.object({
  user: z
    .object({
      fullName: z.string().trim().min(1).max(120),
      email: z.string().trim().max(160).nullable().optional(),
      heightCm: z.number().finite().min(100).max(250),
      currentWeightKg: z.number().finite().min(30).max(300),
      targetFatPct: z.string().trim().max(40).nullable().optional(),
      targetWeightKg: z.number().finite().min(30).max(300),
      weeklyPaceKg: z.string().trim().max(60).nullable().optional(),
      bodyFatPct: z.number().finite().min(3).max(70).nullable().optional(),
      skeletalMuscleKg: z.number().finite().min(10).max(100).nullable().optional(),
      bmrKcal: z.number().finite().min(600).max(5000).nullable().optional(),
      objectiveTitle: z.string().trim().min(1).max(160),
      objectiveDesc: z.string().trim().min(1).max(500),
    })
    .passthrough(),
  dailyGoals: z.object({
    standard: StandardGoalSchema,
    matchDay: MatchDayGoalSchema,
    waterMl: z.number().finite().min(1000).max(8000),
    waterRangeL: z.string().trim().min(1).max(40),
  }),
  mealSchedule: z
    .array(
      z
        .object({
          time: z.string().trim().min(1).max(30),
          block: z.string().trim().min(1).max(80),
          detail: z.string().trim().min(1).max(280),
          energyKcal: z.number().finite().min(0).max(4000),
          proteinG: z.string().trim().min(1).max(40),
          notes: z.string().trim().max(240).optional(),
        })
        .passthrough(),
    )
    .max(10),
  weeklyRoutine: z
    .array(
      z
        .object({
          day: z.string().trim().min(1).max(40),
          activity: z.string().trim().min(1).max(120),
          goal: z.string().trim().min(1).max(160),
          intensity: z.string().trim().min(1).max(60),
          exercises: z
            .array(
              z.object({
                name: z.string().trim().min(1).max(100),
                setsReps: z.string().trim().min(1).max(40),
                rir: z.string().trim().min(1).max(30),
                rest: z.string().trim().min(1).max(40),
              }),
            )
            .max(15)
            .optional(),
        })
        .passthrough(),
    )
    .max(10),
  supplements: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        dose: z.string().trim().min(1).max(60),
        timing: z.string().trim().min(1).max(120),
      }),
    )
    .max(12),
  dailyChecklist: z.array(z.string().trim().min(1).max(160)).max(25),
});
