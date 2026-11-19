import { ApiError, authenticate, errorResponse, json, methodResponse, readBody, reserveAiRequest } from "../_shared/http.ts";
import { parseModelJson } from "../_shared/gemini.ts";
import { generateText, optionalGeminiKey } from "../_shared/aiRouting.ts";
import { formatCompactDietaryNote, loadUserDietaryPreferencesBestEffort } from "../_shared/dietaryPreferences.ts";
import { sumNutrition } from "../_shared/nutritionMath.ts";
import { GENERATE_RECIPE_SYSTEM_PROMPT } from "./prompts/recipePrompt.ts";
import { AIRecipeOutputSchema, GenerateRecipeRequestSchema, type GenerateRecipeRequest } from "./types.ts";

function buildRecipeUserPrompt(input: GenerateRecipeRequest, dietaryNote?: string): string {
  const constraints: Record<string, unknown> = {
    servings: input.servings,
    ...(input.mealType ? { mealType: input.mealType } : {}),
    ...(input.maxPrepMinutes ? { maxPrepMinutes: input.maxPrepMinutes } : {}),
    ...(input.availableIngredients?.length ? { availableIngredients: input.availableIngredients } : {}),
    ...(input.targetMacros ? { targetMacrosPerServing: input.targetMacros } : {}),
    ...(input.cravingNote ? { preferenceNote: input.cravingNote } : {}),
    ...(dietaryNote ? { strictDietaryExclusion: dietaryNote } : {}),
  };
  return "Genera una receta cumpliendo estas condiciones JSON: " + JSON.stringify(constraints);
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function handleRequest(req: Request) {
  const method = methodResponse(req);
  if (method) return method;
  const start = Date.now();
  try {
    const { client, user } = await authenticate(req);
    const parsed = GenerateRecipeRequestSchema.safeParse(await readBody(req, 16384));
    if (!parsed.success) {
      throw new ApiError(400, "INVALID_REQUEST", "Los parámetros para generar la receta no son válidos.");
    }
    const input = parsed.data;
    const geminiKey = await optionalGeminiKey(client);
    await reserveAiRequest(client, user.id);

    const dietaryNote = formatCompactDietaryNote(await loadUserDietaryPreferencesBestEffort(client, user.id));
    const validate = (raw: string) => {
      if (!AIRecipeOutputSchema.safeParse(parseModelJson(raw)).success) {
        throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA no devolvió una receta con formato válido.");
      }
    };

    const result = await generateText({
      geminiKey,
      task: "text",
      json: true,
      maxTokens: 2048,
      temperature: 0.35,
      validate,
      messages: [
        { role: "system", content: GENERATE_RECIPE_SYSTEM_PROMPT },
        { role: "user", content: buildRecipeUserPrompt(input, dietaryNote) },
      ],
    });

    const parsedRecipe = AIRecipeOutputSchema.safeParse(parseModelJson(result.text));
    if (!parsedRecipe.success) {
      throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA no devolvió una receta válida.");
    }

    const aiRecipe = parsedRecipe.data;
    const servings = Math.max(1, input.servings || aiRecipe.servings || 1);
    const normalizedIngredients = aiRecipe.ingredients.map((ing, idx) => ({
      id: `ai_ing_${idx + 1}`,
      foodName: ing.foodName,
      grams: roundOneDecimal(ing.grams),
      unit: ing.unit,
      ...(ing.unit === "unidad" ? { quantity: ing.quantity ?? 1 } : {}),
      category: ing.category,
      calories: roundOneDecimal(ing.calories),
      protein: roundOneDecimal(ing.protein),
      carbs: roundOneDecimal(ing.carbs),
      fat: roundOneDecimal(ing.fat),
    }));

    const totals = sumNutrition(normalizedIngredients);
    const insertPayload = {
      user_id: user.id,
      title: aiRecipe.title,
      description: aiRecipe.description || null,
      meal_type: input.mealType || aiRecipe.mealType,
      prep_time_minutes: Math.max(1, Math.round(aiRecipe.prepTimeMinutes)),
      servings,
      calories_per_serving: roundOneDecimal(totals.calories / servings),
      protein_per_serving: roundOneDecimal(totals.protein / servings),
      carbs_per_serving: roundOneDecimal(totals.carbs / servings),
      fat_per_serving: roundOneDecimal(totals.fat / servings),
      ingredients: normalizedIngredients,
      instructions: aiRecipe.instructions,
      prompt_context: {
        ...(input.availableIngredients?.length ? { availableIngredients: input.availableIngredients } : {}),
        ...(input.targetMacros ? { targetMacros: input.targetMacros } : {}),
        ...(input.maxPrepMinutes ? { maxPrepMinutes: input.maxPrepMinutes } : {}),
      },
    };

    const { data: savedRecipe, error: insertError } = await client
      .from("user_recipes")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !savedRecipe) {
      throw new ApiError(503, "SAVE_RECIPE_FAILED", "No se pudo guardar la receta generada. Inténtalo de nuevo.");
    }

    return json(
      {
        success: true,
        data: savedRecipe,
        meta: {
          model: result.model,
          latency_ms: Date.now() - start,
        },
      },
      200,
      req
    );
  } catch (error) {
    return errorResponse(error, req);
  }
}

Deno.serve(handleRequest);
