import { Capacitor } from '@capacitor/core';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, requireSupabase } from '../services/supabase';
import { errorMessage, loadAccount } from '../services/accountService';
import { disableNotifications } from '../services/notificationService';
import type { User } from '../types';

const AccountContext = createContext<{
  user: User | null; loading: boolean; error: string; recovering: boolean;
  reload: () => void; signOut: () => Promise<void>; finishRecovery: () => void;
}>(null!);
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => { setError(''); setRevision(v => v + 1); }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let observed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      observed = true;
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') { setUser(null); setRecovering(false); setError(''); }
    });
    supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!active || observed) return;
      setSession(data.session);
      if (authError) setError(errorMessage(authError));
    }).catch(() => { if (active && !observed) { setSession(null); setError('Could not restore your session. Please sign in again.'); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !supabase) return;
    let active = true;
    let remove: (()=>Promise<void>) | undefined;
    const handle = async (url:string) => {
      const callback = new URL(url);
      if (callback.protocol !== 'com.aura.couples:' || callback.hostname !== 'auth' || callback.pathname !== '/callback') return;
      const code = callback.searchParams.get('code');
      if (!code) return;
      const { error } = await supabase!.auth.exchangeCodeForSession(code);
      if (error && active) setError('Could not finish sign-in. Please try again.');
      const { Browser } = await import('@capacitor/browser'); await Browser.close().catch(()=>{});
    };
    void import('@capacitor/app').then(async ({ App }) => {
      const listener = await App.addListener('appUrlOpen', event=>void handle(event.url));
      if (!active) { await listener.remove(); return; }
      remove = () => listener.remove();
      const launch = await App.getLaunchUrl(); if (launch?.url) await handle(launch.url);
    });
    return () => { active=false; void remove?.(); };
  }, []);
  const id = session?.user.id;
  const email = session?.user.email;
  useEffect(() => {
    if (!id) { setUser(null); return; }
    let active = true;
    loadAccount(id, email).then(account => { if (active) { setUser(account); setError(''); } })
      .catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [id, email, revision]);
  const currentUser = user?.id === id ? user : null;
  useEffect(() => {
    if (!currentUser || currentUser.linked) return;
    const timer = window.setInterval(reload, 10000);
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [currentUser?.id, currentUser?.linked, reload]);
  return <AccountContext.Provider value={{
    user: currentUser, loading: session === undefined || (!!session && !currentUser && !error), error, recovering,
    reload, finishRecovery: () => setRecovering(false),
    signOut: async () => { await disableNotifications(); const { error } = await requireSupabase().auth.signOut(); if (error) throw error; },
  }}>{children}</AccountContext.Provider>;
}
