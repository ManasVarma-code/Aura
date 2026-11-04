import { build } from 'esbuild';
import { loadEnv } from 'vite';
import { assertPublicFrontendEnv } from '../config/browserEnv.ts';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import tailwindConfig from '../tailwind.config.js';
import { installPreviewFormSupport } from './preview-form-support.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const connected = process.argv.includes('--connected');
const browserEnv = { MODE:'preview', DEV:false, PROD:true, SSR:false, BASE_URL:'./', VITE_AURA_PREVIEW:true };
if (connected) {
  const configured = loadEnv('production', root, 'VITE_');
  assertPublicFrontendEnv(configured);
  const url = configured.VITE_SUPABASE_URL;
  const key = configured.VITE_SUPABASE_PUBLISHABLE_KEY || configured.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configure the Supabase URL and publishable key before exporting a connected preview.');
  if (!['http:','https:'].includes(new URL(url).protocol)) throw new Error('A connected preview requires an HTTP(S) Supabase URL.');
  Object.assign(browserEnv, { VITE_SUPABASE_URL:url, VITE_SUPABASE_PUBLISHABLE_KEY:key });
}
// Only the public Supabase URL/key are allowlisted. Gemini, server credentials,
// Firebase configuration and messaging workers never enter the portable export.
const result = await build({
  absWorkingDir: root,
  entryPoints: ['index.tsx'],
  bundle: true,
  write: false,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  outfile: 'preview.js',
  loader: { '.woff': 'dataurl', '.woff2': 'dataurl' },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.API_KEY': '""',
    'process.env.GEMINI_API_KEY': '""',
    'import.meta.env': JSON.stringify(browserEnv),
  },
  plugins: [{
    name: 'portable-preview-workers',
    setup(bundler) {
      bundler.onResolve({ filter:/\?worker&url$/ }, args => ({ path:args.path, namespace:'preview-worker' }));
      bundler.onLoad({ filter:/.*/, namespace:'preview-worker' }, () => ({ contents:'export default "";', loader:'js' }));
    },
  }],
});
const javascript = result.outputFiles.find(file => file.path.endsWith('.js'))?.text;
const styles = result.outputFiles.find(file => file.path.endsWith('.css'))?.text;
if (!javascript || !styles) throw new Error('The preview bundle is missing application code or styling.');
const css = await postcss([tailwindcss(tailwindConfig), autoprefixer()]).process(styles, { from:path.join(root,'preview.css') });
let html = await readFile(path.join(root,'index.html'),'utf8');
html = html.replace('<title>Aura - Couple Ecosystem</title>', connected ? '<title>Aura — connected preview</title>' : '<title>Aura — standalone UI preview</title>');
html = html.replace('</head>', () => `<style>${css.css.replace(/<\/style/gi,'<\\/style')}</style></head>`);
html = html.replace('<script type="module" src="/index.tsx"></script>', () => `<script>(${installPreviewFormSupport.toString()})();${javascript.replace(/<\/script/gi,'<\\/script')}</script>`);
// This is a check, not an instruction to export or change the configured key.
const configuredKey = process.env.GEMINI_API_KEY;
if (configuredKey && html.includes(configuredKey)) throw new Error('A configured credential unexpectedly appeared in the preview. Export aborted.');
const requested = process.argv.find(value => value.startsWith('--output='))?.slice('--output='.length);
if (requested && !/^[A-Za-z0-9][A-Za-z0-9._-]*\.html$/.test(requested)) throw new Error('Output must be an HTML filename, without directories.');
const filename = requested || (connected ? 'Aura-connected.html' : 'Aura.html');
const output = path.join(root,'preview',filename);
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,html);
console.log(`Created preview/${filename} with inline application code, styling and fonts${connected ? ' and public Supabase configuration' : ''}. No private keys are included.`);
