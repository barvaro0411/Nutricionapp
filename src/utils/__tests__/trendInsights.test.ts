import {
  buildSmoothSvgPath,
  computeBmiSummary,
  computeWeeklyWeightRate,
  computeMetricTrendInsights,
  computeMacroEnergySplit,
  formatCompactMetricValue,
} from "../trendInsights";

describe("trendInsights utilities", () => {
  it("builds valid SVG paths for 0, 1, 2, and multiple points", () => {
    expect(buildSmoothSvgPath([])).toBe("");
    expect(buildSmoothSvgPath([{ x: 10, y: 20 }])).toBe("M 10.0 20.0");
    expect(
      buildSmoothSvgPath([
        { x: 10, y: 20 },
        { x: 50, y: 40 },
      ])
    ).toBe("M 10.0 20.0 L 50.0 40.0");

    const smooth = buildSmoothSvgPath([
      { x: 0, y: 100 },
      { x: 50, y: 60 },
      { x: 100, y: 40 },
    ]);
    expect(smooth.startsWith("M 0.0 100.0 C ")).toBe(true);
    expect(smooth).toContain("100.0 40.0");
  });

  it("computes BMI summary and category accurately", () => {
    expect(computeBmiSummary(70, 175)).toEqual({
      bmi: 22.9,
      label: "Saludable",
      tone: "success",
    });
    expect(computeBmiSummary(85, 175)).toEqual({
      bmi: 27.8,
      label: "Sobrepeso",
      tone: "warning",
    });
    expect(computeBmiSummary(null, 175)).toBeNull();
  });

  it("computes weekly weight rate in kg/week", () => {
    const rate = computeWeeklyWeightRate([
      { date: "2026-11-01", label: "1 nov", weightKg: 75.0, projectedKg: 75.0 },
      { date: "2026-11-15", label: "15 nov", weightKg: 74.0, projectedKg: 74.0 },
    ]);
    expect(rate).toBe(-0.5);
  });

  it("computes adherence and peak metrics for trend charts", () => {
    const insights = computeMetricTrendInsights(
      [
        { date: "2026-11-15", dayLabel: "Dom", calories: 1950, protein: 135, carbs: 200, fat: 60, mealCount: 3 },
        { date: "2026-11-16", dayLabel: "Lun", calories: 2100, protein: 145, carbs: 210, fat: 65, mealCount: 4 },
        { date: "2026-11-17", dayLabel: "Mar", calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 },
        { date: "2026-11-18", dayLabel: "Mié", calories: 1200, protein: 80, carbs: 120, fat: 40, mealCount: 2 },
      ],
      "calories",
      2000
    );

    expect(insights.loggedDays).toBe(3);
    expect(insights.average).toBe(1750);
    expect(insights.targetPct).toBe(88);
    expect(insights.daysOnTarget).toBe(2); // 1950 and 2100 are within 80%-112% of 2000
    expect(insights.peakDay?.date).toBe("2026-11-16");
    expect(insights.minDay?.date).toBe("2026-11-18");
  });

  it("computes Atwater macro energy split percentages summing to 100%", () => {
    const split = computeMacroEnergySplit({ protein: 125, carbs: 200, fat: 60 });
    expect(split.hasData).toBe(true);
    expect(split.proteinPct + split.carbsPct + split.fatPct).toBe(100);
    expect(split.proteinPct).toBeGreaterThan(20);
  });

  it("formats compact metric values cleanly for 30-day charts", () => {
    expect(formatCompactMetricValue(1850, false)).toBe("1850");
    expect(formatCompactMetricValue(1850, true)).toBe("1.9k");
    expect(formatCompactMetricValue(140, true)).toBe("140");
  });
});
