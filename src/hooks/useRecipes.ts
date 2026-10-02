import { useQuery } from "@tanstack/react-query";
import { fetchRecipes, fetchRecipeById } from "@/services/recipeService";
import { MealType } from "@/types/meal";

export function useRecipes(filterMealType?: MealType) {
  return useQuery({
    queryKey: ["recipes", filterMealType],
    queryFn: () => fetchRecipes(filterMealType),
  });
}

export function useRecipeDetail(recipeId: string) {
  return useQuery({
    queryKey: ["recipeDetail", recipeId],
    queryFn: () => fetchRecipeById(recipeId),
    enabled: !!recipeId,
  });
}
