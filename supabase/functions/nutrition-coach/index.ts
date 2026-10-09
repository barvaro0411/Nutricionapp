import { z } from "npm:zod@3.24.1";
import { ApiError, authenticate, errorResponse, json, methodResponse, readBody, reserveAiRequest } from "../_shared/http.ts";
import { generateText, optionalGeminiKey } from "../_shared/aiRouting.ts";
import { loadCoachContext } from "../_shared/coachContext.ts";
import { coachSystemInstruction } from "../_shared/coachPrompt.ts";
import { claimCoachRequest } from "../_shared/coachRequest.ts";
import { coachFactQuestion, coachFactReply } from "../_shared/coachFacts.ts";
import type { ServerClient } from "../_shared/http.ts";
const inputSchema = z.object({ message: z.string().trim().min(1).max(2000), request_id: z.string().uuid().optional(), client_time_iso: z.string().datetime({ offset: true }).optional() });
export async function handleRequest(req: Request) {
  const method = methodResponse(req); if (method) return method;
  const started = Date.now();
  let claimed: { client: ServerClient; userId: string; requestId: string; token: string } | undefined;
  try {
    const { client, user } = await authenticate(req);
    const parsed = inputSchema.safeParse(await readBody(req, 16000));
    if (!parsed.success) throw new ApiError(400, "INVALID_REQUEST", "Escribe un mensaje de hasta 2000 caracteres.");
    const { message, request_id } = parsed.data;
    if (request_id) {
      const claim = await claimCoachRequest(client, user.id, request_id, message);
      if (claim.response) return json({ ...claim.response, meta: { ...claim.response.meta, cached: true } }, 200, req);
      claimed = { client, userId: user.id, requestId: request_id, token: claim.token! };
    }
    const fact = coachFactQuestion(message);
    const loaded = await loadCoachContext(client, user.id, new Date(), fact ? "nutrition" : "full");
    const { context, history, remaining, consumed, dateKey } = loaded;
    await reserveAiRequest(client, user.id);
    const result = fact ? { text: coachFactReply(fact, loaded), model: "nutrition-calculator" }
      : await generateText({ task: "coach", geminiKey: await optionalGeminiKey(client), temperature: 0.3, maxTokens: 1200, messages: [
      { role: "system", content: coachSystemInstruction(context) },
      ...history,
      { role: "user", content: message },
    ] });
    const response = { success: true, reply: result.text, context: { remainingCalories: remaining.calories, remainingProtein: remaining.protein, consumedCalories: consumed.calories }, meta: { latency_ms: Date.now() - started, model: result.model } };
    if (claimed) {
      const { data, error } = await client.rpc("finish_coach_request", { p_user_id: user.id, p_request_id: claimed.requestId, p_claim_token: claimed.token,
        p_user_text: message, p_assistant_text: result.text, p_snapshot: { date: dateKey, remaining }, p_response: response }).abortSignal(AbortSignal.timeout(5000));
      if (error || !data?.success) throw new ApiError(503, "SAVE_ERROR", "No se pudo confirmar el guardado. Reintenta la misma consulta.");
      return json(data, 200, req);
    }
    const savedAt = Date.now();
    const { error } = await client.from("coach_messages").insert([
      { user_id: user.id, role: "user", content: message, created_at: new Date(savedAt).toISOString(), context_snapshot: { date: dateKey, remaining } },
      { user_id: user.id, role: "assistant", content: result.text, created_at: new Date(savedAt + 1).toISOString(), context_snapshot: { date: dateKey, remaining } },
    ]);
    if (error) throw new ApiError(503, "SAVE_ERROR", "No se pudo guardar la conversación. Reintenta.");
    return json(response, 200, req);
  } catch (error) {
    if (claimed) {
      try { await claimed.client.rpc("abandon_coach_request", { p_user_id: claimed.userId, p_request_id: claimed.requestId, p_claim_token: claimed.token }).abortSignal(AbortSignal.timeout(2000)); }
      catch { /* A lease expires if storage is unavailable. Never delete completed results. */ }
    }
    return errorResponse(error, req);
  }
}
Deno.serve(handleRequest);
