import { supabase } from "@/services/supabase";
import { Json } from "@/types/database.types";
import {
  Recipe,
  ShoppingCategory,
  ShoppingListItem,
  ShoppingUnit,
  UpsertShoppingItemInput,
} from "@/types/recipe";
import {
  buildShoppingItemsFromRecipe,
  categorizeIngredientChile,
  normalizeShoppingIngredientKey,
} from "@/utils/shoppingList";

function mapShoppingItemRow(row: any): ShoppingListItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    normalizedKey: row.normalized_key,
    quantity: Number(row.quantity),
    unit: row.unit as ShoppingUnit,
    category: row.category as ShoppingCategory,
    checked: Boolean(row.checked),
    sourceRecipes: Array.isArray(row.source_recipes) ? row.source_recipes : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchShoppingList(userId: string): Promise<ShoppingListItem[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("shopping_list_items")
    .select("*")
    .eq("user_id", userId)
    .order("checked", { ascending: true })
    .order("category", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("No se pudo cargar tu lista de compras.");
  }

  return (data || []).map(mapShoppingItemRow);
}

export async function addItemsToShoppingList(
  userId: string,
  items: UpsertShoppingItemInput[]
): Promise<ShoppingListItem[]> {
  if (!userId) throw new Error("Inicia sesión para guardar en tu lista de compras.");
  if (!items.length) return fetchShoppingList(userId);

  const payload = items.map((item) => ({
    name: item.name,
    normalized_key: item.normalizedKey,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    source_recipe: item.sourceRecipe ?? null,
  }));

  const { data, error } = await supabase.rpc("upsert_shopping_list_items", {
    p_items: payload as unknown as Json,
  });

  if (error) {
    throw new Error("No se pudieron agregar los ingredientes a la lista de compras.");
  }

  return Array.isArray(data) ? data.map(mapShoppingItemRow) : [];
}

export async function addRecipeToShoppingList(
  userId: string,
  recipe: Recipe,
  servings?: number
): Promise<ShoppingListItem[]> {
  const items = buildShoppingItemsFromRecipe(recipe, servings);
  return addItemsToShoppingList(userId, items);
}

export async function addManualShoppingItem(
  userId: string,
  input: { name: string; quantity: number; unit: ShoppingUnit; category?: ShoppingCategory }
): Promise<ShoppingListItem[]> {
  const trimmedName = input.name.trim().replace(/\s+/g, " ");
  if (!trimmedName) throw new Error("Escribe el nombre del producto.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("La cantidad debe ser mayor que 0.");
  }

  const normalizedKey = normalizeShoppingIngredientKey(trimmedName) || trimmedName.toLowerCase();
  const category =
    input.category && input.category !== "otros"
      ? input.category
      : categorizeIngredientChile(trimmedName);

  return addItemsToShoppingList(userId, [
    {
      name: trimmedName,
      normalizedKey,
      quantity: Math.round(input.quantity * 100) / 100,
      unit: input.unit,
      category,
    },
  ]);
}

export async function toggleShoppingItem(
  userId: string,
  itemId: string,
  checked: boolean
): Promise<void> {
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) {
    throw new Error("No se pudo actualizar el estado del producto.");
  }
}

export async function clearCheckedShoppingItems(userId: string): Promise<void> {
  const { error } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("user_id", userId)
    .eq("checked", true);

  if (error) {
    throw new Error("No se pudieron limpiar los productos comprados.");
  }
}

export async function deleteShoppingItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) {
    throw new Error("No se pudo eliminar el producto de la lista.");
  }
}
