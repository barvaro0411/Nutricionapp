import { FoodUnit, MealTotals } from "@/types/meal";

export interface EditableMealItem {
  id: string;
  food_name: string;
  grams: number;
  unit: FoodUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isNew?: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Escala calorías y macronutrientes proporcionalmente al ajustar los gramos/ml de un alimento guardado.
 */
export function scaleMealItemGrams(
  item: EditableMealItem,
  nextGrams: number
): EditableMealItem {
  if (!Number.isFinite(nextGrams) || nextGrams <= 0) {
    throw new Error("La cantidad debe ser mayor a 0.");
  }
  const safeNext = Math.min(20000, round1(nextGrams));
  const baseGrams = item.grams > 0 ? item.grams : 100;
  const factor = safeNext / baseGrams;

  return {
    ...item,
    grams: safeNext,
    calories: round1(Math.max(0, item.calories) * factor),
    protein: round1(Math.max(0, item.protein) * factor),
    carbs: round1(Math.max(0, item.carbs) * factor),
    fat: round1(Math.max(0, item.fat) * factor),
  };
}

export function computeMealItemsTotals(items: EditableMealItem[]): MealTotals {
  return items.reduce<MealTotals>(
    (acc, item) => ({
      calories: round1(acc.calories + (Number(item.calories) || 0)),
      protein: round1(acc.protein + (Number(item.protein) || 0)),
      carbs: round1(acc.carbs + (Number(item.carbs) || 0)),
      fat: round1(acc.fat + (Number(item.fat) || 0)),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
