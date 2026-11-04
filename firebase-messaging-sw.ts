/// <reference lib="webworker" />
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig } from './services/firebaseConfig';
const worker = self as unknown as ServiceWorkerGlobalScope;
const messaging = getMessaging(initializeApp(firebaseConfig));
onBackgroundMessage(messaging, payload => {
  const route = ['/chat','/calendar','/memories'].includes(payload.data?.route || '') ? payload.data!.route : '/';
  return worker.registration.showNotification('Aura', {
    body:'A shared moment is waiting for you. 💕', tag:payload.data?.job_id || 'aura',
    data:{url:`${worker.location.origin}/#${route}`},
  });
});
worker.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', worker.location.origin);
  if (target.origin !== worker.location.origin) return;
  event.waitUntil(worker.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients => {
    const client = clients.find(c=>new URL(c.url).origin === target.origin) as WindowClient | undefined;
    if (client) { await client.navigate(target.href); await client.focus(); }
    else await worker.clients.openWindow(target.href);
  }));
});
