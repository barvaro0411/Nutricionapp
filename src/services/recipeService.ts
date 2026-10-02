import { supabase } from "@/services/supabase";
import { MealType } from "@/types/meal";

export interface RecipeIngredient {
  id: string;
  foodName: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  mealType: MealType;
  prepTimeMinutes: number;
  servings: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  instructions: string[];
  imageUrl: string | null;
  ingredients: RecipeIngredient[];
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
    console.error("Error al cargar recetas:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    mealType: r.meal_type as MealType,
    prepTimeMinutes: r.prep_time_minutes,
    servings: r.servings,
    caloriesPerServing: Number(r.calories_per_serving),
    proteinPerServing: Number(r.protein_per_serving),
    carbsPerServing: Number(r.carbs_per_serving),
    fatPerServing: Number(r.fat_per_serving),
    instructions: r.instructions || [],
    imageUrl: r.image_url,
    ingredients: (r.recipe_ingredients || []).map((i: any) => ({
      id: i.id,
      foodName: i.food_name,
      grams: Number(i.grams),
      calories: Number(i.calories),
      protein: Number(i.protein),
      carbs: Number(i.carbs),
      fat: Number(i.fat),
    })),
  }));
}

export async function fetchRecipeById(id: string): Promise<Recipe | null> {
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
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    mealType: data.meal_type as MealType,
    prepTimeMinutes: data.prep_time_minutes,
    servings: data.servings,
    caloriesPerServing: Number(data.calories_per_serving),
    proteinPerServing: Number(data.protein_per_serving),
    carbsPerServing: Number(data.carbs_per_serving),
    fatPerServing: Number(data.fat_per_serving),
    instructions: data.instructions || [],
    imageUrl: data.image_url,
    ingredients: (data.recipe_ingredients || []).map((i: any) => ({
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
