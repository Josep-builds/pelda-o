-- Peldaño — F2: enforce image-only, <=5MB at the storage bucket level.
-- Paste this into the Supabase SQL editor and run it.

update storage.buckets
set
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'evidence';
