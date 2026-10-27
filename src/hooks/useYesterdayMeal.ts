import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getDateKey, getDayRange } from "@/utils/dates";
import { MealType, parseNutritionReference } from "@/types/meal";
import { isLiquidFood } from "@/utils/liquidUnits";
import { FavoriteComboInput } from "@/stores/useMealReviewStore";

export interface YesterdayMealOption extends FavoriteComboInput {
  meal_type: MealType;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  summaryLabel: string;
}

export function getPreviousDateKey(referenceDate: Date = new Date()): string {
  const currentKey = getDateKey(referenceDate);
  const prev = new Date(`${currentKey}T12:00:00Z`);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return prev.toISOString().slice(0, 10);
}

/**
 * Obtiene las comidas registradas el día anterior agrupadas por horario (desayuno, almuerzo, cena, snack)
 * para habilitar el botón de 1 toque "Repetir de ayer" sin consumir cuota de IA.
 */
export function useYesterdayMeals(referenceDate: Date = new Date()) {
  const user = useAuthStore((state) => state.user);
  const yesterdayKey = getPreviousDateKey(referenceDate);
  const { start, end } = getDayRange(yesterdayKey);

  return useQuery({
    queryKey: ["yesterdayMeals", user?.id, yesterdayKey],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Partial<Record<MealType, YesterdayMealOption>>> => {
      if (!user) return {};

      const { data, error } = await supabase
        .from("meals")
        .select(
          `
          id,
          meal_type,
          total_calories,
          total_protein,
          total_carbs,
          total_fat,
          meal_items (
            id,
            food_name,
            grams,
            unit,
            calories,
            protein,
            carbs,
            fat,
            nutrition_reference
          )
        `
        )
        .eq("user_id", user.id)
        .gte("logged_at", start)
        .lt("logged_at", end)
        .order("logged_at", { ascending: false });

      if (error || !data) return {};

      const byType: Partial<Record<MealType, YesterdayMealOption>> = {};

      for (const row of data as any[]) {
        const type = row.meal_type as MealType;
        if (!type || byType[type]) continue;
        const rawItems = Array.isArray(row.meal_items) ? row.meal_items : [];
        if (rawItems.length === 0) continue;

        const items = rawItems.map((i: any) => ({
          food_name: String(i.food_name || "Alimento"),
          grams: Number(i.grams) || 100,
          unit:
            i.unit === "ml" || (!i.unit && isLiquidFood(String(i.food_name || "")))
              ? ("ml" as const)
              : ("g" as const),
          calories: Number(i.calories) || 0,
          protein: Number(i.protein) || 0,
          carbs: Number(i.carbs) || 0,
          fat: Number(i.fat) || 0,
          nutrition_reference: parseNutritionReference(i.nutrition_reference),
        }));

        const names = items.map((item: { food_name: string }) => item.food_name);
        const summaryLabel =
          names.length <= 2
            ? names.join(" + ")
            : `${names.slice(0, 2).join(", ")} +${names.length - 2} más`;

        byType[type] = {
          id: `yesterday_${row.id}`,
          title: `Ayer: ${summaryLabel}`,
          meal_type: type,
          total_calories: Number(row.total_calories) || 0,
          total_protein: Number(row.total_protein) || 0,
          total_carbs: Number(row.total_carbs) || 0,
          total_fat: Number(row.total_fat) || 0,
          summaryLabel,
          items,
        };
      }

      return byType;
    },
  });
}
