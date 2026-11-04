
import React, { useState } from 'react';
import { Sparkles, MapPin, Coffee, DollarSign, Heart, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../contexts/AccountContext';
import { addEvent, localDate } from '../services/sharedService';
import { geminiService } from '../services/geminiService';

const DatePlanner: React.FC = () => {
  const navigate = useNavigate();
  const {user}=useAccount();
  const [date,setDate]=useState(localDate(new Date()));
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);
  const [preferences, setPreferences] = useState({
    vibe: 'Cozy',
    budget: 'Affordable',
    location: 'Home'
  });
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generatePlan = async () => {
    setLoading(true); setSaved(false);
    setError('');
    try { const result = await geminiService.getPlanDate(`Vibe: ${preferences.vibe}, Budget: ${preferences.budget}, Setting: ${preferences.location}`); setPlan(result); }
    catch { setError('Aura could not create your plan. Please try again.'); } finally { setLoading(false); }
  };

  return (
    <div className="pb-32 px-6 pt-8 space-y-8 max-w-2xl mx-auto min-h-screen bg-[#FFFDF0]">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-pink-400"><ChevronLeft size={28} /></button>
        <div>
          <h1 className="text-3xl font-bold text-pink-600">Date Planner</h1>
          <p className="text-gray-500 text-sm">Aura AI designs your perfect moment 🕯️</p>
        </div>
      </header>

      {/* Input Form */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-8">
        <div className="space-y-4">
           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Choose the vibe</label>
           <div className="grid grid-cols-2 gap-3">
             {['Cozy', 'Adventurous', 'Romantic', 'Chill'].map(v => (
               <button 
                key={v}
                onClick={() => setPreferences({...preferences, vibe: v})}
                className={`py-4 rounded-2xl text-sm font-bold border transition-all ${
                  preferences.vibe === v ? 'bg-pink-500 text-white border-pink-500 shadow-md' : 'bg-gray-50 text-gray-500 border-gray-100'
                }`}
               >
                 {v}
               </button>
             ))}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
           <div className="space-y-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Budget</label>
              <select 
                className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold text-gray-700 outline-none border border-gray-100"
                value={preferences.budget}
                onChange={e => setPreferences({...preferences, budget: e.target.value})}
              >
                <option>Affordable</option>
                <option>Moderate</option>
                <option>Splurge</option>
              </select>
           </div>
           <div className="space-y-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Location</label>
              <select 
                className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold text-gray-700 outline-none border border-gray-100"
                value={preferences.location}
                onChange={e => setPreferences({...preferences, location: e.target.value})}
              >
                <option>Home</option>
                <option>Outdoor</option>
                <option>City</option>
              </select>
           </div>
        </div>

        <button 
          onClick={generatePlan}
          disabled={loading}
          className="w-full py-5 bg-pink-500 text-white font-bold rounded-2xl shadow-xl shadow-pink-100 flex items-center justify-center gap-2 hover:bg-pink-600 transition-all disabled:bg-gray-200 disabled:shadow-none"
        >
          {loading ? 'Creating Magic...' : <><Sparkles size={20} /> Design My Date</>}
        </button>
      </section>

      {error && <p role="alert" className="text-red-600">{error}</p>}
      {/* Result */}
      {plan && (
        <section className="bg-white p-8 rounded-[2.5rem] border border-pink-100 shadow-lg space-y-6 relative overflow-hidden animate-slide-up">
           <div className="absolute top-0 right-0 p-6 opacity-10"><Heart size={100} fill="#FFB6C1" /></div>
           <div className="flex items-center gap-3 text-pink-500">
              <div className="p-3 bg-pink-50 rounded-2xl"><Sparkles size={24} /></div>
              <h3 className="text-xl font-bold">Your Custom Date Plan</h3>
           </div>
           
           <div className="prose prose-sm text-gray-700 leading-relaxed whitespace-pre-line relative z-10">
              {plan}
           </div>

           <label className="block text-sm text-gray-500">Date for your plan<input aria-label="Date for your plan" type="date" required value={date} onChange={e=>setDate(e.target.value)} className="ml-3 p-2 bg-pink-50 rounded-xl" /></label>
           {saved && <p role="status" className="text-sm text-pink-600">Your plan is in your shared calendar.</p>}
           <div className="pt-6 border-t border-pink-50 flex gap-4">
              <button disabled={saving || saved || !date} onClick={async()=>{if(!user?.coupleId || !plan)return;setSaving(true);setError('');try{await addEvent(user.coupleId,'Aura date plan',date,plan.slice(0,4000));setSaved(true);}catch{setError('Could not save your plan. Please try again.');}finally{setSaving(false);}}} className="flex-1 py-3 bg-pink-50 text-pink-500 rounded-xl font-bold text-xs">{saving ? 'Saving…' : saved ? 'Added to Calendar' : 'Add to Calendar'}</button>
              <button onClick={()=>setPlan(null)} className="flex-1 py-3 bg-gray-50 text-gray-400 rounded-xl font-bold text-xs">Try Another</button>
           </div>
        </section>
      )}
    </div>
  );
};

export default DatePlanner;
