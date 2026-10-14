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

export const RecalculateGoalsInputSchema = z.object({
  weightKg: z.number().min(30, "Peso mínimo 30 kg").max(300, "Peso máximo 300 kg"),
  activityLevel: ActivityLevelSchema,
  objective: ObjectiveSchema.optional(),
});
export type RecalculateGoalsInput = z.infer<typeof RecalculateGoalsInputSchema>;

export const DietaryRestrictionSchema = z.enum([
  "lactose_intolerance",
  "celiac_gluten",
  "vegan",
  "vegetarian",
  "low_sodium",
  "low_sugar",
  "nut_allergy",
  "seafood_allergy",
]);
export type DietaryRestriction = z.infer<typeof DietaryRestrictionSchema>;

export const DIETARY_RESTRICTION_LABELS: Record<
  DietaryRestriction,
  { label: string; icon: string; description: string }
> = {
  lactose_intolerance: {
    label: "Sin Lactosa",
    icon: "🥛",
    description: "Evitar lácteos y derivados con lactosa",
  },
  celiac_gluten: {
    label: "Sin Gluten",
    icon: "🌾",
    description: "Evitar trigo, avena no certificada, cebada y centeno",
  },
  vegan: {
    label: "Vegano",
    icon: "🌱",
    description: "Sin carne, lácteos, huevos ni productos animales",
  },
  vegetarian: {
    label: "Vegetariano",
    icon: "🥗",
    description: "Sin carnes ni pescados",
  },
  low_sodium: {
    label: "Bajo en Sodio",
    icon: "🧂",
    description: "Alerta ante alimentos altos en sodio",
  },
  low_sugar: {
    label: "Bajo en Azúcar",
    icon: "🍬",
    description: "Alerta ante alimentos altos en azúcares",
  },
  nut_allergy: {
    label: "Frutos Secos",
    icon: "🥜",
    description: "Alerta ante maní, nueces o almendras",
  },
  seafood_allergy: {
    label: "Mariscos y Pescados",
    icon: "🦐",
    description: "Alerta ante mariscos, crustáceos o pescados",
  },
};
