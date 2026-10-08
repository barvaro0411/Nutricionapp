import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { getDateKey, getDayRange, loggedAtForDate } from "@/utils/dates";
import { usePersonalPlan } from "@/hooks/usePersonalPlan";
import { useAuthStore } from "@/stores/useAuthStore";

export function useWaterTracker(selectedDate: Date = new Date()) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: plan } = usePersonalPlan();
  const { start, end } = getDayRange(selectedDate);
  const dateKey = getDateKey(selectedDate);
  const waterQuery = useQuery({
    queryKey: ["waterLogs", user?.id, dateKey, plan?.dailyGoals.waterMl],
    enabled: !!user?.id,
    queryFn: async ({ signal }) => {
      if (!user) return { totalMl: 0, targetMl: 2000, logs: [] };

      const { data, error } = await supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", start)
        .lt("logged_at", end)
        .order("logged_at", { ascending: false })
        .abortSignal(signal);

      if (error) throw new Error("No se pudo cargar el agua registrada.");
      const totalMl = (data || []).reduce((acc, log) => acc + log.amount_ml, 0);
      const targetMl = plan?.dailyGoals.waterMl ?? 2000;
      return {
        totalMl,
        targetMl,
        logs: data || [],
      };
    },
  });

  const addWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      if (!user) throw new Error("No hay usuario autenticado");

      if (!Number.isInteger(amountMl) || amountMl <= 0 || amountMl > 5000) throw new Error("Cantidad de agua inválida.");
      const { data, error } = await supabase
        .from("water_logs")
        .insert({
          user_id: user.id,
          amount_ml: amountMl,
          logged_at: loggedAtForDate(selectedDate),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waterLogs", user?.id, dateKey] });
    },
  });

  return {
    totalMl: waterQuery.data?.totalMl || 0,
    targetMl: waterQuery.data?.targetMl || 2000,
    logs: waterQuery.data?.logs || [],
    isLoading: waterQuery.isLoading,
    error: waterQuery.error,
    addWater: addWaterMutation.mutateAsync,
    isAdding: addWaterMutation.isPending,
  };
}
