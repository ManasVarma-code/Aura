
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Sparkles, MapPin, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { geminiService } from '../services/geminiService';
import { FestivalData } from '../types';

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [festivals, setFestivals] = useState<FestivalData[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const fetchFestivals = async () => {
      const data = await geminiService.getIndianFestivals(currentDate.getFullYear());
      setFestivals(data);
    };
    fetchFestivals();
  }, [currentDate]);

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const startDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    setShowDetail(true);
    setLoadingAi(true);
    const context = `Date: ${date.toDateString()}. Calendar events: ${festivals.find(f => f.date === date.toISOString().split('T')[0])?.title || 'No major festival'}`;
    const insight = await geminiService.generateRelationshipNote("Tell me why this day matters", context);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  const isFestival = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return festivals.find(f => f.date === dateStr);
  };

  return (
    <div className="pb-32 px-6 pt-8 space-y-8 max-w-2xl mx-auto min-h-screen bg-[#FFFDF0] relative">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-pink-400"><ChevronLeft size={28} /></button>
          <div>
            <h1 className="text-3xl font-bold text-pink-600">Shared Calendar</h1>
            <p className="text-gray-500 text-sm">Every moment together counts 💕</p>
          </div>
        </div>
        <button className="p-4 bg-pink-500 text-white rounded-2xl shadow-lg"><Plus size={24} /></button>
      </header>

      {/* Month Selector */}
      <div className="bg-white p-6 rounded-[2rem] border border-pink-50 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarIcon size={20} className="text-pink-400" />
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-4">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-pink-50 rounded-xl transition-colors"><ChevronLeft /></button>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-pink-50 rounded-xl transition-colors"><ChevronRight /></button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-y-6">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-300 tracking-widest">{d}</div>
          ))}
          {Array(startDay(currentDate)).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1).map(day => {
            const festival = isFestival(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            
            return (
              <div 
                key={day} 
                onClick={() => handleDateClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                className="relative flex flex-col items-center group cursor-pointer"
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                  isToday ? 'bg-pink-500 text-white shadow-lg' : 'text-gray-600 group-hover:bg-pink-50'
                }`}>
                  {day}
                </div>
                {festival && (
                  <div className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full ${festival.type === 'festival' ? 'bg-yellow-400' : 'bg-purple-300'}`} />
                )}
                {/* Simulated Cycle Bar (Day 1-5 example) */}
                {day >= 1 && day <= 5 && currentDate.getMonth() === 4 && (
                   <div className="absolute top-0 left-0 right-0 h-1 bg-pink-300/50 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sheet Detail */}
      {showDetail && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDetail(false)} />
          <div className="relative w-full bg-white rounded-t-[2.5rem] p-8 space-y-8 animate-slide-up max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />
            
            <header className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-800">{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              <p className="text-pink-400 font-bold uppercase tracking-widest text-xs">Special Day Connection</p>
            </header>

            {/* Why This Day Matters (AI Insight) */}
            <section className="bg-pink-50/50 p-6 rounded-[2rem] border border-pink-100 space-y-4 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 text-pink-100/50"><Sparkles size={40} /></div>
               <h3 className="text-sm font-bold text-pink-600 flex items-center gap-2">
                 <Sparkles size={16} /> Aura's Heart Wisdom
               </h3>
               {loadingAi ? (
                 <div className="flex items-center gap-2 py-4">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                 </div>
               ) : (
                 <p className="text-gray-700 text-sm leading-relaxed italic">{aiInsight}</p>
               )}
            </section>

            {/* Events for this day */}
            <section className="space-y-4">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Scheduled Moments</h3>
               <div className="space-y-3">
                 {festivals.filter(f => f.date === selectedDate?.toISOString().split('T')[0]).map((f, i) => (
                    <div key={i} className="bg-white border border-pink-50 p-5 rounded-3xl flex gap-4 shadow-sm">
                       <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-500">
                          <MapPin size={24} />
                       </div>
                       <div className="flex-1">
                          <h4 className="font-bold text-gray-800">{f.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{f.short_description}</p>
                          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-pink-500 bg-pink-50 px-3 py-1.5 rounded-full w-fit">
                             <Heart size={10} fill="currentColor" /> {f.couple_suggestion}
                          </div>
                       </div>
                    </div>
                 ))}
                 <button className="w-full p-5 border-2 border-dashed border-pink-100 rounded-3xl text-pink-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-pink-50 transition-colors">
                    <Plus size={18} /> Add Your Own Event
                 </button>
               </div>
            </section>

            <button 
              onClick={() => setShowDetail(false)}
              className="w-full py-4 bg-pink-500 text-white font-bold rounded-2xl shadow-xl shadow-pink-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
