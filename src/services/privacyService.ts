import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

function consentStorageKey(userId: string) {
  return `ai_consent_${userId || "guest"}`;
}

async function readLocal(key: string): Promise<string | null> {
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

async function writeLocal(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      }
      return;
    }
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {
    // Ignore local storage errors
  }
}

export interface AiConsentState {
  granted: boolean;
  consentedAt: string | null;
}

export async function getAiConsentStatus(
  userId?: string,
  profileConsentAt?: string | null
): Promise<AiConsentState> {
  if (profileConsentAt) {
    if (userId) {
      await writeLocal(consentStorageKey(userId), profileConsentAt);
    }
    return { granted: true, consentedAt: profileConsentAt };
  }

  if (!userId) {
    return { granted: false, consentedAt: null };
  }

  const localValue = await readLocal(consentStorageKey(userId));
  if (localValue && localValue !== "revoked") {
    return { granted: true, consentedAt: localValue };
  }

  return { granted: false, consentedAt: null };
}

export async function setAiConsentStatus(
  userId: string,
  granted: boolean
): Promise<AiConsentState> {
  if (!userId) {
    throw new Error("Inicia sesión para gestionar el consentimiento de IA.");
  }

  const consentedAt = granted ? new Date().toISOString() : null;
  await writeLocal(consentStorageKey(userId), granted ? consentedAt : "revoked");

  const currentProfile = useAuthStore.getState().profile;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ai_consent_at: consentedAt, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    if (!error && data && useAuthStore.getState().user?.id === userId) {
      useAuthStore.getState().setProfile(data);
    } else if (currentProfile && useAuthStore.getState().user?.id === userId) {
      useAuthStore.getState().setProfile({
        ...currentProfile,
        ai_consent_at: consentedAt,
      });
    }
  } catch {
    if (currentProfile && useAuthStore.getState().user?.id === userId) {
      useAuthStore.getState().setProfile({
        ...currentProfile,
        ai_consent_at: consentedAt,
      });
    }
  }

  return { granted, consentedAt };
}

export async function clearLocalUserData(userId?: string): Promise<void> {
  if (!userId) return;
  const keys = [
    `weight_history_${userId}`,
    `weight_target_${userId}`,
    `ai_consent_${userId}`,
    `dietary_prefs_${userId}`,
    `reminder_prefs_${userId}`,
  ];
  for (const key of keys) {
    await writeLocal(key, null);
  }
}

export async function deleteOwnAccount(userId?: string): Promise<void> {
  const activeUserId = userId || useAuthStore.getState().user?.id;
  if (!activeUserId) {
    throw new Error("Debes iniciar sesión para eliminar tu cuenta.");
  }

  const { data, error } = await supabase.rpc("delete_own_account");
  if (error) {
    throw new Error(
      error.message || "No se pudo eliminar tu cuenta en el servidor. Inténtalo nuevamente."
    );
  }

  const res = (data || {}) as Record<string, unknown>;
  if (res.success === false) {
    throw new Error("El servidor rechazó la solicitud de eliminación de cuenta.");
  }

  await clearLocalUserData(activeUserId);

  try {
    await supabase.auth.signOut();
  } catch {
    // Session already invalidated by user deletion on server
  }

  useAuthStore.getState().reset();
}
