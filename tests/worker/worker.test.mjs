import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
test('FCM worker rejects unauthorized requests and does not claim jobs without Firebase credentials',async t=>{
  const env={...process.env,PORT:'18273',NOTIFICATION_WORKER_SECRET:'aura-local-test-only',DENO_CERT:'/etc/ssl/certs/ca-certificates.crt'};
  delete env.FCM_SERVICE_ACCOUNT;
  const child=spawn('node_modules/.bin/deno',['run','--allow-env','--allow-net','supabase/functions/deliver-notifications/index.ts'],{env,stdio:'ignore'});
  t.after(()=>child.kill('SIGTERM'));
  let ready=false;
  for(let i=0;i<50;i++){
    try{await fetch('http://127.0.0.1:18273');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}
  }
  assert.ok(ready,'FCM worker did not start');
  for(const [method,auth,expected] of [['GET','',405],['POST','',401],['POST','Bearer aura-local-test-only',503]]){
    const response=await fetch('http://127.0.0.1:18273',{method,headers:auth?{Authorization:auth}:{}});
    assert.equal(response.status,expected);
  }
});
