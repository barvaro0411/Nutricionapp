import { ApiError, type ServerClient } from "./http.ts";
import { APP_TIME_ZONE, getDateKey, getDayRange, getWeekday } from "../../../src/utils/dates.ts";
import { remainingNutrition, sumNutrition } from "./nutritionMath.ts";
import { extractDietaryPreferences } from "./dietaryPreferences.ts";
import { countCompletedHabits, resolveDayPlanTargets, sanitizeCheckedItems } from "../../../src/utils/personalPlan.ts";
interface CoachMeal {
  meal_type?: string;
  total_calories: number; total_protein: number; total_carbs: number; total_fat: number;
  meal_items?: { food_name: string; grams: number; unit?: string }[];
}

export async function loadCoachContext(client: ServerClient, userId: string, now = new Date(), scope: "full" | "nutrition" = "full") {
  const { start, end } = getDayRange(now);
  const dateKey = getDateKey(now);
  const mealColumns: string = scope === "full" ? "meal_type,total_calories,total_protein,total_carbs,total_fat,meal_items(food_name,grams,unit)" : "total_calories,total_protein,total_carbs,total_fat";
  const [profile, goal, meals, history, personalPlan, activity, water] = await Promise.all([
    scope === "full" ? client.from("profiles").select("objective,current_weight_kg,height_cm,dietary_restrictions,custom_allergies").eq("id", userId).single() : Promise.resolve({ data: null, error: null }),
    client.from("goals").select("*").eq("user_id", userId).eq("is_active", true).maybeSingle(),
    client.from("meals").select(mealColumns).eq("user_id", userId).gte("logged_at", start).lt("logged_at", end).order("logged_at").returns<CoachMeal[]>(),
    scope === "full" ? client.from("coach_messages").select("role,content").eq("user_id", userId).order("created_at", { ascending: false }).order("role", { ascending: true }).limit(6) : Promise.resolve({ data: [], error: null }),
    client.from("personal_plans").select("plan").eq("user_id", userId).maybeSingle(),
    client.from("activity_logs").select("active_calories_burned,steps").eq("user_id", userId).eq("logged_at", dateKey).maybeSingle(),
    scope === "full" ? client.from("water_logs").select("amount_ml").eq("user_id", userId).gte("logged_at", start).lt("logged_at", end) : Promise.resolve({ data: [], error: null }),
  ]);
  if ([profile, goal, meals, history, personalPlan, activity, water].some(r => r.error)) throw new ApiError(503, "CONTEXT_ERROR", "No se pudieron cargar tus datos. Reintenta en unos minutos.");
  if (!goal.data) throw new ApiError(400, "GOALS_REQUIRED", "Configura tus metas antes de consultar al coach.");
  let target = goal.data;
  const plan = personalPlan.data?.plan;
  const resolvedTarget = resolveDayPlanTargets(plan, getWeekday(now), {
    calories: Number(target.calories),
    proteinG: Number(target.protein_g),
    carbsG: Number(target.carbs_g),
    fatG: Number(target.fat_g),
  });
  if (resolvedTarget.isMatchDay) {
    target = {
      ...target,
      calories: resolvedTarget.calories,
      protein_g: resolvedTarget.proteinG,
      carbs_g: resolvedTarget.carbsG,
      fat_g: resolvedTarget.fatG,
    };
  }

  let todayChecklist: { completedCount: number; totalItems: number; pct: number } | null = null;
  if (scope === "full" && Array.isArray(plan?.dailyChecklist) && plan.dailyChecklist.length > 0) {
    try {
      const checklistRes = await client
        .from("plan_daily_checklists")
        .select("checked_items")
        .eq("user_id", userId)
        .eq("plan_date", dateKey)
        .maybeSingle();
      if (!checklistRes?.error) {
        const checked = sanitizeCheckedItems(checklistRes?.data?.checked_items);
        todayChecklist = countCompletedHabits(checked, plan.dailyChecklist);
      }
    } catch {
      // Best-effort context enrichment; ignore if table or mock lacks daily checklists.
    }
  }

  const consumed = sumNutrition((meals.data || []).map(m => ({ calories: Number(m.total_calories), protein: Number(m.total_protein), carbs: Number(m.total_carbs), fat: Number(m.total_fat) })));
  const remaining = remainingNutrition({ calories: Number(target.calories), protein: Number(target.protein_g), carbs: Number(target.carbs_g), fat: Number(target.fat_g) }, consumed, Number(activity.data?.active_calories_burned || 0));
  const compactPlan = plan ? { objective: plan.user?.objectiveTitle, dailyGoals: plan.dailyGoals, isMatchDayToday: resolvedTarget.isMatchDay, todayChecklist, mealSchedule: plan.mealSchedule, supplements: plan.supplements, dailyChecklist: plan.dailyChecklist,
    weeklyRoutine: Array.isArray(plan.weeklyRoutine) ? plan.weeklyRoutine.map(({ day, activity, goal, intensity }: { day: string; activity: string; goal: string; intensity: string }) => ({ day, activity, goal, intensity })) : [] } : null;
  const dietaryPreferences = scope === "full" ? extractDietaryPreferences(profile.data) : null;
  const context = { date: dateKey, weekday: new Intl.DateTimeFormat("es-CL", { weekday: "long", timeZone: APP_TIME_ZONE }).format(now),
    profile: { objective: profile.data?.objective, current_weight_kg: profile.data?.current_weight_kg, height_cm: profile.data?.height_cm },
    ...(dietaryPreferences ? { dietaryPreferences } : {}),
    target: { calories: target.calories, protein_g: target.protein_g, carbs_g: target.carbs_g, fat_g: target.fat_g }, consumed, remaining,
    meals: scope === "full" ? (meals.data || []).map(meal => ({ type: meal.meal_type,
      nutrients: { calories: meal.total_calories, protein: meal.total_protein, carbs: meal.total_carbs, fat: meal.total_fat },
      foods: (meal.meal_items || []).map((item: { food_name: string; grams: number; unit?: string }) => [item.food_name, item.grams, item.unit || "g"]),
    })) : [], activity: activity.data,
    waterMl: scope === "full" ? (water.data || []).reduce((a, w) => a + Number(w.amount_ml), 0) : null, personalPlan: compactPlan };
  return { context, remaining, consumed, dateKey, history: (history.data || []).reverse().map((m): { role: "assistant" | "user"; content: string } => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })) };
}
