import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import type { MasterPlanData } from "@/data/masterPlan";
import { z } from "zod";

const goal = z.object({ calories: z.number().positive(), proteinG: z.number().nonnegative(), carbsG: z.number().nonnegative(), fatG: z.number().nonnegative() }).passthrough();
const planSchema = z.object({
  user: z.object({ fullName: z.string(), objectiveTitle: z.string(), objectiveDesc: z.string() }).passthrough(),
  dailyGoals: z.object({ standard: goal, matchDay: goal, waterMl: z.number().positive(), waterRangeL: z.string() }),
  mealSchedule: z.array(z.object({ time: z.string(), block: z.string(), detail: z.string(), energyKcal: z.number(), proteinG: z.string() }).passthrough()),
  weeklyRoutine: z.array(z.object({ day: z.string(), activity: z.string(), goal: z.string(), intensity: z.string() }).passthrough()),
  supplements: z.array(z.object({ name: z.string(), dose: z.string(), timing: z.string() })),
  dailyChecklist: z.array(z.string()),
});
export function usePersonalPlan() {
  const user = useAuthStore(s => s.user);
  return useQuery({
    queryKey: ["personalPlan", user?.id], enabled: !!user,
    queryFn: async ({ signal }): Promise<MasterPlanData | null> => {
      const { data, error } = await supabase.from("personal_plans").select("plan").eq("user_id", user!.id).abortSignal(signal).maybeSingle();
      if (error) throw new Error("No se pudo cargar el plan personal.");
      if (!data) return null;
      const parsed = planSchema.safeParse(data.plan);
      if (!parsed.success) throw new Error("El plan personal tiene un formato inválido.");
      return parsed.data as unknown as MasterPlanData;
    },
  });
}
