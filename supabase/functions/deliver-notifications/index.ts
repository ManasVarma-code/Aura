import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

type Job = { id:string; route:string; tokens:string[] };
type ServiceAccount = { project_id:string; client_email:string; private_key:string };
const json = (status:number, value:unknown) => new Response(JSON.stringify(value), {status,headers:{'Content-Type':'application/json'}});
const base64url = (bytes:Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encoded = (value:unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)));
async function sameSecret(actual:string, expected:string) {
  const [a,b] = await Promise.all([actual,expected].map(v=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))));
  const x=new Uint8Array(a),y=new Uint8Array(b); let diff=0;
  for(let i=0;i<x.length;i++) diff |= x[i]^y[i];
  return diff===0;
}
async function googleAccessToken(account:ServiceAccount) {
  const bytes=Uint8Array.from(atob(account.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'')),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const now=Math.floor(Date.now()/1000);
  const unsigned=`${encoded({alg:'RS256',typ:'JWT'})}.${encoded({iss:account.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})}`;
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned));
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${unsigned}.${base64url(new Uint8Array(signature))}`}),signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('FCM authentication failed');
  const token=await response.json();
  if (!token.access_token) throw new Error('FCM authentication failed');
  return token.access_token as string;
}
Deno.serve({port:Number(Deno.env.get('PORT') || 8000)},async request => {
  if(request.method!=='POST') return json(405,{error:'POST required'});
  const secret=Deno.env.get('NOTIFICATION_WORKER_SECRET');
  if(!secret) return json(503,{error:'Notification worker is not configured'});
  if(!await sameSecret(request.headers.get('Authorization') || '',`Bearer ${secret}`)) return json(401,{error:'Unauthorized'});
  const credentials=Deno.env.get('FCM_SERVICE_ACCOUNT');
  if(!credentials) return json(503,{error:'FCM delivery is not configured'});
  try {
    const account:ServiceAccount=JSON.parse(credentials);
    if(!account.project_id || !account.client_email || !account.private_key) return json(503,{error:'FCM delivery is not configured'});
    const accessToken=await googleAccessToken(account);
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await db.rpc('claim_notification_jobs'); if(error) throw error;
    let delivered=0, retried=0, noDevices=0;
    for(const job of data as Job[]) {
      let complete=true; const invalid:string[]=[];
      await Promise.all(job.tokens.map(async token => {
        try {
          const response=await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,{
            method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
            body:JSON.stringify({message:{token,data:{job_id:job.id,route:job.route,title:'Aura',body:'A shared moment is waiting for you. 💕'},
              android:{priority:'normal',notification:{title:'Aura',body:'A shared moment is waiting for you. 💕',tag:job.id}},
              apns:{payload:{aps:{alert:{title:'Aura',body:'A shared moment is waiting for you. 💕'},sound:'default'}}}}}),
          });
          if(response.ok) delivered++;
          else {
            const failure=await response.json();
            if(failure.error?.details?.some((d:{errorCode?:string})=>d.errorCode==='UNREGISTERED')) invalid.push(token);
            else complete=false;
          }
        } catch { complete=false; }
      }));
      const done=await db.rpc('finish_notification_job',{job_id:job.id,succeeded:complete,invalid_tokens:invalid});
      if(done.error) throw done.error;
      if(!job.tokens.length) noDevices++; if(!complete) retried++;
    }
    return json(200,{delivered,retried,noDevices});
  } catch { return json(502,{error:'Notification delivery could not complete. Jobs will be retried.'}); }
});
