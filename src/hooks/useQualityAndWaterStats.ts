import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePersonalPlan } from "@/hooks/usePersonalPlan";
import { getDateKey, getDayRange } from "@/utils/dates";
import { ProgressPeriod, progressDateKeys } from "@/utils/progressStats";
import {
  buildWarningStampsStats,
  buildWaterPeriodStats,
  MealWithQualityItems,
  WaterLogRow,
} from "@/utils/qualityStats";

export function useQualityAndWaterStats(period: ProgressPeriod = 7) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const { data: plan } = usePersonalPlan();
  const endDate = getDateKey();
  const profileWaterGoal = profile?.current_weight_kg
    ? Math.round(Number(profile.current_weight_kg) * 35)
    : 2000;
  const waterTargetMl = plan?.dailyGoals.waterMl ?? profileWaterGoal;

  return useQuery({
    queryKey: ["qualityAndWaterStats", user?.id, period, endDate, waterTargetMl],
    enabled: !!user?.id,
    queryFn: async ({ signal }) => {
      if (!user) throw new Error("No hay usuario autenticado");
      const dates = progressDateKeys(period, endDate);
      const { start } = getDayRange(dates[0]);
      const { end } = getDayRange(endDate);

      const [waterRes, mealsRes] = await Promise.all([
        supabase
          .from("water_logs")
          .select("amount_ml,logged_at")
          .eq("user_id", user.id)
          .gte("logged_at", start)
          .lt("logged_at", end)
          .abortSignal(signal),
        supabase
          .from("meals")
          .select("logged_at,meal_items(food_name,grams,unit,calories,protein,carbs,fat)")
          .eq("user_id", user.id)
          .gte("logged_at", start)
          .lt("logged_at", end)
          .abortSignal(signal),
      ]);

      if (waterRes.error || mealsRes.error) {
        throw new Error("No se pudieron cargar los datos de hidratación y calidad.");
      }

      return {
        water: buildWaterPeriodStats(
          (waterRes.data || []) as WaterLogRow[],
          dates,
          waterTargetMl
        ),
        stamps: buildWarningStampsStats(
          (mealsRes.data || []) as unknown as MealWithQualityItems[],
          dates
        ),
      };
    },
  });
}
