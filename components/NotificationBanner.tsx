import React, {useEffect,useState} from 'react';
import {useAccount} from '../contexts/AccountContext';
import {watchNotifications} from '../services/notificationService';
export default function NotificationBanner() {
  const {user}=useAccount();
  const [route,setRoute]=useState<string|null>(null);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{const refresh=()=>setRevision(r=>r+1);window.addEventListener('aura:push-enabled',refresh);return()=>window.removeEventListener('aura:push-enabled',refresh);},[]);
  useEffect(()=>{
    setRoute(null);if(!user)return;
    let active=true,stop:(()=>void)|undefined;
    void watchNotifications(user.id,r=>{if(active)setRoute(r);}).then(remove=>{if(active)stop=remove;else remove();}).catch(()=>{});
    return()=>{active=false;stop?.();};
  },[user?.id,revision]);
  if(!route)return null;
  return <aside role="status" className="fixed top-4 left-4 right-4 z-[200] bg-white border border-pink-100 rounded-2xl shadow-lg p-4 flex items-center justify-between text-sm">
    <a className="text-pink-600 font-bold" href={`#${route}`} onClick={()=>setRoute(null)}>A shared moment is waiting for you 💕</a>
    <button aria-label="Dismiss notification" onClick={()=>setRoute(null)}>×</button>
  </aside>;
}
