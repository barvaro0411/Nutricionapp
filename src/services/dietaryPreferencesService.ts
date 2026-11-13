import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  DietaryPreferences,
  DietaryRestriction,
  normalizeCustomAllergies,
  normalizeDietaryRestrictions,
} from "@/types/profile";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

const EMPTY_PREFERENCES: DietaryPreferences = {
  restrictions: [],
  customAllergies: [],
};

function v2StorageKey(userId?: string) {
  return "dietary_prefs_v2_" + (userId || "anonymous");
}

function legacyStorageKey(userId?: string) {
  return "dietary_prefs_" + (userId || "anonymous");
}

function migratedStorageKey(userId?: string) {
  return "dietary_prefs_migrated_" + (userId || "anonymous");
}

function pendingSyncKey(userId?: string) {
  return "dietary_prefs_pending_" + (userId || "anonymous");
}

async function readLocalString(key: string): Promise<string | null> {
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

async function writeLocalString(key: string, value: string | null): Promise<void> {
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

function normalizePreferences(prefs: Partial<DietaryPreferences>): DietaryPreferences {
  return {
    restrictions: normalizeDietaryRestrictions(prefs.restrictions),
    customAllergies: normalizeCustomAllergies(prefs.customAllergies),
  };
}

async function readLocalPreferences(userId?: string): Promise<DietaryPreferences> {
  const v2Raw = await readLocalString(v2StorageKey(userId));
  if (v2Raw) {
    try {
      const parsed = JSON.parse(v2Raw);
      if (parsed && typeof parsed === "object") {
        return normalizePreferences({
          restrictions: (parsed as Record<string, unknown>).restrictions as DietaryRestriction[],
          customAllergies: (parsed as Record<string, unknown>).customAllergies as string[],
        });
      }
    } catch {
      // Fallback to legacy format
    }
  }

  const legacyRaw = await readLocalString(legacyStorageKey(userId));
  if (legacyRaw) {
    try {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        return {
          restrictions: normalizeDietaryRestrictions(parsed),
          customAllergies: [],
        };
      }
    } catch {
      return EMPTY_PREFERENCES;
    }
  }

  return EMPTY_PREFERENCES;
}

async function writeLocalPreferences(
  prefs: DietaryPreferences,
  userId?: string
): Promise<void> {
  await writeLocalString(v2StorageKey(userId), JSON.stringify(prefs));
}

async function syncPreferencesToSupabase(
  prefs: DietaryPreferences,
  userId: string
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const currentProfile = useAuthStore.getState().profile;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        dietary_restrictions: prefs.restrictions,
        custom_allergies: prefs.customAllergies,
        updated_at: nowIso,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return false;
    }

    if (data && useAuthStore.getState().user?.id === userId) {
      useAuthStore.getState().setProfile(data);
    } else if (currentProfile && useAuthStore.getState().user?.id === userId) {
      useAuthStore.getState().setProfile({
        ...currentProfile,
        dietary_restrictions: prefs.restrictions,
        custom_allergies: prefs.customAllergies,
        updated_at: nowIso,
      });
    }

    await writeLocalString(migratedStorageKey(userId), "1");
    await writeLocalString(pendingSyncKey(userId), null);
    return true;
  } catch {
    return false;
  }
}

export async function getDietaryPreferencesSnapshot(
  userId = useAuthStore.getState().user?.id
): Promise<DietaryPreferences> {
  const local = await readLocalPreferences(userId);
  if (!userId) return local;

  const hasPendingSync = (await readLocalString(pendingSyncKey(userId))) === "1";
  if (hasPendingSync) {
    const synced = await syncPreferencesToSupabase(local, userId);
    if (synced) return local;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("dietary_restrictions, custom_allergies")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      const remote = normalizePreferences({
        restrictions: data.dietary_restrictions as DietaryRestriction[],
        customAllergies: data.custom_allergies as string[],
      });

      const alreadyMigrated = (await readLocalString(migratedStorageKey(userId))) === "1";
      const remoteEmpty =
        remote.restrictions.length === 0 && remote.customAllergies.length === 0;
      const localHasData =
        local.restrictions.length > 0 || local.customAllergies.length > 0;

      if (remoteEmpty && localHasData && !alreadyMigrated) {
        const migrated = await syncPreferencesToSupabase(local, userId);
        if (migrated) {
          await writeLocalPreferences(local, userId);
          return local;
        }
      }

      await writeLocalPreferences(remote, userId);
      await writeLocalString(migratedStorageKey(userId), "1");
      return remote;
    }
  } catch {
    // Fallback to profile cache or local storage when offline
  }

  const profile = useAuthStore.getState().profile;
  if (
    profile &&
    profile.id === userId &&
    (Array.isArray(profile.dietary_restrictions) || Array.isArray(profile.custom_allergies))
  ) {
    const fromProfile = normalizePreferences({
      restrictions: profile.dietary_restrictions as DietaryRestriction[],
      customAllergies: profile.custom_allergies as string[],
    });
    if (fromProfile.restrictions.length > 0 || fromProfile.customAllergies.length > 0) {
      return fromProfile;
    }
  }

  return local;
}

export async function saveDietaryPreferencesSnapshot(
  prefs: DietaryPreferences,
  userId = useAuthStore.getState().user?.id
): Promise<DietaryPreferences> {
  const normalized = normalizePreferences(prefs);
  await writeLocalPreferences(normalized, userId);

  if (userId) {
    const synced = await syncPreferencesToSupabase(normalized, userId);
    if (!synced) {
      await writeLocalString(pendingSyncKey(userId), "1");
      const currentProfile = useAuthStore.getState().profile;
      if (currentProfile && useAuthStore.getState().user?.id === userId) {
        useAuthStore.getState().setProfile({
          ...currentProfile,
          dietary_restrictions: normalized.restrictions,
          custom_allergies: normalized.customAllergies,
        });
      }
    }
  }

  return normalized;
}

export async function getDietaryPreferences(
  userId = useAuthStore.getState().user?.id
): Promise<DietaryRestriction[]> {
  const snapshot = await getDietaryPreferencesSnapshot(userId);
  return snapshot.restrictions;
}

export async function saveDietaryPreferences(
  restrictions: DietaryRestriction[],
  userId = useAuthStore.getState().user?.id
): Promise<DietaryRestriction[]> {
  const current = await readLocalPreferences(userId);
  const saved = await saveDietaryPreferencesSnapshot(
    {
      restrictions,
      customAllergies: current.customAllergies,
    },
    userId
  );
  return saved.restrictions;
}
