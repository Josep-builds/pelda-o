-- Peldaño — F5 hardening fix.
-- Paste this into the Supabase SQL editor and run it.
--
-- Bug: entries.observer_id had no ON DELETE behavior (default NO ACTION),
-- so deleting an observer's auth.users row would fail with a foreign key
-- violation if they had ever attested someone else's work — i.e. account
-- deletion was broken for anyone who had ever verified another worker.
-- The signed entry's own `fields.observer_id` (part of the signed, hashed
-- payload) still preserves who attested it even if this column goes null.

alter table public.entries
  drop constraint entries_observer_id_fkey;

alter table public.entries
  add constraint entries_observer_id_fkey
  foreign key (observer_id) references auth.users (id) on delete set null;
