import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const artifact=path.resolve('preview/Aura.html');
for (const mode of ['document','sandbox'] as const) {
  test(`standalone Aura renders offline in ${mode} mode`,async({page})=>{
    const errors:string[]=[];
    const requests:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
    const html=await readFile(artifact,'utf8');
    const credentialPresent=!!process.env.GEMINI_API_KEY && html.includes(process.env.GEMINI_API_KEY);
    expect(credentialPresent).toBe(false);
    if(mode==='document')await page.setContent(html);
    else {
      // An opaque-origin frame cannot access localStorage or load adjacent files.
      await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}iframe{display:block;width:100%;height:100vh;border:0}</style><iframe id="preview" sandbox="allow-scripts"></iframe>');
      await page.locator('#preview').evaluate((frame:HTMLIFrameElement,source)=>{frame.srcdoc=source;},html);
    }
    const surface=mode==='document' ? page : page.frameLocator('#preview');
    await expect.poll(()=>errors.length).toBe(0);
    await expect(surface.getByRole('heading',{name:'Aura',exact:true})).toBeVisible();
    await expect(surface.getByRole('button',{name:'Sign In',exact:true})).toBeVisible();
    await expect(surface.locator('#root')).not.toBeEmpty();
    await expect(surface.locator('body')).toHaveCSS('background-color','rgb(255, 253, 240)');
    await expect(surface.locator('script[src],link[rel="stylesheet"][href]')).toHaveCount(0);
    await surface.getByRole('button',{name:'Create an Account',exact:true}).click();
    await expect(surface.getByRole('button',{name:'Create Account',exact:true})).toBeVisible();
    if(mode==='sandbox'){
      const opaque=await surface.locator('body').evaluate(()=>{try{window.localStorage;return false;}catch{return true;}});
      expect(opaque).toBe(true);
    }
    await page.screenshot({path:test.info().outputPath(`aura-${mode}.png`),fullPage:true});
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
  });
}
