import { AnalyzeMealRequestSchema } from "./types.ts";
import { CHILEAN_MEAL_VISION_PROMPT } from "./prompts/mealVisionPrompt.ts";
import { NUTRITION_LABEL_PROMPT } from "./prompts/nutritionLabelPrompt.ts";
import { GeminiVisionProvider } from "./providers/gemini.ts";
import { GroqVisionProvider } from "./providers/groq.ts";
import { withAiFallback } from "../_shared/aiRouting.ts";
import { ApiError, authenticate, errorResponse, json, methodResponse, readBody, reserveAiRequest } from "../_shared/http.ts";
import { getGeminiKey } from "../_shared/gemini.ts";
import { resolveItemUnit } from "../_shared/liquidUnits.ts";
import { enrichWithUsda } from "../_shared/usdaSearch.ts";
import type { VisionProvider } from "./providers/provider.interface.ts";

export async function handleRequest(req: Request) {
  const method = methodResponse(req);
  if (method) return method;
  const start = Date.now();
  try {
    const { client, user } = await authenticate(req);
    const parsed = AnalyzeMealRequestSchema.safeParse(await readBody(req, 4096));
    if (!parsed.success) throw new ApiError(400, "INVALID_REQUEST", "Los datos de la foto no son válidos.");
    const { image_path, client_time_iso, user_note, mode } = parsed.data;
    const systemPrompt = mode === "nutrition_label" ? NUTRITION_LABEL_PROMPT : CHILEAN_MEAL_VISION_PROMPT;
    if (!image_path.startsWith(user.id + "/") || image_path.includes("..") || image_path.includes("%")) {
      throw new ApiError(403, "FORBIDDEN", "La imagen no pertenece a tu cuenta.");
    }
    const providers: VisionProvider[] = [];
    let geminiKey: string | undefined;
    const groqKey = Deno.env.get("GROQ_API_KEY")?.trim();
    try { geminiKey = await getGeminiKey(client); providers.push(new GeminiVisionProvider(geminiKey)); }
    catch (error) { if (!groqKey) throw error; }
    if (groqKey) providers.push(new GroqVisionProvider(groqKey));
    const { data: photo, error: downloadError } = await client.storage.from("meal_photos").download(image_path);
    if (downloadError || !photo) throw new ApiError(404, "IMAGE_NOT_FOUND", "No se encontró la foto. Vuelve a subirla.");
    if (photo.size > 5 * 1024 * 1024) throw new ApiError(413, "IMAGE_TOO_LARGE", "La foto supera los 5 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) throw new ApiError(400, "INVALID_IMAGE", "Usa una foto JPG, PNG o WebP.");
    await reserveAiRequest(client, user.id);
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    const image = btoa(chunks.join(""));
    const analysis = await withAiFallback(providers.map(selected => ({ id: selected.name, managedHealth: true,
      run: (timeoutMs: number) => selected.analyzeImage(image, photo.type, systemPrompt, client_time_iso, user_note, timeoutMs),
    })), { timeoutMs: 36000, perProviderMs: 18000 });
    if (!analysis.data.items.length) throw new ApiError(422, "NO_FOOD_DETECTED", "No se detectaron alimentos. Prueba con otra foto.");
    if (mode === "nutrition_label" && (analysis.data.items.length !== 1 || analysis.data.items[0].grams <= 0)) {
      throw new ApiError(422, "INVALID_LABEL", "No se pudo leer la porción de la etiqueta. Ingresa los valores manualmente.");
    }
    const normalizedItems = analysis.data.items.map((item) => ({
      ...item,
      unit: resolveItemUnit(item),
    }));
    const items = mode === "nutrition_label" ? normalizedItems : await enrichWithUsda(normalizedItems, geminiKey);
    const totals = items.reduce((acc, item) => ({
      calories: acc.calories + item.calories, protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs, fat: acc.fat + item.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return json({ success: true, data: { ...analysis.data, items, totals }, meta: {
      provider_used: analysis.providerName, tokens_prompt: analysis.tokensPrompt,
      tokens_completion: analysis.tokensCompletion, latency_ms: Date.now() - start,
    } }, 200, req);
  } catch (error) { return errorResponse(error, req); }
}
Deno.serve(handleRequest);
