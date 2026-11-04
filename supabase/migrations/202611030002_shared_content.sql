create table public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_couple_time_idx on public.messages(couple_id, created_at desc, id);
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null check (length(trim(title)) between 1 and 150),
  event_date date not null,
  description text not null default '' check (length(description) <= 4000),
  created_at timestamptz not null default now()
);
create index calendar_couple_date_idx on public.calendar_events(couple_id, event_date);
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  type text not null check (type in ('photo','note')),
  title text not null check (length(trim(title)) between 1 and 150),
  content text not null default '' check (length(content) <= 4000),
  image_path text,
  location text not null default '' check (length(location) <= 150),
  memory_date date not null default current_date,
  created_at timestamptz not null default now(),
  check ((type = 'photo' and image_path is not null and image_path like couple_id::text || '/%') or (type = 'note' and image_path is null))
);
create index memories_couple_time_idx on public.memories(couple_id, created_at desc);

alter table public.messages enable row level security;
alter table public.calendar_events enable row level security;
alter table public.memories enable row level security;
revoke all on public.messages, public.calendar_events, public.memories from anon, authenticated;
grant select on public.messages, public.calendar_events, public.memories to authenticated;
grant insert (id, couple_id, author_id, body) on public.messages to authenticated;
grant insert (couple_id, author_id, title, event_date, description) on public.calendar_events to authenticated;
grant update (title, event_date, description) on public.calendar_events to authenticated;
grant delete on public.calendar_events, public.memories to authenticated;
grant insert (couple_id, author_id, type, title, content, image_path, location, memory_date) on public.memories to authenticated;
create policy messages_read on public.messages for select to authenticated using (public.is_couple_member(couple_id));
create policy messages_send on public.messages for insert to authenticated with check (author_id = auth.uid() and public.is_couple_member(couple_id));
create policy calendar_read on public.calendar_events for select to authenticated using (public.is_couple_member(couple_id));
create policy calendar_add on public.calendar_events for insert to authenticated with check (author_id = auth.uid() and public.is_couple_member(couple_id));
create policy calendar_edit on public.calendar_events for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy calendar_delete on public.calendar_events for delete to authenticated using (public.is_couple_member(couple_id));
create policy memories_read on public.memories for select to authenticated using (public.is_couple_member(couple_id));
create policy memories_add on public.memories for insert to authenticated with check (author_id = auth.uid() and public.is_couple_member(couple_id));
create policy memories_delete on public.memories for delete to authenticated using (author_id = auth.uid() and public.is_couple_member(couple_id));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('memories','memories',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
-- Guard the UUID cast: arbitrary object paths must not cause a policy exception.
create function public.storage_couple_member(object_name text) returns boolean
language sql stable set search_path = '' as $$
  select case when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.is_couple_member(split_part(object_name, '/', 1)::uuid) else false end;
$$;
revoke all on function public.storage_couple_member(text) from public, anon;
grant execute on function public.storage_couple_member(text) to authenticated;
create policy memory_files_read on storage.objects for select to authenticated using (bucket_id = 'memories' and public.storage_couple_member(name));
create policy memory_files_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'memories' and public.storage_couple_member(name) and split_part(name,'/',2) = auth.uid()::text);
create policy memory_files_delete on storage.objects for delete to authenticated using (
  bucket_id = 'memories' and public.storage_couple_member(name) and split_part(name,'/',2) = auth.uid()::text);

alter publication supabase_realtime add table public.messages, public.calendar_events, public.memories;
