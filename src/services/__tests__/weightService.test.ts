jest.mock("react-native", () => ({ Platform: { OS: "web" } }));
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/services/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: { id: "u1", current_weight_kg: 72.5 }, error: null }),
          })),
        })),
      })),
    })),
  },
}));

import {
  buildWeightTrendStats,
  deriveDefaultTargetWeight,
  validateWeightKg,
} from "../weightService";

describe("weightService", () => {
  test("validates weight range and decimal comma", () => {
    expect(validateWeightKg("74,6")).toEqual({ ok: true, value: 74.6 });
    expect(validateWeightKg(20).ok).toBe(false);
    expect(validateWeightKg(350).ok).toBe(false);
  });

  test("derives default target weight from profile objective", () => {
    expect(
      deriveDefaultTargetWeight({
        id: "u1",
        current_weight_kg: 80,
        objective: "lose_weight",
      } as any)
    ).toBe(76);
    expect(
      deriveDefaultTargetWeight({
        id: "u1",
        current_weight_kg: 65,
        objective: "gain_muscle",
      } as any)
    ).toBe(68);
  });

  test("builds weight trend stats with delta and projected goal curve", () => {
    const entries = [
      { date: "2026-10-10", weightKg: 76.0, loggedAt: "2026-10-10T08:00:00Z" },
      { date: "2026-10-14", weightKg: 75.2, loggedAt: "2026-10-14T08:00:00Z" },
      { date: "2026-10-17", weightKg: 74.5, loggedAt: "2026-10-17T08:00:00Z" },
    ];
    const stats = buildWeightTrendStats(entries, 72.0, 7);
    expect(stats.latestWeightKg).toBe(74.5);
    expect(stats.startWeightKg).toBe(76.0);
    expect(stats.deltaKg).toBe(-1.5);
    expect(stats.remainingToGoalKg).toBe(2.5);
    expect(stats.points[0].projectedKg).toBe(76.0);
    expect(stats.points[2].projectedKg).toBe(72.0);
  });
});
