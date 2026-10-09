import { ApiError } from "./http.ts";
import { providerHealth } from "./providerHealth.ts";
import { abortableDelay, providerRetrySeconds } from "./providerRetry.ts";

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
};

async function requestGroq(apiKey: string, endpoint: string, model: string, body: Record<string, unknown> | FormData, timeoutMs: number) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9./_-]*$/.test(model)) {
    throw new ApiError(503, "CONFIGURATION_ERROR", "El modelo de Groq no es válido.");
  }
  await providerHealth.check("groq", apiKey, model);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
      const multipart = body instanceof FormData;
      const response = await fetch("https://api.groq.com/openai/v1/" + endpoint, {
        method: "POST",
        headers: { ...(!multipart ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${apiKey}` },
        body: multipart ? body : JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        // Provider bodies can contain credentials or user data; log metadata only.
        console.warn("Groq request failed", { model, status: response.status, attempt: attempt + 1 });
        const transient = [500, 502, 503, 504].includes(response.status);
        if (transient && attempt < 2) {
          await abortableDelay(500 * 2 ** attempt, controller.signal);
          continue;
        }
        if ([401, 403, 404].includes(response.status)) {
          await providerHealth.block("groq", apiKey, model, response.status, 300);
          throw new ApiError(503, "AI_PROVIDER_CONFIGURATION_ERROR", "El servicio de IA requiere revisar su configuración. Inténtalo más tarde.");
        }
        const failure = new ApiError(
          response.status === 429 ? 429 : transient ? 503 : 502,
          "AI_PROVIDER_ERROR",
          response.status === 429 || transient
            ? "El proveedor de IA está temporalmente ocupado. Inténtalo en unos minutos."
            : "El proveedor de IA no pudo procesar la solicitud.",
        );
        const retryAfter = response.status === 429 ? await providerRetrySeconds(response, "groq") : 10;
        await providerHealth.block("groq", apiKey, model, response.status, retryAfter);
        if (response.status === 429) failure.retryAfterSeconds = retryAfter;
        throw failure;
      }
      let result;
      try { result = await response.json(); }
      catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        throw new ApiError(502, "AI_INVALID_RESPONSE", "La IA devolvió una respuesta inválida. Inténtalo nuevamente.");
      }
      return result;
    }
    throw new ApiError(502, "AI_PROVIDER_ERROR", "La IA no pudo completar la solicitud.");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      await providerHealth.block("groq", apiKey, model, 504, 5);
      throw new ApiError(504, "AI_TIMEOUT", "La IA tardó demasiado. Inténtalo nuevamente.");
    }
    if (error instanceof ApiError) throw error;
    await providerHealth.block("groq", apiKey, model, 503, 10);
    throw new ApiError(503, "AI_PROVIDER_ERROR", "No se pudo conectar con el proveedor de IA. Inténtalo nuevamente.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGroq(apiKey: string, messages: GroqMessage[], options: {
  model?: string; json?: boolean; maxTokens?: number; temperature?: number; timeoutMs?: number;
} = {}) {
  const model = options.model || Deno.env.get("GROQ_COACH_MODEL") || "openai/gpt-oss-120b";
  const result = await requestGroq(apiKey, "chat/completions", model, {
    model, messages, temperature: options.temperature ?? 0.4,
    max_completion_tokens: options.maxTokens ?? 1200, stream: false,
    ...(options.json ? { response_format: { type: "json_object" } } : {}),
    ...(model.startsWith("openai/gpt-oss-") ? { reasoning_effort: "low", include_reasoning: false } : {}),
    ...(model.startsWith("qwen/") ? { reasoning_effort: "none", reasoning_format: "hidden" } : {}),
  }, options.timeoutMs ?? 15000);
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new ApiError(502, "AI_EMPTY_RESPONSE", "La IA no pudo generar una respuesta. Inténtalo nuevamente.");
  return { text: content.trim(), usage: result.usage, model };
}

export async function transcribeGroq(apiKey: string, base64: string, mimeType: string, timeoutMs = 15000) {
  const model = Deno.env.get("GROQ_AUDIO_MODEL") || "whisper-large-v3-turbo";
  const extensions: Record<string, string> = { "audio/mp4": "m4a", "audio/m4a": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/webm": "webm", "audio/ogg": "ogg" };
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), "recording." + extensions[mimeType]);
  form.append("model", model);
  form.append("language", "es");
  form.append("response_format", "json");
  const result = await requestGroq(apiKey, "audio/transcriptions", model, form, timeoutMs);
  if (typeof result?.text !== "string" || !result.text.trim()) throw new ApiError(502, "AI_EMPTY_RESPONSE", "No se pudo entender la grabación. Inténtalo nuevamente.");
  return { text: result.text.trim().slice(0, 8000), model };
}
