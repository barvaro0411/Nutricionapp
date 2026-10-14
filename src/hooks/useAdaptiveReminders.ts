import { useEffect, useMemo } from "react";
import { useUserStreak } from "@/hooks/useUserStreak";
import { useWaterTracker } from "@/hooks/useWaterTracker";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  evaluateAdaptiveRisks,
  syncAdaptiveNotifications,
  AdaptiveRiskState,
} from "@/services/notificationService";

export function useAdaptiveReminders() {
  const userId = useAuthStore((state) => state.user?.id);
  const { data: streakData } = useUserStreak();
  const { totalMl: waterTotalMl, targetMl: waterTargetMl } = useWaterTracker();
  const { data: nutritionData } = useDailyNutrition();

  const currentStreak = streakData?.currentStreak ?? 0;
  const hasLoggedToday = streakData?.hasLoggedToday ?? false;
  const mealCount = nutritionData?.meals?.length ?? 0;

  const effectiveHasLogged = hasLoggedToday || mealCount > 0;

  const risks: AdaptiveRiskState = useMemo(() => {
    return evaluateAdaptiveRisks({
      currentStreak,
      hasLoggedToday: effectiveHasLogged,
      waterTotalMl,
      waterTargetMl,
    });
  }, [currentStreak, effectiveHasLogged, waterTotalMl, waterTargetMl]);

  useEffect(() => {
    if (!userId) return;

    void syncAdaptiveNotifications({
      userId,
      currentStreak,
      hasLoggedToday: effectiveHasLogged,
      waterTotalMl,
      waterTargetMl,
    });
  }, [userId, currentStreak, effectiveHasLogged, waterTotalMl, waterTargetMl]);

  return {
    ...risks,
    hasLoggedToday: effectiveHasLogged,
    waterTotalMl,
    waterTargetMl,
  };
}
