
import React, { useState } from 'react';
import { Camera, Plus, MapPin, Heart, Share2, MoreHorizontal, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Memories: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'notes'>('all');

  const memories = [
    {
      id: '1',
      title: 'First Date Anniversary',
      date: 'April 12, 2024',
      location: 'Central Park',
      image: 'https://picsum.photos/seed/date/800/600',
      type: 'photo',
      caption: 'A day we will never forget. Still feeling those butterflies! 🦋'
    },
    {
      id: '2',
      title: 'Our Late Night Talks',
      date: 'May 5, 2024',
      type: 'note',
      content: 'I love how we can talk for hours about absolutely nothing and everything at the same time. You are my best friend.',
      location: 'Home'
    }
  ];

  return (
    <div className="pb-32 px-6 pt-8 space-y-8 max-w-2xl mx-auto min-h-screen bg-[#FFFDF0]">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-pink-400"><ChevronLeft size={28} /></button>
          <div>
            <h1 className="text-3xl font-bold text-pink-600">Memory Wall</h1>
            <p className="text-gray-500 text-sm">Building our legacy together ✨</p>
          </div>
        </div>
        <button className="p-4 bg-pink-500 text-white rounded-2xl shadow-xl shadow-pink-100 hover:scale-105 transition-transform">
           <Plus size={24} />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-2xl border border-pink-50">
        {(['all', 'photos', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-bold rounded-xl capitalize transition-all ${
              activeTab === tab ? 'bg-pink-500 text-white shadow-md' : 'text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="space-y-8">
        {memories.filter(m => activeTab === 'all' || (activeTab === 'photos' && m.type === 'photo') || (activeTab === 'notes' && m.type === 'note')).map((memory) => (
          <article key={memory.id} className="bg-white rounded-[2rem] overflow-hidden border border-pink-50 shadow-sm group">
            {memory.type === 'photo' && (
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={memory.image} alt={memory.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-4 right-4 flex gap-2">
                  <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40"><Heart size={20} /></button>
                  <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40"><Share2 size={20} /></button>
                </div>
              </div>
            )}
            
            <div className="p-8 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-1">{memory.date}</div>
                  <h3 className="text-xl font-bold text-gray-800">{memory.title}</h3>
                </div>
                <button className="text-gray-300 hover:text-pink-400"><MoreHorizontal size={24} /></button>
              </div>

              {memory.type === 'note' ? (
                <div className="bg-pink-50/50 p-6 rounded-2xl border-l-4 border-pink-300">
                  <p className="text-gray-700 leading-relaxed italic">"{memory.content}"</p>
                </div>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed">{memory.caption}</p>
              )}

              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                <MapPin size={12} className="text-pink-300" />
                {memory.location}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Memories;
