import type { DetectedFoodItemInput } from "@/types/meal";

/** Los nutrientes del análisis pertenecen a su porción, no necesariamente a 100 g/ml. */
export function nutritionPer100(item: DetectedFoodItemInput) {
  if (!Number.isFinite(item.grams) || item.grams <= 0) {
    throw new Error("No se pudo determinar la porción de la etiqueta. Ingresa los valores manualmente.");
  }
  const values = [item.calories, item.protein, item.carbs, item.fat].map(value => value * 100 / item.grams);
  if (values.some(value => !Number.isFinite(value) || value < 0) || values[0] > 1000 || values.slice(1).some(value => value > 100)) {
    throw new Error("La información nutricional no es válida. Revisa los valores por 100 g o ml.");
  }
  const [caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g] = values.map(value => Math.round(value * 10) / 10);
  return { caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g };
}
