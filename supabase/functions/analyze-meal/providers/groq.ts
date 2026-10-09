import { ApiError } from "../../_shared/http.ts";
import { callGroq } from "../../_shared/groq.ts";
import { parseModelJson } from "../../_shared/gemini.ts";
import { AIStructuredOutputSchema } from "../types.ts";
import type { VisionProvider, VisionProviderResult } from "./provider.interface.ts";
import { CHILEAN_MEAL_VISION_PROMPT, GROQ_MEAL_VISION_PROMPT } from "../prompts/mealVisionPrompt.ts";

export class GroqVisionProvider implements VisionProvider {
  readonly name = Deno.env.get("GROQ_VISION_MODEL") || "qwen/qwen3.8-27b";
  constructor(private apiKey: string) {}
  async analyzeImage(imageBase64: string, mimeType: string, prompt: string, clientTimeIso?: string, userNote?: string, timeoutMs = 15000): Promise<VisionProviderResult> {
    const result = await callGroq(this.apiKey, [
      { role: "system", content: prompt === CHILEAN_MEAL_VISION_PROMPT ? GROQ_MEAL_VISION_PROMPT : prompt },
      { role: "user", content: [
        { type: "text", text: JSON.stringify({ client_time_iso: clientTimeIso, user_note: userNote }) },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ] },
    ], { model: this.name, json: true, temperature: 0.1, maxTokens: 2048, timeoutMs });
    const parsed = AIStructuredOutputSchema.safeParse(parseModelJson(result.text));
    if (!parsed.success) throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA devolvió datos nutricionales inválidos.");
    return { data: parsed.data, providerName: result.model, tokensPrompt: result.usage?.prompt_tokens, tokensCompletion: result.usage?.completion_tokens };
  }
}
