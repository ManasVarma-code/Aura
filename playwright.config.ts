import { defineConfig } from '@playwright/test';
import { localSupabase } from './tests/support/localSupabase';
const backend = process.env.AURA_TEST_SUPABASE === '1' ? localSupabase() : null;
export default defineConfig({
  testDir: './tests/e2e',
  projects: [{name:'desktop'},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
  use: { baseURL: 'http://127.0.0.1:3000', launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.env.HTTP_PROXY ? [`--proxy-server=${process.env.HTTP_PROXY}`, '--proxy-bypass-list=127.0.0.1;localhost'] : [])] } },
  webServer: { command: process.env.AURA_E2E_PREVIEW === '1' ? 'npm run preview -- --host 127.0.0.1 --port 3000 --strictPort' : 'npm run dev -- --host 127.0.0.1 --strictPort', env: backend ? { ...process.env, VITE_SUPABASE_URL:backend.url, VITE_SUPABASE_PUBLISHABLE_KEY:backend.key } : { ...process.env, VITE_SUPABASE_URL:'', VITE_SUPABASE_PUBLISHABLE_KEY:'', VITE_SUPABASE_ANON_KEY:'' }, url: 'http://127.0.0.1:3000', reuseExistingServer: false },
});
