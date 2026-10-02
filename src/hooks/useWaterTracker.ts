import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

export function useWaterTracker(selectedDate: Date = new Date()) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const day = String(selectedDate.getDate()).padStart(2, "0");
  const dateKey = `${year}-${month}-${day}`;

  const waterQuery = useQuery({
    queryKey: ["waterLogs", user?.id, dateKey],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) return { totalMl: 0, targetMl: 2000, logs: [] };

      const { data, error } = await supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay.toISOString())
        .lte("logged_at", endOfDay.toISOString())
        .order("logged_at", { ascending: false });

      if (error) {
        console.error("Error al obtener water_logs:", error);
        return { totalMl: 0, targetMl: 2000, logs: [] };
      }

      const totalMl = (data || []).reduce((acc, log) => acc + log.amount_ml, 0);

      return {
        totalMl,
        targetMl: 2000,
        logs: data || [],
      };
    },
  });

  const addWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      if (!user) throw new Error("No hay usuario autenticado");

      const { data, error } = await supabase
        .from("water_logs")
        .insert({
          user_id: user.id,
          amount_ml: amountMl,
          logged_at: new Date().toISOString(),
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
    addWater: addWaterMutation.mutateAsync,
    isAdding: addWaterMutation.isPending,
  };
}
