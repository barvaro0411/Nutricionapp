import { ApiError, type ServerClient } from "./http.ts";
import { APP_TIME_ZONE, getDateKey, getDayRange, getWeekday } from "../../../src/utils/dates.ts";

export async function loadCoachContext(client: ServerClient, userId: string, now = new Date()) {
  const { start, end } = getDayRange(now);
  const dateKey = getDateKey(now);
  const [profile, goal, meals, history, personalPlan, activity, water] = await Promise.all([
    client.from("profiles").select("objective,current_weight_kg,height_cm").eq("id", userId).single(),
    client.from("goals").select("*").eq("user_id", userId).eq("is_active", true).maybeSingle(),
    client.from("meals").select("meal_type,total_calories,total_protein,total_carbs,total_fat,meal_items(food_name,grams)").eq("user_id", userId).gte("logged_at", start).lt("logged_at", end).order("logged_at"),
    client.from("coach_messages").select("role,content").eq("user_id", userId).order("created_at", { ascending: false }).order("role", { ascending: true }).limit(6),
    client.from("personal_plans").select("plan").eq("user_id", userId).maybeSingle(),
    client.from("activity_logs").select("active_calories_burned,steps").eq("user_id", userId).eq("logged_at", dateKey).maybeSingle(),
    client.from("water_logs").select("amount_ml").eq("user_id", userId).gte("logged_at", start).lt("logged_at", end),
  ]);
  if ([profile, goal, meals, history, personalPlan, activity, water].some(r => r.error)) throw new ApiError(503, "CONTEXT_ERROR", "No se pudieron cargar tus datos. Reintenta en unos minutos.");
  if (!goal.data) throw new ApiError(400, "GOALS_REQUIRED", "Configura tus metas antes de consultar al coach.");
  let target = goal.data;
  const plan = personalPlan.data?.plan;
  const standard = plan?.dailyGoals?.standard;
  const matchDay = plan?.dailyGoals?.matchDay;
  if (getWeekday(now) === 0 && standard && matchDay && target.calories === standard.calories && target.protein_g === standard.proteinG && target.carbs_g === standard.carbsG && target.fat_g === standard.fatG) {
    target = { ...target, calories: matchDay.calories, protein_g: matchDay.proteinG, carbs_g: matchDay.carbsG, fat_g: matchDay.fatG };
  }
  const consumed = (meals.data || []).reduce((a, m) => ({ calories: a.calories + Number(m.total_calories), protein: a.protein + Number(m.total_protein), carbs: a.carbs + Number(m.total_carbs), fat: a.fat + Number(m.total_fat) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const remaining = { calories: target.calories + Number(activity.data?.active_calories_burned || 0) - consumed.calories, protein: target.protein_g - consumed.protein, carbs: target.carbs_g - consumed.carbs, fat: target.fat_g - consumed.fat };
  const compactPlan = plan ? { objective: plan.user?.objectiveTitle, dailyGoals: plan.dailyGoals, mealSchedule: plan.mealSchedule, supplements: plan.supplements, dailyChecklist: plan.dailyChecklist,
    weeklyRoutine: Array.isArray(plan.weeklyRoutine) ? plan.weeklyRoutine.map(({ day, activity, goal, intensity }: { day: string; activity: string; goal: string; intensity: string }) => ({ day, activity, goal, intensity })) : [] } : null;
  const context = { date: dateKey, weekday: new Intl.DateTimeFormat("es-CL", { weekday: "long", timeZone: APP_TIME_ZONE }).format(now),
    profile: { objective: profile.data?.objective, current_weight_kg: profile.data?.current_weight_kg, height_cm: profile.data?.height_cm },
    target: { calories: target.calories, protein_g: target.protein_g, carbs_g: target.carbs_g, fat_g: target.fat_g }, consumed, remaining, meals: meals.data, activity: activity.data,
    waterMl: (water.data || []).reduce((a, w) => a + Number(w.amount_ml), 0), personalPlan: compactPlan };
  return { context, remaining, consumed, dateKey, history: (history.data || []).reverse().map((m): { role: "assistant" | "user"; content: string } => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })) };
}
