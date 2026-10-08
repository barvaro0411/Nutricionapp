const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname,'..');
const parseEnv = file => Object.fromEntries(fs.readFileSync(file,'utf8').split(/\r?\n/).filter(l=>/^[A-Z_][A-Z0-9_]*=/.test(l)).map(l=>{
  const i=l.indexOf('=');let v=l.slice(i+1).trim();
  if(v.startsWith('"')) v=JSON.parse(v);
  else if(v.startsWith("'") && v.endsWith("'")) v=v.slice(1,-1);
  return [l.slice(0,i),v];
}));
const env = parseEnv(path.join(root,'.env'));
async function main() {
  const settingsResponse = await fetch(env.EXPO_PUBLIC_SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:env.EXPO_PUBLIC_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(15000)});
  const settings=await settingsResponse.json();
  console.log(JSON.stringify({authSettingsStatus:settingsResponse.status,signupsEnabled:settings.disable_signup===false,emailProviderEnabled:settings.external?.email,emailConfirmationRequired:settings.mailer_autoconfirm===false}));
  const privateValues=[];
  for(const file of fs.readdirSync(root).filter(n=>n.startsWith('.env')&&n!=='.env.example')) {
    for(const [key,value] of Object.entries(parseEnv(path.join(root,file)))) {
      if(!key.startsWith('EXPO_PUBLIC_') && /KEY|TOKEN|PASSWORD|SECRET/.test(key) && value.length>=20) privateValues.push({key,value});
    }
  }
  const leaks=new Set();let filesChecked=0;
  const inspect=directory=>{
    if(!fs.existsSync(directory))return;
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})) {
      const file=path.join(directory,entry.name);
      if(entry.isDirectory())inspect(file);
      else {filesChecked++;const bytes=fs.readFileSync(file);for(const secret of privateValues)if(bytes.includes(Buffer.from(secret.value)))leaks.add(secret.key);}
    }
  };
  inspect(path.join(root,'dist'));inspect(path.join(root,'artifacts/audit-native-export'));
  const tracked=spawnSync('git',['ls-files'],{cwd:root,encoding:'utf8'});
  const trackedEnv=tracked.stdout.split(/\r?\n/).filter(f=>/(^|\/)\.env($|\.)/.test(f)&&!f.endsWith('.env.example'));
  console.log(JSON.stringify({buildSecretScan:{filesChecked,privateSecretsFound:[...leaks]},trackedSecretEnvFiles:trackedEnv}));
  const cli='C:/Users/alvaro/AppData/Local/npm-cache/_npx/aa8e5c70f9d8d161/node_modules/supabase/dist/supabase.js';
  const result=spawnSync(process.execPath,[cli,'db','query','--linked','--project-ref',env.SUPABASE_PROJECT_REF,'--file',path.join(__dirname,'seguridad-cuentas-2026-10-07.sql'),'--output','json'],{cwd:root,encoding:'utf8',timeout:45000,maxBuffer:1024*1024});
  if(result.status!==0)throw new Error('Security metadata query failed');
  const rows=JSON.parse(result.stdout).rows;
  fs.writeFileSync(path.join(__dirname,'seguridad-cuentas-metadata.json'),JSON.stringify({settings:{signupsEnabled:settings.disable_signup===false,emailProviderEnabled:settings.external?.email,emailConfirmationRequired:settings.mailer_autoconfirm===false},buildSecretScan:{filesChecked,privateSecretsFound:[...leaks]},trackedSecretEnvFiles:trackedEnv,rows},null,2));
  const checks=rows[0].security_checks;
  console.log(JSON.stringify({sqlSecurity:{tableCount:checks.tables.length,allTablesUseRls:checks.tables.every(t=>t.rls),photosPrivate:checks.storage_buckets.find(b=>b.name==='meal_photos')?.public===false,privateSchemaBlocked:!checks.private_schema_anon_access&&!checks.private_schema_authenticated_access,authTriggerEnabled:checks.auth_triggers.some(t=>t.function==='handle_new_user'&&t.enabled==='O'),authUsersWithoutProfile:checks.auth_users_without_profile,profilesWithoutAuthUser:checks.profiles_without_auth_user,profilesWithoutSubscription:checks.profiles_without_subscription,completedProfilesWithoutGoals:checks.completed_profiles_without_active_goals,duplicateActiveGoals:checks.duplicate_active_goals}}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
