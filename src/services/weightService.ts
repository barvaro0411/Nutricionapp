import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getDateKey, parseDecimal } from "@/utils/dates";
import { Database } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weightKg: number;
  loggedAt: string;
}

export interface WeightTrendPoint {
  date: string;
  label: string;
  weightKg: number;
  projectedKg: number | null;
}

export interface WeightTrendStats {
  entries: WeightEntry[];
  points: WeightTrendPoint[];
  latestWeightKg: number | null;
  startWeightKg: number | null;
  deltaKg: number;
  targetWeightKg: number | null;
  remainingToGoalKg: number | null;
  progressPercent: number;
}

function historyStorageKey(userId: string) {
  return `weight_history_${userId}`;
}

function targetStorageKey(userId: string) {
  return `weight_target_${userId}`;
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

async function writeLocalString(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore local storage errors
  }
}

export function validateWeightKg(input: number | string): { ok: true; value: number } | { ok: false; error: string } {
  const num = typeof input === "number" ? input : parseDecimal(String(input));
  if (!Number.isFinite(num) || num < 30 || num > 300) {
    return { ok: false, error: "Ingresa un peso válido entre 30 y 300 kg." };
  }
  return { ok: true, value: Math.round(num * 10) / 10 };
}

export async function getWeightHistory(
  userId: string,
  profile?: ProfileRow | null
): Promise<WeightEntry[]> {
  if (!userId) return [];

  const raw = await readLocalString(historyStorageKey(userId));
  let entries: WeightEntry[] = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        entries = parsed
          .filter(
            (e): e is WeightEntry =>
              e &&
              typeof e.date === "string" &&
              typeof e.weightKg === "number" &&
              Number.isFinite(e.weightKg) &&
              e.weightKg >= 30 &&
              e.weightKg <= 300
          )
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch {
      entries = [];
    }
  }

  // Si aún no hay historial pero el perfil tiene current_weight_kg, inicializar con el peso del perfil
  const profileWeight = Number(profile?.current_weight_kg);
  if (entries.length === 0 && Number.isFinite(profileWeight) && profileWeight >= 30 && profileWeight <= 300) {
    const initialDate = profile?.updated_at
      ? getDateKey(new Date(profile.updated_at))
      : getDateKey();
    entries = [
      {
        date: initialDate,
        weightKg: Math.round(profileWeight * 10) / 10,
        loggedAt: profile?.updated_at || new Date().toISOString(),
      },
    ];
    await writeLocalString(historyStorageKey(userId), JSON.stringify(entries));
  }

  return entries;
}

export async function logWeightEntry(params: {
  userId: string;
  weightKg: number;
  date?: string;
}): Promise<WeightEntry[]> {
  const { userId, weightKg, date = getDateKey() } = params;
  const validation = validateWeightKg(weightKg);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const normalizedWeight = validation.value;
  const nowIso = new Date().toISOString();

  const currentProfile = useAuthStore.getState().profile;
  const existing = await getWeightHistory(userId, currentProfile);

  const byDate = new Map<string, WeightEntry>();
  for (const item of existing) {
    byDate.set(item.date, item);
  }
  byDate.set(date, {
    date,
    weightKg: normalizedWeight,
    loggedAt: nowIso,
  });

  const updated = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  await writeLocalString(historyStorageKey(userId), JSON.stringify(updated));

  // Sincronizar con profiles.current_weight_kg en Supabase si es el registro más reciente
  const latest = updated[updated.length - 1];
  if (latest && latest.date === date) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ current_weight_kg: normalizedWeight, updated_at: nowIso })
        .eq("id", userId)
        .select()
        .single();

      if (!error && data && useAuthStore.getState().user?.id === userId) {
        useAuthStore.getState().setProfile(data);
      } else if (currentProfile && useAuthStore.getState().user?.id === userId) {
        useAuthStore.getState().setProfile({
          ...currentProfile,
          current_weight_kg: normalizedWeight,
          updated_at: nowIso,
        });
      }
    } catch {
      if (currentProfile && useAuthStore.getState().user?.id === userId) {
        useAuthStore.getState().setProfile({
          ...currentProfile,
          current_weight_kg: normalizedWeight,
          updated_at: nowIso,
        });
      }
    }
  }

  return updated;
}

export function deriveDefaultTargetWeight(profile?: ProfileRow | null): number | null {
  const current = Number(profile?.current_weight_kg);
  if (!Number.isFinite(current) || current < 30 || current > 300) return null;

  if (profile?.objective === "lose_weight") {
    return Math.max(40, Math.round((current - 4) * 10) / 10);
  }
  if (profile?.objective === "gain_muscle") {
    return Math.min(250, Math.round((current + 3) * 10) / 10);
  }
  return Math.round(current * 10) / 10;
}

export async function getTargetWeight(
  userId: string,
  profile?: ProfileRow | null
): Promise<number | null> {
  if (!userId) return deriveDefaultTargetWeight(profile);
  const raw = await readLocalString(targetStorageKey(userId));
  if (raw) {
    const validation = validateWeightKg(raw);
    if (validation.ok) return validation.value;
  }
  return deriveDefaultTargetWeight(profile);
}

export async function saveTargetWeight(userId: string, targetKg: number): Promise<number> {
  const validation = validateWeightKg(targetKg);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  await writeLocalString(targetStorageKey(userId), String(validation.value));
  return validation.value;
}

export function buildWeightTrendStats(
  entries: WeightEntry[],
  targetWeightKg: number | null,
  maxPoints = 10
): WeightTrendStats {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const visible = sorted.slice(-maxPoints);

  const latestWeightKg = sorted.length > 0 ? sorted[sorted.length - 1].weightKg : null;
  const startWeightKg = visible.length > 0 ? visible[0].weightKg : null;
  const deltaKg =
    latestWeightKg !== null && startWeightKg !== null
      ? Math.round((latestWeightKg - startWeightKg) * 10) / 10
      : 0;

  const remainingToGoalKg =
    latestWeightKg !== null && targetWeightKg !== null
      ? Math.round((latestWeightKg - targetWeightKg) * 10) / 10
      : null;

  let progressPercent = 0;
  if (startWeightKg !== null && latestWeightKg !== null && targetWeightKg !== null) {
    const totalNeeded = Math.abs(startWeightKg - targetWeightKg);
    if (totalNeeded < 0.1) {
      progressPercent = 100;
    } else {
      const achieved =
        targetWeightKg < startWeightKg
          ? startWeightKg - latestWeightKg
          : latestWeightKg - startWeightKg;
      progressPercent = Math.max(0, Math.min(100, Math.round((achieved / totalNeeded) * 100)));
    }
  }

  const points: WeightTrendPoint[] = visible.map((entry, idx) => {
    const [, month, day] = entry.date.split("-");
    const label = month && day ? `${Number(day)}/${Number(month)}` : entry.date;
    let projectedKg: number | null = null;
    if (startWeightKg !== null && targetWeightKg !== null && visible.length > 1) {
      const ratio = idx / (visible.length - 1);
      projectedKg = Math.round((startWeightKg + (targetWeightKg - startWeightKg) * ratio) * 10) / 10;
    } else if (targetWeightKg !== null) {
      projectedKg = targetWeightKg;
    }
    return {
      date: entry.date,
      label,
      weightKg: entry.weightKg,
      projectedKg,
    };
  });

  return {
    entries: sorted,
    points,
    latestWeightKg,
    startWeightKg,
    deltaKg,
    targetWeightKg,
    remainingToGoalKg,
    progressPercent,
  };
}
