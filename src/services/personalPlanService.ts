import { MasterPlanData, MasterPlanSchema } from "@/data/masterPlan";
import { supabase } from "@/services/supabase";
import type { Json } from "@/types/database.types";
import { getDateKey } from "@/utils/dates";
import { extractFunctionErrorMessage } from "@/utils/functionErrors";
import { sanitizeCheckedItems } from "@/utils/personalPlan";

export interface GeneratePersonalPlanInput {
  matchDayWeekdays: number[];
  trainingDaysPerWeek: number;
  trainingFocus: string;
  equipment: "gym" | "home_dumbbells" | "bodyweight";
  mealsPerDay: number;
  targetWeightKg?: number;
  includeSupplements: boolean;
  customNotes?: string;
}

export interface DailyChecklistRow {
  plan_date: string;
  checked_items: string[];
  total_items: number;
  completed_count: number;
  updated_at?: string;
}

/**
 * Builds chronological YYYY-MM-DD keys (America/Santiago) ending at `referenceDate`.
 */
export function getRecentDateKeys(
  referenceDate: Date | string = new Date(),
  days: number = 7,
): string[] {
  const safeDays = Math.max(1, Math.min(31, Math.floor(days)));
  const endKey = typeof referenceDate === "string" ? referenceDate : getDateKey(referenceDate);
  const anchorMs = Date.parse(`${endKey}T12:00:00Z`);
  const keys: string[] = [];
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const d = new Date(anchorMs - offset * 24 * 60 * 60 * 1000);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export async function getPersonalPlan(
  userId: string,
  signal?: AbortSignal,
): Promise<MasterPlanData | null> {
  const baseQuery = supabase
    .from("personal_plans")
    .select("plan")
    .eq("user_id", userId);
  const { data, error } = signal
    ? await baseQuery.abortSignal(signal).maybeSingle()
    : await baseQuery.maybeSingle();

  if (error) {
    throw new Error("No se pudo cargar el plan personal.");
  }
  if (!data) return null;

  const parsed = MasterPlanSchema.safeParse(data.plan);
  if (!parsed.success) {
    throw new Error("El plan personal tiene un formato inválido.");
  }
  return parsed.data as unknown as MasterPlanData;
}

export async function savePersonalPlan(
  plan: MasterPlanData,
  options?: { syncGoals?: boolean },
): Promise<MasterPlanData> {
  const validated = MasterPlanSchema.safeParse(plan);
  if (!validated.success) {
    throw new Error("Revisa los valores del plan antes de guardar.");
  }

  const syncGoals = options?.syncGoals ?? true;
  const { data, error } = await supabase.rpc("save_personal_plan", {
    p_plan: validated.data as unknown as Json,
    p_sync_goals: syncGoals,
  });

  if (error || !data) {
    throw new Error(error?.message || "No se pudo guardar el Plan Maestro.");
  }

  const parsed = MasterPlanSchema.safeParse(data.plan);
  if (!parsed.success) {
    throw new Error("El plan guardado devolvió un formato inesperado.");
  }
  return parsed.data as unknown as MasterPlanData;
}

export async function deletePersonalPlan(userId: string): Promise<void> {
  const { error } = await supabase.from("personal_plans").delete().eq("user_id", userId);
  if (error) {
    throw new Error("No se pudo eliminar el Plan Maestro.");
  }
}

export async function generatePersonalPlanWithAi(
  input: GeneratePersonalPlanInput,
): Promise<{ plan: MasterPlanData; model?: string }> {
  const { data, error } = await supabase.functions.invoke<{
    success: boolean;
    plan?: unknown;
    meta?: { model?: string };
    error?: { message?: string };
  }>("generate-personal-plan", {
    body: input,
  });

  if (error) {
    const msg = await extractFunctionErrorMessage(
      error,
      "No se pudo generar el Plan Maestro con IA. Inténtalo nuevamente.",
    );
    throw new Error(msg);
  }

  if (!data?.success || !data.plan) {
    throw new Error(data?.error?.message || "La IA no devolvió un Plan Maestro válido.");
  }

  const parsed = MasterPlanSchema.safeParse(data.plan);
  if (!parsed.success) {
    throw new Error("El Plan Maestro recibido no cumple con la estructura esperada.");
  }

  return {
    plan: parsed.data as unknown as MasterPlanData,
    model: data.meta?.model,
  };
}

export async function getChecklistHistory(
  userId: string,
  startDateKey: string,
  endDateKey: string,
  signal?: AbortSignal,
): Promise<DailyChecklistRow[]> {
  const query = supabase
    .from("plan_daily_checklists")
    .select("plan_date,checked_items,total_items,completed_count,updated_at")
    .eq("user_id", userId)
    .gte("plan_date", startDateKey)
    .lte("plan_date", endDateKey)
    .order("plan_date", { ascending: true });

  const { data, error } = signal ? await query.abortSignal(signal) : await query;

  if (error) {
    throw new Error("No se pudo cargar el historial del checklist.");
  }

  return (data || []).map((row) => {
    const totalItems = Math.max(0, Number(row.total_items ?? 0));
    const checkedItems = sanitizeCheckedItems(row.checked_items);
    const completedCount = Math.min(totalItems, Math.max(0, Number(row.completed_count ?? checkedItems.length)));
    return {
      plan_date: row.plan_date,
      checked_items: checkedItems,
      total_items: totalItems,
      completed_count: completedCount,
      updated_at: row.updated_at,
    };
  });
}

export async function upsertDailyChecklist(
  userId: string,
  planDate: string,
  checkedItems: readonly string[],
  totalItems: number,
): Promise<DailyChecklistRow> {
  const sanitized = sanitizeCheckedItems(checkedItems);
  const safeTotal = Math.max(0, Math.min(50, Math.round(totalItems)));
  const safeCompleted = Math.min(safeTotal, sanitized.length);

  const { data, error } = await supabase
    .from("plan_daily_checklists")
    .upsert(
      {
        user_id: userId,
        plan_date: planDate,
        checked_items: sanitized,
        total_items: safeTotal,
        completed_count: safeCompleted,
      },
      { onConflict: "user_id,plan_date" },
    )
    .select("plan_date,checked_items,total_items,completed_count,updated_at")
    .single();

  if (error || !data) {
    throw new Error("No se pudo guardar el checklist del día.");
  }

  return {
    plan_date: data.plan_date,
    checked_items: sanitizeCheckedItems(data.checked_items),
    total_items: Number(data.total_items ?? safeTotal),
    completed_count: Number(data.completed_count ?? safeCompleted),
    updated_at: data.updated_at,
  };
}
