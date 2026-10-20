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

function parseLocalEntries(raw: string | null): WeightEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
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
  } catch {
    return [];
  }
}

function mergeWeightEntries(localEntries: WeightEntry[], remoteEntries: WeightEntry[]): WeightEntry[] {
  const byDate = new Map<string, WeightEntry>();
  for (const item of localEntries) {
    byDate.set(item.date, item);
  }
  for (const remote of remoteEntries) {
    const existing = byDate.get(remote.date);
    if (!existing || new Date(remote.loggedAt).getTime() >= new Date(existing.loggedAt).getTime()) {
      byDate.set(remote.date, remote);
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getWeightHistory(
  userId: string,
  profile?: ProfileRow | null
): Promise<WeightEntry[]> {
  if (!userId) return [];

  const raw = await readLocalString(historyStorageKey(userId));
  const localEntries = parseLocalEntries(raw);
  let remoteEntries: WeightEntry[] = [];
  const remoteDates = new Set<string>();

  try {
    const query = supabase
      .from("weight_logs")
      .select("logged_date, weight_kg, logged_at")
      .eq("user_id", userId)
      .order("logged_date", { ascending: true })
      .limit(90);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      remoteEntries = data
        .map((row) => ({
          date: String(row.logged_date),
          weightKg: Math.round(Number(row.weight_kg) * 10) / 10,
          loggedAt: String(row.logged_at || new Date().toISOString()),
        }))
        .filter((e) => Number.isFinite(e.weightKg) && e.weightKg >= 30 && e.weightKg <= 300);

      for (const r of remoteEntries) {
        remoteDates.add(r.date);
      }
    }
  } catch {
    // Offline or weight_logs table not reachable; fall back to local cache
  }

  let entries = mergeWeightEntries(localEntries, remoteEntries);

  // Sincronizar entradas locales pendientes hacia weight_logs en segundo plano
  const unsyncedLocal = localEntries.filter((e) => !remoteDates.has(e.date));
  if (unsyncedLocal.length > 0) {
    try {
      await supabase.from("weight_logs").upsert(
        unsyncedLocal.map((e) => ({
          user_id: userId,
          logged_date: e.date,
          weight_kg: e.weightKg,
          logged_at: e.loggedAt,
        })),
        { onConflict: "user_id,logged_date" }
      );
    } catch {
      // Ignorar si no hay conectividad
    }
  }

  // Si aún no hay historial pero el perfil tiene current_weight_kg, inicializar con el peso del perfil
  const profileWeight = Number(profile?.current_weight_kg);
  if (entries.length === 0 && Number.isFinite(profileWeight) && profileWeight >= 30 && profileWeight <= 300) {
    const initialDate = profile?.updated_at
      ? getDateKey(new Date(profile.updated_at))
      : getDateKey();
    const initialLoggedAt = profile?.updated_at || new Date().toISOString();
    const initialWeight = Math.round(profileWeight * 10) / 10;
    entries = [
      {
        date: initialDate,
        weightKg: initialWeight,
        loggedAt: initialLoggedAt,
      },
    ];
    await writeLocalString(historyStorageKey(userId), JSON.stringify(entries));
    try {
      await supabase.from("weight_logs").upsert(
        {
          user_id: userId,
          logged_date: initialDate,
          weight_kg: initialWeight,
          logged_at: initialLoggedAt,
        },
        { onConflict: "user_id,logged_date" }
      );
    } catch {
      // Offline fallback
    }
  } else if (entries.length > 0) {
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
  const raw = await readLocalString(historyStorageKey(userId));
  const existing = parseLocalEntries(raw);

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

  // 1. Persistir registro histórico en tabla weight_logs (con RLS por usuario)
  try {
    await supabase.from("weight_logs").upsert(
      {
        user_id: userId,
        logged_date: date,
        weight_kg: normalizedWeight,
        logged_at: nowIso,
      },
      { onConflict: "user_id,logged_date" }
    );
  } catch {
    // Queda respaldado en almacenamiento local para sincronizar luego
  }

  // 2. Sincronizar con profiles.current_weight_kg en Supabase si es el registro más reciente
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
  const explicitTarget = Number(profile?.target_weight_kg);
  if (Number.isFinite(explicitTarget) && explicitTarget >= 30 && explicitTarget <= 300) {
    return Math.round(explicitTarget * 10) / 10;
  }

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
  const profileTarget = Number(profile?.target_weight_kg);
  if (Number.isFinite(profileTarget) && profileTarget >= 30 && profileTarget <= 300) {
    return Math.round(profileTarget * 10) / 10;
  }
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
  const normalizedTarget = validation.value;
  await writeLocalString(targetStorageKey(userId), String(normalizedTarget));

  if (userId) {
    const nowIso = new Date().toISOString();
    const currentProfile = useAuthStore.getState().profile;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ target_weight_kg: normalizedTarget, updated_at: nowIso })
        .eq("id", userId)
        .select()
        .single();

      if (!error && data && useAuthStore.getState().user?.id === userId) {
        useAuthStore.getState().setProfile(data);
      } else if (currentProfile && useAuthStore.getState().user?.id === userId) {
        useAuthStore.getState().setProfile({
          ...currentProfile,
          target_weight_kg: normalizedTarget,
          updated_at: nowIso,
        });
      }
    } catch {
      if (currentProfile && useAuthStore.getState().user?.id === userId) {
        useAuthStore.getState().setProfile({
          ...currentProfile,
          target_weight_kg: normalizedTarget,
          updated_at: nowIso,
        });
      }
    }
  }

  return normalizedTarget;
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
