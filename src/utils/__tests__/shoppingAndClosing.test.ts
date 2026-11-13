import {
  classifyGroceryCategory,
  buildShoppingList,
  formatShoppingListForShare,
  PlannedRecipeEntry,
} from "../shoppingListUtils";
import { buildDailyClosingSummary } from "../dailyClosingUtils";
import { Recipe } from "@/services/recipeService";

describe("Shopping List Utils (Feria & Supermercado)", () => {
  it("classifies Chilean ingredients into the correct grocery categories", () => {
    expect(classifyGroceryCategory("Palta Hass")).toBe("feria");
    expect(classifyGroceryCategory("Tomate en cubos")).toBe("feria");
    expect(classifyGroceryCategory("Pechuga de pollo cocida")).toBe("carnes");
    expect(classifyGroceryCategory("Huevos revueltos")).toBe("carnes");
    expect(classifyGroceryCategory("Quesillo")).toBe("lacteos");
    expect(classifyGroceryCategory("Yogur proteico natural")).toBe("lacteos");
    expect(classifyGroceryCategory("Avena tradicional")).toBe("abarrotes");
    expect(classifyGroceryCategory("Pan marraqueta")).toBe("abarrotes");
  });

  it("aggregates and scales ingredients across multiple planned recipes", () => {
    const recipe1: Recipe = {
      id: "r1",
      title: "Pollo con arroz",
      description: null,
      mealType: "almuerzo",
      prepTimeMinutes: 20,
      servings: 1,
      caloriesPerServing: 450,
      proteinPerServing: 38,
      carbsPerServing: 45,
      fatPerServing: 8,
      instructions: [],
      imageUrl: null,
      ingredients: [
        {
          id: "i1",
          foodName: "Pechuga de pollo cocida",
          grams: 150,
          calories: 250,
          protein: 32,
          carbs: 0,
          fat: 5,
        },
        {
          id: "i2",
          foodName: "Arroz blanco cocido",
          grams: 100,
          calories: 130,
          protein: 3,
          carbs: 28,
          fat: 0.3,
        },
      ],
    };

    const recipe2: Recipe = {
      id: "r2",
      title: "Bowl de pollo y palta",
      description: null,
      mealType: "cena",
      prepTimeMinutes: 15,
      servings: 1,
      caloriesPerServing: 420,
      proteinPerServing: 35,
      carbsPerServing: 15,
      fatPerServing: 20,
      instructions: [],
      imageUrl: null,
      ingredients: [
        {
          id: "i3",
          foodName: "Pechuga de pollo",
          grams: 120,
          calories: 200,
          protein: 26,
          carbs: 0,
          fat: 4,
        },
        {
          id: "i4",
          foodName: "Palta",
          grams: 80,
          calories: 128,
          protein: 1.6,
          carbs: 6,
          fat: 12,
        },
      ],
    };

    const planned: PlannedRecipeEntry[] = [
      { recipe: recipe1, servings: 2 }, // 300g pollo, 200g arroz
      { recipe: recipe2, servings: 1 }, // 120g pollo, 80g palta
    ];

    const list = buildShoppingList(planned, { palta: true });
    const chicken = list.find((i) => i.key === "pechuga de pollo");
    const avocado = list.find((i) => i.key === "palta");

    expect(chicken).toBeDefined();
    expect(chicken?.grams).toBe(420);
    expect(chicken?.fromRecipes).toEqual([
      "Pollo con arroz",
      "Bowl de pollo y palta",
    ]);
    expect(avocado?.checked).toBe(true);
    expect(avocado?.category).toBe("feria");

    const shareText = formatShoppingListForShare(list, planned);
    expect(shareText).toContain("MI LISTA DE COMPRAS");
    expect(shareText).toContain("FERIA LIBRE");
    expect(shareText).toContain("CARNES, PESCADOS Y HUEVOS");
  });
});

describe("Daily Closing Audio Summary (Coach IA)", () => {
  it("generates an encouraging script when the day has balanced calories and high protein", () => {
    const summary = buildDailyClosingSummary({
      userName: "Álvaro Pérez",
      consumedCalories: 1950,
      goalCalories: 2000,
      consumedProtein: 135,
      goalProtein: 140,
      waterMl: 2000,
      targetWaterMl: 2000,
      mealCount: 4,
    });

    expect(summary.headline).toContain("sobresaliente");
    expect(summary.spokenText).toContain("Hola Álvaro");
    expect(summary.spokenText).toContain("1950");
    expect(summary.spokenText).toContain("135 gramos de proteína");
  });

  it("handles days with zero logged meals kindly", () => {
    const summary = buildDailyClosingSummary({
      userName: "Paula",
      consumedCalories: 0,
      goalCalories: 1800,
      consumedProtein: 0,
      goalProtein: 110,
      waterMl: 0,
      targetWaterMl: 2000,
      mealCount: 0,
    });

    expect(summary.badgeText).toBe("Sin registros hoy");
    expect(summary.spokenText).toContain("Hola Paula");
  });
});
