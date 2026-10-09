import { ApiError, type ServerClient } from "./http.ts";
export async function claimCoachRequest(client: ServerClient, userId: string, requestId: string, message: string) {
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message))), b => b.toString(16).padStart(2, "0")).join("");
  const { data, error } = await client.rpc("begin_coach_request", { p_user_id: userId, p_request_id: requestId, p_message_hash: hash }).abortSignal(AbortSignal.timeout(4000));
  if (error || !data) throw new ApiError(503, "REQUEST_STORAGE_ERROR", "No se pudo iniciar la consulta. Reintenta.");
  if (data.state === "conflict") throw new ApiError(409, "REQUEST_CONFLICT", "Esta consulta ya se utilizó con otro mensaje.");
  if (data.state === "processing") throw new ApiError(409, "REQUEST_IN_PROGRESS", "Tu consulta sigue en proceso. Espera unos segundos y reintenta.", 3);
  if (data.state === "cached" && data.response?.success) return { response: data.response };
  if (data.state !== "acquired" || typeof data.claim_token !== "string") throw new ApiError(503, "REQUEST_STORAGE_ERROR", "No se pudo iniciar la consulta.");
  return { token: data.claim_token };
}
