import { Goals, OnboardingProfile } from "@/types/profile";

/**
 * Calcula la Tasa Metabólica Basal (BMR) usando la ecuación validada de Mifflin-St Jeor.
 * Hombres: BMR = (10 × peso_kg) + (6.25 × altura_cm) - (5 × edad) + 5
 * Mujeres: BMR = (10 × peso_kg) + (6.25 × altura_cm) - (5 × edad) - 161
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: "male" | "female" | "other"
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === "male") {
    return Math.round(base + 5);
  } else if (gender === "female") {
    return Math.round(base - 161);
  }
  // En caso de "other", usamos el promedio entre ambas fórmulas
  return Math.round(base - 78);
}

/**
 * Multiplicador de actividad física diaria
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, // Poco o ningún ejercicio (trabajo de escritorio)
  light: 1.375, // Ejercicio ligero 1-3 días a la semana
  moderate: 1.55, // Ejercicio moderado 3-5 días a la semana
  active: 1.725, // Ejercicio fuerte 6-7 días a la semana
  very_active: 1.9, // Trabajo físico duro o entrenamiento atlético intenso
} as const;

/**
 * Calcula el Gasto Energético Total Diario (TDEE)
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: keyof typeof ACTIVITY_MULTIPLIERS
): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Calcula las metas de calorías y macronutrientes basadas en el perfil y objetivo.
 * - Bajar de peso: déficit moderado del 20% (máx 500 kcal).
 * - Mantener: 100% de TDEE.
 * - Subir masa muscular: superávit del 10% (~250-300 kcal).
 *
 * Reparto de macronutrientes:
 * - Proteína: 2.0 g/kg (alta saciedad y preservación de masa magra).
 * - Grasas: 28% de las calorías totales (1 g grasa = 9 kcal).
 * - Carbohidratos: el resto de las calorías (1 g carb = 4 kcal).
 */
export function calculateNutritionGoals(profile: OnboardingProfile): Goals {
  const bmr = calculateBMR(profile.weightKg, profile.heightCm, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  let targetCalories = tdee;
  if (profile.objective === "lose_weight") {
    targetCalories = Math.max(1200, Math.round(tdee * 0.8)); // Déficit del 20%
  } else if (profile.objective === "gain_muscle") {
    targetCalories = Math.round(tdee * 1.1); // Superávit del 10%
  }

  // Proteína: 2.0g por kg de peso
  const targetProteinG = Math.round(profile.weightKg * 2.0);
  const proteinCalories = targetProteinG * 4;

  // Grasas: 28% de calorías totales
  const fatCalories = targetCalories * 0.28;
  const targetFatG = Math.round(fatCalories / 9);

  // Carbohidratos: calorías restantes
  const remainingCalories = Math.max(0, targetCalories - (proteinCalories + targetFatG * 9));
  const targetCarbsG = Math.round(remainingCalories / 4);

  return {
    calories: targetCalories,
    proteinG: targetProteinG,
    carbsG: targetCarbsG,
    fatG: targetFatG,
  };
}
