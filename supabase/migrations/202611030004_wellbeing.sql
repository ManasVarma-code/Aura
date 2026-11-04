create table public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  mood text not null check (mood in ('Happy','Calm','Tired','Loving','Excited')),
  checkin_date date not null,
  created_at timestamptz not null default now(),
  unique (author_id,checkin_date)
);
create index mood_couple_date_idx on public.mood_checkins(couple_id,checkin_date);
alter table public.mood_checkins enable row level security;
revoke all on public.mood_checkins from anon,authenticated;
grant select on public.mood_checkins to authenticated;
create policy mood_read on public.mood_checkins for select to authenticated using (public.is_couple_member(couple_id));
create function public.record_mood(checkin_mood text, checkin_day date) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if checkin_day is null or checkin_day<current_date-1 or checkin_day>current_date+1 then raise exception 'Choose today for your check-in'; end if;
  select couple_id into target from public.couple_members where profile_id=auth.uid();
  if target is null then raise exception 'Link your partner first'; end if;
  insert into public.mood_checkins(author_id,couple_id,mood,checkin_date) values(auth.uid(),target,checkin_mood,checkin_day)
    on conflict(author_id,checkin_date) do update set mood=excluded.mood;
end;
$$;
revoke all on function public.record_mood(text,date) from public,anon;
grant execute on function public.record_mood(text,date) to authenticated;

-- Cycle information is private by default. Sharing is a separate, explicit opt-in.
create table public.cycle_settings (
  author_id uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
  last_period date not null,
  cycle_length integer not null check (cycle_length between 21 and 45),
  period_length integer not null check (period_length between 2 and 10 and period_length<cycle_length),
  share_with_partner boolean not null default false
);
alter table public.cycle_settings enable row level security;
revoke all on public.cycle_settings from anon,authenticated;
grant select,insert,update,delete on public.cycle_settings to authenticated;
create policy cycle_read on public.cycle_settings for select to authenticated using (
  author_id=auth.uid() or (share_with_partner and exists(
    select 1 from public.couple_members m where m.profile_id=author_id and public.is_couple_member(m.couple_id)
  ))
);
create policy cycle_add on public.cycle_settings for insert to authenticated with check (author_id=auth.uid());
create policy cycle_edit on public.cycle_settings for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid());
create policy cycle_delete on public.cycle_settings for delete to authenticated using (author_id=auth.uid());

create function public.get_couple_stats() returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'messages',(select count(*) from public.messages),
    'memories',(select count(*) from public.memories),
    'events',(select count(*) from public.calendar_events),
    'checkins',(select count(*) from public.mood_checkins)
  );
$$;
-- SECURITY INVOKER: each aggregate is constrained by the caller's RLS policies.
revoke all on function public.get_couple_stats() from public,anon;
grant execute on function public.get_couple_stats() to authenticated;
