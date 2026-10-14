import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { DietaryRestriction, DietaryRestrictionSchema } from "@/types/profile";
import { useAuthStore } from "@/stores/useAuthStore";

function storageKey(userId = useAuthStore.getState().user?.id) {
  return "dietary_prefs_" + (userId || "anonymous");
}

export async function getDietaryPreferences(
  userId = useAuthStore.getState().user?.id
): Promise<DietaryRestriction[]> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        raw = window.localStorage.getItem(storageKey(userId));
      }
    } else {
      raw = await SecureStore.getItemAsync(storageKey(userId));
    }

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is DietaryRestriction =>
      DietaryRestrictionSchema.safeParse(item).success
    );
  } catch {
    return [];
  }
}

export async function saveDietaryPreferences(
  restrictions: DietaryRestriction[],
  userId = useAuthStore.getState().user?.id
): Promise<DietaryRestriction[]> {
  const valid = restrictions.filter((r) =>
    DietaryRestrictionSchema.safeParse(r).success
  );
  const json = JSON.stringify(valid);

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(storageKey(userId), json);
    }
  } else {
    await SecureStore.setItemAsync(storageKey(userId), json);
  }

  return valid;
}
