import { AIStructuredOutputSchema } from "../types.ts";
import { VisionProvider, VisionProviderResult } from "./provider.interface.ts";

export class OpenAIVisionProvider implements VisionProvider {
  readonly name = "gpt-4o-mini";
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || Deno.env.get("OPENAI_API_KEY");
    if (!key) {
      throw new Error("OPENAI_API_KEY no está configurada en los secrets del servidor.");
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
    let userPromptText = "Analiza los alimentos de esta imagen y devuelve el JSON requerido.";
    if (clientTimeIso) {
      userPromptText += ` Hora local del cliente: ${clientTimeIso}.`;
    }
    if (userNote) {
      userPromptText += ` Nota del usuario: "${userNote}".`;
    }

    const endpoint = "https://api.openai.com/v1/chat/completions";

    const requestBody = {
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPromptText },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en API OpenAI (${response.status}): ${errText}`);
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("OpenAI no retornó contenido en la respuesta.");
    }

    const parsedJson = JSON.parse(rawContent);
    const validatedData = AIStructuredOutputSchema.parse(parsedJson);

    return {
      data: validatedData,
      tokensPrompt: result.usage?.prompt_tokens,
      tokensCompletion: result.usage?.completion_tokens,
      providerName: this.name,
    };
  }
}
