-- Tokens, job payloads, and delivery state are never readable by browser clients.
create table private.device_tokens (
  token text primary key check (length(token) between 20 and 4096),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('web','android','ios')),
  updated_at timestamptz not null default now()
);
create index device_tokens_user_idx on private.device_tokens(user_id);
create table private.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  recipient uuid not null references public.profiles(id) on delete cascade,
  actor uuid not null references public.profiles(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  route text not null check (route in ('/chat','/calendar','/memories')),
  state text not null default 'pending' check (state in ('pending','processing','sent','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  created_at timestamptz not null default now()
);
create index notification_jobs_pending_idx on private.notification_jobs(state,available_at);
alter table private.device_tokens enable row level security;
alter table private.notification_jobs enable row level security;

create function public.register_device_token(device_token text, device_platform text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  if not exists(select 1 from private.device_tokens where token=device_token and user_id=auth.uid())
    and (select count(*) from private.device_tokens where user_id=auth.uid())>=10 then
    delete from private.device_tokens where token=(select token from private.device_tokens where user_id=auth.uid() order by updated_at limit 1);
  end if;
  insert into private.device_tokens(token,user_id,platform) values (device_token,auth.uid(),device_platform)
    on conflict(token) do update set user_id=auth.uid(),platform=excluded.platform,updated_at=now();
end;
$$;
create function public.remove_device_token(device_token text) returns void
language sql security definer set search_path = '' as $$
  delete from private.device_tokens where token=device_token and user_id=auth.uid();
$$;
revoke all on function public.register_device_token(text,text),public.remove_device_token(text) from public,anon;
grant execute on function public.register_device_token(text,text),public.remove_device_token(text) to authenticated;

create function private.enqueue_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.notification_jobs(recipient,actor,couple_id,route)
    select profile_id,new.author_id,new.couple_id,
      case tg_table_name when 'messages' then '/chat' when 'calendar_events' then '/calendar' else '/memories' end
    from public.couple_members where couple_id=new.couple_id and profile_id<>new.author_id;
  return new;
end;
$$;
create trigger messages_notify after insert on public.messages for each row execute function private.enqueue_notification();
create trigger calendar_notify after insert on public.calendar_events for each row execute function private.enqueue_notification();
create trigger memories_notify after insert on public.memories for each row execute function private.enqueue_notification();

-- Only a trusted server worker can lease jobs. Expired leases are retried.
create function public.claim_notification_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare jobs jsonb;
begin
  update private.notification_jobs set state='failed' where state='processing' and locked_at<now()-interval '5 minutes' and attempts>=5;
  with candidates as (
    select id from private.notification_jobs where
      ((state='pending' and available_at<=now()) or (state='processing' and locked_at<now()-interval '5 minutes'))
      and attempts<5 order by created_at limit 10 for update skip locked
  ), claimed as (
    update private.notification_jobs j set state='processing',locked_at=now(),attempts=attempts+1
      from candidates c where j.id=c.id returning j.*
  ) select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'route',j.route,'tokens',(
    select coalesce(jsonb_agg(t.token),'[]'::jsonb) from private.device_tokens t
    where t.user_id=j.recipient
      and exists(select 1 from public.couple_members where profile_id=j.recipient and couple_id=j.couple_id)
      and exists(select 1 from public.couple_members where profile_id=j.actor and couple_id=j.couple_id)
  ))),'[]'::jsonb) into jobs from claimed j;
  return jobs;
end;
$$;
create function public.finish_notification_job(job_id uuid, succeeded boolean, invalid_tokens text[] default '{}') returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.device_tokens where token=any(invalid_tokens)
    and user_id=(select recipient from private.notification_jobs where id=job_id);
  update private.notification_jobs set state=case when succeeded then 'sent' when attempts>=5 then 'failed' else 'pending' end,
    available_at=now()+interval '5 minutes',locked_at=null where id=job_id and state='processing';
end;
$$;
revoke all on function public.claim_notification_jobs(),public.finish_notification_job(uuid,boolean,text[]) from public,anon,authenticated;
grant execute on function public.claim_notification_jobs(),public.finish_notification_job(uuid,boolean,text[]) to service_role;
