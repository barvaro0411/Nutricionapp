import { buildProgressStats, progressDateKeys, DailyTotalsRow } from "../progressStats";
import { getDateKey } from "../dates";

const row = (date: string, calories: number | string, meals = 1): DailyTotalsRow => ({
  log_date: date, total_calories: calories, total_protein: "20.5",
  total_carbs: 30, total_fat: 10, meal_count: meals,
});

test("7 and 30 calendar dates include today and cross month boundaries", () => {
  expect(progressDateKeys(7, "2026-10-03")).toEqual([
    "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03",
  ]);
  const month = progressDateKeys(30, "2026-03-01");
  expect(month).toHaveLength(30);
  expect(month[0]).toBe("2026-01-31");
  expect(month[29]).toBe("2026-03-01");
});

test("Chile's DST transition and late UTC evenings do not skip or duplicate days", () => {
  const dates = progressDateKeys(7, getDateKey(new Date("2026-09-08T01:00:00Z")));
  expect(dates).toHaveLength(7);
  expect(new Set(dates).size).toBe(7);
  expect(dates[0]).toBe("2026-09-01");
  expect(dates[6]).toBe("2026-09-07");
  expect(buildProgressStats([], dates).days[5].dayLabel).toBe("Dom");
});

test("averages consider only registered days and preserve zero calorie records", () => {
  const dates = progressDateKeys(7, "2026-10-09");
  const stats = buildProgressStats([row("2026-10-07", 1000, 2), row("2026-10-09", "2000", 3), row("2026-10-08", 0)], dates);
  expect(stats.loggedDays).toBe(3);
  expect(stats.totalMeals).toBe(6);
  expect(stats.averages).toEqual({ calories: 1000, protein: 21, carbs: 30, fat: 10 });
  expect(stats.days[0].mealCount).toBe(0);
  expect(stats.days[5].calories).toBe(0);
  expect(stats.days[5].mealCount).toBe(1);
});

test("an empty period returns seven empty days without invalid averages", () => {
  const stats = buildProgressStats([], progressDateKeys(7, "2026-10-09"));
  expect(stats.days).toHaveLength(7);
  expect(stats.loggedDays).toBe(0);
  expect(stats.totalMeals).toBe(0);
  expect(stats.averages).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
});

test("out-of-period records and invalid nutrient values cannot distort totals", () => {
  const stats = buildProgressStats([row("2026-08-01", 9999), row("2026-10-09", "NaN")], progressDateKeys(7, "2026-10-09"));
  expect(stats.totalMeals).toBe(1);
  expect(stats.averages.calories).toBe(0);
  expect(stats.days[6].protein).toBe(20.5);
});
