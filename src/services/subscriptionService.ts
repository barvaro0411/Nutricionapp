import { supabase } from "@/services/supabase";

export type SubscriptionPlanId = "free" | "pro_monthly_clp" | "pro_annual_clp";
export type SubscriptionStatus = "free" | "active" | "trialing" | "canceled" | "past_due";

export interface UserSubscription {
  userId: string;
  status: SubscriptionStatus;
  planId: SubscriptionPlanId;
  isPro: boolean;
  currentPeriodEnd: string | null;
  aiPhotoScansToday: number;
  maxFreeScans: number;
  scansRemaining: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  is_pro: boolean;
  remaining: number;
}

export const MAX_FREE_DAILY_SCANS = 3;

export async function getSubscription(userId: string): Promise<UserSubscription> {
  if (!userId) {
    return {
      userId: "",
      status: "free",
      planId: "free",
      isPro: false,
      currentPeriodEnd: null,
      aiPhotoScansToday: 0,
      maxFreeScans: MAX_FREE_DAILY_SCANS,
      scansRemaining: MAX_FREE_DAILY_SCANS,
    };
  }

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return {
        userId,
        status: "free",
        planId: "free",
        isPro: false,
        currentPeriodEnd: null,
        aiPhotoScansToday: 0,
        maxFreeScans: MAX_FREE_DAILY_SCANS,
        scansRemaining: MAX_FREE_DAILY_SCANS,
      };
    }

    const isPro = data.status === "active" || data.status === "trialing";
    const scansToday = Number(data.ai_photo_scans_today) || 0;
    const scansRemaining = isPro ? 9999 : Math.max(0, MAX_FREE_DAILY_SCANS - scansToday);

    return {
      userId,
      status: (data.status as SubscriptionStatus) || "free",
      planId: (data.plan_id as SubscriptionPlanId) || "free",
      isPro,
      currentPeriodEnd: data.current_period_end || null,
      aiPhotoScansToday: scansToday,
      maxFreeScans: MAX_FREE_DAILY_SCANS,
      scansRemaining,
    };
  } catch (err) {
    console.warn("Error consultando suscripción:", err);
    return {
      userId,
      status: "free",
      planId: "free",
      isPro: false,
      currentPeriodEnd: null,
      aiPhotoScansToday: 0,
      maxFreeScans: MAX_FREE_DAILY_SCANS,
      scansRemaining: MAX_FREE_DAILY_SCANS,
    };
  }
}

export async function checkAndIncrementAiQuota(userId: string): Promise<QuotaCheckResult> {
  if (!userId) throw new Error("No hay usuario autenticado.");

  const { data, error } = await supabase.rpc("check_and_increment_ai_quota", {
    target_user_id: userId,
  });

  if (error || !data) {
    // Si la función RPC no está disponible o falla, permitir la solicitud por resiliencia
    return { allowed: true, is_pro: false, remaining: 1 };
  }

  const res = (data || {}) as Record<string, unknown>;
  return {
    allowed: !!res.allowed,
    is_pro: !!res.is_pro,
    remaining: Number(res.remaining) || 0,
  };
}

export async function activateTrial(userId: string): Promise<UserSubscription> {
  if (!userId) throw new Error("No hay usuario autenticado.");

  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);

  await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      status: "trialing",
      plan_id: "pro_monthly_clp",
      current_period_end: trialEndDate.toISOString(),
      updated_at: new Date().toISOString(),
    });

  return getSubscription(userId);
}

export async function purchaseProPlan(): Promise<never> {
  throw new Error("Los pagos directos por tienda están en fase de activación. Puedes comenzar tu prueba gratuita de 7 días.");
}
