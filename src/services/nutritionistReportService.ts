import { supabase } from "@/services/supabase";
import { getDateKey, getDayRange } from "@/utils/dates";
import { buildNutritionistReport } from "@/utils/reportBuilder";
export type NutritionistReportData = ReturnType<typeof buildNutritionistReport>;

export async function generateNutritionistReport(userId: string, daysBack = 7): Promise<NutritionistReportData> {
  if (!Number.isInteger(daysBack) || daysBack < 1 || daysBack > 365) throw new Error("Período inválido.");
  const today = new Date();
  const first = new Date(getDateKey(today) + "T12:00:00Z");
  first.setUTCDate(first.getUTCDate() - daysBack + 1);
  const startDate = getDateKey(first);
  const endDate = getDateKey(today);
  const { start } = getDayRange(startDate);
  const { end } = getDayRange(endDate);
  const [profile, meals, water] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("meals").select("meal_type,logged_at,total_calories,total_protein,total_carbs,total_fat,meal_items(food_name,grams)").eq("user_id", userId).gte("logged_at", start).lt("logged_at", end).order("logged_at"),
    supabase.from("water_logs").select("amount_ml,logged_at").eq("user_id", userId).gte("logged_at", start).lt("logged_at", end),
  ]);
  if (profile.error || meals.error || water.error || !profile.data) throw new Error("No se pudo cargar el informe. Revisa tu conexión y vuelve a intentar.");
  return buildNutritionistReport(profile.data, meals.data || [], water.data || [], startDate, endDate);
}
