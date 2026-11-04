import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { localSupabase } from '../support/localSupabase';

test.use({offline:false,colorScheme:'dark'});
test.beforeEach(()=>{test.skip(process.env.AURA_TEST_SUPABASE!=='1','Connected authentication checks require isolated local Supabase.');});

async function openPreview(page: import('@playwright/test').Page) {
  const local=localSupabase();
  const html=await readFile('preview/Aura-connected.html','utf8');
  expect(html.includes(local.url)).toBe(true);
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;color:white;color-scheme:dark}iframe{display:block;width:100%;height:100vh;border:0}</style><iframe id="preview" sandbox="allow-scripts"></iframe>');
  await page.locator('#preview').evaluate((frame:HTMLIFrameElement,source)=>{frame.srcdoc=source;},html);
  const surface=page.frameLocator('#preview');
  await expect(surface.getByRole('heading',{name:'Aura',exact:true})).toBeVisible();
  return {local,surface};
}

test('connected preview authenticates a real local user and signs out without browser storage',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const {local,surface}=await openPreview(page);
  const password='Embedded-test-only-8!';
  const email=`embedded-${crypto.randomUUID()}@example.com`;
  const {data,error}=await local.admin.auth.admin.createUser({email,password,email_confirm:true});
  expect(error).toBeNull();
  try {
    const storageBlocked=await surface.locator('body').evaluate(()=>{try{window.localStorage;return false;}catch{return true;}});
    expect(storageBlocked).toBe(true);
    await expect(surface.getByRole('button',{name:'Sign In',exact:true})).toBeEnabled();
    await surface.getByLabel('Email Address').fill(email);
    await expect(surface.getByLabel('Email Address')).toHaveCSS('color','rgb(55, 65, 81)');
    await surface.getByLabel('Password',{exact:true}).fill(password);
    await expect(surface.getByLabel('Password',{exact:true})).toHaveCSS('color','rgb(55, 65, 81)');
    await surface.getByRole('button',{name:'Sign In',exact:true}).click();
    await expect(surface.getByRole('heading',{name:'Tell us about you'})).toBeVisible();
    await surface.getByRole('button',{name:'Other',exact:true}).click();
    await surface.getByRole('button',{name:'Continue',exact:true}).click();
    await surface.getByLabel('Partner nickname').fill('Honey');
    await surface.getByRole('button',{name:'Finish Setup'}).click();
    await expect(surface.getByRole('heading',{name:'Connect Hearts'})).toBeVisible();
    await surface.getByRole('button',{name:'Sign Out',exact:true}).click();
    await expect(surface.getByRole('button',{name:'Sign In',exact:true})).toBeEnabled();
    expect(errors).toEqual([]);
    await page.screenshot({path:test.info().outputPath('connected-signin.png'),fullPage:true});
  } finally {if(data.user)await local.admin.auth.admin.deleteUser(data.user.id);}
});

test('missing database tables block account creation and can be rechecked',async({page})=>{
  let missing=true,signups=0;
  page.on('request',request=>{if(request.url().includes('/auth/v1/signup')&&request.method()==='POST')signups++;});
  await page.route('**/rest/v1/rpc/aura_connection_status*',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},json:!missing}));
  const {surface}=await openPreview(page);
  await expect(surface.getByText('Aura’s database setup is still pending.',{exact:false})).toBeVisible();
  await expect(surface.getByRole('button',{name:'Sign In',exact:true})).toBeDisabled();
  await surface.getByRole('button',{name:'Create an Account',exact:true}).click();
  await expect(surface.getByRole('button',{name:'Create Account',exact:true})).toBeDisabled();
  expect(signups).toBe(0);
  missing=false;
  await surface.getByRole('button',{name:'Check Again',exact:true}).click();
  await expect(surface.getByRole('button',{name:'Create Account',exact:true})).toBeEnabled();
});

test('account creation submits once with Enter inside a storage-blocked viewer',async({page})=>{
  const {local,surface}=await openPreview(page);
  let id:string|undefined,requests=0;
  page.on('request',request=>{if(request.url().includes('/auth/v1/signup')&&request.method()==='POST')requests++;});
  const response=page.waitForResponse(response=>response.url().includes('/auth/v1/signup')&&response.request().method()==='POST');
  try {
    await expect(surface.getByRole('button',{name:'Sign In',exact:true})).toBeEnabled();
    await surface.getByRole('button',{name:'Create an Account',exact:true}).click();
    await surface.getByLabel('Email Address').fill(`embedded-signup-${crypto.randomUUID()}@example.com`);
    await surface.getByLabel('Password',{exact:true}).fill('Embedded-signup-only-8!');
    await surface.getByLabel('Password',{exact:true}).press('Enter');
    const result=await response;const payload=await result.json();id=payload.user?.id||payload.id;
    expect(result.ok()).toBe(true);expect(!!id).toBe(true);
    await expect(surface.getByRole('heading',{name:'Tell us about you'})).toBeVisible();
    expect(requests).toBe(1);
  } finally {if(id)await local.admin.auth.admin.deleteUser(id);}
});

test('linked partners can chat and save a memory inside isolated viewer frames',async({page})=>{
  const {local,surface:a}=await openPreview(page);
  const other=await page.context().newPage();
  const {surface:b}=await openPreview(other);
  const ids:string[]=[],emails:string[]=[];let coupleId:string|undefined;
  const password='Embedded-partners-only-8!';
  try {
    for(let i=0;i<2;i++){
      const email=`embedded-partner-${crypto.randomUUID()}@example.com`;
      const {data,error}=await local.admin.auth.admin.createUser({email,password,email_confirm:true});
      expect(error).toBeNull();ids.push(data.user!.id);emails.push(email);
      const saved=await local.admin.from('profiles').update({gender:'Other',partner_nickname:'Honey'}).eq('id',data.user!.id);expect(saved.error).toBeNull();
    }
    const created=await local.admin.from('couples').insert({}).select('id').single();expect(created.error).toBeNull();coupleId=created.data!.id;
    const members=await local.admin.from('couple_members').insert(ids.map((id,i)=>({profile_id:id,couple_id:coupleId,slot:i+1})));expect(members.error).toBeNull();
    for(const [i,surface] of [a,b].entries()){
      await expect(surface.getByRole('button',{name:'Sign In',exact:true})).toBeEnabled();
      await surface.getByLabel('Email Address').fill(emails[i]);await surface.getByLabel('Password',{exact:true}).fill(password);
      await surface.getByRole('button',{name:'Sign In',exact:true}).click();
      await expect(surface.getByText('Your private sanctuary')).toBeVisible();
      await surface.getByRole('link',{name:'Chat',exact:true}).click();
      await expect(surface.getByText('Connected',{exact:true})).toBeVisible();
    }
    await a.getByLabel('Message',{exact:true}).fill('A real message from the connected viewer');
    await a.getByRole('button',{name:'Send message'}).click();
    await expect(b.getByText('A real message from the connected viewer')).toBeVisible();
    for(const surface of [a,b])await surface.getByRole('link',{name:'Wall',exact:true}).click();
    await a.getByRole('button',{name:'Add memory',exact:true}).click();
    await a.getByLabel('Memory title').fill('A viewer memory');
    await a.getByRole('button',{name:'Save Memory',exact:true}).click();
    await expect(b.getByRole('heading',{name:'A viewer memory'})).toBeVisible();
  } finally {
    if(coupleId)await local.admin.from('couples').delete().eq('id',coupleId);
    for(const id of ids)await local.admin.auth.admin.deleteUser(id);
    await other.close();
  }
});

test('CSP-blocked external connections explain the viewer restriction',async({page})=>{
  const local=localSupabase();const html=await readFile('preview/Aura-connected.html','utf8');
  expect(html.includes(local.url)).toBe(true);
  await page.setContent('<iframe id="preview" sandbox="allow-scripts"></iframe>');
  const restricted=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="connect-src \'none\'">');
  await page.locator('#preview').evaluate((frame:HTMLIFrameElement,source)=>{frame.srcdoc=source;},restricted);
  const surface=page.frameLocator('#preview');
  await expect(surface.getByText('This viewer is blocking connections to Supabase.',{exact:false})).toBeVisible();
  await expect(surface.getByRole('button',{name:'Sign In',exact:true})).toBeDisabled();
});

test('readiness works without AbortSignal.timeout in an embedded runtime',async({page})=>{
  const html=await readFile('preview/Aura-connected.html','utf8');
  await page.setContent('<iframe id="preview" sandbox="allow-scripts"></iframe>');
  const legacy=html.replace('<script>','<script>Object.defineProperty(AbortSignal,"timeout",{value:undefined,configurable:true});');
  await page.locator('#preview').evaluate((frame:HTMLIFrameElement,source)=>{frame.srcdoc=source;},legacy);
  await expect(page.frameLocator('#preview').getByRole('button',{name:'Sign In',exact:true})).toBeEnabled();
});

test('blocked sign-in requests show browser-opening guidance',async({page})=>{
  await page.route('**/auth/v1/token*',route=>route.abort('failed'));
  const {surface}=await openPreview(page);
  await expect(surface.getByRole('button',{name:'Sign In',exact:true})).toBeEnabled();
  await surface.getByLabel('Email Address').fill('connection-check@example.test');await surface.getByLabel('Password',{exact:true}).fill('Test-only-not-a-real-password');
  await surface.getByRole('button',{name:'Sign In',exact:true}).click();
  await expect(surface.getByRole('alert')).toContainText('Download this HTML');
});
