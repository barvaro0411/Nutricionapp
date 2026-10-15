import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { getDateKey, getDayRange, loggedAtForDate } from "@/utils/dates";
import { usePersonalPlan } from "@/hooks/usePersonalPlan";
import { useAuthStore } from "@/stores/useAuthStore";
import { randomUUID } from "expo-crypto";
import {
  buildWaterMutation,
  enqueueMutation,
  requestBackgroundSync,
} from "@/services/offlineQueueStore";
import { useOfflineStore } from "@/services/offlineService";

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

      const isWebOffline =
        typeof navigator !== "undefined" && navigator.onLine === false;

      if (isWebOffline) {
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes.data.session?.access_token;
        if (token) {
          const reqId = randomUUID();
          const mutation = buildWaterMutation({
            id: reqId,
            accessToken: token,
            userId: user.id,
            amountMl,
            loggedAt: selectedDate,
          });
          await enqueueMutation(mutation);
          await requestBackgroundSync();
          useOfflineStore.getState().incrementPendingSync();
          return {
            id: reqId,
            amount_ml: amountMl,
            user_id: user.id,
            logged_at: loggedAtForDate(selectedDate),
          };
        }
      }

      try {
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
      } catch (err: any) {
        const isNetworkError =
          !err?.status &&
          (err?.message?.includes("network") ||
            err?.message?.includes("fetch") ||
            err?.message?.includes("Failed") ||
            err?.message?.includes("aborted"));

        if (isNetworkError) {
          const sessionRes = await supabase.auth.getSession();
          const token = sessionRes.data.session?.access_token;
          if (token) {
            const reqId = randomUUID();
            const mutation = buildWaterMutation({
              id: reqId,
              accessToken: token,
              userId: user.id,
              amountMl,
              loggedAt: selectedDate,
            });
            await enqueueMutation(mutation);
            await requestBackgroundSync();
            useOfflineStore.getState().incrementPendingSync();
            return {
              id: reqId,
              amount_ml: amountMl,
              user_id: user.id,
              logged_at: loggedAtForDate(selectedDate),
            };
          }
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waterLogs", user?.id, dateKey] });
    },
  });

  const removeWaterMutation = useMutation({
    mutationFn: async (amountMl: number = 250) => {
      if (!user) throw new Error("No hay usuario autenticado");
      const currentLogs = waterQuery.data?.logs || [];
      if (!currentLogs.length) return null;

      const latestLog = currentLogs[0];
      if (latestLog.amount_ml <= amountMl) {
        const { error } = await supabase
          .from("water_logs")
          .delete()
          .eq("id", latestLog.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("water_logs")
          .update({ amount_ml: latestLog.amount_ml - amountMl })
          .eq("id", latestLog.id);
        if (error) throw new Error(error.message);
      }
      return latestLog;
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
    removeWater: removeWaterMutation.mutateAsync,
    isRemoving: removeWaterMutation.isPending,
    canRemoveWater: (waterQuery.data?.totalMl || 0) > 0,
  };
}
