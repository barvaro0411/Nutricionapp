import { ApiError, ServerClient } from "./http.ts";
export async function getGeminiKey(client: ServerClient): Promise<string> {
  const configured = Deno.env.get("GEMINI_API_KEY");
  const fallback = Deno.env.get("GEMINI_API_KEY_FALLBACK") || Deno.env.get("GEMINI_API_KEY_BACKUP");
  const keys: string[] = [];

  if (configured) {
    keys.push(...configured.split(",").map((k) => k.trim()).filter(Boolean));
  }
  if (fallback) {
    keys.push(...fallback.split(",").map((k) => k.trim()).filter(Boolean));
  }

  if (keys.length > 0) {
    return Array.from(new Set(keys)).join(",");
  }

  const { data, error } = await client.rpc("get_vault_secret", { secret_name: "GEMINI_API_KEY" });
  if (!error && typeof data === "string" && data.trim()) return data.trim();
  throw new ApiError(503, "CONFIGURATION_ERROR", "Falta configurar GEMINI_API_KEY en Supabase.");
}

export async function callGemini(apiKey: string, body: unknown) {
  const keys = apiKey.split(",").map((k) => k.trim()).filter(Boolean);
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) throw new ApiError(503, "CONFIGURATION_ERROR", "GEMINI_MODEL no es válido.");

  let lastError: ApiError | null = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      // Si la cuenta superó la cuota (429) o cuota bloqueada (403), y hay otra clave disponible, conmutar
      if ((response.status === 429 || response.status === 403) && i < keys.length - 1) {
        clearTimeout(timeout);
        continue;
      }

      if (!response.ok) {
        throw new ApiError(
          response.status === 429 ? 429 : 502,
          "AI_PROVIDER_ERROR",
          response.status === 429
            ? "El proveedor de IA está ocupado. Inténtalo en unos minutos."
            : "El proveedor de IA no pudo procesar la solicitud."
        );
      }

      const result = await response.json();
      const text = (result.candidates?.[0]?.content?.parts || [])
        .filter((part: { text?: string; thought?: boolean }) => part.text && !part.thought)
        .map((part: { text: string }) => part.text)
        .join("");

      if (!text) throw new ApiError(502, "AI_EMPTY_RESPONSE", "La IA no pudo generar una respuesta. Prueba con otra descripción.");
      return { text, usage: result.usageMetadata, model };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(504, "AI_TIMEOUT", "La IA tardó demasiado. Inténtalo nuevamente.");
      }
      if (error instanceof ApiError && (error.status === 429 || error.status === 403) && i < keys.length - 1) {
        lastError = error;
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError) throw lastError;
  throw new ApiError(502, "AI_PROVIDER_ERROR", "No se pudo procesar la solicitud con las claves configuradas.");
}

export function parseModelJson(text: string) {
  try { return JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "")); }
  catch { throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA devolvió una respuesta inválida. Inténtalo nuevamente."); }
}
