
import React, { useState } from 'react';
import { createInvite, errorMessage } from '../services/accountService';
import { useAccount } from '../contexts/AccountContext';
import { User } from '../types';
import { Heart, Copy, Link as LinkIcon, Sparkles, ChevronLeft } from 'lucide-react';

interface LinkPartnerProps {
  user: User;
  onLink: (partnerCode: string) => Promise<void>;
  onBack: () => void;
}

const LinkPartner: React.FC<LinkPartnerProps> = ({ user, onLink, onBack }) => {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState<{code: string; expires_at: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signOut } = useAccount();
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  const handleCopy = () => run(async () => {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
  const handleLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^[0-9a-f]{24}$/i.test(code.trim())) void run(() => onLink(code));
  };

  return (
    <div className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <button onClick={onBack} className="text-gray-400 hover:text-pink-400 transition-colors flex items-center gap-1 font-bold text-sm">
          <ChevronLeft size={20} /> Back
        </button>

        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-gray-800">Connect Hearts</h2>
          <p className="text-gray-500">Enter your partner's code to create your private ecosystem.</p>
        </div>

        {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
        <div className="space-y-6">
          {/* My Code Section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center block">Your Private Invitation</span>
            <div className="flex items-center justify-between bg-pink-50 p-6 rounded-2xl border-2 border-dashed border-pink-200">
              <span data-testid="invite-code" className="text-sm sm:text-lg font-bold text-pink-500 break-all">{invite?.code || 'Create a private code'}</span>
              <button 
                disabled={!invite || busy} aria-label="Copy invitation" onClick={handleCopy}
                className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white text-pink-400 shadow-sm'}`}
              >
                {copied ? <Sparkles size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-wide">Share only with {user.partnerNickname}</p>
            <button disabled={busy} onClick={() => void run(async () => { setInvite(await createInvite()); setCopied(false); })} className="w-full text-pink-500 font-bold text-sm">{invite ? 'Replace Invitation' : 'Create Invitation'}</button>
            {invite && <p className="text-center text-xs text-gray-400">Expires {new Date(invite.expires_at).toLocaleString()}. A replacement revokes the previous code.</p>}
          </div>

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-gray-100"></div>
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-400">
               <LinkIcon size={18} />
            </div>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          {/* Partner Code Input */}
          <form onSubmit={handleLink} className="space-y-4">
            <div className="bg-white p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-6">
              <input 
                type="text" 
                aria-label="Partner invitation code" maxLength={24}
                placeholder="Partner's private code"
                className="w-full p-5 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-pink-200 border border-gray-100 text-center text-sm font-bold text-gray-700"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
              />
              <button 
                type="submit"
                disabled={busy || !/^[0-9a-f]{24}$/i.test(code.trim())}
                className="w-full py-5 bg-pink-500 text-white font-bold rounded-2xl shadow-xl shadow-pink-100 flex items-center justify-center gap-2 hover:bg-pink-600 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
              >
                Link with {user.partnerNickname} <Heart size={18} fill="currentColor" />
              </button>
            </div>
          </form>
        </div>

        <button disabled={busy} onClick={() => void run(signOut)} className="text-sm text-pink-500 font-bold w-full">Sign Out</button>
        <div className="p-6 bg-white/50 rounded-3xl border border-pink-50 text-center space-y-2">
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            "Aura is designed to bring you closer, even when you're apart."
          </p>
        </div>
      </div>
    </div>
  );
};

export default LinkPartner;
