import { supabase } from "@/services/supabase";
import { DetectedFoodItem, DetectedFoodItemSchema, MealTotals, MealType } from "@/types/meal";
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
