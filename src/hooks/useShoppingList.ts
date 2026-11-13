import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addManualShoppingItem,
  addRecipeToShoppingList,
  clearCheckedShoppingItems,
  deleteShoppingItem,
  fetchShoppingList,
  toggleShoppingItem,
} from "@/services/shoppingListService";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Recipe,
  SHOPPING_CATEGORY_ORDER,
  ShoppingCategory,
  ShoppingListItem,
  ShoppingUnit,
} from "@/types/recipe";

export interface ShoppingCategoryGroup {
  category: ShoppingCategory;
  items: ShoppingListItem[];
}

export function useShoppingList() {
  const userId = useAuthStore((state) => state.user?.id || "");
  const queryClient = useQueryClient();
  const queryKey = ["shoppingList", userId] as const;

  const listQuery = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: () => fetchShoppingList(userId),
  });

  const addRecipeMutation = useMutation({
    mutationFn: ({ recipe, servings }: { recipe: Recipe; servings?: number }) =>
      addRecipeToShoppingList(userId, recipe, servings),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
    },
  });

  const addManualMutation = useMutation({
    mutationFn: (input: {
      name: string;
      quantity: number;
      unit: ShoppingUnit;
      category?: ShoppingCategory;
    }) => addManualShoppingItem(userId, input),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      toggleShoppingItem(userId, itemId, checked),
    onMutate: async ({ itemId, checked }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<ShoppingListItem[]>(
          queryKey,
          previous.map((item) => (item.id === itemId ? { ...item, checked } : item))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const clearCheckedMutation = useMutation({
    mutationFn: () => clearCheckedShoppingItems(userId),
    onSuccess: () => {
      queryClient.setQueryData<ShoppingListItem[]>(queryKey, (prev = []) =>
        prev.filter((item) => !item.checked)
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => deleteShoppingItem(userId, itemId),
    onSuccess: (_, itemId) => {
      queryClient.setQueryData<ShoppingListItem[]>(queryKey, (prev = []) =>
        prev.filter((item) => item.id !== itemId)
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const items = useMemo(() => listQuery.data || [], [listQuery.data]);
  const pendingItems = useMemo(() => items.filter((item) => !item.checked), [items]);
  const checkedItems = useMemo(() => items.filter((item) => item.checked), [items]);

  const pendingGroups = useMemo<ShoppingCategoryGroup[]>(() => {
    return SHOPPING_CATEGORY_ORDER.map((category) => ({
      category,
      items: pendingItems.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [pendingItems]);

  return {
    items,
    pendingItems,
    checkedItems,
    pendingGroups,
    pendingCount: pendingItems.length,
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    refetch: listQuery.refetch,
    addRecipeIngredients: addRecipeMutation.mutateAsync,
    addManualItem: addManualMutation.mutateAsync,
    toggleItem: (itemId: string, checked: boolean) =>
      toggleMutation.mutate({ itemId, checked }),
    clearChecked: clearCheckedMutation.mutateAsync,
    removeItem: removeMutation.mutateAsync,
    isAdding: addRecipeMutation.isPending || addManualMutation.isPending,
    isMutating:
      toggleMutation.isPending ||
      clearCheckedMutation.isPending ||
      removeMutation.isPending,
  };
}
