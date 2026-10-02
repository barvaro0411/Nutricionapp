import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { DetectedFoodItem, MealTotals, MealType } from "@/types/meal";

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
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
}

export function useFavoriteMeals() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // 1. Obtener comidas favoritas
  const favoritesQuery = useQuery({
    queryKey: ["favoriteMeals", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<FavoriteMealWithItems[]> => {
      if (!user) return [];

      const { data, error } = await supabase
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

      if (error) {
        console.error("Error al obtener comidas favoritas:", error);
        return [];
      }

      return (data || []).map((fav: any) => ({
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
          calories: Number(item.calories),
          protein: Number(item.protein),
          carbs: Number(item.carbs),
          fat: Number(item.fat),
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
      totals,
    }: {
      title: string;
      mealType: MealType;
      items: DetectedFoodItem[];
      totals: MealTotals;
    }) => {
      if (!user) throw new Error("No hay sesión de usuario");

      const { data: fav, error: favErr } = await supabase
        .from("favorite_meals")
        .insert({
          user_id: user.id,
          title: title.trim(),
          meal_type: mealType,
          total_calories: totals.calories,
          total_protein: totals.protein,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
        })
        .select()
        .single();

      if (favErr || !fav) throw new Error(favErr?.message || "Error al crear favorita");

      const itemsToInsert = items.map((item) => ({
        favorite_meal_id: fav.id,
        food_name: item.food,
        grams: item.grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      }));

      const { error: itemsErr } = await supabase
        .from("favorite_meal_items")
        .insert(itemsToInsert);

      if (itemsErr) throw new Error(itemsErr.message);

      return fav;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favoriteMeals"] });
    },
  });

  // 3. Registrar comida favorita en 1 toque (0 llamadas a la IA, 0 tokens)
  const logFavoriteMealMutation = useMutation({
    mutationFn: async (favoriteMeal: FavoriteMealWithItems) => {
      if (!user) throw new Error("No hay sesión de usuario");

      // Insertar en 'meals'
      const { data: newMeal, error: mealErr } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          meal_type: favoriteMeal.meal_type,
          total_calories: favoriteMeal.total_calories,
          total_protein: favoriteMeal.total_protein,
          total_carbs: favoriteMeal.total_carbs,
          total_fat: favoriteMeal.total_fat,
          notes: `Registrado desde favorita: ${favoriteMeal.title}`,
          logged_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (mealErr || !newMeal) throw new Error(mealErr?.message);

      // Insertar ítems
      const itemsToInsert = favoriteMeal.items.map((i) => ({
        meal_id: newMeal.id,
        food_name: i.food_name,
        grams: i.grams,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        confidence: 1.0,
        ai_detected: false,
      }));

      await supabase.from("meal_items").insert(itemsToInsert);

      // Incrementar contador de uso de la comida frecuente
      await supabase
        .from("favorite_meals")
        .update({ usage_count: favoriteMeal.usage_count + 1 })
        .eq("id", favoriteMeal.id);

      return newMeal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      queryClient.invalidateQueries({ queryKey: ["favoriteMeals"] });
    },
  });

  return {
    favorites: favoritesQuery.data || [],
    isLoading: favoritesQuery.isLoading,
    saveFavorite: saveFavoriteMutation.mutateAsync,
    isSavingFavorite: saveFavoriteMutation.isPending,
    logFavoriteMeal: logFavoriteMealMutation.mutateAsync,
    isLoggingFavorite: logFavoriteMealMutation.isPending,
  };
}
