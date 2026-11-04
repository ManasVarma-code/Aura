import { randomId } from './randomId';
import { requireSupabase } from './supabase';
export interface MessageRow { id: string; couple_id: string; author_id: string; body: string; created_at: string }
export interface EventRow { id: string; couple_id: string; author_id: string; title: string; event_date: string; description: string; created_at: string }
export interface MemoryRow { id: string; couple_id: string; author_id: string; type: 'note'|'photo'; title: string; content: string; image_path: string|null; location: string; memory_date: string; created_at: string }
export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export async function sendMessage(coupleId: string, body: string, id: string, authorId: string) {
  const { error } = await requireSupabase().from('messages').insert({ id, couple_id: coupleId, author_id: authorId, body: body.trim() });
  if (error?.code === '23505') {
    const existing = await requireSupabase().from('messages').select('author_id,body,couple_id').eq('id', id).maybeSingle();
    if (!existing.error && existing.data?.author_id === authorId && existing.data?.body === body.trim() && existing.data?.couple_id === coupleId) return;
  }
  if (error) throw error;
}
export async function addEvent(coupleId: string, title: string, date: string, description = '') {
  const { error } = await requireSupabase().from('calendar_events').insert({ couple_id:coupleId, title:title.trim(), event_date:date, description });
  if (error) throw error;
}
export async function deleteEvent(id: string) {
  const { error } = await requireSupabase().from('calendar_events').delete().eq('id', id);
  if (error) throw error;
}
export async function addMemory(coupleId: string, userId: string, values: { title:string; content:string; location:string; memory_date:string }, file?:File) {
  const db = requireSupabase();
  let path: string | null = null;
  if (file) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10*1024*1024) throw new Error('Choose a JPEG, PNG or WebP photo up to 10 MB.');
    const extension = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' }[file.type];
    path = `${coupleId}/${userId}/${randomId()}.${extension}`;
    const { error } = await db.storage.from('memories').upload(path, file, { contentType:file.type, upsert:false });
    if (error) throw error;
  }
  const { error } = await db.from('memories').insert({ ...values, title:values.title.trim(), couple_id:coupleId, type:file ? 'photo':'note', image_path:path });
  if (error) { if (path) await db.storage.from('memories').remove([path]); throw error; }
}
