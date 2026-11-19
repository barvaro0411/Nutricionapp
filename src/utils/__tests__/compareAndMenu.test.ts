import { compareBarcodeProducts } from "../productCompare";
import { buildMenuAssistantPrompt } from "../menuAssistantPrompt";
import type { BarcodeProduct } from "@/services/barcodeService";

describe("productCompare", () => {
  const highProteinYogurt: BarcodeProduct = {
    barcode: "7801111111111",
    productName: "Yogur Griego Natural Sin Azúcar",
    servingSizeG: 150,
    unit: "g",
    caloriesPer100g: 62,
    proteinPer100g: 10,
    carbsPer100g: 4,
    fatPer100g: 0.5,
    source: "local",
  };

  const sweetSnackBar: BarcodeProduct = {
    barcode: "7802222222222",
    productName: "Galleta de chocolate rellena",
    servingSizeG: 40,
    unit: "g",
    caloriesPer100g: 495,
    proteinPer100g: 5,
    carbsPer100g: 66,
    fatPer100g: 23,
    source: "local",
  };

  test("declares cleaner high-protein product as winner and explains why", () => {
    const res = compareBarcodeProducts(highProteinYogurt, sweetSnackBar, []);
    expect(res.winner).toBe("A");
    expect(res.metricWinners.proteinDensity).toBe("A");
    expect(res.metricWinners.stamps).toBe("A");
    expect(res.reasons.some((r) => r.includes("menos sellos negros"))).toBe(true);
  });

  test("penalizes product conflicting with user dietary restrictions", () => {
    const soyMilk: BarcodeProduct = {
      barcode: "7803333333333",
      productName: "Bebida vegetal de soya sin azúcar",
      servingSizeG: 200,
      unit: "ml",
      caloriesPer100g: 36,
      proteinPer100g: 3.3,
      carbsPer100g: 1.2,
      fatPer100g: 1.8,
      source: "local",
    };

    const dairyMilk: BarcodeProduct = {
      barcode: "7804444444444",
      productName: "Leche descremada fluida",
      servingSizeG: 200,
      unit: "ml",
      caloriesPer100g: 35,
      proteinPer100g: 3.4,
      carbsPer100g: 4.8,
      fatPer100g: 0.2,
      source: "local",
    };

    const res = compareBarcodeProducts(dairyMilk, soyMilk, ["lactose_intolerance"]);
    expect(res.winner).toBe("B");
    expect(res.a.alerts.length).toBeGreaterThan(0);
  });
});

describe("menuAssistantPrompt", () => {
  test("builds structured menu prompt under Coach character limit", () => {
    const prompt = buildMenuAssistantPrompt({
      venue: "casino",
      mealType: "almuerzo",
      menuText: "1) Pollo a la plancha con ensalada\n2) Lasaña con pan",
      remainingCalories: 640,
      remainingProtein: 45,
      remainingCarbs: 70,
      remainingFat: 18,
      preferHighProtein: true,
    });

    expect(prompt.length).toBeLessThanOrEqual(1950);
    expect(prompt).toContain("640 kcal");
    expect(prompt).toContain("45 g proteína");
    expect(prompt).toContain('mealType "almuerzo"');
    expect(prompt).toContain("Pollo a la plancha");
  });
});
