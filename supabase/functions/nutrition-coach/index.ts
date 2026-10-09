import { z } from "npm:zod@3.24.1";
import { ApiError, authenticate, errorResponse, json, methodResponse, readBody, reserveAiRequest } from "../_shared/http.ts";
import { generateText, optionalGeminiKey } from "../_shared/aiRouting.ts";
import { loadCoachContext } from "../_shared/coachContext.ts";
import { coachSystemInstruction } from "../_shared/coachPrompt.ts";
const inputSchema = z.object({ message: z.string().trim().min(1).max(2000), client_time_iso: z.string().datetime({ offset: true }).optional() });
export async function handleRequest(req: Request) {
  const method = methodResponse(req); if (method) return method;
  const started = Date.now();
  try {
    const { client, user } = await authenticate(req);
    const parsed = inputSchema.safeParse(await readBody(req, 16000));
    if (!parsed.success) throw new ApiError(400, "INVALID_REQUEST", "Escribe un mensaje de hasta 2000 caracteres.");
    const { message } = parsed.data;
    const { context, history, remaining, consumed, dateKey } = await loadCoachContext(client, user.id);
    const key = await optionalGeminiKey(client);
    await reserveAiRequest(client, user.id);
    const result = await generateText({ task: "coach", geminiKey: key, temperature: 0.3, maxTokens: 1200, messages: [
      { role: "system", content: coachSystemInstruction(context) },
      ...history,
      { role: "user", content: message },
    ] });
    const savedAt = Date.now();
    const { error } = await client.from("coach_messages").insert([
      { user_id: user.id, role: "user", content: message, created_at: new Date(savedAt).toISOString(), context_snapshot: { date: dateKey, remaining } },
      { user_id: user.id, role: "assistant", content: result.text, created_at: new Date(savedAt + 1).toISOString(), context_snapshot: { date: dateKey, remaining } },
    ]);
    if (error) throw new ApiError(503, "SAVE_ERROR", "No se pudo guardar la conversación. Reintenta.");
    return json({ success: true, reply: result.text, context: { remainingCalories: remaining.calories, remainingProtein: remaining.protein, consumedCalories: consumed.calories }, meta: { latency_ms: Date.now() - started, model: result.model } }, 200, req);
  } catch (error) { return errorResponse(error, req); }
}
Deno.serve(handleRequest);
