import { Capacitor } from '@capacitor/core';
import { Gender, User } from '../types';
import { requireSupabase } from './supabase';

export async function loadAccount(id: string, email = ''): Promise<User> {
  const db = requireSupabase();
  const { data: profile, error } = await db.from('profiles').select('id,name,gender,partner_nickname').eq('id', id).single();
  if (error) throw error;
  const { data: membership, error: membershipError } = await db.from('couple_members').select('couple_id').eq('profile_id', id).maybeSingle();
  if (membershipError) throw membershipError;
  return { id, email, name: profile.name, gender: profile.gender, partnerNickname: profile.partner_nickname,
    linked: !!membership, coupleId: membership?.couple_id, coupleCode: '' };
}
export async function saveProfile(id: string, gender: Gender, nickname: string) {
  const { error } = await requireSupabase().from('profiles').update({ gender, partner_nickname: nickname.trim() }).eq('id', id);
  if (error) throw error;
}
export async function createInvite(): Promise<{ code: string; expires_at: string }> {
  const { data, error } = await requireSupabase().rpc('create_partner_invite');
  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data;
}
export async function acceptInvite(code: string) {
  const { data, error } = await requireSupabase().rpc('accept_partner_invite', { invite_code: code.trim().toLowerCase() });
  if (error) throw error;
  if (data.error) throw new Error(data.error);
}
export const authRedirect = () => {
  if (Capacitor.isNativePlatform()) return 'com.aura.couples://auth/callback';
  return /^https?:$/.test(window.location.protocol) && window.location.origin !== 'null'
    ? window.location.origin + window.location.pathname : undefined;
};
export type ConnectionIssue = 'blocked' | 'network' | 'timeout' | 'configuration';
export class AuraConnectionError extends Error {
  constructor(public readonly reason: ConnectionIssue) {
    super('Could not check the Aura connection.');
  }
}
export async function checkDatabaseReady(): Promise<'ready' | 'missing'> {
  const db = requireSupabase();
  let blocked = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const origin = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
  let rejectBlocked: ((error: AuraConnectionError) => void) | undefined;
  const policyBlocked = new Promise<never>((_resolve, reject) => { rejectBlocked = reject; });
  const onPolicyViolation = (event: SecurityPolicyViolationEvent) => {
    if (event.effectiveDirective !== 'connect-src') return;
    try { if (new URL(event.blockedURI).origin === origin) { blocked = true; rejectBlocked?.(new AuraConnectionError('blocked')); } } catch { /* Non-URL directives are unrelated. */ }
  };
  document.addEventListener('securitypolicyviolation', onPolicyViolation);
  // Avoid AbortSignal.timeout: some embedded runtimes do not provide it.
  const timedOut = new Promise<never>((_, reject) => {
    deadline = setTimeout(() => reject(new AuraConnectionError('timeout')), 10000);
  });
  const inspect = async (): Promise<'ready' | 'missing'> => {
    const health = await db.rpc('aura_connection_status', {}, { get:true }).retry(false);
    if (!health.error && typeof health.data === 'boolean') return health.data ? 'ready' : 'missing';
    // Compatibility for a backend that has the original schema but not the health RPC.
    if (health.status === 404 || health.error?.code === 'PGRST202') {
      const legacy = await db.from('profiles').select('id').limit(0).retry(false);
      if (!legacy.error || legacy.error.code === '42501') return 'ready';
      if (legacy.status === 404 || legacy.error.code === 'PGRST205') return 'missing';
      if (legacy.status === 401 || legacy.status === 403) throw new AuraConnectionError('configuration');
    } else if (health.status === 401 || health.status === 403) {
      throw new AuraConnectionError('configuration');
    }
    // CSP violation events may be dispatched after fetch rejects.
    await new Promise(resolve => setTimeout(resolve, 0));
    throw new AuraConnectionError(blocked ? 'blocked' : 'network');
  };
  try { return await Promise.race([inspect(), timedOut, policyBlocked]); }
  finally { clearTimeout(deadline); document.removeEventListener('securitypolicyviolation', onPolicyViolation); }
}
export function connectionErrorText(reason: ConnectionIssue): string {
  if (reason === 'blocked') return 'This viewer is blocking connections to Supabase. Download this HTML and open it in a browser where network access is allowed.';
  if (reason === 'configuration') return 'Supabase rejected this connection. Open the latest connected Aura file and try again.';
  if (import.meta.env.VITE_AURA_PREVIEW) return 'This embedded preview could not reach Supabase. Download this HTML and open it in a browser where network access is allowed.';
  return reason === 'timeout' ? 'The connection check timed out. Please try again.' : 'Could not reach Aura. Check your connection and try again.';
}
export function errorMessage(error: unknown): string {
  if (error instanceof AuraConnectionError) return connectionErrorText(error.reason);
  if (import.meta.env.VITE_AURA_PREVIEW && error instanceof Error && /fetch|network/i.test(error.message)) return connectionErrorText('network');
  return error instanceof Error ? error.message : 'Could not complete the request. Please try again.';
}
