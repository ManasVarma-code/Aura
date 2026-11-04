
import React, { useState, useEffect } from 'react';
import { Camera, Plus, MapPin, Heart, Share2, MoreHorizontal, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../contexts/AccountContext';
import { useCoupleCollection } from '../hooks/useCoupleCollection';
import { MemoryRow, addMemory, localDate } from '../services/sharedService';
import { requireSupabase } from '../services/supabase';
import { errorMessage } from '../services/accountService';

const Memories: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'notes'>('all');

  const { user } = useAccount();
  const { rows, loading, error, reload, hasMore, loadingMore, loadMore } = useCoupleCollection<MemoryRow>('memories');
  const [images, setImages] = useState<Record<string,string>>({});
  const [photoError, setPhotoError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(localDate(new Date()));
  const [file, setFile] = useState<File | undefined>();
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const paths = rows.flatMap(row => row.image_path ? [row.image_path] : []);
      if (!paths.length) { setImages({}); return; }
      const { data, error } = await requireSupabase().storage.from('memories').createSignedUrls(paths, 900);
      if (!active) return;
      setPhotoError(error || data?.some(d=>d.error) ? 'Some photos could not be opened. Please try again.' : '');
      setImages(Object.fromEntries((data || []).filter(d=>d.path && d.signedUrl).map(d=>[d.path!,d.signedUrl])));
    };
    void refresh();
    const timer = window.setInterval(()=>void refresh(), 600000);
    return () => { active=false; clearInterval(timer); };
  }, [rows]);
  const memories = rows.map(row=>({ ...row, date:new Date(row.memory_date+'T12:00:00').toLocaleDateString(), image:row.image_path ? images[row.image_path] : undefined, caption:row.content }));
  const saveMemory = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user?.coupleId) return;
    setBusy(true); setSaveError('');
    try {
      await addMemory(user.coupleId,user.id,{title,content,location,memory_date:date},file);
      setShowAdd(false); setTitle(''); setContent(''); setLocation(''); setFile(undefined); reload();
    } catch(e) { setSaveError(errorMessage(e)); } finally { setBusy(false); }
  };

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
        <button aria-label="Add memory" onClick={()=>{setShowAdd(true);setSaveError('');}} className="p-4 bg-pink-500 text-white rounded-2xl shadow-xl shadow-pink-100 hover:scale-105 transition-transform">
           <Plus size={24} />
        </button>
      </header>

      {showAdd && <div role="dialog" aria-modal="true" aria-label="Add memory" className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-6">
        <form onSubmit={saveMemory} className="bg-white p-8 rounded-3xl space-y-4 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h2 className="font-bold text-2xl text-pink-600">Keep a memory</h2>
          <input aria-label="Memory title" placeholder="Title" required maxLength={150} value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-3 rounded-xl bg-pink-50" />
          <textarea aria-label="Memory content" placeholder="Your note or photo caption" maxLength={4000} value={content} onChange={e=>setContent(e.target.value)} className="w-full p-3 rounded-xl bg-pink-50" />
          <input aria-label="Memory location" placeholder="Location (optional)" maxLength={150} value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-3 rounded-xl bg-pink-50" />
          <input aria-label="Memory date" type="date" required value={date} onChange={e=>setDate(e.target.value)} className="w-full p-3 rounded-xl bg-pink-50" />
          <label className="block text-sm text-gray-500">Photo (optional, up to 10 MB)<input aria-label="Memory photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0])} className="w-full mt-2" /></label>
          {saveError && <p role="alert" className="text-red-600">{saveError}</p>}
          <button disabled={busy || !title.trim()} className="w-full p-3 bg-pink-500 text-white rounded-xl">{busy ? 'Saving…' : 'Save Memory'}</button>
          <button type="button" disabled={busy} onClick={()=>setShowAdd(false)} className="w-full text-gray-500">Cancel</button>
        </form>
      </div>}
      {(error || photoError) && <p role="alert" className="text-red-600">{error || photoError}<button onClick={reload} className="ml-2 underline">Retry</button></p>}
      {loading && <p role="status" className="text-gray-400">Opening your memories…</p>}
      {!loading && !memories.length && <p className="text-gray-400">Keep your first shared moment here ✨</p>}
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

      {hasMore && <button disabled={loadingMore} onClick={()=>void loadMore()} className="text-pink-500 font-bold text-sm">{loadingMore ? 'Loading…' : 'Load more memories'}</button>}
      {/* Grid */}
      <div className="space-y-8">
        {memories.filter(m => activeTab === 'all' || (activeTab === 'photos' && m.type === 'photo') || (activeTab === 'notes' && m.type === 'note')).map((memory) => (
          <article key={memory.id} className="bg-white rounded-[2rem] overflow-hidden border border-pink-50 shadow-sm group">
            {memory.type === 'photo' && (
              <div className="relative aspect-[4/3] overflow-hidden">
                {memory.image ? <img src={memory.image} alt={memory.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <p className="p-8 text-gray-400">Opening photo…</p>}
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
