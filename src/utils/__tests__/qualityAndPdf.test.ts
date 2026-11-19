import {
  buildWarningStampsStats,
  buildWaterPeriodStats,
} from "../qualityStats";
import { buildNutritionistReportHtml } from "../reportPdf";
import { buildNutritionistReport } from "../reportBuilder";

describe("qualityStats", () => {
  const dates = [
    "2026-11-10",
    "2026-11-11",
    "2026-11-12",
    "2026-11-13",
    "2026-11-14",
    "2026-11-15",
    "2026-11-16",
  ];

  test("buildWaterPeriodStats computes average on logged days and counts goal hits", () => {
    const stats = buildWaterPeriodStats(
      [
        { amount_ml: 1000, logged_at: "2026-11-14T14:00:00Z" },
        { amount_ml: 1250, logged_at: "2026-11-14T19:00:00Z" },
        { amount_ml: 1500, logged_at: "2026-11-16T15:00:00Z" },
      ],
      dates,
      2000
    );

    expect(stats.loggedDays).toBe(2);
    expect(stats.goalDaysCount).toBe(1);
    expect(stats.maxMl).toBe(2250);
    expect(stats.avgMl).toBe(1875);
  });

  test("buildWarningStampsStats evaluates Ley 20.606 stamps and clean ratio", () => {
    const stats = buildWarningStampsStats(
      [
        {
          logged_at: "2026-11-15T16:00:00Z",
          meal_items: [
            {
              food_name: "Pechuga de pollo a la plancha",
              grams: 150,
              unit: "g",
              calories: 248,
              protein: 46,
              carbs: 0,
              fat: 5.4,
            },
            {
              food_name: "Galletas de chocolate",
              grams: 100,
              unit: "g",
              calories: 480,
              protein: 5,
              carbs: 65,
              fat: 22,
            },
          ],
        },
      ],
      dates
    );

    expect(stats.totalItems).toBe(2);
    expect(stats.cleanItems).toBe(1);
    expect(stats.cleanPercent).toBe(50);
    expect(stats.stampCounts.calories).toBe(1);
    expect(stats.stampCounts.sugars).toBe(1);
    expect(stats.stampCounts.fats).toBe(1);
  });
});

describe("reportPdf", () => {
  test("buildNutritionistReportHtml renders print-ready HTML and escapes patient input", () => {
    const report = buildNutritionistReport(
      {
        full_name: 'María <script>alert("x")</script>',
        current_weight_kg: 64,
        height_cm: 165,
        objective: "maintain",
      },
      [
        {
          meal_type: "almuerzo",
          logged_at: "2026-11-15T16:00:00Z",
          total_calories: 650,
          total_protein: 42,
          total_carbs: 60,
          total_fat: 22,
          meal_items: [{ food_name: "Pollo con arroz", grams: 250 }],
        },
      ],
      [{ amount_ml: 2000, logged_at: "2026-11-15T18:00:00Z" }],
      "2026-11-10",
      "2026-11-16"
    );

    const html = buildNutritionistReportHtml(report);
    expect(html).toContain("@page");
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("650 kcal");
    expect(html).toContain("2000 ml");
  });
});
