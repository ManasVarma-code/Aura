
import { Capacitor } from '@capacitor/core';
import React, { useState, useEffect } from 'react';
import { Heart, Mail, Lock, Chrome } from 'lucide-react';
import { supabase, requireSupabase, persistAuthSession } from '../services/supabase';
import { authRedirect, errorMessage, checkDatabaseReady, AuraConnectionError, ConnectionIssue, connectionErrorText } from '../services/accountService';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [databaseState,setDatabaseState] = useState<'checking'|'ready'|'missing'|'unavailable'>(supabase ? 'checking' : 'unavailable');
  const [revision,setRevision] = useState(0);
  const [connectionIssue,setConnectionIssue] = useState<ConnectionIssue>('network');
  useEffect(()=>{
    if (!supabase) return;
    let active=true;setDatabaseState('checking');
    checkDatabaseReady().then(state=>{if(active)setDatabaseState(state);}).catch(error=>{if(active){setConnectionIssue(error instanceof AuraConnectionError ? error.reason : 'network');setDatabaseState('unavailable');}});
    return()=>{active=false;};
  },[revision]);
  const connectionMessage = connectionErrorText(connectionIssue);
  const accountUnavailable = busy || !supabase || databaseState !== 'ready';
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (await checkDatabaseReady() !== 'ready') { setDatabaseState('missing'); return; }
      const db = requireSupabase();
      if (mode === 'reset') {
        if (!authRedirect()) throw new Error('Open Aura in its own browser tab to reset your password.');
        const { error } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect() });
        if (error) throw error;
        setNotice('If an account exists, a password reset link is on its way.');
      } else if (mode === 'signup') {
        const { data, error } = await db.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirect() } });
        if (error) throw error;
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
      } else {
        const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    });
  };
  const googleSignIn = () => run(async () => {
    if (!authRedirect()) throw new Error('Open Aura in its own browser tab to use Google sign-in. You can sign in with email here.');
    const { data, error } = await requireSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirect(), skipBrowserRedirect: Capacitor.isNativePlatform() } });
    if (error) throw error;
    if (Capacitor.isNativePlatform() && data.url) { const { Browser } = await import('@capacitor/browser'); await Browser.open({url:data.url}); }
  });

  return (
    <div className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-pink-100 rounded-[2rem] flex items-center justify-center text-pink-500 mx-auto shadow-xl shadow-pink-100 animate-bounce">
            <Heart size={40} fill="currentColor" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Aura</h1>
          <p className="text-gray-500 font-medium">Step into your private sanctuary 🌸</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
          {!supabase && <p role="status" className="text-sm text-pink-600">Secure sign-in will be available once Aura’s backend is connected.</p>}
          {supabase && databaseState === 'checking' && <p role="status" className="text-sm text-gray-500">Connecting to Aura…</p>}
          {supabase && databaseState === 'missing' && <p role="status" className="text-sm text-pink-600">Aura’s database setup is still pending. Account access will be available once setup is complete.</p>}
          {supabase && databaseState === 'unavailable' && <p role="status" className="text-sm text-pink-600">{connectionMessage}</p>}
          {supabase && ['missing','unavailable'].includes(databaseState) && <button className="text-sm font-bold text-pink-600" onClick={()=>setRevision(v=>v+1)}>Check Again</button>}
          {supabase && !persistAuthSession && <p className="text-xs text-gray-500">Your session ends when this view reloads.</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {notice && <p role="status" className="text-sm text-pink-600">{notice}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" size={18} />
              <input 
                aria-label="Email Address" autoComplete="email" type="email"
                placeholder="Email Address" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 text-gray-700 placeholder:text-gray-400 rounded-2xl outline-none focus:ring-2 focus:ring-pink-200 border border-gray-100 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {mode !== 'reset' && <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" size={18} />
              <input 
                aria-label="Password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} type="password"
                placeholder="Password" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 text-gray-700 placeholder:text-gray-400 rounded-2xl outline-none focus:ring-2 focus:ring-pink-200 border border-gray-100 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            }
            <button disabled={accountUnavailable}
              type="submit" 
              className="w-full py-4 bg-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-100 hover:bg-pink-600 transition-all active:scale-95"
            >
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>
          <div className="flex justify-between gap-4 text-xs font-bold text-pink-500">
            <button disabled={busy} onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice(''); }}>{mode === 'signup' ? 'Already have an account? Sign In' : 'Create an Account'}</button>
            <button disabled={busy} onClick={() => { setMode(mode === 'reset' ? 'signin' : 'reset'); setError(''); setNotice(''); }}>{mode === 'reset' ? 'Back to Sign In' : 'Forgot Password?'}</button>
          </div>

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          <button 
            disabled={accountUnavailable} onClick={() => void googleSignIn()}
            className="w-full py-4 bg-white border border-gray-100 text-gray-600 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-95"
          >
            <Chrome size={20} className="text-pink-400" />
            Continue with Google
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 font-medium">
          Secure, encrypted, and private. <br />
          Always just for the two of you. 💖
        </p>
      </div>
    </div>
  );
};

export default Login;
