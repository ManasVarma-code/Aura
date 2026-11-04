import { randomId } from '../services/randomId';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAccount } from '../contexts/AccountContext';
import { requireSupabase } from '../services/supabase';

export function useCoupleCollection<T extends { id: string; created_at: string }>(table: 'messages' | 'calendar_events' | 'memories', range?: [string,string]) {
  const { user } = useAccount();
  const coupleId = user?.coupleId;
  const epoch=useRef(0);
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore,setHasMore] = useState(false);
  const [loadingMore,setLoadingMore] = useState(false);
  const [connected, setConnected] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(r => r + 1), []);
  useEffect(() => {
    epoch.current++; setLoadingMore(false);
    setRows([]); setError(''); setLoading(true); setConnected(false); setHasMore(false);
    if (!coupleId) { setLoading(false); return; }
    const db = requireSupabase();
    let active = true, request = 0;
    let updateTimer: number | undefined;
    const fetchRows = async () => {
      const ticket = ++request;
      let query=db.from(table).select('*').eq('couple_id',coupleId);
      if(range)query=query.gte('event_date',range[0]).lte('event_date',range[1]);
      const {data,error}=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100);
      if (!active || ticket !== request) return;
      if (error) setError('Could not load your shared moments. Please try again.');
      else {
        const latest=(data||[]) as T[];
        setRows(previous=>{
          if(latest.length<100)return latest;
          const last=latest[latest.length-1];
          return [...latest,...previous.filter(row=>row.created_at<last.created_at || (row.created_at===last.created_at && row.id<last.id))];
        });
        setHasMore(latest.length===100);setError('');
      }
      setLoading(false);
    };
    void fetchRows();
    const channel = db.channel(`${table}:${coupleId}:${randomId()}`)
      .on('system', {}, message => { if (active && message.extension==='postgres_changes') { setConnected(message.status==='ok'); if(message.status==='ok') void fetchRows(); } })
      .on('postgres_changes', { event:'*', schema:'public', table, filter:`couple_id=eq.${coupleId}` }, () => { clearTimeout(updateTimer); updateTimer=window.setTimeout(()=>void fetchRows(),75); });
    void db.auth.getSession().then(async ({ data }) => {
      if (!active || !data.session) return;
      await db.realtime.setAuth(data.session.access_token);
      if (active) channel.subscribe(status => { if (!active) return; if(status!=='SUBSCRIBED')setConnected(false); });
    }).catch(() => { if (active) setConnected(false); });
    // Reconcile after reconnect/focus, even if a WebSocket update was missed.
    const focus = () => void fetchRows();
    const timer = window.setInterval(focus, 30000);
    window.addEventListener('focus', focus);
    return () => { active=false; request++; epoch.current++; clearInterval(timer); clearTimeout(updateTimer); window.removeEventListener('focus',focus); void db.removeChannel(channel); };
  }, [table, coupleId, revision, range?.[0], range?.[1]]);
  const loadMore = async () => {
    if(!coupleId || loadingMore || !rows.length)return;
    const generation=epoch.current;
    const cursor=rows[rows.length-1];
    setLoadingMore(true);
    try {
      let query=requireSupabase().from(table).select('*').eq('couple_id',coupleId);
      if(range)query=query.gte('event_date',range[0]).lte('event_date',range[1]);
      const {data,error}=await query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100);
      if(generation!==epoch.current)return;
      if(error)throw error;
      const older=(data||[]) as T[];
      setRows(current=>{const seen=new Set(current.map(row=>row.id));return [...current,...older.filter(row=>!seen.has(row.id))];});
      setHasMore(older.length===100);setError('');
    }catch{if(generation===epoch.current)setError('Could not load earlier moments. Please try again.');}finally{if(generation===epoch.current)setLoadingMore(false);}
  };
  return { rows, error, loading, connected, reload, hasMore, loadingMore, loadMore };
}
