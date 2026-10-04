import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getDateKey, getDayRange, getWeekday } from "@/utils/dates";
import { usePersonalPlan } from "@/hooks/usePersonalPlan";
import { MealWithItems } from "@/types/meal";

export function useDailyNutrition(selectedDate: Date = new Date()) {
  const { user } = useAuthStore();

  const { data: personalPlan } = usePersonalPlan();
  const dateString = getDateKey(selectedDate);
  const { start, end } = getDayRange(selectedDate);
  return useQuery({
    queryKey: ["dailyNutrition", user?.id, dateString, personalPlan?.dailyGoals],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) throw new Error("No hay usuario autenticado");

      // 1. Obtener objetivo activo
      const { data: goalData, error: goalErr } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalErr) throw new Error("No se pudieron cargar tus metas.");
      if (!goalData) throw new Error("Completa tus metas para ver el resumen.");
      let goal = goalData;
      if (personalPlan && getWeekday(selectedDate) === 0 && goalData.calories === personalPlan.dailyGoals.standard.calories && goalData.protein_g === personalPlan.dailyGoals.standard.proteinG && goalData.carbs_g === personalPlan.dailyGoals.standard.carbsG && goalData.fat_g === personalPlan.dailyGoals.standard.fatG) {
        const planGoal = getWeekday(selectedDate) === 0 ? personalPlan.dailyGoals.matchDay : personalPlan.dailyGoals.standard;
        goal = { ...goalData, calories: planGoal.calories, protein_g: planGoal.proteinG, carbs_g: planGoal.carbsG, fat_g: planGoal.fatG };
      }
      // 2. Obtener comidas registradas en el día con sus ítems
      const { data: mealsData, error: mealsErr } = await supabase
        .from("meals")
        .select(`
          id,
          user_id,
          meal_type,
          logged_at,
          image_path,
          total_calories,
          total_protein,
          total_carbs,
          total_fat,
          notes,
          meal_items (
            id,
            food_name,
            grams,
            calories,
            protein,
            carbs,
            fat,
            confidence,
            ai_detected
          )
        `)
        .eq("user_id", user.id)
        .gte("logged_at", start)
        .lt("logged_at", end)
        .order("logged_at", { ascending: true });

      if (mealsErr) {
        throw new Error(`Error al obtener comidas: ${mealsErr.message}`);
      }

      const meals: MealWithItems[] = (mealsData || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        meal_type: m.meal_type,
        logged_at: m.logged_at,
        image_path: m.image_path,
        total_calories: Number(m.total_calories),
        total_protein: Number(m.total_protein),
        total_carbs: Number(m.total_carbs),
        total_fat: Number(m.total_fat),
        notes: m.notes,
        items: (m.meal_items || []).map((i: any) => ({
          id: i.id,
          food_name: i.food_name,
          grams: Number(i.grams),
          calories: Number(i.calories),
          protein: Number(i.protein),
          carbs: Number(i.carbs),
          fat: Number(i.fat),
          confidence: i.confidence ? Number(i.confidence) : null,
          ai_detected: i.ai_detected,
        })),
      }));

      // 3. Totales consumidos
      const consumed = meals.reduce(
        (acc, meal) => ({
          calories: Math.round((acc.calories + meal.total_calories) * 10) / 10,
          protein: Math.round((acc.protein + meal.total_protein) * 10) / 10,
          carbs: Math.round((acc.carbs + meal.total_carbs) * 10) / 10,
          fat: Math.round((acc.fat + meal.total_fat) * 10) / 10,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      // 4. Totales restantes
      const remaining = {
        calories: Math.max(0, goal.calories - consumed.calories),
        protein: Math.max(0, goal.protein_g - consumed.protein),
        carbs: Math.max(0, goal.carbs_g - consumed.carbs),
        fat: Math.max(0, goal.fat_g - consumed.fat),
      };

      return {
        goal,
        meals,
        consumed,
        remaining,
        dateString,
      };
    },
  });
}
