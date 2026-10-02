import { supabase } from "@/services/supabase";
import { DetectedFoodItem, MealTotals, MealType } from "@/types/meal";

export interface SaveMealParams {
  userId: string;
  mealType: MealType;
  imagePath: string | null;
  items: DetectedFoodItem[];
  totals: MealTotals;
  notes?: string;
  loggedAt?: Date;
}

export async function saveMealToDatabase(params: SaveMealParams) {
  const { userId, mealType, imagePath, items, totals, notes, loggedAt } = params;

  // 1. Insertar registro principal en 'meals'
  const { data: mealData, error: mealError } = await supabase
    .from("meals")
    .insert({
      user_id: userId,
      meal_type: mealType,
      image_path: imagePath,
      total_calories: totals.calories,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fat: totals.fat,
      notes: notes || null,
      logged_at: (loggedAt || new Date()).toISOString(),
    })
    .select()
    .single();

  if (mealError || !mealData) {
    throw new Error(`Error al guardar la comida: ${mealError?.message}`);
  }

  // 2. Insertar cada uno de los alimentos en 'meal_items'
  const itemsToInsert = items.map((item) => ({
    meal_id: mealData.id,
    food_name: item.food,
    grams: item.grams,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    confidence: item.confidence ?? null,
    ai_detected: true,
  }));

  const { error: itemsError } = await supabase
    .from("meal_items")
    .insert(itemsToInsert);

  if (itemsError) {
    // Si falla el detalle, intentar limpiar la comida huérfana
    await supabase.from("meals").delete().eq("id", mealData.id);
    throw new Error(`Error al guardar el detalle de alimentos: ${itemsError.message}`);
  }

  return mealData;
}
