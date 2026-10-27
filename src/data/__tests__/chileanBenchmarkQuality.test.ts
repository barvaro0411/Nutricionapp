import {
  CHILEAN_BENCHMARK_DISHES,
  resolveChileanBenchmarkDish,
  evaluateDishPrediction,
  computeBenchmarkMetrics,
} from "../chileanBenchmarkDataset";
import { CHILEAN_FOOD_FAMILIES, CHILEAN_CATALOG_METADATA } from "@/constants/chileanPresets";
import {
  calculateAtwaterCalories,
  validateMacroCalorieCoherence,
  reconcileMacroCalories,
} from "@/utils/nutritionCalculator";

describe("Chilean 45-Dish Benchmark & AI Quality Regression Suite", () => {
  test("contains exactly 45 weighed Chilean dishes across all 6 categories", () => {
    expect(CHILEAN_BENCHMARK_DISHES).toHaveLength(45);
    const ids = new Set(CHILEAN_BENCHMARK_DISHES.map((d) => d.id));
    expect(ids.size).toBe(45);
  });

  test("every benchmark dish has weighed ingredients summing to portionGrams and passes Atwater 4P+4C+9F validation", () => {
    for (const dish of CHILEAN_BENCHMARK_DISHES) {
      const sumGrams = dish.ingredientsBreakdown.reduce((acc, ing) => acc + ing.grams, 0);
      expect(sumGrams).toBe(dish.portionGrams);

      const sumIngCals = dish.ingredientsBreakdown.reduce((acc, ing) => acc + ing.calories, 0);
      expect(sumIngCals).toBe(dish.referenceMacros.calories);

      const coherence = validateMacroCalorieCoherence(dish.referenceMacros, 0.1, 15);
      expect(coherence.coherent).toBe(true);
      expect(CHILEAN_CATALOG_METADATA.sources[dish.source]).toBeDefined();
    }
  });

  test("every variant in CHILEAN_FOOD_FAMILIES passes Atwater physiological coherence", () => {
    for (const family of Object.values(CHILEAN_FOOD_FAMILIES)) {
      for (const variant of family.variants) {
        const check = validateMacroCalorieCoherence(
          {
            calories: variant.caloriesPer100g,
            protein: variant.proteinPer100g,
            carbs: variant.carbsPer100g,
            fat: variant.fatPer100g,
          },
          0.15,
          20
        );
        expect(check.coherent).toBe(true);
      }
    }
  });

  test("reconcileMacroCalories detects and fixes hallucinated AI calorie values", () => {
    const hallucinatedComplete = {
      food: "Completo italiano",
      calories: 980, // AI hallucinated calories
      protein: 14.3,
      carbs: 46.2,
      fat: 24.4,
    };
    const expectedAtwater = calculateAtwaterCalories(hallucinatedComplete);
    expect(expectedAtwater).toBe(461.6);

    const reconciled = reconcileMacroCalories(hallucinatedComplete);
    expect(reconciled.atwaterAdjusted).toBe(true);
    expect(reconciled.calories).toBe(461.6);
  });

  test("resolveChileanBenchmarkDish resolves canonical Chilean dishes and scales portions", () => {
    const completo = resolveChileanBenchmarkDish("Completo italiano", 220);
    expect(completo).not.toBeNull();
    expect(completo?.dish.id).toBe("cl-11");
    expect(completo?.scaledMacros.calories).toBe(462);

    const halfPastel = resolveChileanBenchmarkDish("Pastel de choclo", 175);
    expect(halfPastel).not.toBeNull();
    expect(halfPastel?.dish.id).toBe("cl-21");
    expect(halfPastel?.scaledMacros.calories).toBe(306.5);
  });

  test("computeBenchmarkMetrics calculates publishable median error, ±15% accuracy and Atwater coherence", () => {
    const evaluations = CHILEAN_BENCHMARK_DISHES.map((dish) => {
      const resolved = resolveChileanBenchmarkDish(dish.name, dish.portionGrams);
      return evaluateDishPrediction(dish, {
        predictedMacros: resolved ? resolved.scaledMacros : dish.referenceMacros,
        correctionTouches: 0,
        latencyMs: 1200,
      });
    });

    const summary = computeBenchmarkMetrics("Nutricionapp", evaluations);
    expect(summary.totalDishes).toBe(45);
    expect(summary.medianCaloricErrorPct).toBe(0);
    expect(summary.pctWithin15Pct).toBe(100);
    expect(summary.pctAtwaterCoherent).toBe(100);
    expect(summary.meanCorrectionTouches).toBe(0);
  });
});
