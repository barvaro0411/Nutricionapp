const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).filter(line => /^[A-Z_][A-Z0-9_]*=/.test(line)).map(line => {
  const index = line.indexOf('='); let value = line.slice(index + 1).trim();
  if (value.startsWith('"')) value = JSON.parse(value);
  return [line.slice(0, index), value];
}));
async function main() {
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY };
  const response = await fetch(env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/', { headers, signal: AbortSignal.timeout(15000) });
  console.log(JSON.stringify({ restStatus: response.status }));
  if (response.ok) {
    const schema = await response.json();
    console.log(JSON.stringify({ restUnitColumns: ['meal_items','favorite_meal_items'].map(table => ({ table, present: !!schema.definitions?.[table]?.properties?.unit })) }));
  }
  const cli = 'C:/Users/alvaro/AppData/Local/npm-cache/_npx/aa8e5c70f9d8d161/node_modules/supabase/dist/supabase.js';
  if (!fs.existsSync(cli)) { console.log(JSON.stringify({ sqlCheck: 'CLI unavailable' })); return; }
  const result = spawnSync(process.execPath, [cli, 'db', 'query', '--linked', '--project-ref', env.SUPABASE_PROJECT_REF, '--file', path.join(__dirname, 'revision-2026-10-07-db.sql'), '--output', 'json'], { cwd: root, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 });
  if (result.status !== 0) { console.log(JSON.stringify({ sqlCheck: 'failed', timedOut: result.error?.code === 'ETIMEDOUT' })); return; }
  console.log(JSON.stringify({ sqlChecks: JSON.parse(result.stdout) }));
}
main().catch(error => { console.log(JSON.stringify({ checkFailed: true, name: error.name })); process.exitCode = 1; });
