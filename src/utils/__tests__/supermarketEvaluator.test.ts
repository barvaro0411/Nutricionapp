import { evaluateSupermarketProduct } from "../supermarketEvaluator";
import type { BarcodeProduct } from "@/services/barcodeService";

describe("evaluateSupermarketProduct", () => {
  const highProteinCleanYogurt: BarcodeProduct = {
    barcode: "7801000000001",
    productName: "Yogur Griego Proteína Natural",
    brand: "Colun",
    servingSizeG: 150,
    unit: "g",
    caloriesPer100g: 64,
    proteinPer100g: 10.5,
    carbsPer100g: 4.2,
    fatPer100g: 0.4,
    sugarsPer100g: 3.5,
    saturatedFatPer100g: 0.2,
    sodiumMgPer100g: 45,
    novaGroup: 1,
    source: "openfoodfacts",
  };

  const sugaryUltraProcessedCookie: BarcodeProduct = {
    barcode: "7801000000002",
    productName: "Galletas rellenas sabor chocolate",
    brand: "Demo",
    servingSizeG: 40,
    unit: "g",
    caloriesPer100g: 490,
    proteinPer100g: 4.5,
    carbsPer100g: 68,
    fatPer100g: 21,
    sugarsPer100g: 34,
    saturatedFatPer100g: 9.5,
    sodiumMgPer100g: 430,
    novaGroup: 4,
    source: "openfoodfacts",
  };

  test("marks clean high-protein product as great for lose_weight and computes day budget impact", () => {
    const res = evaluateSupermarketProduct({
      product: highProteinCleanYogurt,
      portionAmount: 150,
      portionUnit: "g",
      objective: "lose_weight",
      remainingCalories: 800,
      remainingProtein: 60,
      restrictions: [],
    });

    expect(res.verdict).toBe("great");
    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.stamps).toHaveLength(0);
    expect(res.trafficLights.find((t) => t.key === "sugars")?.level).toBe("good");
    expect(res.dayBudgetImpact?.portionCalories).toBe(96);
    expect(res.dayBudgetImpact?.caloriesPctOfRemaining).toBe(12);
    expect(res.dayBudgetImpact?.exceedsRemainingCalories).toBe(false);
  });

  test("marks sugary ultraprocessed snack as avoid using exact Open Food Facts thresholds", () => {
    const res = evaluateSupermarketProduct({
      product: sugaryUltraProcessedCookie,
      portionAmount: 40,
      portionUnit: "g",
      objective: "lose_weight",
      remainingCalories: 150,
      remainingProtein: 30,
      restrictions: [],
    });

    expect(res.verdict).toBe("avoid");
    expect(res.isUltraProcessed).toBe(true);
    expect(res.stamps.map((s) => s.stamp)).toEqual(
      expect.arrayContaining(["calories", "sugars", "fats", "sodium"])
    );
    expect(res.trafficLights.find((t) => t.key === "sugars")?.statusText).toBe("Alto en azúcar");
    expect(res.dayBudgetImpact?.exceedsRemainingCalories).toBe(true);
    expect(res.cons.some((c) => c.includes("34 g"))).toBe(true);
  });

  test("downgrades a healthy dairy product to avoid when user has lactose_intolerance or celiac_gluten conflict", () => {
    const res = evaluateSupermarketProduct({
      product: highProteinCleanYogurt,
      portionAmount: 150,
      portionUnit: "g",
      objective: "gain_muscle",
      restrictions: ["lactose_intolerance"],
    });

    expect(res.alerts.length).toBeGreaterThan(0);
    expect(res.verdict).not.toBe("great");
    expect(res.summary).toContain("Choca con tus preferencias");
  });
});
