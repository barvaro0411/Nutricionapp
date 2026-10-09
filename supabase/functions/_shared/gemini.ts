import { ApiError, ServerClient } from "./http.ts";
export async function getGeminiKey(client: ServerClient): Promise<string> {
  const configured = Deno.env.get("GEMINI_API_KEY");
  const keys: string[] = [];

  if (configured) {
    keys.push(...configured.split(",").map((k) => k.trim()).filter(Boolean));
  }
  for (const name of ["GEMINI_API_KEY_FALLBACK", "GEMINI_API_KEY_BACKUP", "GEMINI_API_KEY_ADDITIONAL"]) {
    const fallback = Deno.env.get(name);
    if (fallback) keys.push(...fallback.split(",").map((k) => k.trim()).filter(Boolean));
  }

  if (!configured?.trim()) {
    const { data, error } = await client.rpc("get_vault_secret", { secret_name: "GEMINI_API_KEY" });
    if (!error && typeof data === "string" && data.trim()) keys.unshift(...data.split(",").map(key => key.trim()).filter(Boolean));
  }
  if (keys.length > 0) return Array.from(new Set(keys)).join(",");
  throw new ApiError(503, "CONFIGURATION_ERROR", "Falta configurar GEMINI_API_KEY en Supabase.");
}

export async function callGemini(apiKey: string, body: unknown, options?: { timeoutMs: number }) {
  const keys = apiKey.split(",").map((k) => k.trim()).filter(Boolean);
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) throw new ApiError(503, "CONFIGURATION_ERROR", "GEMINI_MODEL no es válido.");
  // Optional work has one deadline shared by all backup keys and retries.
  const deadline = options ? Date.now() + options.timeoutMs : undefined;

  for (let i = 0; i < keys.length; i++) {
    const remaining = deadline === undefined ? 45000 : deadline - Date.now();
    if (remaining <= 0) throw new ApiError(504, "AI_TIMEOUT", "La IA tardó demasiado. Inténtalo nuevamente.");
    const key = keys[i];
    const controller = new AbortController();
    // Reserve time for each remaining key so a stalled key cannot consume every backup's budget.
    const timeout = setTimeout(() => controller.abort(), Math.ceil(remaining / (keys.length - i)));

    try {
      // Keep retries within the existing timeout; never retry credentials or invalid requests.
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          // Log only operational metadata: provider bodies can contain credentials or user text.
          console.warn("Gemini request failed", { model, status: response.status, attempt: attempt + 1 });
          if ([401, 403, 429].includes(response.status) && i < keys.length - 1) break;
          const transient = [500, 502, 503, 504].includes(response.status);
          if (transient && attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
            continue;
          }
          if ([401, 403, 404].includes(response.status)) {
            throw new ApiError(503, "AI_PROVIDER_CONFIGURATION_ERROR", "El servicio de IA requiere revisar su configuración. Inténtalo más tarde.");
          }
          throw new ApiError(
            response.status === 429 ? 429 : transient ? 503 : 502,
            "AI_PROVIDER_ERROR",
            response.status === 429 || transient
              ? "El proveedor de IA está temporalmente ocupado. Inténtalo en unos minutos."
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
      }
    } catch (error) {
      const failure = error instanceof DOMException && error.name === "AbortError"
        ? new ApiError(504, "AI_TIMEOUT", "La IA tardó demasiado. Inténtalo nuevamente.")
        : error instanceof ApiError ? error
        : new ApiError(502, "AI_PROVIDER_ERROR", "No se pudo procesar la solicitud de IA. Inténtalo nuevamente.");
      if (i < keys.length - 1 && [502, 503, 504].includes(failure.status)) continue;
      throw failure;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ApiError(502, "AI_PROVIDER_ERROR", "No se pudo procesar la solicitud con las claves configuradas.");
}

export function parseModelJson(text: string) {
  try { return JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "")); }
  catch { throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA devolvió una respuesta inválida. Inténtalo nuevamente."); }
}
