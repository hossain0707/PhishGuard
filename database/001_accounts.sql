-- Back up the database and review existing tables before running. No tables are dropped.
begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  created_at timestamptz not null default now()
);
create table if not exists public.extension_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id uuid not null,
  browser_type text not null check (browser_type in ('Chrome', 'Edge', 'Firefox')),
  extension_version text not null check (char_length(extension_version) <= 32),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, installation_id)
);
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='extension_sessions' and column_name='installation_id') then
    raise exception 'Existing extension_sessions needs a reviewed schema migration. No changes committed.';
  end if;
end $$;
alter table public.profiles enable row level security;
alter table public.extension_sessions enable row level security;
revoke all on public.profiles, public.extension_sessions from public, anon;
grant select, insert, update, delete on public.profiles, public.extension_sessions to authenticated;
drop policy if exists profiles_owner_guard on public.profiles;
create policy profiles_owner_guard on public.profiles as restrictive for all to public using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists sessions_owner_guard on public.extension_sessions;
create policy sessions_owner_guard on public.extension_sessions as restrictive for all to public using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists sessions_owner on public.extension_sessions;
create policy sessions_owner on public.extension_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index if not exists extension_sessions_user_idx on public.extension_sessions(user_id);
create or replace function public.phishguard_sync_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name) values (new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),100))
  on conflict (id) do update set full_name=excluded.full_name;
  return new;
end; $$;
revoke all on function public.phishguard_sync_profile() from public, anon, authenticated;
drop trigger if exists phishguard_profile_sync on auth.users;
create trigger phishguard_profile_sync after insert or update of raw_user_meta_data on auth.users for each row execute function public.phishguard_sync_profile();
insert into public.profiles(id,full_name) select id,left(coalesce(raw_user_meta_data->>'full_name',''),100) from auth.users on conflict(id) do nothing;
commit;
