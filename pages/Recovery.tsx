import React, { useState } from 'react';
import { requireSupabase } from '../services/supabase';
import { errorMessage } from '../services/accountService';
export default function Recovery({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <main className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-6">
    <form className="bg-white p-8 rounded-3xl space-y-6 max-w-md w-full" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try { const { error } = await requireSupabase().auth.updateUser({ password }); if (error) throw error; onComplete(); }
      catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
    }}>
      <h1 className="text-2xl font-bold text-pink-600">Choose a new password</h1>
      <input aria-label="New password" autoComplete="new-password" type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50" />
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} className="bg-pink-500 text-white p-4 rounded-2xl w-full">{busy ? 'Saving…' : 'Save Password'}</button>
    </form>
  </main>;
}
