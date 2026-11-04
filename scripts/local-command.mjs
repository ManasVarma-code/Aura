import {execFileSync,spawn} from 'node:child_process';
const env={...process.env,DOCKER_HOST:'unix:///var/run/docker.sock'};
for(const key of ['DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
let status;
try{status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','-o','json'],{env,stdio:['ignore','pipe','pipe']}).toString());}
catch{throw new Error('Start the isolated local Supabase stack first: npm run backend:start');}
if(!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(status.API_URL))throw new Error('This helper is restricted to the local test stack.');
const args=process.argv.slice(2);
const child=spawn('npm',args.length?args:['run','dev'],{stdio:'inherit',env:{...process.env,VITE_SUPABASE_URL:status.API_URL,VITE_SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY}});
child.on('exit',code=>process.exit(code??1));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
