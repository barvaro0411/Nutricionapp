import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { saveMealToDatabase } from "@/services/mealService";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { randomUUID } from "expo-crypto";
import { DetectedFoodItemSchema, DetectedFoodItem, FoodUnit, MealTotals, MealType, NutritionReference, parseNutritionReference } from "@/types/meal";
import { isLiquidFood } from "@/utils/liquidUnits";

export interface FavoriteMealWithItems {
  id: string;
  title: string;
  meal_type: MealType;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  usage_count: number;
  items: {
    id: string;
    food_name: string;
    grams: number;
    unit?: FoodUnit;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    nutrition_reference?: NutritionReference;
  }[];
}

export function useFavoriteMeals() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // 1. Obtener comidas favoritas
  const favoritesQuery = useQuery({
    queryKey: ["favoriteMeals", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<FavoriteMealWithItems[]> => {
      if (!user) return [];

      let favData: any[] | null = null;
      const primaryQuery = await supabase
        .from("favorite_meals")
        .select(`
          id,
          title,
          meal_type,
          total_calories,
          total_protein,
          total_carbs,
          total_fat,
          usage_count,
          favorite_meal_items (
            id,
            food_name,
            grams,
            nutrition_reference,
            unit,
            calories,
            protein,
            carbs,
            fat
          )
        `)
        .eq("user_id", user.id)
        .order("usage_count", { ascending: false });

      if (primaryQuery.error) {
        const isUnitMissing =
          primaryQuery.error.message.includes("unit") ||
          primaryQuery.error.code === "42703" ||
          primaryQuery.error.message.includes("does not exist");

        if (isUnitMissing) {
          const fallbackQuery = await supabase
            .from("favorite_meals")
            .select(`
              id,
              title,
              meal_type,
              total_calories,
              total_protein,
              total_carbs,
              total_fat,
              usage_count,
              favorite_meal_items (
                id,
                food_name,
                grams,
                calories,
                protein,
                carbs,
                fat
              )
            `)
            .eq("user_id", user.id)
            .order("usage_count", { ascending: false });

          if (fallbackQuery.error) {
            throw new Error("No se pudieron cargar tus favoritas.");
          }
          favData = fallbackQuery.data;
        } else {
          throw new Error("No se pudieron cargar tus favoritas.");
        }
      } else {
        favData = primaryQuery.data;
      }

      return (favData || []).map((fav: any) => ({
        id: fav.id,
        title: fav.title,
        meal_type: fav.meal_type as MealType,
        total_calories: Number(fav.total_calories),
        total_protein: Number(fav.total_protein),
        total_carbs: Number(fav.total_carbs),
        total_fat: Number(fav.total_fat),
        usage_count: fav.usage_count,
        items: (fav.favorite_meal_items || []).map((item: any) => ({
          id: item.id,
          food_name: item.food_name,
          grams: Number(item.grams),
          unit: item.unit === "ml" || (!item.unit && isLiquidFood(item.food_name)) ? "ml" : "g",
          calories: Number(item.calories),
          protein: Number(item.protein),
          carbs: Number(item.carbs),
          fat: Number(item.fat),
          nutrition_reference: parseNutritionReference(item.nutrition_reference),
        })),
      }));
    },
  });

  // 2. Guardar comida actual como favorita
  const saveFavoriteMutation = useMutation({
    mutationFn: async ({
      title,
      mealType,
      items,
    }: {
      title: string;
      mealType: MealType;
      items: DetectedFoodItem[];
      totals: MealTotals;
    }) => {
      if (!user) throw new Error("No hay sesión de usuario");

      const { data: fav, error: favErr } = await supabase.rpc("save_favorite", {
        p_title: title.trim(), p_meal_type: mealType,
        p_items: items.map(item => DetectedFoodItemSchema.parse(item)),
      });
      if (favErr || !fav) throw new Error(favErr?.message || "No se pudo guardar la favorita.");
      return fav;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favoriteMeals"] });
    },
  });

  // 3. Registrar comida favorita en 1 toque (0 llamadas a la IA, 0 tokens)
  const logFavoriteMealMutation = useMutation({
    mutationFn: async (favoriteMeal: FavoriteMealWithItems & { targetMealType?: MealType }) => {
      if (!user) throw new Error("No hay sesión de usuario");

      const newMeal = await saveMealToDatabase({
        userId: user.id, mealType: favoriteMeal.targetMealType || favoriteMeal.meal_type,
        items: favoriteMeal.items.map(i => ({ food: i.food_name, grams: i.grams, unit: i.unit || "g", calories: i.calories, protein: i.protein, carbs: i.carbs, fat: i.fat, confidence: 1, nutrition_reference: i.nutrition_reference })),
        totals: { calories: favoriteMeal.total_calories, protein: favoriteMeal.total_protein, carbs: favoriteMeal.total_carbs, fat: favoriteMeal.total_fat },
        imagePath: "", notes: "Registrado desde favorita: " + favoriteMeal.title,
        loggedAt: useMealReviewStore.getState().loggedAt ? new Date(useMealReviewStore.getState().loggedAt!) : undefined,
        clientRequestId: randomUUID(),
      });
      return newMeal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      queryClient.invalidateQueries({ queryKey: ["userStreak"] });
      queryClient.invalidateQueries({ queryKey: ["favoriteMeals"] });
    },
  });

  return {
    favorites: favoritesQuery.data || [],
    isLoading: favoritesQuery.isLoading,
    error: favoritesQuery.error,
    saveFavorite: saveFavoriteMutation.mutateAsync,
    isSavingFavorite: saveFavoriteMutation.isPending,
    logFavoriteMeal: logFavoriteMealMutation.mutateAsync,
    isLoggingFavorite: logFavoriteMealMutation.isPending,
  };
}
