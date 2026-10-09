import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getDateKey } from "@/utils/dates";
import { buildProgressStats, progressDateKeys, ProgressPeriod, DailyTotalsRow } from "@/utils/progressStats";
export type { DayStat, WeeklyStats } from "@/utils/progressStats";

export function useWeeklyStats(period: ProgressPeriod = 7) {
  const user = useAuthStore(state => state.user);
  const endDate = getDateKey();
  return useQuery({
    queryKey: ["weeklyStats", user?.id, period, endDate],
    enabled: !!user?.id,
    queryFn: async ({ signal }) => {
      if (!user) throw new Error("No hay usuario autenticado");
      const dates = progressDateKeys(period, endDate);
      const { data, error } = await supabase.from("v_daily_totals")
        .select("log_date,total_calories,total_protein,total_carbs,total_fat,meal_count")
        .eq("user_id", user.id).gte("log_date", dates[0]).lte("log_date", endDate)
        .order("log_date", { ascending: true }).abortSignal(signal);
      if (error) throw new Error("No se pudieron cargar las estadísticas.");
      return buildProgressStats((data || []) as DailyTotalsRow[], dates);
    },
  });
}
