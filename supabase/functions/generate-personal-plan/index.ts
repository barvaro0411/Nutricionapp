import { ApiError, authenticate, errorResponse, json, methodResponse, readBody, reserveAiRequest } from "../_shared/http.ts";
import { parseModelJson } from "../_shared/gemini.ts";
import { generateText, optionalGeminiKey } from "../_shared/aiRouting.ts";
import { extractDietaryPreferences, formatCompactDietaryNote } from "../_shared/dietaryPreferences.ts";
import { clampPlanInteger, formatWeekdaysLabel, normalizeWeekdays } from "../../../src/utils/personalPlan.ts";
import { GENERATE_PERSONAL_PLAN_SYSTEM_PROMPT } from "./prompts/planPrompt.ts";
import { AIPersonalPlanOutputSchema, GeneratePersonalPlanRequestSchema, type GeneratePersonalPlanRequest } from "./types.ts";

interface ProfileRow {
  full_name?: string | null;
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  current_weight_kg?: number | null;
  target_weight_kg?: number | null;
  activity_level?: string | null;
  objective?: string | null;
}

interface GoalRow {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
}

function buildPlanUserPrompt(
  input: GeneratePersonalPlanRequest,
  profile: ProfileRow | null,
  goal: GoalRow | null,
  dietaryNote: string | undefined,
): string {
  const payload = {
    profile: {
      age: profile?.age ?? 28,
      gender: profile?.gender ?? "other",
      heightCm: profile?.height_cm ?? 170,
      currentWeightKg: profile?.current_weight_kg ?? 70,
      targetWeightKg: input.targetWeightKg ?? profile?.target_weight_kg ?? profile?.current_weight_kg ?? 70,
      activityLevel: profile?.activity_level ?? "moderate",
      objective: profile?.objective ?? "maintain",
    },
    currentGoals: goal
      ? {
          calories: goal.calories,
          proteinG: goal.protein_g,
          carbsG: goal.carbs_g,
          fatG: goal.fat_g,
        }
      : null,
    preferences: {
      matchDayWeekdays: input.matchDayWeekdays,
      matchDaysLabel: formatWeekdaysLabel(input.matchDayWeekdays),
      trainingDaysPerWeek: input.trainingDaysPerWeek,
      trainingFocus: input.trainingFocus,
      equipment: input.equipment,
      mealsPerDay: input.mealsPerDay,
      includeSupplements: input.includeSupplements,
      ...(input.customNotes ? { customNotes: input.customNotes } : {}),
    },
    ...(dietaryNote ? { strictDietaryExclusion: dietaryNote } : {}),
  };

  return "Diseña el Plan Maestro JSON considerando estos datos exactos: " + JSON.stringify(payload);
}

export async function handleRequest(req: Request) {
  const method = methodResponse(req);
  if (method) return method;
  const start = Date.now();
  try {
    const { client, user } = await authenticate(req);
    const parsed = GeneratePersonalPlanRequestSchema.safeParse(await readBody(req, 16384));
    if (!parsed.success) {
      throw new ApiError(400, "INVALID_REQUEST", "Los parámetros para generar el plan no son válidos.");
    }
    const input = parsed.data;
    const enforcedWeekdays = normalizeWeekdays(input.matchDayWeekdays);

    const geminiKey = await optionalGeminiKey(client);
    await reserveAiRequest(client, user.id);

    const [profileRes, goalRes] = await Promise.all([
      client
        .from("profiles")
        .select("full_name,age,gender,height_cm,current_weight_kg,target_weight_kg,activity_level,objective,dietary_restrictions,custom_allergies")
        .eq("id", user.id)
        .maybeSingle(),
      client
        .from("goals")
        .select("calories,protein_g,carbs_g,fat_g")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    const profile = (profileRes.data ?? null) as ProfileRow | null;
    const goal = (goalRes.data ?? null) as GoalRow | null;
    const dietaryNote = formatCompactDietaryNote(extractDietaryPreferences(profile));

    const validate = (raw: string) => {
      if (!AIPersonalPlanOutputSchema.safeParse(parseModelJson(raw)).success) {
        throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA no devolvió un plan personal con formato válido.");
      }
    };

    const result = await generateText({
      geminiKey,
      task: "text",
      json: true,
      maxTokens: 3200,
      temperature: 0.3,
      validate,
      messages: [
        { role: "system", content: GENERATE_PERSONAL_PLAN_SYSTEM_PROMPT },
        { role: "user", content: buildPlanUserPrompt(input, profile, goal, dietaryNote) },
      ],
    });

    const parsedPlan = AIPersonalPlanOutputSchema.safeParse(parseModelJson(result.text));
    if (!parsedPlan.success) {
      throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA no devolvió un plan personal válido.");
    }

    const aiPlan = parsedPlan.data;
    const heightCm = Number(profile?.height_cm || aiPlan.user.heightCm || 170);
    const currentWeightKg = Number(profile?.current_weight_kg || aiPlan.user.currentWeightKg || 70);
    const targetWeightKg = Number(
      input.targetWeightKg ?? profile?.target_weight_kg ?? aiPlan.user.targetWeightKg ?? currentWeightKg,
    );

    const sanitizedPlan = {
      user: {
        fullName: profile?.full_name?.trim() || aiPlan.user.fullName || "Usuario",
        heightCm: Math.round(heightCm * 10) / 10,
        currentWeightKg: Math.round(currentWeightKg * 10) / 10,
        targetWeightKg: Math.round(targetWeightKg * 10) / 10,
        weeklyPaceKg: aiPlan.user.weeklyPaceKg || null,
        objectiveTitle: aiPlan.user.objectiveTitle,
        objectiveDesc: aiPlan.user.objectiveDesc,
      },
      dailyGoals: {
        standard: {
          days: aiPlan.dailyGoals.standard.days,
          calories: clampPlanInteger(aiPlan.dailyGoals.standard.calories, 800, 8000),
          caloriesRange: aiPlan.dailyGoals.standard.caloriesRange,
          proteinG: clampPlanInteger(aiPlan.dailyGoals.standard.proteinG, 10, 400),
          proteinRange: aiPlan.dailyGoals.standard.proteinRange,
          carbsG: clampPlanInteger(aiPlan.dailyGoals.standard.carbsG, 10, 1600),
          carbsRange: aiPlan.dailyGoals.standard.carbsRange,
          fatG: clampPlanInteger(aiPlan.dailyGoals.standard.fatG, 5, 300),
          fatRange: aiPlan.dailyGoals.standard.fatRange,
        },
        matchDay: {
          days: enforcedWeekdays.length > 0 ? formatWeekdaysLabel(enforcedWeekdays) : "Sin días especiales",
          weekdays: enforcedWeekdays,
          calories: clampPlanInteger(aiPlan.dailyGoals.matchDay.calories, 800, 8000),
          caloriesRange: aiPlan.dailyGoals.matchDay.caloriesRange,
          proteinG: clampPlanInteger(aiPlan.dailyGoals.matchDay.proteinG, 10, 400),
          carbsG: clampPlanInteger(aiPlan.dailyGoals.matchDay.carbsG, 10, 1600),
          carbsRange: aiPlan.dailyGoals.matchDay.carbsRange,
          fatG: clampPlanInteger(aiPlan.dailyGoals.matchDay.fatG, 5, 300),
          fatRange: aiPlan.dailyGoals.matchDay.fatRange,
          focus: aiPlan.dailyGoals.matchDay.focus,
        },
        waterMl: clampPlanInteger(aiPlan.dailyGoals.waterMl, 1200, 6000),
        waterRangeL: aiPlan.dailyGoals.waterRangeL,
      },
      mealSchedule: aiPlan.mealSchedule,
      weeklyRoutine: aiPlan.weeklyRoutine,
      supplements: input.includeSupplements ? aiPlan.supplements : [],
      dailyChecklist: aiPlan.dailyChecklist,
    };

    return json(
      {
        success: true,
        plan: sanitizedPlan,
        meta: {
          model: result.model,
          latency_ms: Date.now() - start,
        },
      },
      200,
      req,
    );
  } catch (error) {
    return errorResponse(error, req);
  }
}

Deno.serve(handleRequest);
