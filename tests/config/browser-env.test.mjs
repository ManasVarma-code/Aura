import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { assertPublicFrontendEnv } from '../../config/browserEnv.ts';
const jwt = role => ['header',Buffer.from(JSON.stringify({role})).toString('base64url'),'signature'].join('.');
test('browser configuration accepts publishable and legacy anon keys',()=>{
  assert.doesNotThrow(()=>assertPublicFrontendEnv({VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'}));
  assert.doesNotThrow(()=>assertPublicFrontendEnv({VITE_SUPABASE_ANON_KEY:jwt('anon')}));
});
test('privileged Supabase keys cannot be placed in browser variables',()=>{
  for(const env of [{VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_example'},{VITE_OTHER_KEY:'sb_secret_example'},{VITE_SUPABASE_PUBLISHABLE_KEY:'  sb_secret_example  '},{VITE_SUPABASE_ANON_KEY:jwt('service_role')}]){
    let failure;try{assertPublicFrontendEnv(env);}catch(error){failure=error;}
    assert.ok(failure);assert.match(failure.message,/server-only Supabase key/);
    for(const value of Object.values(env))assert.equal(failure.message.includes(value),false,'Errors must not disclose credential values');
  }
});
test('server-only variables are never mistaken for browser configuration',()=>{
  assert.doesNotThrow(()=>assertPublicFrontendEnv({SUPABASE_SECRET_KEY:'sb_secret_example',GEMINI_API_KEY:'existing-server-binding'}));
});

test('Vite refuses a privileged key before producing browser assets',()=>{
  const result=spawnSync('node_modules/.bin/vite',['build'],{encoding:'utf8',env:{...process.env,VITE_SUPABASE_PUBLISHABLE_KEY:'  sb_secret_test-only  '}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/server-only Supabase key/);
  assert.equal(result.stderr.includes('sb_secret_test-only'),false,'Build failures must not print key values');
});
