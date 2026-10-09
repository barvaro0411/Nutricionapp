import { AIStructuredOutputSchema } from "../types.ts";
import { VisionProvider, VisionProviderResult } from "./provider.interface.ts";
import { callGemini, parseModelJson } from "../../_shared/gemini.ts";
import { ApiError } from "../../_shared/http.ts";

export class GeminiVisionProvider implements VisionProvider {
  readonly name = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
  constructor(private apiKey: string) {}
  async analyzeImage(imageBase64: string, mimeType: string, systemPrompt: string, clientTimeIso?: string, userNote?: string, timeoutMs = 18000): Promise<VisionProviderResult> {
    const result = await callGemini(this.apiKey, {
      contents: [{ role: "user", parts: [
        { text: systemPrompt },
        { text: JSON.stringify({ client_time_iso: clientTimeIso, user_note: userNote }) },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ] }],
      generationConfig: { response_mime_type: "application/json", temperature: 0.1, maxOutputTokens: 4096 },
    }, { timeoutMs });
    const parsed = AIStructuredOutputSchema.safeParse(parseModelJson(result.text));
    if (!parsed.success) throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA devolvió datos nutricionales inválidos.");
    return { data: parsed.data, tokensPrompt: result.usage?.promptTokenCount, tokensCompletion: result.usage?.candidatesTokenCount, providerName: result.model };
  }
}
