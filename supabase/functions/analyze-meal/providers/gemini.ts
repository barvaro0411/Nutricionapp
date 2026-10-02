import { AIStructuredOutputSchema } from "../types.ts";
import { VisionProvider, VisionProviderResult } from "./provider.interface.ts";

export class GeminiVisionProvider implements VisionProvider {
  readonly name = "gemini-3.5-flash";
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || Deno.env.get("GEMINI_API_KEY");
    if (!key) {
      throw new Error("GEMINI_API_KEY no está configurada en los secrets del servidor.");
    }
    this.apiKey = key;
  }

  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    systemPrompt: string,
    clientTimeIso?: string,
    userNote?: string
  ): Promise<VisionProviderResult> {
    let contextInstructions = systemPrompt;
    if (clientTimeIso) {
      contextInstructions += `\n[Contexto del usuario: Hora local actual del cliente: ${clientTimeIso}]`;
    }
    if (userNote) {
      contextInstructions += `\n[Nota opcional del usuario: "${userNote}"]`;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: contextInstructions },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.1,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en API Gemini (${response.status}): ${errText}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Gemini no retornó contenido textual en la respuesta.");
    }

    const parsedJson = JSON.parse(rawText);
    const validatedData = AIStructuredOutputSchema.parse(parsedJson);

    const usage = result.usageMetadata;

    return {
      data: validatedData,
      tokensPrompt: usage?.promptTokenCount,
      tokensCompletion: usage?.candidatesTokenCount,
      providerName: this.name,
    };
  }
}
