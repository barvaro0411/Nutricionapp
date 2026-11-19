import { supabase } from "@/services/supabase";
import { removeMealPhoto } from "@/services/storageService";
import { DetectedFoodItem, DetectedFoodItemSchema, MealTotals, MealType } from "@/types/meal";
import { computeMealItemsTotals, EditableMealItem } from "@/utils/mealEditUtils";
import { Json } from "@/types/database.types";
import { randomUUID } from "expo-crypto";
import {
  buildMealMutation,
  enqueueMutation,
  requestBackgroundSync,
} from "./offlineQueueStore";
import { useOfflineStore } from "./offlineService";

export interface SaveMealParams {
  userId: string;
  mealType: MealType;
  imagePath: string | null;
  items: DetectedFoodItem[];
  totals: MealTotals;
  notes?: string;
  loggedAt?: Date;
  clientRequestId?: string;
}

export async function saveMealToDatabase(params: SaveMealParams) {
  const { mealType, imagePath, items, notes, loggedAt, clientRequestId } = params;
  if (!items.length || items.length > 100)
    throw new Error("La comida debe tener entre 1 y 100 alimentos.");

  const validatedItems = items.map((item) => DetectedFoodItemSchema.parse(item));
  const reqId = clientRequestId || randomUUID();

  // Si el navegador declara explícitamente estar desconectado, encolar en IndexedDB
  const isWebOffline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  if (isWebOffline) {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data.session?.access_token;
    if (token) {
      const mutation = buildMealMutation({
        id: reqId,
        accessToken: token,
        mealType,
        items: validatedItems,
        imagePath,
        notes,
        loggedAt,
        clientRequestId: reqId,
      });
      await enqueueMutation(mutation);
      await requestBackgroundSync();
      useOfflineStore.getState().incrementPendingSync();
      return { id: reqId, offline: true };
    }
  }

  try {
    const { data, error } = await supabase.rpc("save_meal", {
      p_meal_type: mealType,
      p_items: validatedItems as unknown as Json,
      p_image_path: imagePath || null,
      p_notes: notes?.trim() || null,
      p_logged_at: (loggedAt || new Date()).toISOString(),
      p_client_request_id: reqId,
    });

    if (error || !data) {
      throw new Error(
        `Error al guardar la comida: ${error?.message || "Sin respuesta del servidor"}`
      );
    }
    return data;
  } catch (err: any) {
    // Si falló por error de red / conexión, guardar en la cola offline para Background Sync
    const isNetworkError =
      !err?.status &&
      (err?.message?.includes("network") ||
        err?.message?.includes("fetch") ||
        err?.message?.includes("Failed") ||
        err?.message?.includes("aborted"));

    if (isNetworkError) {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      if (token) {
        const mutation = buildMealMutation({
          id: reqId,
          accessToken: token,
          mealType,
          items: validatedItems,
          imagePath,
          notes,
          loggedAt,
          clientRequestId: reqId,
        });
        await enqueueMutation(mutation);
        await requestBackgroundSync();
        useOfflineStore.getState().incrementPendingSync();
        return { id: reqId, offline: true };
      }
    }

    throw err;
  }
}

export interface UpdateSavedMealParams {
  userId: string;
  mealId: string;
  mealType: MealType;
  loggedAtIso: string;
  items: EditableMealItem[];
  removedItemIds?: string[];
}

export async function updateSavedMeal(params: UpdateSavedMealParams) {
  const { userId, mealId, mealType, loggedAtIso, items, removedItemIds = [] } = params;
  if (!userId || !mealId) throw new Error("Falta información de la comida.");
  if (!items.length) {
    throw new Error("Debe quedar al menos un alimento o elimina la comida completa.");
  }

  for (const item of items) {
    if (!Number.isFinite(item.grams) || item.grams <= 0 || item.grams > 20000) {
      throw new Error(`Cantidad inválida para ${item.food_name}.`);
    }
  }

  if (removedItemIds.length > 0) {
    const { error: delItemsErr } = await supabase
      .from("meal_items")
      .delete()
      .eq("meal_id", mealId)
      .in("id", removedItemIds);
    if (delItemsErr) {
      throw new Error("No se pudieron quitar los alimentos eliminados.");
    }
  }

  for (const item of items) {
    const { error: itemErr } = await supabase
      .from("meal_items")
      .update({
        grams: item.grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })
      .eq("id", item.id)
      .eq("meal_id", mealId);

    if (itemErr) {
      throw new Error(`No se pudo actualizar ${item.food_name}.`);
    }
  }

  const totals = computeMealItemsTotals(items);
  const { data, error: mealErr } = await supabase
    .from("meals")
    .update({
      meal_type: mealType,
      logged_at: loggedAtIso,
      total_calories: totals.calories,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fat: totals.fat,
    })
    .eq("id", mealId)
    .eq("user_id", userId)
    .select()
    .single();

  if (mealErr || !data) {
    throw new Error("No se pudieron guardar los cambios de la comida.");
  }

  return data;
}

export async function deleteSavedMeal(params: {
  userId: string;
  mealId: string;
  imagePath?: string | null;
}) {
  const { userId, mealId, imagePath } = params;
  if (!userId || !mealId) throw new Error("Falta información de la comida.");

  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("id", mealId)
    .eq("user_id", userId);

  if (error) {
    throw new Error("No se pudo eliminar la comida.");
  }

  if (imagePath) {
    await removeMealPhoto(imagePath).catch(() => undefined);
  }
}
