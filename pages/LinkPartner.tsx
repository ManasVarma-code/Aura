
import React, { useState } from 'react';
import { User } from '../types';
import { Heart, Copy, Link as LinkIcon, Sparkles, ChevronLeft } from 'lucide-react';

interface LinkPartnerProps {
  user: User;
  onLink: (partnerCode: string) => void;
  onBack: () => void;
}

const LinkPartner: React.FC<LinkPartnerProps> = ({ user, onLink, onBack }) => {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(user.coupleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      onLink(code);
    }
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

        <div className="space-y-6">
          {/* My Code Section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center block">Your Unique Code</span>
            <div className="flex items-center justify-between bg-pink-50 p-6 rounded-2xl border-2 border-dashed border-pink-200">
              <span className="text-4xl font-bold text-pink-500 tracking-[0.3em]">{user.coupleCode}</span>
              <button 
                onClick={handleCopy}
                className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white text-pink-400 shadow-sm'}`}
              >
                {copied ? <Sparkles size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-wide">Share this code with {user.partnerNickname}</p>
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
                maxLength={6}
                placeholder="Partner's 6-digit code" 
                className="w-full p-5 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-pink-200 border border-gray-100 text-center text-3xl font-bold tracking-[0.3em] text-gray-700 uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button 
                type="submit"
                disabled={code.length !== 6}
                className="w-full py-5 bg-pink-500 text-white font-bold rounded-2xl shadow-xl shadow-pink-100 flex items-center justify-center gap-2 hover:bg-pink-600 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
              >
                Link with {user.partnerNickname} <Heart size={18} fill="currentColor" />
              </button>
            </div>
          </form>
        </div>

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
