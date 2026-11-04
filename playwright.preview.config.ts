import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/preview',
  projects:[{name:'desktop'},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
  use:{
    offline:true,
    launchOptions:{executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']},
  },
});
