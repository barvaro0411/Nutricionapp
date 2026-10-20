import { supabase } from "@/services/supabase";
import { getDateKey } from "@/utils/dates";

export type SubscriptionPlanId = "free" | "pro_monthly_clp" | "pro_annual_clp";
export type SubscriptionStatus = "free" | "active" | "trialing" | "canceled" | "past_due";

export interface UserSubscription {
  userId: string;
  status: SubscriptionStatus;
  planId: SubscriptionPlanId;
  isPro: boolean;
  currentPeriodEnd: string | null;
  trialUsed?: boolean;
  aiPhotoScansToday: number;
  maxFreeScans: number;
  scansRemaining: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  is_pro: boolean;
  remaining: number;
}

export interface PaymentProviderAdapter {
  name: string;
  purchasePlan: (userId: string, planId: Exclude<SubscriptionPlanId, "free">) => Promise<UserSubscription>;
  restorePurchases?: (userId: string) => Promise<UserSubscription>;
}

export const MAX_FREE_DAILY_SCANS = 3;

let paymentAdapter: PaymentProviderAdapter | null = null;

export function registerPaymentAdapter(adapter: PaymentProviderAdapter | null): void {
  paymentAdapter = adapter;
}

function defaultFreeSubscription(userId: string): UserSubscription {
  return {
    userId,
    status: "free",
    planId: "free",
    isPro: false,
    currentPeriodEnd: null,
    trialUsed: false,
    aiPhotoScansToday: 0,
    maxFreeScans: MAX_FREE_DAILY_SCANS,
    scansRemaining: MAX_FREE_DAILY_SCANS,
  };
}

export function mapSubscriptionRow(
  userId: string,
  data: Record<string, unknown> | null | undefined
): UserSubscription {
  if (!data) {
    return defaultFreeSubscription(userId);
  }

  const status = (data.status as SubscriptionStatus) || "free";
  const planId = (data.plan_id as SubscriptionPlanId) || "free";
  const currentPeriodEnd = typeof data.current_period_end === "string" ? data.current_period_end : null;
  const periodValid = !currentPeriodEnd || new Date(currentPeriodEnd).getTime() > Date.now();
  const isPro = (status === "active" || status === "trialing" || (status === "canceled" && Boolean(currentPeriodEnd))) &&
    planId !== "free" &&
    periodValid;

  const todayKey = getDateKey();
  const lastScanDate = typeof data.last_scan_date === "string" ? data.last_scan_date : null;
  const rawScans = Number(data.ai_photo_scans_today) || 0;
  const scansToday = lastScanDate && lastScanDate !== todayKey ? 0 : Math.max(0, rawScans);
  const scansRemaining = isPro ? 9999 : Math.max(0, MAX_FREE_DAILY_SCANS - scansToday);
  const trialUsed = Boolean(data.trial_started_at) || status === "trialing";

  return {
    userId,
    status,
    planId,
    isPro,
    currentPeriodEnd,
    trialUsed,
    aiPhotoScansToday: scansToday,
    maxFreeScans: MAX_FREE_DAILY_SCANS,
    scansRemaining,
  };
}

export async function getSubscription(userId: string): Promise<UserSubscription> {
  if (!userId) {
    return defaultFreeSubscription("");
  }

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return defaultFreeSubscription(userId);
    }

    return mapSubscriptionRow(userId, data as Record<string, unknown>);
  } catch (err) {
    console.warn("Error consultando suscripción:", err);
    return defaultFreeSubscription(userId);
  }
}

export async function checkAndIncrementAiQuota(userId: string): Promise<QuotaCheckResult> {
  if (!userId) throw new Error("No hay usuario autenticado.");

  const { data, error } = await supabase.rpc("check_and_increment_ai_quota", {
    target_user_id: userId,
  });

  if (error || !data) {
    throw new Error(
      error?.message || "No se pudo verificar tu cuota diaria de IA en el servidor. Inténtalo nuevamente."
    );
  }

  const res = data as Record<string, unknown>;
  return {
    allowed: !!res.allowed,
    is_pro: !!res.is_pro,
    remaining: Number(res.remaining) || 0,
  };
}

export async function activateTrial(
  userId: string,
  planId: Exclude<SubscriptionPlanId, "free"> = "pro_annual_clp"
): Promise<UserSubscription> {
  if (!userId) throw new Error("No hay usuario autenticado.");

  const { data, error } = await supabase.rpc("activate_free_trial", {
    p_plan_id: planId,
  });

  if (error || !data) {
    throw new Error(
      error?.message || "No se pudo activar la prueba gratuita en el servidor."
    );
  }

  const sub = mapSubscriptionRow(userId, data as unknown as Record<string, unknown>);
  if (!sub.isPro) {
    throw new Error("El servidor no confirmó la activación de tu prueba Pro.");
  }

  return sub;
}

export async function purchaseProPlan(
  userId?: string,
  planId: Exclude<SubscriptionPlanId, "free"> = "pro_annual_clp"
): Promise<UserSubscription> {
  if (paymentAdapter && userId) {
    return paymentAdapter.purchasePlan(userId, planId);
  }
  throw new Error(
    "Los pagos directos por tienda están en fase de activación. Puedes comenzar tu prueba gratuita de 7 días."
  );
}
