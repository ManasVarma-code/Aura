import { createClient } from '@supabase/supabase-js';

export const hasPersistentStorage = (() => {
  try {
    const probe = `aura-storage-check-${Math.random()}`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch { return false; }
})();

export const persistAuthSession = hasPersistentStorage && !import.meta.env.VITE_AURA_PREVIEW;

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
// Missing backend configuration must never silently enable simulated authentication.
function configuredClient() {
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { flowType: 'pkce', persistSession: persistAuthSession, autoRefreshToken: true, detectSessionInUrl: persistAuthSession } });
  } catch { return null; }
}
export const supabase = configuredClient();
export function requireSupabase() {
  if (!supabase) throw new Error('Aura’s secure sign-in is not configured yet. Please try again once setup is complete.');
  return supabase;
}
