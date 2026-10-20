import {
  getSubscription,
  checkAndIncrementAiQuota,
  activateTrial,
  purchaseProPlan,
  registerPaymentAdapter,
  MAX_FREE_DAILY_SCANS,
} from "../subscriptionService";
import { supabase } from "@/services/supabase";
import { getDateKey } from "@/utils/dates";

jest.mock("@/services/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe("subscriptionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerPaymentAdapter(null);
  });

  describe("getSubscription", () => {
    test("returns default free subscription when userId is empty", async () => {
      const sub = await getSubscription("");
      expect(sub.isPro).toBe(false);
      expect(sub.status).toBe("free");
      expect(sub.scansRemaining).toBe(MAX_FREE_DAILY_SCANS);
    });

    test("returns active Pro subscription when status is active and period is valid", async () => {
      const futureIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: "pro_user_1",
                status: "active",
                plan_id: "pro_monthly_clp",
                ai_photo_scans_today: 12,
                current_period_end: futureIso,
              },
              error: null,
            }),
          }),
        }),
      });

      const sub = await getSubscription("pro_user_1");
      expect(sub.isPro).toBe(true);
      expect(sub.status).toBe("active");
      expect(sub.planId).toBe("pro_monthly_clp");
      expect(sub.scansRemaining).toBe(9999);
    });

    test("marks expired trial as non-Pro", async () => {
      const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: "expired_user",
                status: "trialing",
                plan_id: "pro_annual_clp",
                trial_started_at: pastIso,
                current_period_end: pastIso,
                ai_photo_scans_today: 1,
                last_scan_date: getDateKey(),
              },
              error: null,
            }),
          }),
        }),
      });

      const sub = await getSubscription("expired_user");
      expect(sub.isPro).toBe(false);
      expect(sub.trialUsed).toBe(true);
      expect(sub.scansRemaining).toBe(2);
    });

    test("resets daily scan counter when last_scan_date is from a previous day", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: "free_user_yesterday",
                status: "free",
                plan_id: "free",
                ai_photo_scans_today: 3,
                last_scan_date: "2020-01-01",
                current_period_end: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const sub = await getSubscription("free_user_yesterday");
      expect(sub.isPro).toBe(false);
      expect(sub.aiPhotoScansToday).toBe(0);
      expect(sub.scansRemaining).toBe(MAX_FREE_DAILY_SCANS);
    });

    test("calculates remaining free scans correctly for free user today", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: "free_user_1",
                status: "free",
                plan_id: "free",
                ai_photo_scans_today: 2,
                last_scan_date: getDateKey(),
                current_period_end: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const sub = await getSubscription("free_user_1");
      expect(sub.isPro).toBe(false);
      expect(sub.aiPhotoScansToday).toBe(2);
      expect(sub.scansRemaining).toBe(1);
    });
  });

  describe("checkAndIncrementAiQuota", () => {
    test("calls supabase RPC check_and_increment_ai_quota", async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { allowed: true, is_pro: false, remaining: 2 },
        error: null,
      });

      const result = await checkAndIncrementAiQuota("user_123");
      expect(supabase.rpc).toHaveBeenCalledWith("check_and_increment_ai_quota", {
        target_user_id: "user_123",
      });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    test("handles quota exhausted response", async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { allowed: false, is_pro: false, remaining: 0 },
        error: null,
      });

      const result = await checkAndIncrementAiQuota("user_123");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test("throws error instead of fake success when RPC fails", async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: "No autorizado" },
      });

      await expect(checkAndIncrementAiQuota("user_123")).rejects.toThrow("No autorizado");
    });
  });

  describe("activateTrial", () => {
    test("activates a 7-day trialing subscription via server RPC", async () => {
      const futureIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: {
          user_id: "user_trial",
          status: "trialing",
          plan_id: "pro_annual_clp",
          trial_started_at: new Date().toISOString(),
          current_period_end: futureIso,
          ai_photo_scans_today: 0,
        },
        error: null,
      });

      const sub = await activateTrial("user_trial", "pro_annual_clp");
      expect(supabase.rpc).toHaveBeenCalledWith("activate_free_trial", {
        p_plan_id: "pro_annual_clp",
      });
      expect(sub.isPro).toBe(true);
      expect(sub.status).toBe("trialing");
      expect(sub.trialUsed).toBe(true);
    });

    test("throws error when server rejects trial activation", async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: "Ya utilizaste tu prueba gratuita de 7 días en esta cuenta." },
      });

      await expect(activateTrial("user_trial")).rejects.toThrow(
        "Ya utilizaste tu prueba gratuita de 7 días en esta cuenta."
      );
    });
  });

  describe("purchaseProPlan", () => {
    test("uses registered payment adapter when configured", async () => {
      const mockSub = {
        userId: "u1",
        status: "active" as const,
        planId: "pro_annual_clp" as const,
        isPro: true,
        currentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
        trialUsed: true,
        aiPhotoScansToday: 0,
        maxFreeScans: 3,
        scansRemaining: 9999,
      };
      registerPaymentAdapter({
        name: "revenuecat",
        purchasePlan: jest.fn().mockResolvedValue(mockSub),
      });

      const res = await purchaseProPlan("u1", "pro_annual_clp");
      expect(res.isPro).toBe(true);
    });
  });
});
