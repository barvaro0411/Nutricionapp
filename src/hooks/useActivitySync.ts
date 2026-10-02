import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchDailyActivity, saveActivityCalories, ActivityLog } from "@/services/activityService";

export function useActivitySync(selectedDate: Date = new Date()) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const y = selectedDate.getFullYear();
  const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const d = String(selectedDate.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  const activityQuery = useQuery({
    queryKey: ["dailyActivity", user?.id, dateStr],
    enabled: !!user?.id,
    queryFn: () => (user ? fetchDailyActivity(user.id, dateStr) : null),
  });

  const logActivityMutation = useMutation({
    mutationFn: async ({
      calories,
      steps,
      source,
    }: {
      calories: number;
      steps?: number;
      source?: "apple_health" | "health_connect" | "manual";
    }) => {
      if (!user) throw new Error("No hay usuario autenticado");
      return saveActivityCalories(user.id, calories, steps || 0, source || "manual", dateStr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyActivity", user?.id, dateStr] });
    },
  });

  return {
    activity: activityQuery.data,
    burnedCalories: activityQuery.data?.activeCaloriesBurned || 0,
    steps: activityQuery.data?.steps || 0,
    isLoading: activityQuery.isLoading,
    logActivity: logActivityMutation.mutateAsync,
    isLogging: logActivityMutation.isPending,
  };
}
