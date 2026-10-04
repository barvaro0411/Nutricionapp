import { ApiError, ServerClient } from "./http.ts";
export async function getGeminiKey(client: ServerClient): Promise<string> {
  const configured = Deno.env.get("GEMINI_API_KEY");
  if (configured) return configured;
  const { data, error } = await client.rpc("get_vault_secret", { secret_name: "GEMINI_API_KEY" });
  if (!error && typeof data === "string" && data) return data;
  throw new ApiError(503, "CONFIGURATION_ERROR", "Falta configurar GEMINI_API_KEY en Supabase.");
}
export async function callGemini(apiKey: string, body: unknown) {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash";
  if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model)) throw new ApiError(503, "CONFIGURATION_ERROR", "GEMINI_MODEL no es válido.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, "AI_PROVIDER_ERROR", response.status === 429 ? "El proveedor de IA está ocupado. Inténtalo en unos minutos." : "El proveedor de IA no pudo procesar la solicitud.");
    const result = await response.json();
    const text = (result.candidates?.[0]?.content?.parts || [])
      .filter((part: { text?: string; thought?: boolean }) => part.text && !part.thought)
      .map((part: { text: string }) => part.text).join("");
    if (!text) throw new ApiError(502, "AI_EMPTY_RESPONSE", "La IA no pudo generar una respuesta. Prueba con otra descripción.");
    return { text, usage: result.usageMetadata, model };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new ApiError(504, "AI_TIMEOUT", "La IA tardó demasiado. Inténtalo nuevamente.");
    throw error;
  } finally { clearTimeout(timeout); }
}
export function parseModelJson(text: string) {
  try { return JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "")); }
  catch { throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA devolvió una respuesta inválida. Inténtalo nuevamente."); }
}
