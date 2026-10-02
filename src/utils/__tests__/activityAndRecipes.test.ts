describe("Activity and Energy Calculation", () => {
  test("calculates effective remaining calories with burned activity", () => {
    const goal = 2000;
    const consumed = 1200;
    const burnedCalories = 350;

    // Remaining = Goal + Burned - Consumed
    const effectiveRemaining = goal + burnedCalories - consumed;
    expect(effectiveRemaining).toBe(1150);

    const totalBudget = goal + burnedCalories;
    const progressPct = Math.round((consumed / totalBudget) * 100);
    expect(progressPct).toBe(51);
  });

  test("handles zero burned calories gracefully", () => {
    const goal = 2000;
    const consumed = 1800;
    const burnedCalories = 0;

    const effectiveRemaining = Math.max(0, goal + burnedCalories - consumed);
    expect(effectiveRemaining).toBe(200);
  });
});
