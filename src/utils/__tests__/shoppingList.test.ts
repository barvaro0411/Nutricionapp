import {
  buildShoppingItemsFromRecipe,
  categorizeIngredientChile,
  formatShoppingListForShare,
  inferShoppingUnit,
  mergeShoppingListPreview,
  normalizeShoppingIngredientKey,
} from "../shoppingList";
import type { Recipe, ShoppingListItem } from "@/types/recipe";

describe("shoppingList utilities", () => {
  test("normalizes accents, parenthetical notes, and common Spanish plurals consistently", () => {
    expect(normalizeShoppingIngredientKey("Tomates cherry")).toBe("tomate cherry");
    expect(normalizeShoppingIngredientKey("  TOMATE  ")).toBe("tomate");
    expect(normalizeShoppingIngredientKey("Limón")).toBe("limon");
    expect(normalizeShoppingIngredientKey("Limones (jugo)")).toBe("limon");
    expect(normalizeShoppingIngredientKey("Huevos")).toBe("huevo");
    expect(normalizeShoppingIngredientKey("Champiñones frescos")).toBe("champinon fresco");
    expect(normalizeShoppingIngredientKey("Nueces")).toBe("nuez");
    expect(normalizeShoppingIngredientKey("Hummus")).toBe("hummus");
  });

  test("categorizes common Chilean ingredients accurately", () => {
    expect(categorizeIngredientChile("Palta Hass")).toBe("verduras_frutas");
    expect(categorizeIngredientChile("Porotos verdes")).toBe("verduras_frutas");
    expect(categorizeIngredientChile("Porotos negros")).toBe("despensa_granos");
    expect(categorizeIngredientChile("Pechuga de pollo")).toBe("proteinas");
    expect(categorizeIngredientChile("Quesillo descremado")).toBe("lacteos_huevos");
    expect(categorizeIngredientChile("Marraqueta integral")).toBe("despensa_granos");
    expect(categorizeIngredientChile("Aceite de oliva")).toBe("condimentos_aceites");
  });

  test("infers shopping unit respecting explicit hint and liquid detection", () => {
    expect(inferShoppingUnit("Leche descremada")).toBe("ml");
    expect(inferShoppingUnit("Huevos", "unidad")).toBe("unidad");
    expect(inferShoppingUnit("Pechuga de pollo")).toBe("g");
  });

  test("builds scaled and deduplicated shopping items from recipe", () => {
    const recipe: Recipe = {
      id: "r1",
      title: "Tortilla de espinaca",
      description: "Rápida",
      mealType: "almuerzo",
      prepTimeMinutes: 15,
      servings: 2,
      caloriesPerServing: 250,
      proteinPerServing: 20,
      carbsPerServing: 10,
      fatPerServing: 12,
      instructions: ["Batir", "Cocinar"],
      imageUrl: null,
      ingredients: [
        {
          id: "i1",
          foodName: "Huevos",
          grams: 200,
          unit: "unidad",
          quantity: 4,
          category: "lacteos_huevos",
          calories: 280,
          protein: 24,
          carbs: 2,
          fat: 20,
        },
        {
          id: "i2",
          foodName: "Espinacas",
          grams: 100,
          calories: 23,
          protein: 3,
          carbs: 3,
          fat: 0.4,
        },
        {
          id: "i3",
          foodName: "Espinaca",
          grams: 50,
          calories: 12,
          protein: 1.5,
          carbs: 1.5,
          fat: 0.2,
        },
      ],
    };

    const items = buildShoppingItemsFromRecipe(recipe, 1);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      normalizedKey: "huevo",
      quantity: 2,
      unit: "unidad",
      category: "lacteos_huevos",
      sourceRecipe: "Tortilla de espinaca",
    });
    expect(items[1]).toMatchObject({
      normalizedKey: "espinaca",
      quantity: 75,
      unit: "g",
      category: "verduras_frutas",
    });
  });

  test("mergeShoppingListPreview adds to unchecked items and resets checked items", () => {
    const existing: ShoppingListItem[] = [
      {
        id: "s1",
        userId: "u1",
        name: "Pollo",
        normalizedKey: "pollo",
        quantity: 200,
        unit: "g",
        category: "proteinas",
        checked: false,
        sourceRecipes: ["Cazuela"],
        createdAt: "2026-11-12T10:00:00Z",
        updatedAt: "2026-11-12T10:00:00Z",
      },
      {
        id: "s2",
        userId: "u1",
        name: "Palta",
        normalizedKey: "palta",
        quantity: 1,
        unit: "unidad",
        category: "verduras_frutas",
        checked: true,
        sourceRecipes: ["Desayuno"],
        createdAt: "2026-11-12T10:00:00Z",
        updatedAt: "2026-11-12T10:00:00Z",
      },
    ];

    const merged = mergeShoppingListPreview(existing, [
      {
        name: "Pollo",
        normalizedKey: "pollo",
        quantity: 150,
        unit: "g",
        category: "proteinas",
        sourceRecipe: "Salteado",
      },
      {
        name: "Palta",
        normalizedKey: "palta",
        quantity: 2,
        unit: "unidad",
        category: "verduras_frutas",
        sourceRecipe: "Ensalada",
      },
    ]);

    expect(merged.find((m) => m.normalizedKey === "pollo")).toMatchObject({
      quantity: 350,
      checked: false,
      sourceRecipes: ["Cazuela", "Salteado"],
    });
    expect(merged.find((m) => m.normalizedKey === "palta")).toMatchObject({
      quantity: 2,
      checked: false,
      sourceRecipes: ["Desayuno", "Ensalada"],
    });
  });

  test("formatShoppingListForShare groups pending items by category and ignores checked items", () => {
    const items: ShoppingListItem[] = [
      {
        id: "1",
        userId: "u1",
        name: "Palta",
        normalizedKey: "palta",
        quantity: 2,
        unit: "unidad",
        category: "verduras_frutas",
        checked: false,
        sourceRecipes: [],
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "2",
        userId: "u1",
        name: "Sal",
        normalizedKey: "sal",
        quantity: 10,
        unit: "g",
        category: "condimentos_aceites",
        checked: true,
        sourceRecipes: [],
        createdAt: "",
        updatedAt: "",
      },
    ];

    const text = formatShoppingListForShare(items);
    expect(text).toContain("Verduras y frutas");
    expect(text).toContain("Palta (2 unid)");
    expect(text).not.toContain("Sal");
  });
});
