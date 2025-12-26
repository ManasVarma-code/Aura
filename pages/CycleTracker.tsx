
import React, { useState } from 'react';
import { Heart, ChevronLeft, ChevronRight, Settings, Info, Sparkles, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CycleTracker: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<number | null>(new Date().getDate());
  
  const phases = [
    { name: 'Menstrual', color: '#FFB6C1', days: [1, 5] },
    { name: 'Follicular', color: '#FFDAB9', days: [6, 11] },
    { name: 'Ovulation', color: '#98D8C8', days: [12, 16] },
    { name: 'Luteal', color: '#E6E6FA', days: [17, 24] },
    { name: 'PMS', color: '#D8BFD8', days: [25, 28] },
  ];

  const suggestions = [
    "Prepare her favorite warm tea ☕️",
    "Offer a cozy movie night at home 🎬",
    "Send a sweet text to check in 📱",
    "Keep the heating pad ready 🔥"
  ];

  return (
    <div className="pb-32 min-h-screen bg-[#FFFDF0]">
      {/* Header */}
      <header className="p-8 bg-gradient-to-b from-pink-100/50 to-transparent">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/')} className="text-pink-400"><ChevronLeft size={28} /></button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">Cycle Tracker 💗</h1>
            <p className="text-xs text-gray-500 font-medium">Shared awareness for both</p>
          </div>
          <button className="text-pink-400"><Settings size={24} /></button>
        </div>

        {/* Top Card */}
        <div className="bg-gradient-to-br from-pink-400 to-rose-400 p-8 rounded-[2rem] text-white shadow-xl shadow-pink-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20"><Heart size={80} /></div>
          <div className="relative z-10 space-y-1">
            <h2 className="text-4xl font-bold">Day 12</h2>
            <p className="text-pink-100 font-medium opacity-90">of 28 • Ovulation Phase</p>
            <div className="pt-4 flex items-center gap-2">
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm">
                 Next period: May 11
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-8">
        {/* Phase Bar */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
             <h3 className="text-sm font-bold text-gray-700">Cycle Progress</h3>
             <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Nearly Halfway</span>
          </div>
          <div className="h-4 w-full bg-gray-100 rounded-full flex overflow-hidden border border-white p-0.5">
             {phases.map(p => (
               <div key={p.name} className="h-full flex-1 first:rounded-l-full last:rounded-r-full" style={{ backgroundColor: p.color, opacity: 0.8 }} />
             ))}
          </div>
          <div className="flex justify-between text-[10px] font-bold text-gray-400 px-1">
             <span>MENSTRUAL</span>
             <span>FOLLICULAR</span>
             <span>OVULATION</span>
             <span>LUTEAL</span>
             <span>PMS</span>
          </div>
        </section>

        {/* Insight */}
        <section className="bg-white p-6 rounded-3xl border border-pink-50 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-pink-500 font-bold">
            <Info size={18} />
            <span>Today's Emotional Insight</span>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Energy levels are peaking today! This is a great time for social activities and deep connection. Emotional openness is high. 🌸
          </p>
        </section>

        {/* Support Suggestions */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800">How You Can Support Today ❤️</h3>
          <div className="grid gap-3">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-pink-50 flex items-center gap-3 shadow-sm hover:border-pink-200 transition-all">
                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-400">
                   <Heart size={14} fill="currentColor" />
                </div>
                <span className="text-gray-700 text-sm font-medium">{s}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Mini Calendar View Preview */}
        <section className="bg-white rounded-[2rem] border border-pink-50 shadow-sm overflow-hidden mb-12">
           <div className="p-6 border-b border-pink-50 flex justify-between items-center bg-pink-50/30">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Sparkles size={16} className="text-pink-400" /> May 2024
              </h3>
              <div className="flex gap-4">
                <ChevronLeft size={20} className="text-gray-400" />
                <ChevronRight size={20} className="text-gray-400" />
              </div>
           </div>
           <div className="p-6 grid grid-cols-7 gap-2">
              {['S','M','T','W','T','F','S'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-300 py-2">{d}</div>
              ))}
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <div 
                  key={day} 
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square flex items-center justify-center text-xs font-bold rounded-xl cursor-pointer transition-all ${
                    selectedDate === day ? 'bg-pink-500 text-white shadow-lg' : 'hover:bg-pink-50 text-gray-600'
                  } ${day >= 12 && day <= 16 ? 'border-b-2 border-green-300' : ''}`}
                >
                  {day}
                </div>
              ))}
           </div>
           <button 
             onClick={() => navigate('/calendar')}
             className="w-full p-4 text-center text-sm font-bold text-pink-500 hover:bg-pink-50 transition-colors border-t border-pink-50"
           >
             View Full Shared Calendar
           </button>
        </section>
      </div>
    </div>
  );
};

export default CycleTracker;
