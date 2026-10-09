import { ApiError } from "./http.ts";
export const LIVE_DURATION_MS = 120000;
type Proof = { uid: string; sid: string; exp: number };
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const decode = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function signingKey() {
  const secret = Deno.env.get("COACH_LIVE_SIGNING_SECRET");
  if (!secret || secret.length < 32) throw new ApiError(503, "LIVE_CONFIGURATION_ERROR", "La conversación por voz todavía no está configurada.");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function issueLiveProof(uid: string, now = Date.now()) {
  const payload: Proof = { uid, sid: crypto.randomUUID(), exp: now + LIVE_DURATION_MS + 60000 };
  const encoded = encode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), new TextEncoder().encode(encoded));
  return encoded + "." + encode(new Uint8Array(signature));
}
export async function verifyLiveProof(proof: string, uid: string, now = Date.now()): Promise<Proof> {
  const invalid = () => new ApiError(401, "INVALID_LIVE_SESSION", "La sesión de voz expiró. Inicia otra conversación.");
  const key = await signingKey();
  try {
    const parts = proof.split(".");
    if (parts.length !== 2 || !await crypto.subtle.verify("HMAC", key, decode(parts[1]), new TextEncoder().encode(parts[0]))) throw invalid();
    const payload = JSON.parse(new TextDecoder().decode(decode(parts[0]))) as Proof;
    if (payload.uid !== uid || typeof payload.sid !== "string" || !/^[a-f0-9-]{36}$/.test(payload.sid) || !Number.isFinite(payload.exp) || payload.exp <= now || payload.exp > now + LIVE_DURATION_MS + 60000) throw invalid();
    return payload;
  } catch { throw invalid(); }
}
export async function liveMessageId(sessionId: string, turn: number, role: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${sessionId}:${turn}:${role}`))).slice(0, 16);
  hash[6] = (hash[6] & 15) | 80;
  hash[8] = (hash[8] & 63) | 128;
  const hex = Array.from(hash, b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
