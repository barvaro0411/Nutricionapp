import { buildNutritionistReport } from "../reportBuilder";
const profile = { full_name: "Test", current_weight_kg: 70, height_cm: 170, objective: "maintain" };
test("CSV uses Chile dates and escapes commas, quotes and line breaks", () => {
  const report = buildNutritionistReport(profile, [{
    meal_type: "cena", logged_at: "2026-10-03T01:00:00Z", total_calories: 500, total_protein: 30, total_carbs: 50, total_fat: 20,
    meal_items: [{ food_name: 'Pan, "integral"\ncon palta', grams: 100 }],
  }], [], "2026-10-02", "2026-10-02");
  expect(report.csvContent).toContain('"2026-10-02"');
  expect(report.csvContent).toContain('Pan, ""integral""\ncon palta');
});
test("no records means zero logged days; water-only days do not dilute food averages", () => {
  expect(buildNutritionistReport(profile, [], [], "2026-10-01","2026-10-02").totalDaysLogged).toBe(0);
  const result = buildNutritionistReport(profile, [{
    meal_type: "almuerzo", logged_at: "2026-10-01T15:00:00Z", total_calories: 1000, total_protein: 50, total_carbs: 100, total_fat: 40, meal_items: [],
  }], [{ logged_at: "2026-10-02T15:00:00Z", amount_ml: 500 }], "2026-10-01","2026-10-02");
  expect(result.avgCalories).toBe(1000);
  expect(result.avgWaterMl).toBe(500);
  expect(result.totalDaysLogged).toBe(2);
});
