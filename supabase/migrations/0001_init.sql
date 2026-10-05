-- Peldaño — F1: core schema + RLS (PACKET.md §9)
-- Paste this into the Supabase SQL editor (Database → SQL Editor) and run it.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row the first time someone signs in with Google.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- entries
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('platform_history', 'observer_attestation')),
  fields jsonb not null default '{}'::jsonb,
  verification text not null check (verification in ('ai_read_self_confirmed', 'observer_attested')),
  observer_id uuid references auth.users (id),
  status text not null default 'active' check (status in ('active', 'hidden', 'replaced')),
  replaces_id uuid references public.entries (id),
  signature text,
  signed_payload_hash text,
  created_at timestamptz not null default now()
);

create index if not exists entries_owner_id_idx on public.entries (owner_id);

alter table public.entries enable row level security;

create policy "entries_select_own"
  on public.entries for select
  using (auth.uid() = owner_id);

create policy "entries_insert_own"
  on public.entries for insert
  with check (auth.uid() = owner_id);

create policy "entries_update_own"
  on public.entries for update
  using (auth.uid() = owner_id);

create policy "entries_delete_own"
  on public.entries for delete
  using (auth.uid() = owner_id);

-- Observer-attested entries and public share reads are written/read by
-- server routes using the service role key, which bypasses RLS by design.
-- No client-facing policy grants that access.

-- ---------------------------------------------------------------------------
-- attestation_requests
-- ---------------------------------------------------------------------------
create table if not exists public.attestation_requests (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  context text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists attestation_requests_owner_id_idx on public.attestation_requests (owner_id);

alter table public.attestation_requests enable row level security;

create policy "attestation_requests_select_own"
  on public.attestation_requests for select
  using (auth.uid() = owner_id);

create policy "attestation_requests_insert_own"
  on public.attestation_requests for insert
  with check (auth.uid() = owner_id);

create policy "attestation_requests_update_own"
  on public.attestation_requests for update
  using (auth.uid() = owner_id);

create policy "attestation_requests_delete_own"
  on public.attestation_requests for delete
  using (auth.uid() = owner_id);

-- An observer never reads or writes this table directly: the
-- /atestiguar/[token] flow validates the token through a server route
-- using the service role key, then marks it used.

-- ---------------------------------------------------------------------------
-- share_links
-- ---------------------------------------------------------------------------
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  entry_ids uuid[] not null default '{}',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists share_links_owner_id_idx on public.share_links (owner_id);

alter table public.share_links enable row level security;

create policy "share_links_select_own"
  on public.share_links for select
  using (auth.uid() = owner_id);

create policy "share_links_insert_own"
  on public.share_links for insert
  with check (auth.uid() = owner_id);

create policy "share_links_update_own"
  on public.share_links for update
  using (auth.uid() = owner_id);

create policy "share_links_delete_own"
  on public.share_links for delete
  using (auth.uid() = owner_id);

-- The public /v/[token] verifier page never queries this table directly;
-- a server route reads it with the service role key.

-- ---------------------------------------------------------------------------
-- storage: private "evidence" bucket, owner-only (path prefixed by owner id)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

create policy "evidence_select_own"
  on storage.objects for select
  using (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "evidence_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "evidence_update_own"
  on storage.objects for update
  using (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "evidence_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Upload convention: evidence/<owner_id>/<file>. The owner_id path segment
-- is what the policies above check against auth.uid().
