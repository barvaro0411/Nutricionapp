import {
  deleteUserRecipe,
  fetchRecipeById,
  fetchUserRecipes,
  generateAiRecipe,
  toggleUserRecipeFavorite,
} from "../recipeService";

const mockInvoke = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/services/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const rawAiRow = {
  id: "u-rec-1",
  user_id: "user-1",
  title: "Bowl de pollo y quinoa",
  description: "Alto en proteína",
  meal_type: "almuerzo",
  prep_time_minutes: 20,
  servings: 1,
  calories_per_serving: 480,
  protein_per_serving: 40,
  carbs_per_serving: 45,
  fat_per_serving: 14,
  ingredients: [
    {
      id: "ai_1",
      foodName: "Pollo",
      grams: 150,
      unit: "g",
      category: "proteinas",
      calories: 250,
      protein: 46,
      carbs: 0,
      fat: 5,
    },
  ],
  instructions: ["Cocinar quinoa.", "Saltear pollo y armar bowl."],
  is_favorite: false,
  created_at: "2026-11-12T12:00:00Z",
};

test("generateAiRecipe invokes generate-recipe and maps returned user recipe", async () => {
  mockInvoke.mockResolvedValueOnce({
    data: { success: true, data: rawAiRow },
    error: null,
  });

  const recipe = await generateAiRecipe({ mealType: "almuerzo", servings: 1 });
  expect(mockInvoke).toHaveBeenCalledWith("generate-recipe", {
    body: { mealType: "almuerzo", servings: 1 },
  });
  expect(recipe).toMatchObject({
    id: "u-rec-1",
    title: "Bowl de pollo y quinoa",
    source: "ai",
    caloriesPerServing: 480,
    ingredients: [expect.objectContaining({ foodName: "Pollo", grams: 150, unit: "g" })],
  });
});

test("generateAiRecipe unpacks friendly error from Edge Function response", async () => {
  mockInvoke.mockResolvedValueOnce({
    data: null,
    error: {
      message: "Edge Function returned a non-2xx status code",
      context: {
        json: async () => ({ error: { message: "Alcanzaste el límite diario de IA." } }),
      },
    },
  });

  await expect(generateAiRecipe({ servings: 1 })).rejects.toThrow("Alcanzaste el límite diario de IA.");
});

test("fetchUserRecipes returns mapped AI recipes ordered correctly", async () => {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    then: (resolve: (v: unknown) => unknown) => resolve({ data: [rawAiRow], error: null }),
  };
  mockFrom.mockReturnValueOnce(chain);

  const list = await fetchUserRecipes("almuerzo");
  expect(mockFrom).toHaveBeenCalledWith("user_recipes");
  expect(list).toHaveLength(1);
  expect(list[0].source).toBe("ai");
});

test("fetchRecipeById falls back from catalog recipes to user_recipes when source is omitted", async () => {
  mockFrom.mockImplementation((table: string) => {
    if (table === "recipes") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    }
    if (table === "user_recipes") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: rawAiRow, error: null }),
          }),
        }),
      };
    }
    throw new Error("Unexpected table " + table);
  });

  const recipe = await fetchRecipeById("u-rec-1");
  expect(recipe?.source).toBe("ai");
  expect(recipe?.title).toBe("Bowl de pollo y quinoa");
});

test("toggleUserRecipeFavorite and deleteUserRecipe call user_recipes", async () => {
  mockFrom
    .mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { is_favorite: true }, error: null }),
          }),
        }),
      }),
    })
    .mockReturnValueOnce({
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
    });

  expect(await toggleUserRecipeFavorite("u-rec-1", true)).toBe(true);
  await expect(deleteUserRecipe("u-rec-1")).resolves.toBeUndefined();
});
