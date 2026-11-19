import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteUserRecipe,
  fetchRecipeById,
  fetchRecipes,
  fetchUserRecipes,
  generateAiRecipe,
  toggleUserRecipeFavorite,
} from "@/services/recipeService";
import { useAuthStore } from "@/stores/useAuthStore";
import { MealType } from "@/types/meal";
import { GenerateRecipeRequest, Recipe, RecipeSource } from "@/types/recipe";

export function useRecipes(filterMealType?: MealType) {
  return useQuery({
    queryKey: ["recipes", filterMealType],
    queryFn: () => fetchRecipes(filterMealType),
  });
}

export function useUserRecipes(filterMealType?: MealType) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["userRecipes", userId, filterMealType],
    enabled: !!userId,
    queryFn: () => fetchUserRecipes(filterMealType),
  });
}

export function useRecipeDetail(recipeId: string, source?: RecipeSource) {
  return useQuery({
    queryKey: ["recipeDetail", recipeId, source || "auto"],
    queryFn: () => fetchRecipeById(recipeId, source),
    enabled: !!recipeId,
  });
}

export function useGenerateRecipe() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: (input: GenerateRecipeRequest) => generateAiRecipe(input),
    onSuccess: (created: Recipe) => {
      queryClient.setQueryData(["recipeDetail", created.id, "ai"], created);
      queryClient.setQueryData(["recipeDetail", created.id, "auto"], created);
      void queryClient.invalidateQueries({ queryKey: ["userRecipes", userId] });
    },
  });
}

export function useToggleRecipeFavorite() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: ({ recipeId, isFavorite }: { recipeId: string; isFavorite: boolean }) =>
      toggleUserRecipeFavorite(recipeId, isFavorite),
    onSuccess: (nextValue, { recipeId }) => {
      queryClient.setQueriesData<Recipe | null>(
        { queryKey: ["recipeDetail", recipeId] },
        (prev) => (prev ? { ...prev, isFavorite: nextValue } : prev)
      );
      void queryClient.invalidateQueries({ queryKey: ["userRecipes", userId] });
    },
  });
}

export function useDeleteUserRecipe() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: (recipeId: string) => deleteUserRecipe(recipeId),
    onSuccess: (_, recipeId) => {
      queryClient.removeQueries({ queryKey: ["recipeDetail", recipeId] });
      void queryClient.invalidateQueries({ queryKey: ["userRecipes", userId] });
    },
  });
}
