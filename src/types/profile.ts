import { z } from "zod";

export const GenderSchema = z.enum(["male", "female", "other"]);
export type Gender = z.infer<typeof GenderSchema>;

export const ActivityLevelSchema = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const ObjectiveSchema = z.enum(["lose_weight", "maintain", "gain_muscle"]);
export type Objective = z.infer<typeof ObjectiveSchema>;

export const OnboardingProfileSchema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre"),
  gender: GenderSchema,
  age: z.number().int().min(14, "Debes tener al menos 14 años").max(100),
  heightCm: z.number().min(100, "Altura mínima 100 cm").max(240, "Altura máxima 240 cm"),
  weightKg: z.number().min(30, "Peso mínimo 30 kg").max(300, "Peso máximo 300 kg"),
  activityLevel: ActivityLevelSchema,
  objective: ObjectiveSchema,
});
export type OnboardingProfile = z.infer<typeof OnboardingProfileSchema>;

export const GoalsSchema = z.object({
  calories: z.number().finite().min(1200).max(8000),
  proteinG: z.number().min(20).max(400),
  carbsG: z.number().finite().min(20).max(1600),
  fatG: z.number().min(15).max(300),
});
export type Goals = z.infer<typeof GoalsSchema>;
