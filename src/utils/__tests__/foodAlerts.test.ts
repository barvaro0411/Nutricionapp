import {
  detectFoodWarningLabels,
  detectDietaryAlerts,
  evaluateFoodAlerts,
  isRecipeCompatible,
} from "../foodAlerts";

describe("foodAlerts", () => {
  describe("detectFoodWarningLabels", () => {
    test("detects Alto en Calorías for high-energy solids and liquids", () => {
      const solid = {
        food: "Chocolate amargo",
        calories: 550,
        protein: 8,
        carbs: 30,
        fat: 45,
        grams: 100,
        unit: "g",
      };
      const stamps = detectFoodWarningLabels(solid);
      expect(stamps.some((s) => s.stamp === "calories")).toBe(true);

      const soda = {
        food: "Bebida cola común",
        calories: 84,
        protein: 0,
        carbs: 21,
        fat: 0,
        grams: 200,
        unit: "ml",
      };
      // 84 / 200 * 100 = 42 kcal / 100ml (< 70)
      expect(detectFoodWarningLabels(soda).some((s) => s.stamp === "calories")).toBe(false);

      const highCalDrink = {
        food: "Batido de chocolate",
        calories: 180,
        protein: 5,
        carbs: 25,
        fat: 6,
        grams: 200,
        unit: "ml",
      };
      // 180 / 2 = 90 kcal / 100ml (>= 70)
      expect(detectFoodWarningLabels(highCalDrink).some((s) => s.stamp === "calories")).toBe(true);
    });

    test("detects Alto en Azúcares in sweet foods and scanned soft drinks like Coca-Cola 500ml", () => {
      const cake = {
        food: "Torta de manjar",
        calories: 380,
        protein: 4,
        carbs: 55,
        fat: 16,
        grams: 100,
        unit: "g",
      };
      const stamps = detectFoodWarningLabels(cake);
      expect(stamps.some((s) => s.stamp === "sugars")).toBe(true);

      const cocaCola500 = {
        food: "Coca-Cola Original (Coca-Cola)",
        calories: 210,
        protein: 0,
        carbs: 53,
        fat: 0,
        grams: 500,
        unit: "ml",
      };
      const cokeStamps = detectFoodWarningLabels(cocaCola500);
      expect(cokeStamps.some((s) => s.stamp === "sugars")).toBe(true);
    });

    test("detects Alto en Grasas and Alto en Sodio in savory snacks", () => {
      const snack = {
        food: "Papas fritas en bolsa",
        calories: 520,
        protein: 6,
        carbs: 50,
        fat: 33,
        grams: 100,
        unit: "g",
      };
      const stamps = detectFoodWarningLabels(snack);
      expect(stamps.some((s) => s.stamp === "fats")).toBe(true);
      expect(stamps.some((s) => s.stamp === "sodium")).toBe(true);
    });
  });

  describe("detectDietaryAlerts", () => {
    test("detects lactose conflict and respects exemptions like sin lactosa", () => {
      const milk = { calories: 120, carbs: 10, fat: 6, grams: 200, unit: "ml" };
      const alert1 = detectDietaryAlerts("Leche entera", milk, ["lactose_intolerance"]);
      expect(alert1.length).toBe(1);
      expect(alert1[0].type).toBe("lactose_intolerance");

      const alertExempt = detectDietaryAlerts("Leche sin lactosa", milk, ["lactose_intolerance"]);
      expect(alertExempt.length).toBe(0);

      const alertAlmond = detectDietaryAlerts("Leche de almendras", milk, ["lactose_intolerance"]);
      expect(alertAlmond.length).toBe(0);
    });

    test("detects gluten conflict and respects exemptions", () => {
      const bread = { calories: 250, carbs: 50, fat: 2, grams: 100, unit: "g" };
      const alert1 = detectDietaryAlerts("Pan marraqueta", bread, ["celiac_gluten"]);
      expect(alert1.length).toBe(1);
      expect(alert1[0].type).toBe("celiac_gluten");

      const alertExempt = detectDietaryAlerts("Pan sin gluten", bread, ["celiac_gluten"]);
      expect(alertExempt.length).toBe(0);
    });

    test("detects meat and animal products for vegan and vegetarian diets", () => {
      const chicken = { calories: 180, carbs: 0, fat: 4, grams: 120, unit: "g" };
      const alertVeg = detectDietaryAlerts("Pechuga de pollo", chicken, ["vegetarian"]);
      expect(alertVeg.length).toBe(1);

      const egg = { calories: 75, carbs: 0.5, fat: 5, grams: 50, unit: "g" };
      const alertVegan = detectDietaryAlerts("Huevo revuelto", egg, ["vegan"]);
      expect(alertVegan.length).toBe(1);

      const tofu = { calories: 80, carbs: 2, fat: 4, grams: 100, unit: "g" };
      expect(detectDietaryAlerts("Tofu salteado", tofu, ["vegan", "vegetarian"]).length).toBe(0);
    });

    test("detects nut and seafood allergens", () => {
      const nuts = { calories: 200, carbs: 6, fat: 18, grams: 30, unit: "g" };
      expect(detectDietaryAlerts("Mix de nueces y almendras", nuts, ["nut_allergy"]).length).toBe(1);

      const seafood = { calories: 110, carbs: 1, fat: 2, grams: 100, unit: "g" };
      expect(detectDietaryAlerts("Caldillo de mariscos", seafood, ["seafood_allergy"]).length).toBe(1);
    });
  });

  describe("isRecipeCompatible", () => {
    test("marks compatible recipes correctly", () => {
      const veganSalad = {
        title: "Ensalada verde con palta",
        description: "Lechuga, espinaca y palta",
        ingredients: [{ foodName: "Lechuga" }, { foodName: "Palta" }, { foodName: "Aceite de oliva" }],
      };
      const result = isRecipeCompatible(veganSalad, ["vegan", "lactose_intolerance", "celiac_gluten"]);
      expect(result.compatible).toBe(true);
      expect(result.alerts.length).toBe(0);
    });

    test("marks incompatible recipe when an ingredient conflicts with restriction", () => {
      const carbonara = {
        title: "Fideos con salsa blanca y queso",
        description: "Pasta clásica con crema y queso parmesano",
        ingredients: [
          { foodName: "Fideos de trigo" },
          { foodName: "Crema de leche" },
          { foodName: "Queso parmesano" },
        ],
      };
      const result = isRecipeCompatible(carbonara, ["lactose_intolerance", "celiac_gluten"]);
      expect(result.compatible).toBe(false);
      expect(result.alerts.length).toBe(2);
    });
  });

  describe("evaluateFoodAlerts", () => {
    test("evaluates both stamps and dietary alerts simultaneously", () => {
      const sweetYogurt = {
        food: "Yogurt con crema y azúcar",
        calories: 140,
        protein: 4,
        carbs: 22,
        fat: 5,
        grams: 100,
      };
      const evaluation = evaluateFoodAlerts(sweetYogurt, ["lactose_intolerance", "low_sugar"]);
      expect(evaluation.stamps.some((s) => s.stamp === "sugars")).toBe(true);
      expect(evaluation.alerts.some((a) => a.type === "lactose_intolerance")).toBe(true);
      expect(evaluation.alerts.some((a) => a.type === "low_sugar")).toBe(true);
    });
  });
});
