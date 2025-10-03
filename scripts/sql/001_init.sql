-- Extensions
create extension if not exists "pgcrypto";

-- Devices
create table if not exists public.devices (
  id text primary key,
  name text not null,
  status text not null check (status in ('available','busy','stopped')),
  mb_per_minute numeric not null
);
alter table public.devices enable row level security;

-- Sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
alter table public.sessions enable row level security;

-- Session segments
create table if not exists public.session_segments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  device_id text not null references public.devices(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  mb_used numeric
);
alter table public.session_segments enable row level security;

-- Optional: read-only policies for anon (service_role bypasses RLS automatically)
drop policy if exists "ro_devices" on public.devices;
create policy "ro_devices" on public.devices for select using (true);

drop policy if exists "ro_sessions" on public.sessions;
create policy "ro_sessions" on public.sessions for select using (true);

drop policy if exists "ro_segments" on public.session_segments;
create policy "ro_segments" on public.session_segments for select using (true);
