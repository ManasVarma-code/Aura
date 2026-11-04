
import React, { useState, useEffect } from 'react';
import { Heart, ChevronLeft, ChevronRight, Settings, Info, Sparkles, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../contexts/AccountContext';
import { requireSupabase } from '../services/supabase';
import { localDate } from '../services/sharedService';
import { errorMessage } from '../services/accountService';
interface CycleData {author_id:string;last_period:string;cycle_length:number;period_length:number;share_with_partner:boolean}

const CycleTracker: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAccount();
  const [entries,setEntries]=useState<CycleData[]>([]);
  const [lastPeriod,setLastPeriod]=useState(localDate(new Date()));
  const [length,setLength]=useState(28);
  const [periodLength,setPeriodLength]=useState(5);
  const [share,setShare]=useState(false);
  const [view,setView]=useState<'me'|'partner'>('me');
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;
    void requireSupabase().from('cycle_settings').select('*').then(({data,error})=>{
      if(!active)return;
      if(error){setError('Could not load cycle settings.');return;}
      const rows=(data||[]) as CycleData[];setEntries(rows);
      const own=rows.find(r=>r.author_id===user?.id);
      if(own){setLastPeriod(own.last_period);setLength(own.cycle_length);setPeriodLength(own.period_length);setShare(own.share_with_partner);}
    });
    return()=>{active=false;};
  },[user?.id,revision]);
  const entry=entries.find(e=>view==='me' ? e.author_id===user?.id : e.author_id!==user?.id);
  const days=entry ? Math.floor((Date.parse(localDate(new Date()))-Date.parse(entry.last_period))/86400000) : 0;
  const day=entry ? ((days%entry.cycle_length)+entry.cycle_length)%entry.cycle_length+1 : 0;
  const ovulation=entry ? entry.cycle_length-14 : 14;
  const phase=!entry ? 'Log your cycle for an estimate' : day<=entry.period_length ? 'Menstrual' : day<ovulation-1 ? 'Follicular' : day<=ovulation+1 ? 'Ovulation' : day>entry.cycle_length-5 ? 'PMS' : 'Luteal';
  const next=entry ? new Date(Date.parse(entry.last_period)+(Math.floor(days/entry.cycle_length)+1)*entry.cycle_length*86400000).toLocaleDateString(undefined,{timeZone:'UTC'}) : 'Not logged';
  const month=new Date();
  const save = async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try{const {error}=await requireSupabase().from('cycle_settings').upsert({author_id:user!.id,last_period:lastPeriod,cycle_length:length,period_length:periodLength,share_with_partner:share});if(error)throw error;setEditing(false);setRevision(r=>r+1);}
    catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  };
  const [selectedDate, setSelectedDate] = useState<number | null>(new Date().getDate());
  
  const phases = [
    { name: 'Menstrual', color: '#FFB6C1', days: [1, 5] },
    { name: 'Follicular', color: '#FFDAB9', days: [6, 11] },
    { name: 'Ovulation', color: '#98D8C8', days: [12, 16] },
    { name: 'Luteal', color: '#E6E6FA', days: [17, 24] },
    { name: 'PMS', color: '#D8BFD8', days: [25, 28] },
  ];

  const suggestions = [
    "Prepare their favorite warm tea ☕️",
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
            <p className="text-xs text-gray-500 font-medium">Private unless you choose to share</p>
          </div>
          <button aria-label="Edit cycle settings" onClick={()=>setEditing(true)} className="text-pink-400"><Settings size={24} /></button>
        </div>

        {/* Top Card */}
        <div className="bg-gradient-to-br from-pink-400 to-rose-400 p-8 rounded-[2rem] text-white shadow-xl shadow-pink-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20"><Heart size={80} /></div>
          <div className="relative z-10 space-y-1">
            <h2 className="text-4xl font-bold">Day {day || '—'}</h2>
            <p className="text-pink-100 font-medium opacity-90">{entry ? `of ${entry.cycle_length} • ${phase} Phase` : phase}</p>
            <div className="pt-4 flex items-center gap-2">
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm">
                 Estimated next period: {next}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-8">
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <p className="text-xs text-gray-500">Calendar estimates vary. This is not a diagnosis or a contraception tool.</p>
        <div className="flex gap-4 text-sm font-bold text-pink-500">
          <button onClick={()=>setView('me')}>My Cycle</button>
          <button onClick={()=>{setView('partner');setRevision(r=>r+1);}}>Partner’s Shared Cycle</button>
          <button onClick={()=>setEditing(true)}>Log Cycle</button>
        </div>
        {view==='partner' && !entry && <p className="text-gray-500">Your partner has not shared cycle information.</p>}
        {editing && <form onSubmit={save} className="bg-white p-6 rounded-3xl space-y-4 border border-pink-100">
          <h2 className="font-bold text-pink-600">My cycle settings</h2>
          <label className="block text-sm">Last period started<input aria-label="Last period started" required max={localDate(new Date())} type="date" value={lastPeriod} onChange={e=>setLastPeriod(e.target.value)} className="w-full p-3 bg-pink-50 rounded-xl" /></label>
          <label className="block text-sm">Cycle length<input aria-label="Cycle length" type="number" min={21} max={45} required value={length} onChange={e=>setLength(Number(e.target.value))} className="w-full p-3 bg-pink-50 rounded-xl" /></label>
          <label className="block text-sm">Period length<input aria-label="Period length" type="number" min={2} max={10} required value={periodLength} onChange={e=>setPeriodLength(Number(e.target.value))} className="w-full p-3 bg-pink-50 rounded-xl" /></label>
          <label className="flex gap-3 text-sm"><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)} />Share my cycle with my partner</label>
          <div className="flex gap-4"><button disabled={busy} className="bg-pink-500 text-white px-5 py-3 rounded-xl">Save Cycle</button><button disabled={busy} type="button" onClick={()=>setEditing(false)}>Cancel</button></div>
        </form>}
        {/* Phase Bar */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
             <h3 className="text-sm font-bold text-gray-700">Cycle Progress</h3>
             <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">{entry ? `Day ${day}` : 'Not logged'}</span>
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
            Every cycle is different. Ask how your partner is feeling and choose support together. 🌸
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
                 <Sparkles size={16} className="text-pink-400" /> {month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}
              </h3>
              <div className="flex gap-4">
                <ChevronLeft size={20} className="text-gray-400" />
                <ChevronRight size={20} className="text-gray-400" />
              </div>
           </div>
           <div className="p-6 grid grid-cols-7 gap-2">
              {['S','M','T','W','T','F','S'].map((d,i) => (
                <div key={i} className="text-center text-[10px] font-bold text-gray-300 py-2">{d}</div>
              ))}
              {Array.from({ length: new Date(month.getFullYear(),month.getMonth()+1,0).getDate() }, (_, i) => i + 1).map(day => (
                <div 
                  key={day} 
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square flex items-center justify-center text-xs font-bold rounded-xl cursor-pointer transition-all ${
                    selectedDate === day ? 'bg-pink-500 text-white shadow-lg' : 'hover:bg-pink-50 text-gray-600'
                  } `}
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
