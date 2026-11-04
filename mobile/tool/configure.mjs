import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env=loadEnv('production',path.resolve(mobile,'..'),'VITE_SUPABASE_');
const url=env.VITE_SUPABASE_URL, key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || new URL(url).protocol!=='https:' || !key?.startsWith('sb_publishable_') || key.trim()!==key) {
  throw new Error('Expected an HTTPS Supabase URL and a publishable client key. Server keys are never copied.');
}
await mkdir(path.join(mobile,'config'),{recursive:true});
await writeFile(path.join(mobile,'config','supabase.local.json'),JSON.stringify({
  SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:key,
},null,2)+'\n',{mode:0o600});
console.log('Native public connection settings prepared. No server or Gemini keys copied.');
