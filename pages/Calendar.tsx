
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Sparkles, MapPin, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { geminiService } from '../services/geminiService';
import { FestivalData } from '../types';
import { useAccount } from '../contexts/AccountContext';
import { useCoupleCollection } from '../hooks/useCoupleCollection';
import { EventRow, addEvent, deleteEvent, localDate } from '../services/sharedService';
import { errorMessage } from '../services/accountService';

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAccount();
  const [showAdd, setShowAdd] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(localDate(new Date()));
  const [eventDescription, setEventDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const openAdd = () => { setEventDate(localDate(selectedDate || new Date())); setShowDetail(false); setShowAdd(true); setSaveError(''); };
  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user?.coupleId) return;
    setSaving(true); setSaveError('');
    try { await addEvent(user.coupleId, eventTitle, eventDate, eventDescription); setShowAdd(false); setEventTitle(''); setEventDescription(''); reload(); }
    catch(e) { setSaveError(errorMessage(e)); } finally { setSaving(false); }
  };
  const [currentDate, setCurrentDate] = useState(new Date());
  const { rows: events, error: eventError, reload, hasMore, loadingMore, loadMore } = useCoupleCollection<EventRow>('calendar_events',[localDate(new Date(currentDate.getFullYear(),currentDate.getMonth(),1)),localDate(new Date(currentDate.getFullYear(),currentDate.getMonth()+1,0))]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [festivals, setFestivals] = useState<FestivalData[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const year = currentDate.getFullYear();
  useEffect(() => {
    let active = true;
    const fetchFestivals = async () => {
      const data = await geminiService.getIndianFestivals(currentDate.getFullYear());
      if (active) setFestivals(data);
    };
    fetchFestivals();
    return () => { active = false; };
  }, [year]);

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const startDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    setShowDetail(true);
    setLoadingAi(true);
    const context = `Date: ${date.toDateString()}. Calendar events: ${festivals.find(f => f.date === localDate(date))?.title || 'No major festival'}`;
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
        <button aria-label="Add event" onClick={openAdd} className="p-4 bg-pink-500 text-white rounded-2xl shadow-lg"><Plus size={24} /></button>
      </header>

      {eventError && <p role="alert" className="text-red-600">{eventError}</p>}
      {hasMore && <button disabled={loadingMore} onClick={()=>void loadMore()} className="text-pink-500 text-sm font-bold">Load more events this month</button>}
      {/* Month Selector */}
      <div className="bg-white p-6 rounded-[2rem] border border-pink-50 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarIcon size={20} className="text-pink-400" />
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-4">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-pink-50 rounded-xl transition-colors"><ChevronLeft /></button>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-pink-50 rounded-xl transition-colors"><ChevronRight /></button>
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
            const shared = events.some(e => e.event_date === localDate(new Date(currentDate.getFullYear(),currentDate.getMonth(),day)));
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            
            return (
              <button type="button" aria-label={localDate(new Date(currentDate.getFullYear(),currentDate.getMonth(),day))}
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
                {shared && <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-pink-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {showAdd && <div role="dialog" aria-modal="true" aria-label="Add shared event" className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-6">
        <form onSubmit={saveEvent} className="bg-white p-8 rounded-3xl space-y-4 max-w-md w-full">
          <h2 className="font-bold text-2xl text-pink-600">Plan a shared moment</h2>
          <label className="block text-sm">Title<input aria-label="Event title" required maxLength={150} value={eventTitle} onChange={e=>setEventTitle(e.target.value)} className="w-full p-3 rounded-xl bg-pink-50" /></label>
          <label className="block text-sm">Date<input aria-label="Event date" required type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} className="w-full p-3 rounded-xl bg-pink-50" /></label>
          <label className="block text-sm">Details<textarea aria-label="Event details" maxLength={4000} value={eventDescription} onChange={e=>setEventDescription(e.target.value)} className="w-full p-3 rounded-xl bg-pink-50" /></label>
          {saveError && <p role="alert" className="text-red-600">{saveError}</p>}
          <button disabled={saving || !eventTitle.trim()} className="w-full p-3 bg-pink-500 text-white rounded-xl">{saving ? 'Saving…' : 'Save Event'}</button>
          <button type="button" disabled={saving} onClick={()=>setShowAdd(false)} className="w-full text-gray-500">Cancel</button>
        </form>
      </div>}
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
                 {events.filter(e => e.event_date === (selectedDate ? localDate(selectedDate) : '')).map(event => <article key={event.id} className="bg-pink-50 p-5 rounded-3xl space-y-2">
                   <h4 className="font-bold text-gray-800">{event.title}</h4><p className="text-sm text-gray-600 whitespace-pre-line">{event.description}</p>
                   <button disabled={saving} className="text-xs text-pink-600 font-bold" onClick={async () => { setSaving(true); setSaveError(''); try { await deleteEvent(event.id); reload(); } catch(e) { setSaveError(errorMessage(e)); } finally { setSaving(false); } }}>Delete Event</button>
                 </article>)}
                 {saveError && <p role="alert" className="text-red-600">{saveError}</p>}
                 {festivals.filter(f => f.date === (selectedDate ? localDate(selectedDate) : '')).map((f, i) => (
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
                 <button onClick={openAdd} className="w-full p-5 border-2 border-dashed border-pink-100 rounded-3xl text-pink-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-pink-50 transition-colors">
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
