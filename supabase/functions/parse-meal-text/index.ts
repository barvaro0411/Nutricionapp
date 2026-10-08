import { ParseMealTextRequestSchema, AIStructuredOutputSchema } from "./types.ts";
import { CHILEAN_MEAL_TEXT_PROMPT } from "./prompts/mealTextPrompt.ts";
import { ApiError, authenticate, errorResponse, json, methodResponse, readBody, reserveAiRequest } from "../_shared/http.ts";
import { callGemini, getGeminiKey, parseModelJson } from "../_shared/gemini.ts";
import { resolveItemUnit } from "../_shared/liquidUnits.ts";
import { enrichWithUsda } from "../_shared/usdaSearch.ts";

export async function handleRequest(req: Request) {
  const method = methodResponse(req);
  if (method) return method;
  const start = Date.now();
  try {
    const { client, user } = await authenticate(req);
    const parsed = ParseMealTextRequestSchema.safeParse(await readBody(req));
    if (!parsed.success) throw new ApiError(400, "INVALID_REQUEST", "Describe los alimentos o proporciona una grabación válida.");
    const { text, audio_base64, audio_mime_type, client_time_iso } = parsed.data;
    const key = await getGeminiKey(client);
    await reserveAiRequest(client, user.id);
    const parts: unknown[] = [{ text: CHILEAN_MEAL_TEXT_PROMPT + (client_time_iso ? "\nFecha de referencia: " + client_time_iso : "") }];
    if (audio_base64) {
      parts.push({ inline_data: { mime_type: audio_mime_type, data: audio_base64 } });
      parts.push({ text: "Transcribe el audio y extrae los alimentos y sus nutrientes en el JSON requerido." });
    } else parts.push({ text: "Descripción de la comida: " + text });
    const result = await callGemini(key, {
      contents: [{ role: "user", parts }],
      generationConfig: { response_mime_type: "application/json", temperature: 0.1, maxOutputTokens: 4096 },
    });
    const output = AIStructuredOutputSchema.safeParse(parseModelJson(result.text));
    if (!output.success) throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA no devolvió alimentos con datos válidos.");
    if (!output.data.items.length) throw new ApiError(422, "NO_FOOD_DETECTED", "No se detectaron alimentos. Describe la comida con más detalle.");
    const normalizedItems = output.data.items.map((item) => ({
      ...item,
      unit: resolveItemUnit(item),
    }));
    const items = await enrichWithUsda(normalizedItems, key);
    const totals = items.reduce((acc, item) => ({
      calories: acc.calories + item.calories, protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs, fat: acc.fat + item.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return json({ success: true, data: { ...output.data, items, totals }, meta: { provider_used: result.model, latency_ms: Date.now() - start } }, 200, req);
  } catch (error) { return errorResponse(error, req); }
}
Deno.serve(handleRequest);
