
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Moon, Sun, Coffee, Sparkles, Smile, MessageCircle } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [mood, setMood] = useState('Feeling good');
  const [partnerActivity, setPartnerActivity] = useState('Recently 💕');
  
  const quickActions = [
    { label: 'Cycle Tracker', icon: <Moon className="text-pink-400" />, path: '/cycle' },
    { label: 'Mood Track', icon: <Smile className="text-purple-400" />, path: '/mood' },
    { label: 'Date Planner', icon: <Coffee className="text-orange-400" />, path: '/date-planner' },
    { label: 'Aura AI', icon: <Sparkles className="text-yellow-400" />, path: '/chat' },
  ];

  return (
    <div className="pb-24 px-6 pt-8 space-y-8 max-w-2xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-pink-600">Aura</h1>
          <p className="text-gray-500 font-medium">Your private sanctuary 🌸</p>
        </div>
        <div className="bg-pink-100 p-2 rounded-full cursor-pointer" onClick={() => navigate('/settings')}>
          <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-pink-500 font-bold">A</div>
        </div>
      </header>

      {/* Partner Activity Tracker */}
      <div className="bg-gradient-to-br from-pink-50 to-lavender-50 p-6 rounded-3xl shadow-sm border border-pink-100/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-pink-200 border-4 border-white overflow-hidden">
               <img src="https://picsum.photos/seed/partner/200" alt="Partner" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Your Partner</h3>
            <p className="text-sm text-pink-500 font-medium flex items-center gap-1">
              <Heart size={14} fill="currentColor" /> {partnerActivity}
            </p>
          </div>
        </div>
      </div>

      {/* Mood Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          How are you feeling?
        </h2>
        <div className="flex gap-3 overflow-x-auto py-2 custom-scrollbar no-scrollbar">
          {['Happy', 'Calm', 'Tired', 'Loving', 'Excited'].map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`px-6 py-3 rounded-2xl whitespace-nowrap transition-all border ${
                mood === m 
                ? 'bg-pink-500 text-white border-pink-500 shadow-md' 
                : 'bg-white text-gray-500 border-gray-100 hover:border-pink-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      {/* Quick Tools */}
      <section className="grid grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-pink-50 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="p-3 bg-gray-50 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
              {action.icon}
            </div>
            <span className="font-semibold text-gray-700 text-sm">{action.label}</span>
          </button>
        ))}
      </section>

      {/* Love Suggestion */}
      <div className="bg-white p-6 rounded-3xl border border-pink-100 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 text-pink-100">
           <Heart size={80} strokeWidth={1} />
        </div>
        <div className="flex items-center gap-2 text-pink-500 font-bold">
           <Sparkles size={18} />
           <span>Aura Suggestion</span>
        </div>
        <p className="text-gray-600 leading-relaxed relative z-10">
          Energy feels lower for both of you today. Maybe plan a quiet evening with a favorite movie and some warm tea? ☕️
        </p>
      </div>
    </div>
  );
};

export default Home;
