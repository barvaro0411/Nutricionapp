import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { FoodUnit } from "@/types/meal";
import { useAuthStore } from "@/stores/useAuthStore";

export interface UserFoodCorrection {
  foodKey: string;
  displayName: string;
  preferredGrams: number;
  unit: FoodUnit;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  count: number;
  updatedAt: string;
}

const MAX_STORED_CORRECTIONS = 60;

export function normalizeFoodKey(foodName: string): string {
  return (foodName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function storageKey(userId = useAuthStore.getState().user?.id) {
  return `user_food_corrections_${userId || "anonymous"}`;
}

async function readStorage(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeStorage(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore storage quota errors safely
  }
}

export async function getAllUserFoodCorrections(
  userId = useAuthStore.getState().user?.id
): Promise<Record<string, UserFoodCorrection>> {
  const raw = await readStorage(storageKey(userId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, UserFoodCorrection>;
  } catch {
    return {};
  }
}

export async function getUserFoodCorrection(
  foodName: string,
  userId = useAuthStore.getState().user?.id
): Promise<UserFoodCorrection | null> {
  const key = normalizeFoodKey(foodName);
  if (!key) return null;
  const all = await getAllUserFoodCorrections(userId);
  return all[key] || null;
}

/**
 * Registra localmente una corrección de porción/nutrientes hecha por el usuario
 * para recordarla como sugerencia personal en futuros registros del mismo plato.
 * Privacidad por diseño (Ley 21.719): se almacena para la cuenta del usuario sin enviarse a entrenar modelos externos.
 */
export async function recordUserFoodCorrection(
  item: {
    food: string;
    grams: number;
    unit?: FoodUnit;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  },
  userId = useAuthStore.getState().user?.id
): Promise<UserFoodCorrection | null> {
  const key = normalizeFoodKey(item.food);
  if (!key || !Number.isFinite(item.grams) || item.grams <= 0) return null;

  const all = await getAllUserFoodCorrections(userId);
  const existing = all[key];
  const factor = 100 / item.grams;

  const entry: UserFoodCorrection = {
    foodKey: key,
    displayName: item.food.trim(),
    preferredGrams: Math.round(item.grams * 10) / 10,
    unit: item.unit || "g",
    caloriesPer100g: Math.round(item.calories * factor * 10) / 10,
    proteinPer100g: Math.round(item.protein * factor * 10) / 10,
    carbsPer100g: Math.round(item.carbs * factor * 10) / 10,
    fatPer100g: Math.round(item.fat * factor * 10) / 10,
    count: (existing?.count || 0) + 1,
    updatedAt: new Date().toISOString(),
  };

  all[key] = entry;

  const keys = Object.keys(all);
  if (keys.length > MAX_STORED_CORRECTIONS) {
    const oldestKey = keys.sort((a, b) =>
      (all[a]?.updatedAt || "").localeCompare(all[b]?.updatedAt || "")
    )[0];
    if (oldestKey) delete all[oldestKey];
  }

  await writeStorage(storageKey(userId), JSON.stringify(all));
  return entry;
}

export async function clearUserFoodCorrections(
  userId = useAuthStore.getState().user?.id
): Promise<void> {
  try {
    const key = storageKey(userId);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore errors
  }
}
