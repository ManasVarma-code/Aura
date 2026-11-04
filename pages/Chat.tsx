import { randomId } from '../services/randomId';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Phone, Video, Sparkles, Mic, Image, Info, ChevronLeft, X, MicOff, VideoOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { geminiService } from '../services/geminiService';
import { useAccount } from '../contexts/AccountContext';
import { useCoupleCollection } from '../hooks/useCoupleCollection';
import { MessageRow, sendMessage } from '../services/sharedService';
import { errorMessage } from '../services/accountService';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAccount();
  const { rows, loading, error: loadError, connected, reload, hasMore, loadingMore, loadMore } = useCoupleCollection<MessageRow>('messages');
  const messages = useMemo(()=>[...rows].reverse().map(m => ({ id:m.id, text:m.body, sender:m.author_id === user?.id ? 'me':'partner', time:new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) })),[rows,user?.id]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const pending = useRef<{ body:string; id:string } | null>(null);
  const [inputText, setInputText] = useState('');
  const [isCalling, setIsCalling] = useState<'audio' | 'video' | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const newest = messages[messages.length-1]?.id;
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [newest]);

  const handleSend = async () => {
    const body = inputText.trim();
    if (!body || !user?.coupleId || sending) return;
    // Keep the same message ID on retry to prevent duplicates after a lost response.
    if (pending.current?.body !== body) pending.current = { body, id:randomId() };
    setSending(true); setSendError('');
    try {
      await sendMessage(user.coupleId, body, pending.current.id, user.id);
      setInputText(''); setSuggestions([]); pending.current = null; reload();
    } catch(e) { setSendError(errorMessage(e)); } finally { setSending(false); }
  };

  const getAiSuggestions = async () => {
    const recent = messages.slice(-3).map(m => m.text);
    const aiSug = await geminiService.getChatSuggestions(recent, "Loving");
    setSuggestions(aiSug);
  };

  const CallOverlay = () => (
    <div className="fixed inset-0 bg-pink-500/95 z-[100] flex flex-col items-center justify-between py-24 text-white">
      <div className="flex flex-col items-center gap-6">
        <div className="w-32 h-32 rounded-full border-4 border-white/30 overflow-hidden shadow-2xl animate-pulse">
           <img src="https://picsum.photos/seed/partner/400" alt="Partner" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-bold">Calling My Partner</h2>
          <p className="text-pink-100 mt-2">Call preview · Live calling is not connected yet</p>
        </div>
      </div>
      
      <div className="flex gap-8">
        <button className="p-5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
          <MicOff size={28} />
        </button>
        <button 
          onClick={() => setIsCalling(null)}
          className="p-6 bg-red-500 rounded-full hover:bg-red-600 transition-colors shadow-xl"
        >
          <X size={32} />
        </button>
        <button className="p-5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
          {isCalling === 'video' ? <VideoOff size={28} /> : <Info size={28} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#FFFDF0]">
      {isCalling && <CallOverlay />}
      
      {/* Header */}
      <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-pink-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-pink-400"><ChevronLeft size={28} /></button>
          <div className="flex flex-col">
            <span className="font-bold text-gray-800">{user?.partnerNickname || 'My Partner'}</span>
            <span className="text-[10px] text-green-500 font-semibold tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> {connected ? 'Connected' : 'Reconnecting…'}
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsCalling('audio')} className="text-pink-400 hover:text-pink-500"><Phone size={22} /></button>
          <button onClick={() => setIsCalling('video')} className="text-pink-400 hover:text-pink-500"><Video size={24} /></button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {hasMore && <button disabled={loadingMore} onClick={()=>void loadMore()} className="w-full text-sm font-bold text-pink-500">{loadingMore ? 'Loading…' : 'Load earlier messages'}</button>}
        {loading && <p role="status" className="text-center text-gray-400">Opening your conversation…</p>}
        {!loading && !messages.length && <p className="text-center text-gray-400">Your conversation starts here 💕</p>}
        {(loadError || sendError) && <p role="alert" className="text-red-600">{loadError || sendError}<button onClick={reload} className="ml-2 underline">Retry</button></p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-5 py-3 rounded-3xl text-sm ${
              m.sender === 'me' 
              ? 'bg-pink-500 text-white rounded-tr-none shadow-sm' 
              : 'bg-white text-gray-700 border border-pink-50 rounded-tl-none shadow-sm'
            }`}>
              {m.text}
              <div className={`text-[10px] mt-1 ${m.sender === 'me' ? 'text-pink-100' : 'text-gray-400'}`}>
                {m.time}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-pink-100 space-y-3 pb-24">
        {suggestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {suggestions.map((s, i) => (
              <button 
                key={i} 
                onClick={() => setInputText(s)}
                className="whitespace-nowrap px-4 py-2 bg-pink-50 border border-pink-200 text-pink-600 rounded-full text-xs font-medium hover:bg-pink-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button 
            onClick={getAiSuggestions}
            className="p-2 border-2 border-pink-200 text-pink-400 rounded-2xl hover:bg-pink-50 transition-colors"
          >
            <Sparkles size={20} />
          </button>
          <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-2 flex items-center gap-2 border border-gray-100 focus-within:border-pink-300 transition-all">
            <input 
              aria-label="Message" maxLength={4000} disabled={sending} type="text"
              placeholder="Type your message..." 
              className="bg-transparent flex-1 outline-none text-sm text-gray-700"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="text-gray-400 hover:text-pink-400"><Mic size={18} /></button>
            <button className="text-gray-400 hover:text-pink-400"><Image size={18} /></button>
          </div>
          <button 
            onClick={handleSend}
            aria-label="Send message" disabled={sending || !inputText.trim()}
            className="p-3 bg-pink-500 text-white rounded-2xl shadow-lg shadow-pink-200 disabled:bg-gray-200 disabled:shadow-none transition-all"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
