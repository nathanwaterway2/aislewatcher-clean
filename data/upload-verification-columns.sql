alter table public.upload_batches
  add column if not exists upload_lat double precision,
  add column if not exists upload_long double precision,
  add column if not exists upload_accuracy_m double precision,
  add column if not exists upload_location_captured_at timestamptz,
  add column if not exists upload_location_source text,
  add column if not exists client_timezone text;

alter table public.uploads
  add column if not exists photo_taken_at timestamptz,
  add column if not exists photo_lat double precision,
  add column if not exists photo_long double precision,
  add column if not exists photo_metadata jsonb;

create index if not exists upload_batches_upload_location_idx
  on public.upload_batches (upload_lat, upload_long);

create index if not exists uploads_photo_location_idx
  on public.uploads (photo_lat, photo_long);

create index if not exists uploads_photo_taken_at_idx
  on public.uploads (photo_taken_at);
