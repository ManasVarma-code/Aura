import {execFileSync,spawn} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const mobile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(mobile,'..');
const status=JSON.parse(execFileSync(path.join(root,'node_modules/.bin/supabase'),['status','-o','json'],{cwd:root,stdio:['ignore','pipe','pipe']}));
const url=status.API_URL;
if(new URL(url).hostname!=='127.0.0.1')throw new Error('Only the isolated local Supabase is permitted.');
const admin=createClient(url,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const users=[],emails=[]; const password='Aa1!'+randomUUID();
const directory=await mkdtemp(path.join(tmpdir(),'aura-native-tests-'));
let exitCode=1;
try {
 for(let i=0;i<2;i++){
  const email=`flutter-${randomUUID()}@example.com`;
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  if(error)throw error; users.push(data.user.id);emails.push(email);
 }
 const config=path.join(directory,'test.json');
 await writeFile(config,JSON.stringify({TEST_SUPABASE_URL:url,TEST_SUPABASE_KEY:status.ANON_KEY,
 TEST_EMAIL_A:emails[0],TEST_EMAIL_B:emails[1],TEST_PASSWORD:password}),{mode:0o600});
 exitCode=await new Promise((resolve,reject)=>{
  const child=spawn(process.env.FLUTTER_BIN||'/workspace/.flutter-sdk/bin/flutter',
   ['test','--no-pub','test/backend_test.dart',`--dart-define-from-file=${config}`],{cwd:mobile,stdio:'inherit'});
  child.on('error',reject);child.on('exit',code=>resolve(code??1));
 });
} finally {
 const {data,error}=await admin.from('couple_members').select('couple_id').in('profile_id',users);
 if(error)throw error;
 for(const id of new Set(data.map(x=>x.couple_id))){const {error}=await admin.from('couples').delete().eq('id',id);if(error)throw error;}
 for(const id of users){const {error}=await admin.auth.admin.deleteUser(id);if(error)throw error;}
 await rm(directory,{recursive:true,force:true}); await admin.removeAllChannels();
 console.log('Temporary native-test accounts and shared data cleaned up.');
}
process.exit(exitCode);
