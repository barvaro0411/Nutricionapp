import {
  computeMealItemsTotals,
  EditableMealItem,
  scaleMealItemGrams,
} from "../mealEditUtils";
import {
  autoGenerateWeeklyPlan,
  buildShoppingItemsFromWeeklyPlan,
  createEmptyWeeklyPlan,
  recipeToPlannerSlot,
  summarizeWeekPlan,
} from "../weeklyPlanner";
import type { Recipe } from "@/types/recipe";

describe("mealEditUtils", () => {
  const sampleItem: EditableMealItem = {
    id: "item-1",
    food_name: "Pechuga de pollo a la plancha",
    grams: 150,
    unit: "g",
    calories: 247.5,
    protein: 46.5,
    carbs: 0,
    fat: 5.4,
  };

  test("scaleMealItemGrams scales energy and macros proportionally", () => {
    const doubled = scaleMealItemGrams(sampleItem, 300);
    expect(doubled.grams).toBe(300);
    expect(doubled.calories).toBe(495);
    expect(doubled.protein).toBe(93);
    expect(doubled.fat).toBe(10.8);
  });

  test("computeMealItemsTotals sums multiple items cleanly", () => {
    const totals = computeMealItemsTotals([
      sampleItem,
      {
        id: "item-2",
        food_name: "Arroz blanco cocido",
        grams: 150,
        unit: "g",
        calories: 195,
        protein: 4,
        carbs: 42,
        fat: 0.4,
      },
    ]);
    expect(totals.calories).toBe(442.5);
    expect(totals.protein).toBe(50.5);
    expect(totals.carbs).toBe(42);
    expect(totals.fat).toBe(5.8);
  });
});

describe("weeklyPlanner", () => {
  const catalog: Recipe[] = [
    {
      id: "r1",
      title: "Avena con fruta",
      description: null,
      mealType: "desayuno",
      prepTimeMinutes: 10,
      servings: 1,
      caloriesPerServing: 360,
      proteinPerServing: 18,
      carbsPerServing: 52,
      fatPerServing: 8,
      instructions: [],
      imageUrl: null,
      source: "catalog",
      ingredients: [
        {
          id: "i1",
          foodName: "Avena tradicional",
          grams: 60,
          unit: "g",
          calories: 220,
          protein: 8,
          carbs: 38,
          fat: 4,
        },
        {
          id: "i2",
          foodName: "Leche descremada",
          grams: 200,
          unit: "ml",
          calories: 70,
          protein: 7,
          carbs: 10,
          fat: 0.5,
        },
      ],
    },
    {
      id: "r2",
      title: "Pollo a la plancha con quinoa",
      description: null,
      mealType: "almuerzo",
      prepTimeMinutes: 25,
      servings: 1,
      caloriesPerServing: 560,
      proteinPerServing: 46,
      carbsPerServing: 50,
      fatPerServing: 15,
      instructions: [],
      imageUrl: null,
      source: "catalog",
      ingredients: [
        {
          id: "i3",
          foodName: "Pechuga de pollo",
          grams: 180,
          unit: "g",
          calories: 290,
          protein: 40,
          carbs: 0,
          fat: 6,
        },
      ],
    },
    {
      id: "r3",
      title: "Tortilla de verduras y atún",
      description: null,
      mealType: "cena",
      prepTimeMinutes: 15,
      servings: 1,
      caloriesPerServing: 410,
      proteinPerServing: 34,
      carbsPerServing: 18,
      fatPerServing: 20,
      instructions: [],
      imageUrl: null,
      source: "ai",
      ingredients: [
        {
          id: "i4",
          foodName: "Atún al agua",
          grams: 120,
          unit: "g",
          calories: 140,
          protein: 28,
          carbs: 0,
          fat: 1,
        },
      ],
    },
  ];

  test("autoGenerateWeeklyPlan filters incompatible dairy recipes when lactose_intolerance is active", () => {
    const { plan, compatibleCount } = autoGenerateWeeklyPlan({
      recipes: catalog,
      restrictions: ["lactose_intolerance"],
    });

    expect(compatibleCount).toBe(2);
    expect(plan.lun.desayuno?.recipeId).not.toBe("r1");
    expect(summarizeWeekPlan(plan).plannedMeals).toBe(21);
  });

  test("buildShoppingItemsFromWeeklyPlan consolidates repeated ingredients across days and scales servings", () => {
    const plan = createEmptyWeeklyPlan();
    plan.lun.almuerzo = recipeToPlannerSlot(catalog[1], 2); // 360g pollo
    plan.mar.almuerzo = recipeToPlannerSlot(catalog[1], 1); // +180g pollo = 540g pollo

    const map = new Map(catalog.map((r) => [r.id, r]));
    const shopping = buildShoppingItemsFromWeeklyPlan(plan, map);

    expect(shopping).toHaveLength(1);
    expect(shopping[0].name).toBe("Pechuga de pollo");
    expect(shopping[0].quantity).toBe(540);
    expect(shopping[0].unit).toBe("g");
  });
});
