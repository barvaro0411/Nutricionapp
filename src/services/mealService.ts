import { supabase } from "@/services/supabase";
import { DetectedFoodItem, DetectedFoodItemSchema, MealTotals, MealType } from "@/types/meal";
import { Json } from "@/types/database.types";

export interface SaveMealParams {
  userId: string;
  mealType: MealType;
  imagePath: string | null;
  items: DetectedFoodItem[];
  totals: MealTotals;
  notes?: string;
  loggedAt?: Date;
  clientRequestId?: string;
}

export async function saveMealToDatabase(params: SaveMealParams) {
  const { mealType, imagePath, items, notes, loggedAt, clientRequestId } = params;
  if (!items.length || items.length > 100) throw new Error("La comida debe tener entre 1 y 100 alimentos.");
  const validatedItems = items.map((item) => DetectedFoodItemSchema.parse(item));
  const { data, error } = await supabase.rpc("save_meal", {
    p_meal_type: mealType,
    p_items: validatedItems as unknown as Json,
    p_image_path: imagePath || null,
    p_notes: notes?.trim() || null,
    p_logged_at: (loggedAt || new Date()).toISOString(),
    ...(clientRequestId ? { p_client_request_id: clientRequestId } : {}),
  });
  if (error || !data) throw new Error(`Error al guardar la comida: ${error?.message || "Sin respuesta del servidor"}`);
  return data;
}
