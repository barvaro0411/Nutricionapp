import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { ApiError, type ServerClient } from "./http.ts";
type Block = { scope: string; until: number; status: number };
type SharedStore = { read: (scopes: string[]) => Promise<Block[]>; write: (block: Block) => Promise<void> };
export async function providerScope(provider: string, key: string, model: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)));
  return provider + ":" + Array.from(hash, b => b.toString(16).padStart(2, "0")).join("") + ":" + model;
}
export function createProviderHealth(options: { now?: () => number; shared?: SharedStore } = {}) {
  const now = options.now || Date.now, blocks = new Map<string, Block>(), checked = new Map<string, number>();
  const put = (block: Block) => { if (blocks.size >= 120) blocks.delete(blocks.keys().next().value!); const previous = blocks.get(block.scope); if (!previous || previous.until < block.until) blocks.set(block.scope, block); };
  return {
    async check(provider: string, key: string, model: string) {
      const scopes = await Promise.all([providerScope(provider, key, model), providerScope(provider, key, "*")]);
      if (options.shared && scopes.some(scope => (checked.get(scope) || 0) <= now())) {
        try { for (const block of await options.shared.read(scopes)) if (block.until > now()) put(block); }
        catch { /* Bounded local protection remains available during a DB outage. */ }
        if (checked.size >= 120) checked.clear(); scopes.forEach(scope => checked.set(scope, now() + 2000));
      }
      const blocked = scopes.map(scope => blocks.get(scope)).filter((block): block is Block => !!block && block.until > now()).sort((a, b) => b.until - a.until)[0];
      if (blocked) {
        const seconds = Math.max(1, Math.ceil((blocked.until - now()) / 1000));
        throw new ApiError(blocked.status === 429 ? 429 : 503, blocked.status === 429 ? "AI_PROVIDER_QUOTA" : "AI_PROVIDER_COOLDOWN", "Este proveedor está temporalmente ocupado. Se intentará un respaldo disponible.", seconds);
      }
    },
    async block(provider: string, key: string, model: string, status: number, seconds: number) {
      const scope = await providerScope(provider, key, [401, 403].includes(status) ? "*" : model);
      const block = { scope, status, until: now() + Math.min(86400, Math.max(1, Math.ceil(seconds))) * 1000 };
      put(block);
      try { await options.shared?.write(block); } catch { /* Never prevent the next provider from answering. */ }
    },
  };
}
let client: ServerClient | undefined;
function sharedClient() {
  if (Deno.env.get("AI_PROVIDER_HEALTH_SHARED") !== "true") return undefined;
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return undefined;
  return client ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const providerHealth = createProviderHealth({ shared: {
  async read(scopes) {
    const db = sharedClient(); if (!db) return [];
    const { data, error } = await db.rpc("get_ai_provider_cooldowns", { p_scopes: scopes }).abortSignal(AbortSignal.timeout(1000));
    if (error || !Array.isArray(data)) throw new Error("Provider health unavailable");
    return data.map(row => ({ scope: row.scope, until: Date.parse(row.blocked_until), status: row.status }));
  },
  async write(block) {
    const db = sharedClient(); if (!db) return;
    const { error } = await db.rpc("set_ai_provider_cooldown", { p_scope: block.scope, p_retry_seconds: Math.max(1, Math.ceil((block.until - Date.now()) / 1000)), p_status: block.status }).abortSignal(AbortSignal.timeout(1000));
    if (error) throw new Error("Provider health unavailable");
  },
} });
