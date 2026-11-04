import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from '../contexts/AccountContext';
import { enableNotifications, disableNotifications } from '../services/notificationService';
import { errorMessage } from '../services/accountService';
export default function Settings() {
  const { user, signOut } = useAccount();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  return <main className="min-h-screen bg-[#FFFDF0] max-w-2xl mx-auto p-6 pb-32 space-y-6">
    <Link to="/" className="text-pink-500">Back to Aura</Link>
    <h1 className="text-3xl font-bold text-pink-600">Settings</h1>
    <div className="bg-white p-6 rounded-3xl space-y-4">
      <p>{user?.email}</p><p>Linked with {user?.partnerNickname}</p>
      <h2 className="font-bold text-pink-600">Push notifications</h2>
      <p className="text-sm text-gray-500">Choose whether this device receives gentle reminders. Message content stays out of push notifications.</p>
      {notice && <p role="status" className="text-sm text-pink-600">{notice}</p>}
      <div className="flex gap-4">
        <button disabled={busy} className="text-pink-600 font-bold text-sm" onClick={async()=>{setBusy(true);setError('');try{await enableNotifications();setNotice('Notifications enabled on this device.');}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}}>Enable Notifications</button>
        <button disabled={busy} className="text-gray-500 font-bold text-sm" onClick={async()=>{setBusy(true);setError('');try{await disableNotifications();setNotice('Notifications disabled on this device.');}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}}>Disable Notifications</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} onClick={async () => {
        setBusy(true); setError(''); try { await signOut(); } catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
      }} className="bg-pink-500 text-white p-4 rounded-2xl">{busy ? 'Signing out…' : 'Sign Out'}</button>
    </div>
  </main>;
}
