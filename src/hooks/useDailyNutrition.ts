import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { MealWithItems } from "@/types/meal";

export function useDailyNutrition(selectedDate: Date = new Date()) {
  const { user } = useAuthStore();

  // Formato local YYYY-MM-DD para la consulta
  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const day = String(selectedDate.getDate()).padStart(2, "0");
  const dateString = `${year}-${month}-${day}`;

  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  return useQuery({
    queryKey: ["dailyNutrition", user?.id, dateString],
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

      if (goalErr) {
        console.error("Error al obtener objetivos:", goalErr);
      }

      // Default goal o meta base
      let goal = goalData || {
        calories: 2175,
        protein_g: 155,
        carbs_g: 245,
        fat_g: 60,
      };

      // Ciclado de carbohidratos en el Plan Maestro: Domingo día de fútbol y recarga
      const isSunday = selectedDate.getDay() === 0;
      if (isSunday && (user?.email === "barvaro0411@gmail.com" || goal.calories === 2175)) {
        goal = {
          ...goal,
          calories: 2550,
          protein_g: 150,
          carbs_g: 360,
          fat_g: 58,
        };
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
        .gte("logged_at", startOfDay.toISOString())
        .lte("logged_at", endOfDay.toISOString())
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
