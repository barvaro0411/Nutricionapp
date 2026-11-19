import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MasterPlanData } from "@/data/masterPlan";
import {
  deletePersonalPlan,
  generatePersonalPlanWithAi,
  getChecklistHistory,
  getPersonalPlan,
  getRecentDateKeys,
  savePersonalPlan,
  upsertDailyChecklist,
  type DailyChecklistRow,
  type GeneratePersonalPlanInput,
} from "@/services/personalPlanService";
import { useAuthStore } from "@/stores/useAuthStore";
import { showToast } from "@/utils/alerts";
import { getDateKey } from "@/utils/dates";
import { computeChecklistAdherence, toggleCheckedHabit } from "@/utils/personalPlan";

export function usePersonalPlan() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["personalPlan", user?.id],
    enabled: !!user?.id,
    queryFn: ({ signal }) => getPersonalPlan(user!.id, signal),
  });
}

export function useSavePersonalPlan() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      plan,
      syncGoals = true,
    }: {
      plan: MasterPlanData;
      syncGoals?: boolean;
    }) => savePersonalPlan(plan, { syncGoals }),
    onSuccess: (savedPlan) => {
      if (user?.id) {
        queryClient.setQueryData(["personalPlan", user.id], savedPlan);
      }
      void queryClient.invalidateQueries({ queryKey: ["personalPlan"] });
      void queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
    },
  });
}

export function useDeletePersonalPlan() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Debes iniciar sesión.");
      await deletePersonalPlan(user.id);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.setQueryData(["personalPlan", user.id], null);
      }
      void queryClient.invalidateQueries({ queryKey: ["personalPlan"] });
      void queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
    },
  });
}

export function useGeneratePersonalPlan() {
  return useMutation({
    mutationFn: (input: GeneratePersonalPlanInput) => generatePersonalPlanWithAi(input),
  });
}

export function useChecklistHistory(days: number = 7, referenceDate: Date = new Date()) {
  const user = useAuthStore((s) => s.user);
  const { data: plan } = usePersonalPlan();

  const referenceKey = getDateKey(referenceDate);
  const dateKeys = useMemo(() => getRecentDateKeys(referenceKey, days), [referenceKey, days]);
  const startKey = dateKeys[0];
  const endKey = dateKeys[dateKeys.length - 1];

  const query = useQuery({
    queryKey: ["personalPlanChecklist", user?.id, startKey, endKey],
    enabled: !!user?.id && !!plan,
    queryFn: ({ signal }) => getChecklistHistory(user!.id, startKey, endKey, signal),
  });

  const checkedItemsForDay = useMemo(() => {
    const row = query.data?.find((entry) => entry.plan_date === referenceKey);
    return row?.checked_items ?? [];
  }, [query.data, referenceKey]);

  const adherence = useMemo(
    () =>
      computeChecklistAdherence(
        query.data ?? [],
        dateKeys,
        plan?.dailyChecklist ?? [],
        referenceKey,
      ),
    [query.data, dateKeys, plan?.dailyChecklist, referenceKey],
  );

  return {
    ...query,
    dateKey: referenceKey,
    dateKeys,
    checkedItemsForDay,
    adherence,
  };
}

export function useToggleChecklistItem(dateKey: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      habit,
      checklist,
      currentChecked,
    }: {
      habit: string;
      checklist: string[];
      currentChecked: string[];
    }) => {
      if (!user?.id) throw new Error("Debes iniciar sesión.");
      const next = toggleCheckedHabit(currentChecked, checklist, habit);
      return upsertDailyChecklist(user.id, dateKey, next.checkedItems, next.totalItems);
    },
    onMutate: async ({ habit, checklist, currentChecked }) => {
      const prefixKey = ["personalPlanChecklist", user?.id];
      await queryClient.cancelQueries({ queryKey: prefixKey });

      const previousQueries = queryClient.getQueriesData<DailyChecklistRow[]>({
        queryKey: prefixKey,
      });

      const next = toggleCheckedHabit(currentChecked, checklist, habit);
      const optimisticRow: DailyChecklistRow = {
        plan_date: dateKey,
        checked_items: next.checkedItems,
        total_items: next.totalItems,
        completed_count: next.completedCount,
      };

      for (const [key] of previousQueries) {
        queryClient.setQueryData<DailyChecklistRow[]>(key, (old) => {
          const rows = old ?? [];
          const exists = rows.some((row) => row.plan_date === dateKey);
          if (exists) {
            return rows.map((row) => (row.plan_date === dateKey ? optimisticRow : row));
          }
          return [...rows, optimisticRow].sort((a, b) => a.plan_date.localeCompare(b.plan_date));
        });
      }

      return { previousQueries };
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      showToast({
        type: "error",
        title: "No se pudo guardar el hábito",
        message: err.message,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["personalPlanChecklist", user?.id] });
    },
  });
}
