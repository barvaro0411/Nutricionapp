import { ApiError, type ServerClient } from "./http.ts";
import { providerHealth } from "./providerHealth.ts";
import { abortableDelay, providerRetrySeconds } from "./providerRetry.ts";
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
  const keys = [...new Set(apiKey.split(",").map(k => k.trim()).filter(Boolean))];
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) throw new ApiError(503, "CONFIGURATION_ERROR", "GEMINI_MODEL no es válido.");
  const deadline = Date.now() + (options?.timeoutMs ?? 45000);
  const failures: ApiError[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try { await providerHealth.check("gemini", key, model); }
    catch (error) { if (error instanceof ApiError) { failures.push(error); continue; } throw error; }
    const remaining = deadline - Date.now();
    if (remaining <= 0) { failures.push(new ApiError(504, "AI_TIMEOUT", "La IA tardó demasiado. Inténtalo nuevamente.")); break; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.ceil(remaining / (keys.length - i)));
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(body), signal: controller.signal,
        });
        if (!response.ok) {
          console.warn("Gemini request failed", { model, status: response.status, attempt: attempt + 1 });
          const transient = [500, 502, 503, 504].includes(response.status);
          if (transient && attempt < 2) { await abortableDelay(500 * 2 ** attempt, controller.signal); continue; }
          const retry = response.status === 429 ? await providerRetrySeconds(response, "gemini")
            : [401, 403, 404].includes(response.status) ? 300 : 10;
          await providerHealth.block("gemini", key, model, response.status, retry);
          throw new ApiError(response.status === 429 ? 429 : [401, 403, 404].includes(response.status) || transient ? 503 : 502,
            [401, 403, 404].includes(response.status) ? "AI_PROVIDER_CONFIGURATION_ERROR" : "AI_PROVIDER_ERROR",
            response.status === 429 || transient ? "El proveedor de IA está temporalmente ocupado. Inténtalo en unos minutos."
              : "El proveedor de IA no pudo procesar la solicitud.", response.status === 429 ? retry : undefined);
        }
        const result = await response.json();
        const text = (result.candidates?.[0]?.content?.parts || []).filter((part: { text?: string; thought?: boolean }) => part.text && !part.thought)
          .map((part: { text: string }) => part.text).join("");
        if (!text.trim()) throw new ApiError(502, "AI_EMPTY_RESPONSE", "La IA no pudo generar una respuesta. Prueba con otra descripción.");
        return { text: text.trim(), usage: result.usageMetadata, model };
      }
    } catch (error) {
      const failure = error instanceof DOMException && error.name === "AbortError" ? new ApiError(504, "AI_TIMEOUT", "La IA tardó demasiado. Inténtalo nuevamente.")
        : error instanceof ApiError ? error : new ApiError(502, "AI_PROVIDER_ERROR", "No se pudo procesar la solicitud de IA. Inténtalo nuevamente.");
      if (!(error instanceof ApiError)) await providerHealth.block("gemini", key, model, failure.status, failure.status === 504 ? 5 : 10);
      failures.push(failure);
    } finally { clearTimeout(timeout); }
  }
  // An exhausted pool is retried at the earliest eligible key, not the last key's reset.
  if (failures.length && failures.every(error => error.status === 429)) {
    throw new ApiError(429, "AI_PROVIDER_QUOTA", "Las cuotas gratuitas están temporalmente ocupadas. Inténtalo cuando se liberen.",
      Math.min(...failures.map(error => error.retryAfterSeconds || 60)));
  }
  throw failures.at(-1) || new ApiError(503, "CONFIGURATION_ERROR", "No hay una clave de Gemini disponible.");
}

export function parseModelJson(text: string) {
  try { return JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "")); }
  catch { throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA devolvió una respuesta inválida. Inténtalo nuevamente."); }
}
