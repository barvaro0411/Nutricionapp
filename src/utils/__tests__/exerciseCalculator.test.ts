import { estimateExerciseBurn } from "../exerciseCalculator";

describe("estimateExerciseBurn", () => {
  test("scales burned calories linearly with weight and duration", () => {
    const light = estimateExerciseBurn({
      presetId: "run",
      durationMinutes: 30,
      weightKg: 60,
    });
    const heavy = estimateExerciseBurn({
      presetId: "run",
      durationMinutes: 60,
      weightKg: 80,
    });

    expect(light.calories).toBe(Math.round(((8.3 * 3.5 * 60) / 200) * 30));
    expect(heavy.calories).toBeGreaterThan(light.calories * 2);
    expect(light.estimatedSteps).toBe(4650);
  });

  test("falls back safely to 70 kg and 30 min on invalid inputs and yields 0 steps on bike", () => {
    const bike = estimateExerciseBurn({
      presetId: "bike",
      durationMinutes: -10,
      weightKg: null,
    });

    expect(bike.calories).toBe(Math.round(((6.8 * 3.5 * 70) / 200) * 30));
    expect(bike.estimatedSteps).toBe(0);
  });
});
