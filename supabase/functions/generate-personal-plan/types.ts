import { z } from "zod";

export const GeneratePersonalPlanRequestSchema = z.object({
  matchDayWeekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  trainingDaysPerWeek: z.number().int().min(0).max(7).default(4),
  trainingFocus: z.string().trim().min(2).max(80).default("Fuerza y composición corporal"),
  equipment: z.enum(["gym", "home_dumbbells", "bodyweight"]).default("gym"),
  mealsPerDay: z.number().int().min(3).max(6).default(4),
  targetWeightKg: z.number().finite().min(30).max(300).optional(),
  includeSupplements: z.boolean().default(true),
  customNotes: z.string().trim().max(240).optional(),
});

export type GeneratePersonalPlanRequest = z.infer<typeof GeneratePersonalPlanRequestSchema>;

const AIStandardGoalSchema = z.object({
  days: z.string().trim().min(1).max(80),
  calories: z.number().finite().min(400).max(20000),
  caloriesRange: z.string().trim().min(1).max(60),
  proteinG: z.number().finite().min(5).max(1000),
  proteinRange: z.string().trim().min(1).max(60),
  carbsG: z.number().finite().min(5).max(3000),
  carbsRange: z.string().trim().min(1).max(60),
  fatG: z.number().finite().min(2).max(1000),
  fatRange: z.string().trim().min(1).max(60),
});

const AIMatchDayGoalSchema = z.object({
  days: z.string().trim().min(1).max(80),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  calories: z.number().finite().min(400).max(20000),
  caloriesRange: z.string().trim().min(1).max(60),
  proteinG: z.number().finite().min(5).max(1000),
  carbsG: z.number().finite().min(5).max(3000),
  carbsRange: z.string().trim().min(1).max(60),
  fatG: z.number().finite().min(2).max(1000),
  fatRange: z.string().trim().min(1).max(60),
  focus: z.string().trim().min(1).max(160),
});

export const AIPersonalPlanOutputSchema = z.object({
  user: z.object({
    fullName: z.string().trim().min(1).max(120).optional(),
    heightCm: z.number().finite().positive().max(260).optional(),
    currentWeightKg: z.number().finite().positive().max(350).optional(),
    targetWeightKg: z.number().finite().positive().max(350).optional(),
    weeklyPaceKg: z.string().trim().max(60).optional(),
    objectiveTitle: z.string().trim().min(2).max(160),
    objectiveDesc: z.string().trim().min(2).max(500),
  }),
  dailyGoals: z.object({
    standard: AIStandardGoalSchema,
    matchDay: AIMatchDayGoalSchema,
    waterMl: z.number().finite().min(1000).max(8000),
    waterRangeL: z.string().trim().min(1).max(40),
  }),
  mealSchedule: z
    .array(
      z.object({
        time: z.string().trim().min(1).max(30),
        block: z.string().trim().min(1).max(80),
        detail: z.string().trim().min(2).max(280),
        energyKcal: z.number().finite().min(0).max(4000),
        proteinG: z.string().trim().min(1).max(40),
        notes: z.string().trim().max(240).optional(),
      }),
    )
    .min(3)
    .max(7),
  weeklyRoutine: z
    .array(
      z.object({
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
          .max(12)
          .optional(),
      }),
    )
    .min(1)
    .max(7),
  supplements: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        dose: z.string().trim().min(1).max(60),
        timing: z.string().trim().min(1).max(120),
      }),
    )
    .max(6),
  dailyChecklist: z.array(z.string().trim().min(2).max(160)).min(3).max(10),
});
