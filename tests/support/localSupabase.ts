import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
export function localSupabase() {
  const env = { ...process.env, DOCKER_HOST:'unix:///var/run/docker.sock' };
  for (const name of ['DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[name];
  const status = JSON.parse(execFileSync('node_modules/.bin/supabase',['status','-o','json'],{env,stdio:['ignore','pipe','pipe']}).toString());
  if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(status.API_URL)) throw new Error('Browser tests require isolated local Supabase.');
  return { url:status.API_URL as string, key:status.ANON_KEY as string, admin:createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}) };
}
