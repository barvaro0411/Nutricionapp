import { getDateKey, getWeekday } from "@/utils/dates";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

export interface DayStat {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Lun", "Mar", etc.
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
}

export interface WeeklyStats {
  days: DayStat[];
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  totalMeals: number;
}

export function useWeeklyStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["weeklyStats", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<WeeklyStats> => {
      if (!user) throw new Error("No hay usuario autenticado");

      // Calcular rango de los últimos 7 días
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("v_daily_totals")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", getDateKey(sevenDaysAgo))
        .lte("log_date", getDateKey(today))
        .order("log_date", { ascending: true });

      if (error) {
        throw new Error("No se pudieron cargar las estadísticas.");
      }

      const rowsByDate: Record<string, any> = {};
      (data || []).forEach((row: any) => {
        rowsByDate[row.log_date] = row;
      });

      const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const days: DayStat[] = [];
      let sumCalories = 0;
      let sumProtein = 0;
      let sumCarbs = 0;
      let sumFat = 0;
      let totalMeals = 0;

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateIso = getDateKey(d);

        const row = rowsByDate[dateIso];
        const cals = row ? Number(row.total_calories) : 0;
        const prot = row ? Number(row.total_protein) : 0;
        const carbs = row ? Number(row.total_carbs) : 0;
        const fat = row ? Number(row.total_fat) : 0;
        const meals = row ? Number(row.meal_count) : 0;

        sumCalories += cals;
        sumProtein += prot;
        sumCarbs += carbs;
        sumFat += fat;
        totalMeals += meals;

        days.push({
          date: dateIso,
          dayLabel: dayNames[getWeekday(d)],
          calories: cals,
          protein: prot,
          carbs: carbs,
          fat: fat,
          mealCount: meals,
        });
      }

      // Días con al menos un registro para promediar realistamente, o 7
      const loggedDaysCount = days.filter((d) => d.mealCount > 0).length || 1;

      return {
        days,
        averages: {
          calories: Math.round(sumCalories / loggedDaysCount),
          protein: Math.round(sumProtein / loggedDaysCount),
          carbs: Math.round(sumCarbs / loggedDaysCount),
          fat: Math.round(sumFat / loggedDaysCount),
        },
        totalMeals,
      };
    },
  });
}
