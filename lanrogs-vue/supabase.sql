-- =====================================================================
-- Lanrogs database
-- Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
-- Safe to run more than once.
--
-- Who can see what:
--   * every user : only their OWN profile and their OWN flashcards / quizzes / scores
--   * admins     : the user list, the user counts and the contact messages
--                  (admins can NOT read anybody's flashcards or quizzes)
--   * visitors   : can only SEND a contact message
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text        not null default '' check (char_length(display_name) <= 60),
  native       text        not null default '' check (char_length(native) <= 60),
  learning     text        not null default '' check (char_length(learning) <= 120),
  goal         int         not null default 10 check (goal between 1 and 500),
  bio          text        not null default '' check (char_length(bio) <= 300),
  avatar       text        not null default '' check (char_length(avatar) <= 300000),
  design       jsonb       not null default '{}'::jsonb check (octet_length(design::text) <= 600000),
  role         text        not null default 'user' check (role in ('user', 'admin')),
  created_at   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb check (octet_length(data::text) <= 8000000),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid references auth.users(id) on delete set null,
  name       text not null check (char_length(name)    between 1 and 120),
  email      text not null check (char_length(email)   between 3 and 200),
  message    text not null check (char_length(message) between 1 and 4000)
);

create index if not exists profiles_last_seen_idx on public.profiles (last_seen);
create index if not exists messages_created_idx   on public.messages (created_at desc);

-- ---------- helper functions ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Creates a profile row automatically when somebody signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)), 60)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for accounts that already exist (harmless if there are none).
insert into public.profiles (id, email, display_name)
select id, email, left(split_part(email, '@', 1), 60) from auth.users
on conflict (id) do nothing;

-- Normal users can never change their own role, email or join date.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role       := old.role;
    new.email      := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile();

-- The site calls this about once a minute while a tab is open and visible.
create or replace function public.heartbeat() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_seen = now() where id = auth.uid();
$$;

-- Admin only: counts. "Active now" = seen in the last 5 minutes.
create or replace function public.admin_stats() returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return json_build_object(
    'total',        (select count(*) from public.profiles),
    'active_now',   (select count(*) from public.profiles where last_seen > now() - interval '5 minutes'),
    'active_today', (select count(*) from public.profiles where last_seen > now() - interval '24 hours'),
    'active_week',  (select count(*) from public.profiles where last_seen > now() - interval '7 days'),
    'new_week',     (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'messages',     (select count(*) from public.messages)
  );
end $$;

-- Admin only: the user list.
create or replace function public.admin_users()
returns table (
  id uuid, email text, display_name text, native text, learning text,
  role text, created_at timestamptz, last_seen timestamptz, is_active boolean
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select p.id, p.email, p.display_name, p.native, p.learning, p.role, p.created_at, p.last_seen,
           (p.last_seen > now() - interval '5 minutes')
    from public.profiles p
    order by p.last_seen desc
    limit 1000;
end $$;

-- Lets a signed-in user delete their own account and everything in it.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.is_admin(), public.heartbeat(), public.admin_stats(),
                       public.admin_users(), public.delete_my_account() from public, anon;
grant execute on function public.is_admin(), public.heartbeat(), public.admin_stats(),
                          public.admin_users(), public.delete_my_account() to authenticated;

-- ---------- row level security ----------
alter table public.profiles  enable row level security;
alter table public.user_data enable row level security;
alter table public.messages  enable row level security;

-- profiles
drop policy if exists "profiles select" on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles insert" on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'user');
create policy "profiles update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- user_data: strictly private to its owner (not even admins)
drop policy if exists "user_data own" on public.user_data;
create policy "user_data own" on public.user_data for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages: anyone can send, only admins can read or delete
drop policy if exists "messages insert" on public.messages;
drop policy if exists "messages select" on public.messages;
drop policy if exists "messages delete" on public.messages;
create policy "messages insert" on public.messages for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
create policy "messages select" on public.messages for select to authenticated
  using (public.is_admin());
create policy "messages delete" on public.messages for delete to authenticated
  using (public.is_admin());

-- ---------- contact form protection ----------
-- Basic e-mail shape check (NOT VALID = does not re-check old rows, so this is safe to re-run).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'messages_email_format') then
    alter table public.messages
      add constraint messages_email_format check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') not valid;
  end if;
end $$;

-- Stops a bot from flooding the table: at most 20 messages per 10 minutes for the whole site.
create or replace function public.limit_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Too many messages right now. Please try again later.';
  end if;
  return new;
end $$;

drop trigger if exists limit_messages_insert on public.messages;
create trigger limit_messages_insert
  before insert on public.messages
  for each row execute function public.limit_messages();

-- =====================================================================
-- MAKE YOURSELF ADMIN (do this once, AFTER you created your own account on the site).
-- Run this in the SQL Editor with YOUR login email. Do not save your email in this file
-- if the repository is public.
--
--   update public.profiles set role = 'admin' where email = 'YOUR-LOGIN-EMAIL';
-- =====================================================================
