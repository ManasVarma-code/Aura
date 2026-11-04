import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

// Local integration tests NEVER use hosted admin credentials or touch hosted users.
const env = { ...process.env, DOCKER_HOST: 'unix:///var/run/docker.sock' };
for (const name of ['DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[name];
const status = JSON.parse(execFileSync('node_modules/.bin/supabase', ['status', '-o', 'json'], { env, stdio: ['ignore', 'pipe', 'pipe'] }).toString());
const url = status.API_URL;
assert.match(url, /^http:\/\/(127\.0\.0\.1|localhost):54321$/);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, status.SERVICE_ROLE_KEY, options);
const anon = () => createClient(url, status.ANON_KEY, options);
const accounts = [];
const password = 'Aura-integration-only-8!';
after(async () => {
  const memberships=await admin.from('couple_members').select('couple_id').in('profile_id',accounts.map(a=>a.id));
  for (const id of new Set(memberships.data?.map(m=>m.couple_id))) await admin.from('couples').delete().eq('id',id);
  for (const account of accounts) await admin.auth.admin.deleteUser(account.id);
  for (const account of accounts) await account.db.removeAllChannels();
});
async function account() {
  const email = `aura-${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(error, null);
  const db = anon();
  const auth = await db.auth.signInWithPassword({ email, password });
  assert.equal(auth.error, null);
  const result = { db, id: data.user.id, email };
  accounts.push(result);
  return result;
}
async function complete(a) {
  const { error } = await a.db.from('profiles').update({ gender: 'Other', partner_nickname: 'Honey' }).eq('id', a.id);
  assert.equal(error, null);
}
async function rpc(a, name, args) {
  const { data, error } = await a.db.rpc(name, args);
  assert.equal(error, null);
  return data;
}

test('Supabase identity, profile RLS and secure partner linking', async t => {
  const a = await account(), b = await account(), outsider = await account();
  await t.test('real password authentication rejects incorrect passwords', async () => {
    const result = await anon().auth.signInWithPassword({ email: a.email, password: 'incorrect-password' });
    assert.ok(result.error);
  });
  await t.test('profiles are created by Auth and isolated per account', async () => {
    const { data, error } = await a.db.from('profiles').select('id');
    assert.equal(error, null); assert.deepEqual(data, [{ id: a.id }]);
    const result = await anon().from('profiles').select('id');
    assert.ok(result.error || result.data.length === 0);
    await a.db.from('profiles').update({ name: 'forged' }).eq('id', b.id);
    const original = await b.db.from('profiles').select('name').single();
    assert.notEqual(original.data.name, 'forged');
  });
  await t.test('clients cannot create or forge couple membership', async () => {
    const result = await a.db.from('couple_members').insert({ profile_id: a.id, couple_id: crypto.randomUUID(), slot: 1 });
    assert.ok(result.error);
    const unauth = await anon().rpc('create_partner_invite'); assert.ok(unauth.error);
    assert.ok((await rpc(a, 'create_partner_invite')).error);
  });
  await complete(a); await complete(b); await complete(outsider);
  let invitation, coupleId;
  await t.test('rotated and self invitations cannot link accounts', async () => {
    const original = await rpc(a, 'create_partner_invite');
    invitation = await rpc(a, 'create_partner_invite');
    assert.match(invitation.code, /^[0-9a-f]{24}$/);
    assert.ok((await rpc(b, 'accept_partner_invite', { invite_code: original.code })).error);
    assert.ok((await rpc(a, 'accept_partner_invite', { invite_code: invitation.code })).error);
  });
  await t.test('linking is atomic and gives exactly two users one shared couple', async () => {
    const accepted = await rpc(b, 'accept_partner_invite', { invite_code: invitation.code.toUpperCase() });
    assert.ok(accepted.couple_id); coupleId = accepted.couple_id;
    const first = await a.db.from('couple_members').select('*');
    assert.equal(first.error, null); assert.equal(first.data.length, 2);
    assert.ok(first.data.every(row => row.couple_id === accepted.couple_id));
    const hidden = await outsider.db.from('couple_members').select('*');
    assert.equal(hidden.error, null); assert.deepEqual(hidden.data, []);
  });
  await t.test('codes cannot be replayed or used to add a third partner', async () => {
    assert.ok((await rpc(outsider, 'accept_partner_invite', { invite_code: invitation.code })).error);
    assert.ok((await rpc(a, 'create_partner_invite')).error);
    const fresh = await rpc(outsider, 'create_partner_invite');
    assert.ok((await rpc(b, 'accept_partner_invite', { invite_code: fresh.code })).error);
  });
  await t.test('invalid attempts persist and trigger the database rate limit', async () => {
    for (let i=0; i<10; i++) await rpc(outsider, 'accept_partner_invite', { invite_code: '0'.repeat(24) });
    const response = await rpc(outsider, 'accept_partner_invite', { invite_code: '0'.repeat(24) });
    assert.match(response.error, /Too many attempts/);
  });
  await t.test('private invitations expire and are not readable through the API', async () => {
    const owner = await account(), joiner = await account();
    await complete(owner); await complete(joiner);
    const inv = await rpc(owner, 'create_partner_invite');
    execFileSync('docker', ['--host=unix:///var/run/docker.sock','exec','supabase_db_Aura','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c', `update private.partner_invites set expires_at = now() - interval '1 second' where owner_id = '${owner.id}'`], { env, stdio:'pipe' });
    assert.ok((await rpc(joiner, 'accept_partner_invite', {invite_code:inv.code})).error);
    const hidden = await owner.db.schema('private').from('partner_invites').select('*');
    assert.ok(hidden.error);
  });
  await t.test('messages persist, reach the partner over Realtime and remain hidden from outsiders', async () => {
    await b.db.realtime.setAuth((await b.db.auth.getSession()).data.session.access_token);
    let resolveReady;
    const postgresReady=new Promise(resolve=>{resolveReady=resolve;});
    let resolveUpdate;
    const received = new Promise(resolve => { resolveUpdate = resolve; });
    const channel = b.db.channel('test-messages-'+crypto.randomUUID()).on('system',{}, msg => { console.log('Realtime readiness:',msg.extension,msg.status,msg.message); if(msg.extension==='postgres_changes' && msg.status==='ok')resolveReady(); }).on('postgres_changes', {event:'INSERT',schema:'public',table:'messages',filter:`couple_id=eq.${coupleId}`}, payload=>resolveUpdate(payload.new));
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Realtime subscription timed out')),10000);
      channel.subscribe(status=>{ if(status==='SUBSCRIBED'){clearTimeout(timeout);resolve();} if(status==='CHANNEL_ERROR'){clearTimeout(timeout);reject(new Error('Realtime subscription failed'));} });
    });
    try {
      let readyTimeout;await Promise.race([postgresReady,new Promise((_,reject)=>{readyTimeout=setTimeout(()=>reject(new Error('PostgreSQL subscription readiness timed out')),15000);})]).finally(()=>clearTimeout(readyTimeout));
      const id=crypto.randomUUID();
      const sent = await a.db.from('messages').insert({id,couple_id:coupleId,body:'Real shared message'});
      assert.equal(sent.error,null);
      let timeout; const result=await Promise.race([received,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Realtime delivery timed out')),10000);})]).finally(()=>clearTimeout(timeout));
      assert.equal(result.id,id);
      const other=await outsider.db.from('messages').select('*'); assert.equal(other.error,null); assert.deepEqual(other.data,[]);
      const forged=await outsider.db.from('messages').insert({couple_id:coupleId,body:'forged'}); assert.ok(forged.error);
      const impersonated=await b.db.from('messages').insert({couple_id:coupleId,author_id:a.id,body:'forged'});assert.ok(impersonated.error);
    } finally { await b.db.removeChannel(channel); }
  });
  await t.test('calendar events are shared and may only be edited inside the couple', async () => {
    const created=await a.db.from('calendar_events').insert({couple_id:coupleId,title:'Dinner',event_date:'2026-11-20'}).select().single();
    assert.equal(created.error,null);
    const seen=await b.db.from('calendar_events').select('*').eq('id',created.data.id).single();assert.equal(seen.error,null);assert.equal(seen.data.title,'Dinner');
    const forged=await outsider.db.from('calendar_events').insert({couple_id:coupleId,title:'Intrusion',event_date:'2026-11-20'});assert.ok(forged.error);
    const hidden=await outsider.db.from('calendar_events').select('*');assert.deepEqual(hidden.data,[]);
    const changed=await b.db.from('calendar_events').update({title:'Dinner together'}).eq('id',created.data.id);assert.equal(changed.error,null);
    const deleted=await b.db.from('calendar_events').delete().eq('id',created.data.id);assert.equal(deleted.error,null);
  });
  await t.test('private memory photos support authorized signed access and reject outsiders', async () => {
    const path=`${coupleId}/${a.id}/${crypto.randomUUID()}.png`;
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8S8AAAAASUVORK5CYII=','base64');
    const uploaded=await a.db.storage.from('memories').upload(path,png,{contentType:'image/png'});assert.equal(uploaded.error,null);
    try {
      const saved=await a.db.from('memories').insert({couple_id:coupleId,type:'photo',title:'Together',image_path:path}).select().single();assert.equal(saved.error,null);
      const shared=await b.db.from('memories').select('*').eq('id',saved.data.id).single();assert.equal(shared.error,null);
      const signed=await b.db.storage.from('memories').createSignedUrl(path,60);assert.equal(signed.error,null);
      const response=await fetch(signed.data.signedUrl);assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,png.length);
      const denied=await outsider.db.storage.from('memories').createSignedUrl(path,60);assert.ok(denied.error);
      const anonymous=await anon().storage.from('memories').download(path);assert.ok(anonymous.error);
      const spoof=await b.db.storage.from('memories').upload(`${coupleId}/${a.id}/forged.png`,png,{contentType:'image/png'});assert.ok(spoof.error);
      const hidden=await outsider.db.from('memories').select('*');assert.deepEqual(hidden.data,[]);
    } finally { await a.db.storage.from('memories').remove([path]); }
  });
  await t.test('mood check-ins persist once per local day and reward counts respect RLS', async () => {
    const today=new Date().toISOString().slice(0,10);
    let response=await a.db.rpc('record_mood',{checkin_mood:'Happy',checkin_day:today});assert.equal(response.error,null);
    response=await a.db.rpc('record_mood',{checkin_mood:'Calm',checkin_day:today});assert.equal(response.error,null);
    const rows=await b.db.from('mood_checkins').select('*');assert.equal(rows.error,null);assert.equal(rows.data.length,1);assert.equal(rows.data[0].mood,'Calm');
    const hidden=await outsider.db.from('mood_checkins').select('*');assert.deepEqual(hidden.data,[]);
    const stats=await outsider.db.rpc('get_couple_stats');assert.equal(stats.error,null);assert.deepEqual(stats.data,{messages:0,memories:0,events:0,checkins:0});
  });
  await t.test('cycle sharing is explicit, private by default, and revocable', async () => {
    const own={author_id:a.id,last_period:'2026-11-01',cycle_length:28,period_length:5};
    const saved=await a.db.from('cycle_settings').insert(own);assert.equal(saved.error,null);
    let partner=await b.db.from('cycle_settings').select('*');assert.deepEqual(partner.data,[]);
    const share=await a.db.from('cycle_settings').update({share_with_partner:true}).eq('author_id',a.id);assert.equal(share.error,null);
    partner=await b.db.from('cycle_settings').select('*');assert.equal(partner.data.length,1);
    const hidden=await outsider.db.from('cycle_settings').select('*');assert.deepEqual(hidden.data,[]);
    await b.db.from('cycle_settings').update({cycle_length:35}).eq('author_id',a.id);
    const unchanged=await a.db.from('cycle_settings').select('*').single();assert.equal(unchanged.data.cycle_length,28);
    await a.db.from('cycle_settings').update({share_with_partner:false}).eq('author_id',a.id);
    partner=await b.db.from('cycle_settings').select('*');assert.deepEqual(partner.data,[]);
  });
  await t.test('FCM device tokens and worker jobs are inaccessible to clients', async () => {
    const token='local-test-token-'+crypto.randomUUID();
    const registered=await b.db.rpc('register_device_token',{device_token:token,device_platform:'web'});assert.equal(registered.error,null);
    const forbidden=await a.db.rpc('claim_notification_jobs');assert.ok(forbidden.error);
    const jobs=await admin.rpc('claim_notification_jobs');assert.equal(jobs.error,null);
    assert.ok(jobs.data.some(job=>job.tokens.includes(token)));
    assert.ok(jobs.data.every(job=>['/chat','/calendar','/memories'].includes(job.route)));
    for(const job of jobs.data) {
      const bad=await outsider.db.rpc('finish_notification_job',{job_id:job.id,succeeded:true});assert.ok(bad.error);
      const done=await admin.rpc('finish_notification_job',{job_id:job.id,succeeded:false});assert.equal(done.error,null);
    }
    const remove=await b.db.rpc('remove_device_token',{device_token:token});assert.equal(remove.error,null);
    const anonymous=await anon().rpc('register_device_token',{device_token:token,device_platform:'web'});assert.ok(anonymous.error);
  });
  await t.test('concurrent acceptors cannot consume the same invitation twice', async () => {
    const owner = await account(), one = await account(), two = await account();
    await Promise.all([complete(owner),complete(one),complete(two)]);
    const inv = await rpc(owner, 'create_partner_invite');
    const results = await Promise.all([rpc(one, 'accept_partner_invite', {invite_code:inv.code}),rpc(two, 'accept_partner_invite', {invite_code:inv.code})]);
    assert.equal(results.filter(r=>r.couple_id).length,1);
    assert.equal(results.filter(r=>r.error).length,1);
  });
});
