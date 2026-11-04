import { Capacitor } from '@capacitor/core';
import { requireSupabase, hasPersistentStorage } from './supabase';
import { firebaseConfigured, firebaseConfig } from './firebaseConfig';

const savedToken = () => { try { return localStorage.getItem('aura_push_token'); } catch { return null; } };
let allowRegistration = true;
const registrations = new Set<Promise<unknown>>();
async function webMessaging() {
  if (!firebaseConfigured || !import.meta.env.VITE_FIREBASE_VAPID_KEY) throw new Error('Push notifications are not configured yet.');
  const [{getApps,initializeApp}, {getMessaging,isSupported}] = await Promise.all([import('firebase/app'),import('firebase/messaging')]);
  if (!await isSupported()) throw new Error('Push notifications are not supported on this device.');
  return getMessaging(getApps()[0] || initializeApp(firebaseConfig));
}
export async function enableNotifications() {
  if (import.meta.env.VITE_AURA_PREVIEW || !hasPersistentStorage) throw new Error('Open Aura in a browser tab to enable notifications.');
  allowRegistration=true;
  let token: string;
  if (Capacitor.isNativePlatform()) {
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
    const permission = await FirebaseMessaging.requestPermissions();
    if (permission.receive !== 'granted') throw new Error('Notification permission was not granted.');
    token = (await FirebaseMessaging.getToken()).token;
  } else {
    const messaging = await webMessaging();
    if (await Notification.requestPermission() !== 'granted') throw new Error('Notification permission was not granted.');
    const { default: workerUrl } = await import('../firebase-messaging-sw.ts?worker&url');
    const registration = await navigator.serviceWorker.register(workerUrl,{type:'module'});
    await new Promise<void>((resolve,reject)=>{
      const worker=registration.installing || registration.waiting || registration.active;
      if (worker?.state === 'activated') return resolve();
      const timer=setTimeout(()=>reject(new Error('Notification setup timed out. Please try again.')),15000);
      worker?.addEventListener('statechange',()=>{ if(worker.state==='activated'){clearTimeout(timer);resolve();} if(worker.state==='redundant'){clearTimeout(timer);reject(new Error('Notification setup failed.'));} });
    });
    const {getToken} = await import('firebase/messaging');
    token = await getToken(messaging,{vapidKey:import.meta.env.VITE_FIREBASE_VAPID_KEY,serviceWorkerRegistration:registration});
  }
  if (!token) throw new Error('Could not register this device for notifications.');
  const { error } = await requireSupabase().rpc('register_device_token',{device_token:token,device_platform:Capacitor.getPlatform()});
  if (error) throw error;
  localStorage.setItem('aura_push_token',token);
  window.dispatchEvent(new Event('aura:push-enabled'));
}
export async function disableNotifications() {
  if (import.meta.env.VITE_AURA_PREVIEW) return;
  allowRegistration=false;
  await Promise.allSettled([...registrations]);
  const activeToken = savedToken();
  if (!activeToken) return;
  if (activeToken) {
    const {error} = await requireSupabase().rpc('remove_device_token',{device_token:activeToken});
    if (error) {
      if (!Capacitor.isNativePlatform() && firebaseConfigured) { const {deleteToken}=await import('firebase/messaging'); await deleteToken(await webMessaging()); }
      throw error;
    }
  }
  if (Capacitor.isNativePlatform()) {
    const {FirebaseMessaging} = await import('@capacitor-firebase/messaging'); await FirebaseMessaging.deleteToken();
  } else if (firebaseConfigured) {
    const {deleteToken} = await import('firebase/messaging'); await deleteToken(await webMessaging());
  }
  localStorage.removeItem('aura_push_token');
}

export async function watchNotifications(userId:string, receive:(route:string)=>void):Promise<()=>void> {
  if (import.meta.env.VITE_AURA_PREVIEW || !hasPersistentStorage) return () => {};
  const db=requireSupabase();
  allowRegistration=!!savedToken();
  const routeFrom = (data:unknown):unknown => data && typeof data==='object' && 'route' in data ? data.route : undefined;
  const notify=(route:unknown)=>receive(typeof route==='string' && ['/chat','/calendar','/memories'].includes(route) ? route : '/');
  const register=async(token:string)=>{
    const session=await db.auth.getSession();
    if(!allowRegistration || session.data.session?.user.id!==userId)return;
    const pending=Promise.resolve(db.rpc('register_device_token',{device_token:token,device_platform:Capacitor.getPlatform()}));
    registrations.add(pending);
    try { const {error}=await pending; if(!error)localStorage.setItem('aura_push_token',token); } finally { registrations.delete(pending); }
  };
  if(Capacitor.isNativePlatform()) {
    const {FirebaseMessaging}=await import('@capacitor-firebase/messaging');
    const token=await FirebaseMessaging.addListener('tokenReceived',event=>void register(event.token));
    const foreground=await FirebaseMessaging.addListener('notificationReceived',event=>notify(routeFrom(event.notification.data)));
    const action=await FirebaseMessaging.addListener('notificationActionPerformed',event=>{const route=routeFrom(event.notification.data);notify(route);window.location.hash=typeof route==='string' && ['/chat','/calendar','/memories'].includes(route) ? route : '/';});
    if(savedToken())void register(savedToken()!);
    return ()=>{void token.remove();void foreground.remove();void action.remove();};
  }
  if(!firebaseConfigured || !savedToken() || Notification.permission!=='granted')return ()=>{};
  const messaging=await webMessaging();
  const {onMessage}=await import('firebase/messaging');
  await register(savedToken()!);
  return onMessage(messaging,payload=>notify(payload.data?.route));
}
