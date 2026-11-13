import { MasterPlanSchema } from "@/data/masterPlan";
import { buildLocalMasterPlanTemplate } from "../personalPlanTemplate";
import {
  generatePersonalPlanWithAi,
  getChecklistHistory,
  savePersonalPlan,
  upsertDailyChecklist,
} from "../personalPlanService";

const mockInvoke = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/services/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("buildLocalMasterPlanTemplate creates valid MasterPlanSchema for goals and load days", () => {
  const plan = buildLocalMasterPlanTemplate({
    fullName: "Valentina Díaz",
    gender: "female",
    age: 27,
    heightCm: 166,
    weightKg: 64,
    targetWeightKg: 60,
    activityLevel: "moderate",
    objective: "lose_weight",
    matchDayWeekdays: [2, 5],
    trainingDaysPerWeek: 4,
    mealsPerDay: 4,
  });

  expect(MasterPlanSchema.safeParse(plan).success).toBe(true);
  expect(plan.dailyGoals.matchDay.weekdays).toEqual([2, 5]);
  expect(plan.dailyGoals.matchDay.calories).toBeGreaterThan(plan.dailyGoals.standard.calories);
  expect(plan.mealSchedule).toHaveLength(4);
  expect(plan.dailyChecklist.length).toBeGreaterThanOrEqual(4);

  const uniformPlan = buildLocalMasterPlanTemplate({
    fullName: "Valentina Díaz",
    gender: "female",
    age: 27,
    heightCm: 166,
    weightKg: 64,
    targetWeightKg: 64,
    activityLevel: "light",
    objective: "maintain",
    matchDayWeekdays: [],
    trainingDaysPerWeek: 2,
    mealsPerDay: 3,
  });

  expect(uniformPlan.dailyGoals.matchDay.weekdays).toEqual([]);
  expect(uniformPlan.dailyGoals.matchDay.calories).toBe(uniformPlan.dailyGoals.standard.calories);
});

test("savePersonalPlan invokes save_personal_plan RPC with sync flag", async () => {
  const sample = buildLocalMasterPlanTemplate({
    fullName: "Luis Vera",
    gender: "male",
    age: 31,
    heightCm: 178,
    weightKg: 82,
    targetWeightKg: 78,
    activityLevel: "active",
    objective: "lose_weight",
    matchDayWeekdays: [0],
    trainingDaysPerWeek: 5,
    mealsPerDay: 4,
  });

  mockRpc.mockResolvedValueOnce({ data: { user_id: "u1", plan: sample }, error: null });

  const saved = await savePersonalPlan(sample, { syncGoals: true });
  expect(mockRpc).toHaveBeenCalledWith("save_personal_plan", {
    p_plan: expect.objectContaining({
      user: expect.objectContaining({ fullName: "Luis Vera" }),
    }),
    p_sync_goals: true,
  });
  expect(saved.user.fullName).toBe("Luis Vera");
});

test("generatePersonalPlanWithAi invokes Edge Function and surfaces server errors", async () => {
  const sample = buildLocalMasterPlanTemplate({
    fullName: "Luis Vera",
    gender: "male",
    age: 31,
    heightCm: 178,
    weightKg: 82,
    targetWeightKg: 78,
    activityLevel: "active",
    objective: "gain_muscle",
    matchDayWeekdays: [1, 4],
    trainingDaysPerWeek: 4,
    mealsPerDay: 4,
  });

  mockInvoke.mockResolvedValueOnce({
    data: { success: true, plan: sample, meta: { model: "gemini-2.5-flash" } },
    error: null,
  });

  const generated = await generatePersonalPlanWithAi({
    matchDayWeekdays: [1, 4],
    trainingDaysPerWeek: 4,
    trainingFocus: "Hipertrofia",
    equipment: "gym",
    mealsPerDay: 4,
    includeSupplements: true,
  });

  expect(mockInvoke).toHaveBeenCalledWith(
    "generate-personal-plan",
    expect.objectContaining({
      body: expect.objectContaining({ matchDayWeekdays: [1, 4], equipment: "gym" }),
    }),
  );
  expect(generated.plan.user.fullName).toBe("Luis Vera");

  mockInvoke.mockResolvedValueOnce({
    data: null,
    error: {
      message: "Edge Function error",
      context: { json: async () => ({ error: { message: "Límite diario de IA alcanzado." } }) },
    },
  });

  await expect(
    generatePersonalPlanWithAi({
      matchDayWeekdays: [],
      trainingDaysPerWeek: 3,
      trainingFocus: "Salud",
      equipment: "bodyweight",
      mealsPerDay: 3,
      includeSupplements: false,
    }),
  ).rejects.toThrow("Límite diario de IA alcanzado.");
});

test("upsertDailyChecklist and getChecklistHistory persist normalized counts by date", async () => {
  const upsertMock = jest.fn().mockReturnValue({
    select: () => ({
      single: async () => ({
        data: {
          plan_date: "2026-11-12",
          checked_items: ["Agua 3L"],
          total_items: 4,
          completed_count: 1,
        },
        error: null,
      }),
    }),
  });

  mockFrom.mockReturnValueOnce({ upsert: upsertMock });

  const row = await upsertDailyChecklist(
    "u1",
    "2026-11-12",
    [" Agua 3L ", "agua 3l"],
    4,
  );

  expect(upsertMock).toHaveBeenCalledWith(
    {
      user_id: "u1",
      plan_date: "2026-11-12",
      checked_items: ["Agua 3L"],
      total_items: 4,
      completed_count: 1,
    },
    { onConflict: "user_id,plan_date" },
  );
  expect(row.completed_count).toBe(1);

  mockFrom.mockReturnValueOnce({
    select: () => ({
      eq: () => ({
        gte: () => ({
          lte: () => ({
            order: () => ({
              abortSignal: async () => ({
                data: [row],
                error: null,
              }),
              then: (resolve: (val: unknown) => void) =>
                resolve({ data: [row], error: null }),
            }),
          }),
        }),
      }),
    }),
  });

  const history = await getChecklistHistory("u1", "2026-11-06", "2026-11-12");
  expect(history).toHaveLength(1);
  expect(history[0].plan_date).toBe("2026-11-12");
});
