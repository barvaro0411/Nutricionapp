import {
  getSubscription,
  checkAndIncrementAiQuota,
  activateTrial,
  MAX_FREE_DAILY_SCANS,
} from "../subscriptionService";
import { supabase } from "@/services/supabase";

jest.mock("@/services/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe("subscriptionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSubscription", () => {
    test("returns default free subscription when userId is empty", async () => {
      const sub = await getSubscription("");
      expect(sub.isPro).toBe(false);
      expect(sub.status).toBe("free");
      expect(sub.scansRemaining).toBe(MAX_FREE_DAILY_SCANS);
    });

    test("returns active Pro subscription when status is active", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: "pro_user_1",
                status: "active",
                plan_id: "pro_monthly_clp",
                ai_photo_scans_today: 12,
                current_period_end: "2026-11-01T00:00:00Z",
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

    test("calculates remaining free scans correctly for free user", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: "free_user_1",
                status: "free",
                plan_id: "free",
                ai_photo_scans_today: 2,
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
      expect(sub.scansRemaining).toBe(1); // 3 - 2 = 1
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
  });

  describe("activateTrial", () => {
    test("activates a 7-day trialing subscription", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { user_id: "user_trial", status: "trialing" },
              error: null,
            }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: "user_trial",
                status: "trialing",
                plan_id: "pro_monthly_clp",
                ai_photo_scans_today: 0,
              },
              error: null,
            }),
          }),
        }),
      });

      const sub = await activateTrial("user_trial");
      expect(sub.isPro).toBe(true);
      expect(sub.status).toBe("trialing");
    });
  });
});
