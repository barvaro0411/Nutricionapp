import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  createEmptyWeeklyPlan,
  WEEKLY_PLANNER_DAYS,
  WeeklyPlanGrid,
} from "@/utils/weeklyPlanner";

function plannerStorageKey(userId: string) {
  return `weekly_plan_${userId || "anon"}`;
}

export async function loadWeeklyPlan(userId: string): Promise<WeeklyPlanGrid> {
  if (!userId) return createEmptyWeeklyPlan();
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        raw = window.localStorage.getItem(plannerStorageKey(userId));
      }
    } else {
      raw = await SecureStore.getItemAsync(plannerStorageKey(userId));
    }

    if (!raw) return createEmptyWeeklyPlan();
    const parsed = JSON.parse(raw);
    const empty = createEmptyWeeklyPlan();
    for (const day of WEEKLY_PLANNER_DAYS) {
      if (parsed && typeof parsed[day.id] === "object" && parsed[day.id] !== null) {
        empty[day.id] = parsed[day.id];
      }
    }
    return empty;
  } catch {
    return createEmptyWeeklyPlan();
  }
}

export async function saveWeeklyPlan(
  userId: string,
  plan: WeeklyPlanGrid
): Promise<void> {
  if (!userId) return;
  const serialized = JSON.stringify(plan);
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(plannerStorageKey(userId), serialized);
    }
    return;
  }
  await SecureStore.setItemAsync(plannerStorageKey(userId), serialized);
}
