const fs = require("node:fs");
const files = fs.readdirSync("supabase/migrations").filter(f => f.endsWith(".sql")).sort();
const all = files.map(f => "-- " + f + "\n" + fs.readFileSync("supabase/migrations/" + f, "utf8")).join("\n\n");
fs.writeFileSync("supabase/bootstrap.sql", "-- Fresh database only. Existing projects use incremental migrations.\nBEGIN;\n" + all + "\nCOMMIT;\n");
fs.writeFileSync("supabase/full_schema.sql", fs.readFileSync("supabase/bootstrap.sql"));
const plan = JSON.parse(fs.readFileSync("supabase/.private/personal-plan.json", "utf8"));
const quote = value => "'" + String(value).replace(/'/g, "''") + "'";
const repairs = files.filter(f => f.includes("000004_") || f.includes("000005_"));
if (repairs.length !== 2) throw new Error("Expected two incremental migrations.");
const body = repairs.map(f => fs.readFileSync("supabase/migrations/" + f,"utf8")).join("\n");
const history = [
  "CREATE SCHEMA IF NOT EXISTS supabase_migrations;",
  "CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);",
  ...files.map(f => "INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES(" + quote(f.split("_")[0]) + "," + quote(f.slice(15,-4)) + ") ON CONFLICT (version) DO NOTHING;"),
].join("\n");
const seed = "INSERT INTO public.personal_plans(user_id,plan) SELECT p.id," + quote(JSON.stringify(plan)) + "::jsonb FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE lower(u.email)=" + quote(plan.user.email.toLowerCase()) + " ON CONFLICT(user_id) DO UPDATE SET plan=EXCLUDED.plan,updated_at=now();";
fs.writeFileSync("supabase/.private/repair.sql", "BEGIN;\n" + body + "\n" + seed + "\n" + history + "\nCOMMIT;\nSELECT 'migrations_applied' AS result;");
const env = Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const p=l.indexOf("="); let value=l.slice(p+1).trim(); if(value.startsWith('"')) value=JSON.parse(value); return [l.slice(0,p),value]; }));
fs.writeFileSync(".env.gemini.local", ["GEMINI_API_KEY","GEMINI_MODEL"].map(k => k + "=" + JSON.stringify(env[k])).join("\n") + "\nAI_DAILY_LIMIT=100\nAI_MINUTE_LIMIT=10\n");
console.log("Migration bundle and server secrets prepared in ignored files.");
