import { createClient } from "npm:@supabase/supabase-js@2.117.2";

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("Origin");
  let allowedOrigin = "*";

  if (origin) {
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isVercel = /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
    const customAllowed = Deno.env.get("ALLOWED_ORIGIN");

    if (isLocalhost || isVercel || (customAllowed && origin === customAllowed)) {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfterSeconds?: number) { super(message); }
}
export function json(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), { status, headers: getCorsHeaders(req) });
}
export function methodResponse(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Usa POST." } }, 405, req);
  return null;
}
export function errorResponse(error: unknown, req?: Request) {
  if (error instanceof ApiError) {
    const seconds = error.retryAfterSeconds ? Math.min(86400, Math.max(1, Math.ceil(error.retryAfterSeconds))) : undefined;
    const response = json({ success: false, error: { code: error.code, message: error.message, ...(seconds ? { retry_after_seconds: seconds } : {}) } }, error.status, req);
    if (seconds) response.headers.set("Retry-After", String(seconds));
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  console.error("Fallo del servicio de IA:", error instanceof Error ? error.name : "UnknownError");
  return json({ success: false, error: { code: "SERVER_ERROR", message: "No se pudo completar la solicitud. Inténtalo nuevamente." } }, 500, req);
}
export async function readBody(req: Request, maxBytes = 6 * 1024 * 1024) {
  if (Number(req.headers.get("Content-Length")) > maxBytes) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "La solicitud es demasiado grande.");
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "La solicitud es demasiado grande.");
  try { return JSON.parse(text); } catch { throw new ApiError(400, "INVALID_REQUEST", "El cuerpo debe ser JSON válido."); }
}
export async function authenticate(req: Request) {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new ApiError(401, "UNAUTHORIZED", "Inicia sesión para continuar.");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new ApiError(503, "CONFIGURATION_ERROR", "El servidor no está configurado.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new ApiError(401, "UNAUTHORIZED", "La sesión expiró. Inicia sesión nuevamente.");
  return { client, user };
}
export type ServerClient = Awaited<ReturnType<typeof authenticate>>["client"];
export async function reserveAiRequest(client: ServerClient, userId: string) {
  const parseLimit = (value: string | undefined, fallback: number) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 10000 ? number : fallback;
  };
  const { data, error } = await client.rpc("reserve_ai_request", {
    target_user_id: userId,
    daily_limit: parseLimit(Deno.env.get("AI_DAILY_LIMIT"), 100),
    minute_limit: parseLimit(Deno.env.get("AI_MINUTE_LIMIT"), 10),
  });
  if (error) throw new ApiError(503, "DATABASE_CONFIGURATION_ERROR", "Falta actualizar la configuración de IA en la base de datos.");
  if (!data?.allowed) throw new ApiError(429, "RATE_LIMITED", data?.scope === "daily"
    ? "Alcanzaste el límite diario de IA. Se renueva a medianoche en Chile; puedes consultar tus registros guardados."
    : "Has consultado varias veces seguidas. Espera un momento antes de volver a intentar.", Number(data?.retry_after_seconds) || 60);
}
