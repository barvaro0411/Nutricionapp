const fs = require("node:fs");
const path = require("node:path");
function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, "utf8").split(/\r?\n/).filter(l => /^[A-Z_][A-Z0-9_]*=/.test(l)).map(l => {
    const pos = l.indexOf("="); let v = l.slice(pos + 1).trim();
    if (/^["']/.test(v)) { try { v = JSON.parse(v); } catch { v = v.slice(1,-1); } }
    return [l.slice(0,pos), v];
  }));
}
const local = readEnv(".env");
const remote = readEnv(".env.vercel.production.local");
for (const key of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"]) {
  const value = remote[key];
  console.log(JSON.stringify({ key, localPresent: !!local[key], productionPresent: !!value, matches: value === local[key],
    validFormat: key.endsWith("URL") ? /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(value || "") : /^(eyJ|sb_publishable_)/.test(value || "") }));
}
const ref = new URL(local.EXPO_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const jwt = key => { try { return JSON.parse(Buffer.from(key.split(".")[1], "base64url")); } catch { return {}; } };
console.log(JSON.stringify({ localProjectMatches: ref === local.SUPABASE_PROJECT_REF,
  anonRoleValid: jwt(local.EXPO_PUBLIC_SUPABASE_ANON_KEY).role === "anon" || local.EXPO_PUBLIC_SUPABASE_ANON_KEY?.startsWith("sb_publishable_"),
  serviceRoleValid: jwt(local.SUPABASE_SERVICE_ROLE_KEY).role === "service_role" || local.SUPABASE_SERVICE_ROLE_KEY?.startsWith("sb_secret_"),
  serviceProjectMatches: jwt(local.SUPABASE_SERVICE_ROLE_KEY).ref ? jwt(local.SUPABASE_SERVICE_ROLE_KEY).ref === ref : null, geminiPresent: !!local.GEMINI_API_KEY }));
async function check() {
  const headers = { apikey: local.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + local.SUPABASE_SERVICE_ROLE_KEY };
  const res = await fetch(local.EXPO_PUBLIC_SUPABASE_URL + "/rest/v1/", { headers, signal: AbortSignal.timeout(15000) });
  console.log(JSON.stringify({ supabaseApiStatus: res.status }));
  if (res.ok) {
    const schema = await res.json();
    console.log(JSON.stringify({ tables: Object.keys(schema.definitions || {}), rpcs: Object.keys(schema.paths || {}).filter(p => p.startsWith("/rpc/")).map(p => p.slice(5)) }));
  }
  const model = local.GEMINI_MODEL || "gemini-3.5-flash";
  const ai = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model), {
    headers: { "x-goog-api-key": local.GEMINI_API_KEY }, signal: AbortSignal.timeout(15000),
  });
  console.log(JSON.stringify({ geminiModel: model, geminiModelStatus: ai.status }));
}
check().catch(e => { console.log(JSON.stringify({ error: e.name, message: "No se pudo comprobar la conectividad." })); process.exitCode = 1; });
module.exports = { readEnv };
