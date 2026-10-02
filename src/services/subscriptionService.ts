import { supabase } from "@/services/supabase";

export interface QuotaCheckResult {
  allowed: boolean;
  is_pro: boolean;
  remaining: number;
}

export interface SubscriptionInfo {
  status: "free" | "active" | "trialing" | "canceled" | "past_due";
  planId: "free" | "pro_monthly_clp" | "pro_annual_clp";
  isPro: boolean;
  remainingAiScans: number;
}

/**
 * Verifica y consume un crédito de análisis con IA para el plan gratuito
 * Si el usuario es Pro, siempre retorna allowed: true
 */
export async function verifyAndConsumeAiQuota(userId: string): Promise<QuotaCheckResult> {
  try {
    const { data, error } = await supabase.rpc("check_and_increment_ai_quota", {
      target_user_id: userId,
    });

    if (error) {
      console.warn("Error en RPC check_and_increment_ai_quota:", error);
      // En caso de fallo transitorio, permitimos la llamada
      return { allowed: true, is_pro: false, remaining: 1 };
    }

    const res = data as any;
    return {
      allowed: !!res.allowed,
      is_pro: !!res.is_pro,
      remaining: Number(res.remaining) || 0,
    };
  } catch (err) {
    console.error("Excepción al verificar cuota de IA:", err);
    return { allowed: true, is_pro: false, remaining: 1 };
  }
}

/**
 * Consulta el estado actual de suscripción de un usuario
 */
export async function fetchUserSubscription(userId: string): Promise<SubscriptionInfo> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      status: "free",
      planId: "free",
      isPro: false,
      remainingAiScans: 3,
    };
  }

  const isPro = data.status === "active" || data.status === "trialing";
  const remaining = isPro ? 9999 : Math.max(0, 3 - (data.ai_photo_scans_today || 0));

  return {
    status: data.status as any,
    planId: data.plan_id as any,
    isPro,
    remainingAiScans: remaining,
  };
}

/**
 * Activa o simula la compra de un plan Pro con RevenueCat
 */
export async function purchaseProPlan(
  userId: string,
  planId: "pro_monthly_clp" | "pro_annual_clp"
) {
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + (planId === "pro_annual_clp" ? 1 : 0));
  if (planId === "pro_monthly_clp") {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      status: "active",
      plan_id: planId,
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
