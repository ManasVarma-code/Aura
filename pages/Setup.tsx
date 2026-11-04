
import React, { useState } from 'react';
import { errorMessage } from '../services/accountService';
import { Gender, User } from '../types';
import { Heart, ChevronRight, User as UserIcon, Sparkles } from 'lucide-react';

interface SetupProps {
  user: User;
  onComplete: (gender: Gender, partnerNickname: string) => Promise<void>;
}

const Setup: React.FC<SetupProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [partnerNickname, setPartnerNickname] = useState(user.partnerNickname);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    setError('');
    if (step === 1 && gender) {
      setStep(2);
    } else if (step === 2 && partnerNickname) {
      setBusy(true);
      try { await onComplete(gender!, partnerNickname.trim()); }
      catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="flex justify-center gap-2">
          <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-pink-400' : 'bg-gray-200'}`}></div>
          <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-pink-400' : 'bg-gray-200'}`}></div>
        </div>

        {step === 1 ? (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-gray-800">Tell us about you</h2>
              <p className="text-gray-500">How do you identify? This helps us personalize your experience.</p>
            </div>
            <div className="grid gap-3">
              {[Gender.FEMALE, Gender.MALE, Gender.OTHER, Gender.PREFER_NOT_TO_SAY].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`w-full p-5 rounded-2xl text-left font-bold transition-all border-2 flex items-center justify-between ${
                    gender === g 
                    ? 'bg-pink-50 border-pink-400 text-pink-600 shadow-md shadow-pink-50' 
                    : 'bg-white border-gray-100 text-gray-500 hover:border-pink-200'
                  }`}
                >
                  {g}
                  {gender === g && <Heart size={18} fill="currentColor" />}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-gray-800">Your better half</h2>
              <p className="text-gray-500">What should we call your partner within Aura? 🌸</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-6">
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" size={18} />
                <input 
                  type="text" 
                  maxLength={100} aria-label="Partner nickname" placeholder="Partner's Nickname (e.g., Honey)"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-pink-200 border border-gray-100 transition-all font-bold"
                  value={partnerNickname}
                  onChange={(e) => setPartnerNickname(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="p-4 bg-pink-50 rounded-2xl flex items-start gap-3">
                <Sparkles size={18} className="text-pink-400 mt-0.5" />
                <p className="text-xs text-pink-600 font-medium leading-relaxed">
                  This nickname will be used for all reminders, notifications, and AI suggestions. You can change it later in settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
        <button 
          onClick={handleNext}
          disabled={busy || (step === 1 && !gender) || (step === 2 && !partnerNickname.trim())}
          className="w-full py-5 bg-pink-500 text-white font-bold rounded-2xl shadow-xl shadow-pink-100 flex items-center justify-center gap-2 hover:bg-pink-600 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
        >
          {step === 1 ? 'Continue' : 'Finish Setup'}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default Setup;
