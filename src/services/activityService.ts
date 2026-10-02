import { supabase } from "@/services/supabase";

export interface ActivityLog {
  id: string;
  userId: string;
  loggedAt: string;
  activeCaloriesBurned: number;
  steps: number;
  source: "apple_health" | "health_connect" | "manual";
}

export async function fetchDailyActivity(
  userId: string,
  dateStr: string
): Promise<ActivityLog | null> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_at", dateStr)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    loggedAt: data.logged_at,
    activeCaloriesBurned: Number(data.active_calories_burned) || 0,
    steps: Number(data.steps) || 0,
    source: data.source as any,
  };
}

export async function saveActivityCalories(
  userId: string,
  caloriesBurned: number,
  steps: number = 0,
  source: "apple_health" | "health_connect" | "manual" = "manual",
  dateStr?: string
) {
  const targetDate = dateStr || new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("activity_logs")
    .upsert(
      {
        user_id: userId,
        logged_at: targetDate,
        active_calories_burned: Math.max(0, Math.round(caloriesBurned)),
        steps: Math.max(0, Math.round(steps)),
        source,
      },
      { onConflict: "user_id,logged_at" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
