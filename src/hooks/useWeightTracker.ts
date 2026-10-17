import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  buildWeightTrendStats,
  getTargetWeight,
  getWeightHistory,
  logWeightEntry,
  saveTargetWeight,
} from "@/services/weightService";

export function useWeightTracker(maxPoints = 10) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const userId = user?.id || "";

  const query = useQuery({
    queryKey: ["weightTracker", userId, profile?.current_weight_kg, profile?.objective, maxPoints],
    enabled: !!userId,
    queryFn: async () => {
      const [entries, targetWeightKg] = await Promise.all([
        getWeightHistory(userId, profile),
        getTargetWeight(userId, profile),
      ]);
      return buildWeightTrendStats(entries, targetWeightKg, maxPoints);
    },
  });

  const logWeightMutation = useMutation({
    mutationFn: async (params: { weightKg: number; date?: string }) => {
      if (!userId) throw new Error("Inicia sesión para registrar tu peso.");
      return logWeightEntry({
        userId,
        weightKg: params.weightKg,
        date: params.date,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["weightTracker"] });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: async (targetKg: number) => {
      if (!userId) throw new Error("Inicia sesión para guardar tu meta.");
      return saveTargetWeight(userId, targetKg);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["weightTracker"] });
    },
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
    logWeight: logWeightMutation.mutateAsync,
    isLoggingWeight: logWeightMutation.isPending,
    updateTargetWeight: updateTargetMutation.mutateAsync,
    isUpdatingTarget: updateTargetMutation.isPending,
  };
}
