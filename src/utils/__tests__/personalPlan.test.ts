import {
  computeChecklistAdherence,
  countCompletedHabits,
  getMatchDayWeekdays,
  isHabitChecked,
  resolveDayPlanTargets,
  toggleCheckedHabit,
} from "@/utils/personalPlan";
import type { MasterPlanData } from "@/data/masterPlan";

function makePlan(overrides?: Partial<MasterPlanData["dailyGoals"]>): MasterPlanData {
  return {
    user: {
      fullName: "Matías Rojas",
      heightCm: 178,
      currentWeightKg: 80,
      targetWeightKg: 76,
      objectiveTitle: "Recomposición corporal",
      objectiveDesc: "Mantener músculo y bajar grasa gradualmente.",
    },
    dailyGoals: {
      standard: {
        days: "Lunes a Sábado",
        calories: 2200,
        caloriesRange: "2150 - 2250 kcal",
        proteinG: 165,
        proteinRange: "160 - 170 g",
        carbsG: 230,
        carbsRange: "220 - 240 g",
        fatG: 68,
        fatRange: "65 - 72 g",
      },
      matchDay: {
        days: "Domingo",
        calories: 2650,
        caloriesRange: "2600 - 2750 kcal",
        proteinG: 165,
        carbsG: 340,
        carbsRange: "320 - 360 g",
        fatG: 68,
        fatRange: "65 - 72 g",
        focus: "Carga de glucógeno para partido",
      },
      waterMl: 3000,
      waterRangeL: "3.0 L",
      ...overrides,
    },
    mealSchedule: [
      {
        time: "08:00",
        block: "Desayuno",
        detail: "Avena con yogur proteico",
        energyKcal: 480,
        proteinG: "35g",
      },
    ],
    weeklyRoutine: [
      {
        day: "Lunes",
        activity: "Torso fuerza",
        goal: "Progresión en básicos",
        intensity: "RIR 2",
      },
    ],
    supplements: [{ name: "Creatina", dose: "5 g", timing: "Con desayuno" }],
    dailyChecklist: ["Tomar creatina 5 g", "Tomar 3 L de agua", "Cumplir proteína diaria"],
  };
}

describe("personalPlan helpers", () => {
  test("getMatchDayWeekdays defaults legacy plans without weekdays to Sunday [0]", () => {
    const legacy = makePlan();
    expect(getMatchDayWeekdays(legacy)).toEqual([0]);
  });

  test("getMatchDayWeekdays respects explicit custom arrays including empty []", () => {
    const custom = makePlan({
      matchDay: { ...makePlan().dailyGoals.matchDay, weekdays: [2, 4, 2, 9, -1] },
    });
    expect(getMatchDayWeekdays(custom)).toEqual([2, 4]);

    const uniform = makePlan({
      matchDay: { ...makePlan().dailyGoals.matchDay, weekdays: [] },
    });
    expect(getMatchDayWeekdays(uniform)).toEqual([]);
  });

  test("resolveDayPlanTargets switches to matchDay on configured weekdays within rounding tolerance", () => {
    const plan = makePlan({
      matchDay: { ...makePlan().dailyGoals.matchDay, weekdays: [2, 5] },
    });

    const baseGoal = { calories: 2202, proteinG: 165, carbsG: 230, fatG: 68 };
    const tuesday = resolveDayPlanTargets(plan, 2, baseGoal);
    expect(tuesday).toEqual({
      isMatchDay: true,
      calories: 2650,
      proteinG: 165,
      carbsG: 340,
      fatG: 68,
    });

    const wednesday = resolveDayPlanTargets(plan, 3, baseGoal);
    expect(wednesday).toEqual({ isMatchDay: false, ...baseGoal });
  });

  test("resolveDayPlanTargets keeps customized user goals unchanged even on a match weekday", () => {
    const plan = makePlan({
      matchDay: { ...makePlan().dailyGoals.matchDay, weekdays: [2] },
    });
    const customized = { calories: 1900, proteinG: 150, carbsG: 180, fatG: 64 };
    expect(resolveDayPlanTargets(plan, 2, customized)).toEqual({
      isMatchDay: false,
      ...customized,
    });
  });

  test("toggleCheckedHabit matches case-insensitively and computes accurate counts", () => {
    const checklist = ["Tomar creatina 5 g", "Tomar 3 L de agua", "Dormir 7+ horas"];
    expect(isHabitChecked(["  tomar   creatina 5 g "], checklist[0])).toBe(true);

    const added = toggleCheckedHabit(["tomar creatina 5 g"], checklist, "Tomar 3 L de agua");
    expect(added).toEqual({
      checkedItems: ["Tomar creatina 5 g", "Tomar 3 L de agua"],
      completedCount: 2,
      totalItems: 3,
    });

    const removed = toggleCheckedHabit(added.checkedItems, checklist, "Tomar creatina 5 g");
    expect(removed).toEqual({
      checkedItems: ["Tomar 3 L de agua"],
      completedCount: 1,
      totalItems: 3,
    });

    expect(countCompletedHabits(removed.checkedItems, checklist)).toEqual({
      completedCount: 1,
      totalItems: 3,
      pct: 33,
    });
  });

  test("computeChecklistAdherence computes today, 7-day average, and active >=80% streak", () => {
    const dateKeys = [
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
    ];
    const history = [
      { plan_date: "2026-11-09", completed_count: 1, total_items: 4 }, // 25% (breaks earlier)
      { plan_date: "2026-11-10", completed_count: 4, total_items: 5 }, // 80%
      { plan_date: "2026-11-11", completed_count: 5, total_items: 5 }, // 100%
      {
        plan_date: "2026-11-12",
        completed_count: 0,
        total_items: 3,
        checked_items: ["Tomar creatina 5 g"],
      },
    ];
    const checklist = ["Tomar creatina 5 g", "Agua 3L", "Dormir 7h"];
    const summary = computeChecklistAdherence(history, dateKeys, checklist, "2026-11-12");

    expect(summary.today).toEqual({ completedCount: 1, totalItems: 3, pct: 33 });
    expect(summary.streakDays).toBe(2); // Nov 10 (80%) + Nov 11 (100%), today still in progress
    expect(summary.weeklyAveragePct).toBe(60); // (25 + 80 + 100 + 33) / 4 = 59.5 -> 60
  });
});
