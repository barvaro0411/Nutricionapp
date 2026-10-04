import { AnalyzeMealRequestSchema } from "./types.ts";
import { CHILEAN_MEAL_VISION_PROMPT } from "./prompts/mealVisionPrompt.ts";
import { GeminiVisionProvider } from "./providers/gemini.ts";
import { OpenAIVisionProvider } from "./providers/openai.ts";
import { ApiError, authenticate, errorResponse, json, methodResponse, readBody, reserveAiRequest } from "../_shared/http.ts";
import { getGeminiKey } from "../_shared/gemini.ts";
import type { VisionProvider } from "./providers/provider.interface.ts";

export async function handleRequest(req: Request) {
  const method = methodResponse(req);
  if (method) return method;
  const start = Date.now();
  try {
    const { client, user } = await authenticate(req);
    const parsed = AnalyzeMealRequestSchema.safeParse(await readBody(req, 4096));
    if (!parsed.success) throw new ApiError(400, "INVALID_REQUEST", "Los datos de la foto no son válidos.");
    const { image_path, client_time_iso, user_note, provider } = parsed.data;
    if (!image_path.startsWith(user.id + "/") || image_path.includes("..") || image_path.includes("%")) {
      throw new ApiError(403, "FORBIDDEN", "La imagen no pertenece a tu cuenta.");
    }
    const providers: VisionProvider[] = [];
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    try { providers.push(new GeminiVisionProvider(await getGeminiKey(client))); }
    catch (error) { if (!openaiKey) throw error; }
    if (openaiKey) providers.push(new OpenAIVisionProvider(openaiKey));
    if (provider === "openai") providers.reverse();
    const { data: photo, error: downloadError } = await client.storage.from("meal_photos").download(image_path);
    if (downloadError || !photo) throw new ApiError(404, "IMAGE_NOT_FOUND", "No se encontró la foto. Vuelve a subirla.");
    if (photo.size > 5 * 1024 * 1024) throw new ApiError(413, "IMAGE_TOO_LARGE", "La foto supera los 5 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) throw new ApiError(400, "INVALID_IMAGE", "Usa una foto JPG, PNG o WebP.");
    await reserveAiRequest(client, user.id);
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    const image = btoa(chunks.join(""));
    let analysis;
    let failure: unknown;
    for (const selected of providers) {
      try { analysis = await selected.analyzeImage(image, photo.type, CHILEAN_MEAL_VISION_PROMPT, client_time_iso, user_note); break; }
      catch (error) { failure = error; }
    }
    if (!analysis) throw failure || new ApiError(503, "CONFIGURATION_ERROR", "No hay un proveedor de IA configurado.");
    if (!analysis.data.items.length) throw new ApiError(422, "NO_FOOD_DETECTED", "No se detectaron alimentos. Prueba con otra foto.");
    const totals = analysis.data.items.reduce((acc, item) => ({
      calories: acc.calories + item.calories, protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs, fat: acc.fat + item.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return json({ success: true, data: { ...analysis.data, totals }, meta: {
      provider_used: analysis.providerName, tokens_prompt: analysis.tokensPrompt,
      tokens_completion: analysis.tokensCompletion, latency_ms: Date.now() - start,
    } }, 200, req);
  } catch (error) { return errorResponse(error, req); }
}
Deno.serve(handleRequest);
