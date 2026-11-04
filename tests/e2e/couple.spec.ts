import { test, expect, type Page } from '@playwright/test';
import { localSupabase } from '../support/localSupabase';

test('real sign-in, profile setup, private linking, chat, calendar and memories', async ({ browser }) => {
  test.skip(process.env.AURA_TEST_SUPABASE !== '1', 'Requires the isolated local Supabase stack.');
  test.setTimeout(90000);
  const local = localSupabase();
  const password = 'Browser-test-only-8!';
  const users: string[] = [];
  const one = await browser.newContext(), two = await browser.newContext();
  const a = await one.newPage(), b = await two.newPage();
  const errors: string[] = [];
  for (const page of [a,b]) {
    page.on('pageerror', error=>errors.push(error.message));
    // AI responses are outside these backend/UI checks; avoid consuming live API quota.
    await page.route('https://generativelanguage.googleapis.com/**', route=>route.fulfill({json:{candidates:[{content:{parts:[{text:'[]'}]}}]}}));
  }
  const today=new Date().toISOString().slice(0,10);
  async function signInAndSetup(page: Page) {
    const email = `browser-${crypto.randomUUID()}@example.com`;
    const {data,error} = await local.admin.auth.admin.createUser({email,password,email_confirm:true});
    expect(error).toBeNull(); users.push(data.user!.id);
    await page.goto('/');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Tell us about you'})).toBeVisible();
    await page.getByRole('button',{name:'Other',exact:true}).click();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByLabel('Partner nickname').fill('Honey');
    await page.getByRole('button',{name:'Finish Setup'}).click();
    await expect(page.getByRole('heading',{name:'Connect Hearts'})).toBeVisible();
  }
  try {
    await signInAndSetup(a); await signInAndSetup(b);
    await a.getByRole('button',{name:'Create Invitation',exact:true}).click();
    await expect(a.getByTestId('invite-code')).toHaveText(/^[a-f0-9]{24}$/);
    await b.getByLabel('Partner invitation code').fill((await a.getByTestId('invite-code').textContent())!);
    await b.getByRole('button',{name:'Link with Honey'}).click();
    await expect(b.getByText('Your private sanctuary')).toBeVisible();
    await a.reload(); await expect(a.getByText('Your private sanctuary')).toBeVisible();
    for (const page of [a,b]) await page.getByRole('link',{name:'Chat',exact:true}).click();
    for(const page of [a,b]) await expect(page.getByText('Connected',{exact:true})).toBeVisible();
    await a.getByLabel('Message',{exact:true}).fill('A real message across two browser sessions');
    await a.getByRole('button',{name:'Send message'}).click();
    await expect(b.getByText('A real message across two browser sessions')).toBeVisible();
    await b.reload(); await expect(b.getByText('A real message across two browser sessions')).toBeVisible();
    const membership=await local.admin.from('couple_members').select('couple_id').eq('profile_id',users[0]).single();
    expect(membership.error).toBeNull();
    const bulk=await local.admin.from('messages').insert(Array.from({length:101},(_,i)=>({couple_id:membership.data!.couple_id,author_id:users[0],body:`History entry ${i}`})));
    expect(bulk.error).toBeNull();
    await b.reload();
    await b.getByRole('button',{name:'Load earlier messages',exact:true}).click();
    await expect(b.getByText('A real message across two browser sessions')).toBeVisible();
    await a.getByRole('link',{name:'Calendar',exact:true}).click();
    await a.getByRole('button',{name:'Add event',exact:true}).click();
    await a.getByLabel('Event title').fill('Our shared dinner');
    await a.getByLabel('Event date').fill(today);
    await a.getByRole('button',{name:'Save Event',exact:true}).click();
    await expect(a.getByRole('dialog')).toHaveCount(0);
    await b.getByRole('link',{name:'Calendar',exact:true}).click();
    await b.getByRole('button',{name:today,exact:true}).click();
    await expect(b.getByRole('heading',{name:'Our shared dinner'})).toBeVisible();
    await b.getByRole('button',{name:'Close',exact:true}).click();
    for (const page of [a,b]) await page.getByRole('link',{name:'Wall',exact:true}).click();
    await a.getByRole('button',{name:'Add memory',exact:true}).click();
    await a.getByLabel('Memory title').fill('Our first real memory');
    await a.getByLabel('Memory content').fill('Saved securely for the two of us.');
    await a.getByRole('button',{name:'Save Memory',exact:true}).click();
    await expect(a.getByRole('dialog')).toHaveCount(0);
    await expect(b.getByRole('heading',{name:'Our first real memory'})).toBeVisible();
    await b.reload(); await expect(b.getByText('Saved securely for the two of us.')).toBeVisible();
    await a.getByRole('button',{name:'Add memory',exact:true}).click();
    await a.getByLabel('Memory title').fill('Our private photo');
    await a.getByLabel('Memory photo').setInputFiles({name:'memory.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8S8AAAAASUVORK5CYII=','base64')});
    await a.getByRole('button',{name:'Save Memory',exact:true}).click();
    await expect(b.getByRole('img',{name:'Our private photo'})).toBeVisible();
    await expect.poll(()=>b.getByRole('img',{name:'Our private photo'}).evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(1);
    await b.goto('/#/');
    await b.getByRole('button',{name:'Happy',exact:true}).click();
    await b.reload(); await expect(b.getByRole('button',{name:'Happy',exact:true})).toHaveAttribute('aria-pressed','true');
    await b.getByRole('button',{name:'Cycle Tracker',exact:true}).click();
    await b.getByRole('button',{name:'Log Cycle',exact:true}).click();
    await b.getByRole('button',{name:'Save Cycle',exact:true}).click();
    await b.reload(); await expect(b.getByRole('heading',{name:'Day 1',exact:true})).toBeVisible();
    await b.goto('/#/unknown-route'); await expect(b.getByText('Your private sanctuary')).toBeVisible();
    await b.goto('/#/settings'); await b.getByRole('button',{name:'Sign Out',exact:true}).click();
    await expect(b.getByRole('button',{name:'Sign In',exact:true})).toBeVisible();
    await b.reload(); await expect(b.getByRole('button',{name:'Sign In',exact:true})).toBeVisible();
    expect(errors).toEqual([]);
    await a.screenshot({path:test.info().outputPath('aura-memory-wall.png'),fullPage:true});
  } finally {
    const memberships=await local.admin.from('couple_members').select('couple_id').in('profile_id',users);
    for (const id of new Set(memberships.data?.map(m=>m.couple_id))) {
      const photos=await local.admin.from('memories').select('image_path').eq('couple_id',id).not('image_path','is',null);
      if(photos.data?.length)await local.admin.storage.from('memories').remove(photos.data.map(row=>row.image_path));
      await local.admin.from('couples').delete().eq('id',id);
    }
    for (const id of users) await local.admin.auth.admin.deleteUser(id);
    await one.close(); await two.close();
  }
});
