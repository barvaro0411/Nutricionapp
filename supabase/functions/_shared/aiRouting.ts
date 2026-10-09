import { ApiError, type ServerClient } from "./http.ts";
import { callGemini, getGeminiKey, parseModelJson } from "./gemini.ts";
import { callGroq } from "./groq.ts";

// Best-effort cooldowns within a warm Edge instance. Provider quotas remain authoritative.
const cooldowns = new Map<string, { until: number; failure: ApiError }>();
export async function withAiFallback<T>(providers: { id: string; run: (timeoutMs: number) => Promise<T> }[], options: { timeoutMs?: number; perProviderMs?: number } = {}): Promise<T> {
  const deadline = Date.now() + (options.timeoutMs ?? 30000);
  let failure: unknown;
  for (const provider of providers) {
    const cooling = cooldowns.get(provider.id);
    if (cooling && cooling.until > Date.now()) { failure = cooling.failure; continue; }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      const result = await provider.run(Math.min(remaining, options.perProviderMs ?? 15000));
      cooldowns.delete(provider.id);
      return result;
    } catch (error) {
      failure = error;
      if (!(error instanceof ApiError)) throw error;
      if (![429, 502, 503, 504].includes(error.status)) throw error;
      const retryAfter = (error as ApiError & { retryAfterSeconds?: number }).retryAfterSeconds;
      const seconds = error.status === 429 ? Math.min(86400, Math.max(1, retryAfter || 60))
        : error.code === "AI_PROVIDER_CONFIGURATION_ERROR" ? 300 : 10;
      if (cooldowns.size >= 30) cooldowns.delete(cooldowns.keys().next().value!);
      cooldowns.set(provider.id, { until: Date.now() + seconds * 1000, failure: error });
      console.warn("AI provider fallback", { model: provider.id, code: error.code });
    }
  }
  throw failure || new ApiError(503, "CONFIGURATION_ERROR", "No hay un proveedor de IA disponible. Inténtalo más tarde.");
}

export async function optionalGeminiKey(client: ServerClient): Promise<string | undefined> {
  try { return await getGeminiKey(client); }
  catch (error) {
    if (Deno.env.get("GROQ_API_KEY")?.trim() && error instanceof ApiError && error.code === "CONFIGURATION_ERROR") return undefined;
    throw error;
  }
}

export async function generateText(options: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  geminiKey?: string; task?: "coach" | "text"; json?: boolean;
  maxTokens?: number; temperature?: number; timeoutMs?: number;
  validate?: (text: string) => void;
}) {
  const groqKey = Deno.env.get("GROQ_API_KEY")?.trim();
  const groqModel = options.task === "coach"
    ? Deno.env.get("GROQ_COACH_MODEL") || "openai/gpt-oss-120b"
    : Deno.env.get("GROQ_TEXT_MODEL") || "openai/gpt-oss-20b";
  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
  const validate = (text: string) => { if (options.json) parseModelJson(text); options.validate?.(text); };
  const providers: { id: string; run: (timeoutMs: number) => Promise<{ text: string; model: string }> }[] = [];
  if (groqKey) providers.push({ id: groqModel, run: async timeoutMs => {
    const result = await callGroq(groqKey, options.messages, { model: groqModel, json: options.json,
      maxTokens: options.maxTokens ?? 1200, temperature: options.temperature ?? 0.1, timeoutMs });
    validate(result.text); return result;
  } });
  if (options.geminiKey) providers.push({ id: geminiModel, run: async timeoutMs => {
    const system = options.messages.filter(m => m.role === "system").map(m => m.content).join("\n");
    const result = await callGemini(options.geminiKey!, {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: options.messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { ...(options.json ? { response_mime_type: "application/json" } : {}), temperature: options.temperature ?? 0.1, maxOutputTokens: options.maxTokens ?? 1200 },
    }, { timeoutMs });
    validate(result.text); return result;
  } });
  return withAiFallback(providers, { timeoutMs: options.timeoutMs,
    perProviderMs: options.timeoutMs ? Math.min(15000, Math.ceil(options.timeoutMs / Math.max(1, providers.length))) : 15000 });
}
