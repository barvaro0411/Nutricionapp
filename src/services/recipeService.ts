import { supabase } from "@/services/supabase";
import { MealType } from "@/types/meal";
import type {
  GenerateRecipeRequest,
  Recipe,
  RecipeIngredient,
  RecipeSource,
  ShoppingCategory,
  ShoppingUnit,
} from "@/types/recipe";
import { extractFunctionErrorMessage } from "@/utils/functionErrors";

export type { Recipe, RecipeIngredient, RecipeSource, GenerateRecipeRequest };

function mapCatalogRecipeRow(r: any): Recipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    mealType: r.meal_type as MealType,
    prepTimeMinutes: Number(r.prep_time_minutes),
    servings: Number(r.servings),
    caloriesPerServing: Number(r.calories_per_serving),
    proteinPerServing: Number(r.protein_per_serving),
    carbsPerServing: Number(r.carbs_per_serving),
    fatPerServing: Number(r.fat_per_serving),
    instructions: Array.isArray(r.instructions) ? r.instructions : [],
    imageUrl: r.image_url ?? null,
    source: "catalog",
    ingredients: (r.recipe_ingredients || []).map((i: any) => ({
      id: i.id,
      foodName: i.food_name,
      grams: Number(i.grams),
      calories: Number(i.calories),
      protein: Number(i.protein),
      carbs: Number(i.carbs),
      fat: Number(i.fat),
    })),
  };
}

function mapUserRecipeRow(r: any): Recipe {
  const rawIngredients = Array.isArray(r.ingredients) ? r.ingredients : [];
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    mealType: r.meal_type as MealType,
    prepTimeMinutes: Number(r.prep_time_minutes),
    servings: Number(r.servings),
    caloriesPerServing: Number(r.calories_per_serving),
    proteinPerServing: Number(r.protein_per_serving),
    carbsPerServing: Number(r.carbs_per_serving),
    fatPerServing: Number(r.fat_per_serving),
    instructions: Array.isArray(r.instructions) ? r.instructions : [],
    imageUrl: null,
    source: "ai",
    isFavorite: Boolean(r.is_favorite),
    createdAt: r.created_at,
    ingredients: rawIngredients.map((i: any, idx: number) => ({
      id: String(i.id || `ai_ing_${idx + 1}`),
      foodName: String(i.foodName || ""),
      grams: Number(i.grams || 0),
      unit: i.unit as ShoppingUnit | undefined,
      quantity: typeof i.quantity === "number" ? Number(i.quantity) : undefined,
      category: i.category as ShoppingCategory | undefined,
      calories: Number(i.calories || 0),
      protein: Number(i.protein || 0),
      carbs: Number(i.carbs || 0),
      fat: Number(i.fat || 0),
    })),
  };
}

export async function fetchRecipes(filterMealType?: MealType): Promise<Recipe[]> {
  let query = supabase.from("recipes").select(`
    id,
    title,
    description,
    meal_type,
    prep_time_minutes,
    servings,
    calories_per_serving,
    protein_per_serving,
    carbs_per_serving,
    fat_per_serving,
    instructions,
    image_url,
    recipe_ingredients (
      id,
      food_name,
      grams,
      calories,
      protein,
      carbs,
      fat
    )
  `);

  if (filterMealType) {
    query = query.eq("meal_type", filterMealType);
  }

  const { data, error } = await query.order("calories_per_serving", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar las recetas.");
  }

  return (data || []).map(mapCatalogRecipeRow);
}

/**
 * Fetches private AI-generated recipes owned by the authenticated user.
 */
export async function fetchUserRecipes(filterMealType?: MealType): Promise<Recipe[]> {
  let query = supabase
    .from("user_recipes")
    .select(
      "id,title,description,meal_type,prep_time_minutes,servings,calories_per_serving,protein_per_serving,carbs_per_serving,fat_per_serving,ingredients,instructions,is_favorite,created_at"
    );

  if (filterMealType) {
    query = query.eq("meal_type", filterMealType);
  }

  const { data, error } = await query
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("No se pudieron cargar tus recetas guardadas.");
  }

  return (data || []).map(mapUserRecipeRow);
}

export async function fetchRecipeById(
  id: string,
  source?: RecipeSource
): Promise<Recipe | null> {
  if (source !== "ai") {
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        id,
        title,
        description,
        meal_type,
        prep_time_minutes,
        servings,
        calories_per_serving,
        protein_per_serving,
        carbs_per_serving,
        fat_per_serving,
        instructions,
        image_url,
        recipe_ingredients (
          id,
          food_name,
          grams,
          calories,
          protein,
          carbs,
          fat
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error && source === "catalog") {
      throw new Error("No se pudo cargar la receta.");
    }
    if (data) {
      return mapCatalogRecipeRow(data);
    }
    if (source === "catalog") {
      return null;
    }
  }

  const { data: userRecipe, error: userError } = await supabase
    .from("user_recipes")
    .select(
      "id,title,description,meal_type,prep_time_minutes,servings,calories_per_serving,protein_per_serving,carbs_per_serving,fat_per_serving,ingredients,instructions,is_favorite,created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (userError) {
    throw new Error("No se pudo cargar la receta.");
  }
  if (!userRecipe) return null;

  return mapUserRecipeRow(userRecipe);
}

/**
 * Invokes the generate-recipe Edge Function and maps the newly persisted user recipe.
 */
export async function generateAiRecipe(input: GenerateRecipeRequest): Promise<Recipe> {
  const { data, error } = await supabase.functions.invoke<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: { message?: string };
  }>("generate-recipe", {
    body: input,
  });

  if (error) {
    const msg = await extractFunctionErrorMessage(
      error,
      "No se pudo generar la receta con IA. Inténtalo nuevamente."
    );
    throw new Error(msg);
  }

  if (!data?.success || !data?.data) {
    throw new Error(data?.error?.message || "No se recibió una receta válida del servidor.");
  }

  return mapUserRecipeRow(data.data);
}

export async function toggleUserRecipeFavorite(
  recipeId: string,
  isFavorite: boolean
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_recipes")
    .update({ is_favorite: isFavorite })
    .eq("id", recipeId)
    .select("is_favorite")
    .single();

  if (error || !data) {
    throw new Error("No se pudo actualizar el estado de favorito.");
  }
  return Boolean(data.is_favorite);
}

export async function deleteUserRecipe(recipeId: string): Promise<void> {
  const { error } = await supabase.from("user_recipes").delete().eq("id", recipeId);
  if (error) {
    throw new Error("No se pudo eliminar la receta.");
  }
}
