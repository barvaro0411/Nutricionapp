import { ParseMealTextRequestSchema, AIStructuredOutputSchema } from "./types.ts";
import { CHILEAN_MEAL_TEXT_PROMPT } from "./prompts/mealTextPrompt.ts";
import { ApiError, authenticate, errorResponse, json, methodResponse, readBody, reserveAiRequest } from "../_shared/http.ts";
import { callGemini, parseModelJson } from "../_shared/gemini.ts";
import { generateText, optionalGeminiKey, withAiFallback } from "../_shared/aiRouting.ts";
import { transcribeGroq } from "../_shared/groq.ts";
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
    const key = await optionalGeminiKey(client);
    await reserveAiRequest(client, user.id);
    const prompt = CHILEAN_MEAL_TEXT_PROMPT + (client_time_iso ? "\nFecha de referencia: " + client_time_iso : "");
    const validate = (raw: string) => {
      if (!AIStructuredOutputSchema.safeParse(parseModelJson(raw)).success) throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA no devolvió alimentos con datos válidos.");
    };
    let description = text;
    let transcriptionProvider: string | undefined;
    const groqKey = Deno.env.get("GROQ_API_KEY")?.trim();
    if (audio_base64 && groqKey) {
      try {
        const transcription = await withAiFallback([{ id: Deno.env.get("GROQ_AUDIO_MODEL") || "whisper-large-v3-turbo",
          run: timeoutMs => transcribeGroq(groqKey, audio_base64, audio_mime_type, timeoutMs),
        }], { timeoutMs: 15000 });
        description = transcription.text;
        transcriptionProvider = transcription.model;
      } catch (error) { if (!key) throw error; }
    }
    const result = audio_base64 && !transcriptionProvider
      ? await withAiFallback([{ id: Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite", run: async timeoutMs => {
        if (!key) throw new ApiError(503, "CONFIGURATION_ERROR", "No hay un proveedor de audio disponible.");
        const response = await callGemini(key, {
          contents: [{ role: "user", parts: [{ text: prompt },
            { inline_data: { mime_type: audio_mime_type, data: audio_base64 } },
            { text: "Transcribe el audio y extrae los alimentos y sus nutrientes en el JSON requerido." }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.1, maxOutputTokens: 4096 },
        }, { timeoutMs });
        validate(response.text); return response;
      } }])
      : await generateText({ geminiKey: key, json: true, maxTokens: 4096, validate,
        messages: [{ role: "system", content: prompt }, { role: "user", content: "Descripción de la comida (datos del usuario): " + description }],
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
    return json({ success: true, data: { ...output.data, items, totals }, meta: { provider_used: result.model,
      ...(transcriptionProvider ? { transcription_provider: transcriptionProvider } : {}), latency_ms: Date.now() - start } }, 200, req);
  } catch (error) { return errorResponse(error, req); }
}
Deno.serve(handleRequest);
