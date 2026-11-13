import {
  addManualShoppingItem,
  addRecipeToShoppingList,
  clearCheckedShoppingItems,
  deleteShoppingItem,
  fetchShoppingList,
  toggleShoppingItem,
} from "../shoppingListService";
import type { Recipe } from "@/types/recipe";

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/services/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const rawRow = {
  id: "s-1",
  user_id: "user-1",
  name: "Huevos",
  normalized_key: "huevo",
  quantity: 4,
  unit: "unidad",
  category: "lacteos_huevos",
  checked: false,
  source_recipes: ["Tortilla"],
  created_at: "2026-11-12T10:00:00Z",
  updated_at: "2026-11-12T10:00:00Z",
};

test("fetchShoppingList maps sorted rows", async () => {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    then: (resolve: (v: unknown) => unknown) => resolve({ data: [rawRow], error: null }),
  };
  mockFrom.mockReturnValueOnce(chain);

  const list = await fetchShoppingList("user-1");
  expect(mockFrom).toHaveBeenCalledWith("shopping_list_items");
  expect(list[0]).toMatchObject({
    id: "s-1",
    normalizedKey: "huevo",
    quantity: 4,
    unit: "unidad",
    category: "lacteos_huevos",
  });
});

test("addRecipeToShoppingList scales ingredients and invokes upsert_shopping_list_items RPC", async () => {
  mockRpc.mockResolvedValueOnce({ data: [rawRow], error: null });
  const recipe: Recipe = {
    id: "r1",
    title: "Tortilla",
    description: null,
    mealType: "almuerzo",
    prepTimeMinutes: 15,
    servings: 1,
    caloriesPerServing: 300,
    proteinPerServing: 20,
    carbsPerServing: 5,
    fatPerServing: 20,
    instructions: ["Batir", "Cocinar"],
    imageUrl: null,
    ingredients: [
      {
        id: "i1",
        foodName: "Huevos",
        grams: 100,
        unit: "unidad",
        quantity: 2,
        category: "lacteos_huevos",
        calories: 140,
        protein: 12,
        carbs: 1,
        fat: 10,
      },
    ],
  };

  const result = await addRecipeToShoppingList("user-1", recipe, 2);
  expect(mockRpc).toHaveBeenCalledWith("upsert_shopping_list_items", {
    p_items: [
      {
        name: "Huevos",
        normalized_key: "huevo",
        quantity: 4,
        unit: "unidad",
        category: "lacteos_huevos",
        source_recipe: "Tortilla",
      },
    ],
  });
  expect(result).toHaveLength(1);
});

test("addManualShoppingItem normalizes name and auto-categorizes Chilean ingredients", async () => {
  mockRpc.mockResolvedValueOnce({ data: [], error: null });
  await addManualShoppingItem("user-1", { name: "Paltas Hass", quantity: 3, unit: "unidad" });
  expect(mockRpc).toHaveBeenCalledWith("upsert_shopping_list_items", {
    p_items: [
      {
        name: "Paltas Hass",
        normalized_key: "palta hass",
        quantity: 3,
        unit: "unidad",
        category: "verduras_frutas",
        source_recipe: null,
      },
    ],
  });
});

test("toggle, clearChecked, and delete mutate shopping_list_items cleanly", async () => {
  mockFrom
    .mockReturnValueOnce({
      update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    })
    .mockReturnValueOnce({
      delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    })
    .mockReturnValueOnce({
      delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    });

  await expect(toggleShoppingItem("user-1", "s-1", true)).resolves.toBeUndefined();
  await expect(clearCheckedShoppingItems("user-1")).resolves.toBeUndefined();
  await expect(deleteShoppingItem("user-1", "s-1")).resolves.toBeUndefined();
});
