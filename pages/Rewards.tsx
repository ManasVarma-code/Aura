
import React, { useEffect, useState } from 'react';
import { requireSupabase } from '../services/supabase';
import { Trophy, Star, Lock, Heart, Gift, Sparkles, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Rewards: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({messages:0,memories:0,events:0,checkins:0});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(()=>{let active=true;void requireSupabase().rpc('get_couple_stats').then(({data,error})=>{if(active){if(error)setError('Could not load your milestones.');else setStats(data);setLoading(false);}});return()=>{active=false;};},[]);
  const points=stats.memories*10+stats.events*5+stats.checkins*5+Math.min(stats.messages,100);
  const level=Math.floor(points/100);
  const badges=[{title:'First Memory',unlocked:stats.memories>0},{title:'A Date Together',unlocked:stats.events>0},{title:'Heart Check-in',unlocked:stats.checkins>0},{title:'100 Shared Messages',unlocked:stats.messages>=100}];

  const rewardParameters = [
    { title: 'Daily Check-ins', desc: 'Consistency is key to a healthy bond.' },
    { title: 'Mood Updates', desc: 'Sharing your heart helps you grow.' },
    { title: 'Memory Adding', desc: 'Preserving moments forever.' },
    { title: 'Couple Challenges', desc: 'Completing goals together.' },
  ];

  return (
    <div className="pb-32 px-6 pt-8 space-y-8 max-w-2xl mx-auto min-h-screen bg-[#FFFDF0]">
      <header className="text-center space-y-2">
        <button onClick={() => navigate('/')} className="absolute left-6 top-8 text-pink-400"><ChevronLeft size={28} /></button>
        <h1 className="text-3xl font-bold text-pink-600">Your Love, Rewarded 💕</h1>
        <p className="text-gray-500 text-sm max-w-[80%] mx-auto">Celebrate the moments you create and the care you share.</p>
      </header>

      {error && <p role="alert" className="text-red-600">{error}</p>}
      {/* Preview Card */}
      <div className="bg-gradient-to-br from-pink-400 to-rose-500 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-pink-200 relative overflow-hidden">
        <div className="absolute -bottom-4 -right-4 text-white/10 rotate-12"><Trophy size={160} /></div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Gift size={28} />
            </div>
            <div>
              <h3 className="font-bold text-xl">Love Level: {loading ? '…' : level}</h3>
              <p className="text-pink-100 text-xs font-medium">{points} shared points</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-pink-100">
               <span>Journey to Level {level+1}</span>
               <span>{points%100}/100</span>
            </div>
            <div className="h-3 w-full bg-white/20 rounded-full overflow-hidden border border-white/10">
               <div style={{width:`${points%100}%`}} className="h-full bg-white rounded-full shadow-[0_0_15px_white]" />
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Grid Preview */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Star size={20} className="text-yellow-400" /> Unlockable Experiences
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {badges.map((r) => (
            <div key={r.title} className="bg-white p-6 rounded-3xl border border-pink-50 shadow-sm flex flex-col items-center gap-4 group opacity-80">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 relative">
                 {r.unlocked ? <Star size={20} className="text-pink-500" /> : <Lock size={20} />}
                 <div className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow-sm">
                   <Sparkles size={10} className="text-pink-300" />
                 </div>
              </div>
              <span className="font-bold text-gray-500 text-xs text-center">{r.title}{r.unlocked ? ' ✓' : ''}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Earn through your journey</h2>
        <div className="grid gap-3">
          {rewardParameters.map((p) => (
            <div key={p.title} className="bg-white p-5 rounded-3xl border border-pink-50 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-pink-50 rounded-2xl text-pink-400">
                <Heart size={20} fill="currentColor" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">{p.title}</h4>
                <p className="text-xs text-gray-400">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center py-4">
         <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">The best is yet to come ✨</p>
      </div>
    </div>
  );
};

export default Rewards;
