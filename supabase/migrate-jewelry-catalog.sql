-- =============================================================================
-- Katalog tempahan jewelry (GLOBAL untuk semua outlet)
-- =============================================================================
-- Jalankan fail ini SEKALI dalam Supabase Dashboard > SQL Editor.
-- Ia mencipta:
--   1. jadual public.kiosk_catalog_items (butiran produk + URL gambar)
--   2. bucket Storage public `jewelry-catalog` untuk gambar produk
--   3. polisi RLS: awam BOCA, admin sahaja TULIS
--   4. Realtime untuk kemas kini serta-merta di tablet kaunter
--
-- Jadual ini TIDAK menjejaskan harga / poster / resit sedia ada.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Jadual produk katalog
-- ---------------------------------------------------------------------------
create table if not exists public.kiosk_catalog_items (
  id text primary key,
  name text not null default '',
  category text not null default '',
  description text not null default '',
  price numeric(12, 2) not null default 0,
  image_url text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kesiapan untuk pangkalan yang sudah ada versi awal jadual ini.
alter table public.kiosk_catalog_items
  add column if not exists name text not null default '',
  add column if not exists category text not null default '',
  add column if not exists description text not null default '',
  add column if not exists price numeric(12, 2) not null default 0,
  add column if not exists image_url text not null default '',
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists kiosk_catalog_items_active_sort_idx
  on public.kiosk_catalog_items (is_active, sort_order, created_at);

create or replace function public.kiosk_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kiosk_catalog_items_set_updated_at on public.kiosk_catalog_items;
create trigger kiosk_catalog_items_set_updated_at
  before update on public.kiosk_catalog_items
  for each row execute function public.kiosk_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. RLS: kiosk baca sahaja; admin (dari schema.sql) sahaja tulis
-- ---------------------------------------------------------------------------
alter table public.kiosk_catalog_items enable row level security;
alter table public.kiosk_catalog_items force row level security;

drop policy if exists "Kiosk catalog readable" on public.kiosk_catalog_items;
drop policy if exists "Kiosk admins can insert catalog" on public.kiosk_catalog_items;
drop policy if exists "Kiosk admins can update catalog" on public.kiosk_catalog_items;
drop policy if exists "Kiosk admins can delete catalog" on public.kiosk_catalog_items;

create policy "Kiosk catalog readable"
  on public.kiosk_catalog_items
  for select to anon, authenticated
  using (true);

create policy "Kiosk admins can insert catalog"
  on public.kiosk_catalog_items
  for insert to authenticated
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can update catalog"
  on public.kiosk_catalog_items
  for update to authenticated
  using (public.is_kiosk_admin())
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can delete catalog"
  on public.kiosk_catalog_items
  for delete to authenticated
  using (public.is_kiosk_admin());

revoke all on public.kiosk_catalog_items from anon, authenticated;
grant select on public.kiosk_catalog_items to anon, authenticated;
grant insert, update, delete on public.kiosk_catalog_items to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Storage bucket untuk gambar produk
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jewelry-catalog',
  'jewelry-catalog',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Catalog images are publicly readable" on storage.objects;
drop policy if exists "Kiosk admins can upload catalog images" on storage.objects;
drop policy if exists "Kiosk admins can update catalog images" on storage.objects;
drop policy if exists "Kiosk admins can delete catalog images" on storage.objects;

create policy "Catalog images are publicly readable"
  on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'jewelry-catalog');

create policy "Kiosk admins can upload catalog images"
  on storage.objects
  for insert to authenticated
  with check (bucket_id = 'jewelry-catalog' and public.is_kiosk_admin());

create policy "Kiosk admins can update catalog images"
  on storage.objects
  for update to authenticated
  using (bucket_id = 'jewelry-catalog' and public.is_kiosk_admin())
  with check (bucket_id = 'jewelry-catalog' and public.is_kiosk_admin());

create policy "Kiosk admins can delete catalog images"
  on storage.objects
  for delete to authenticated
  using (bucket_id = 'jewelry-catalog' and public.is_kiosk_admin());

-- ---------------------------------------------------------------------------
-- 4. Realtime — katalog berubah terus muncul di semua tablet
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kiosk_catalog_items'
  ) then
    alter publication supabase_realtime add table public.kiosk_catalog_items;
  end if;
exception
  when undefined_object then
    raise notice 'Publication supabase_realtime tidak ditemui — enable Realtime dalam dashboard.';
end $$;

-- Beritahu PostgREST supaya memuat semula schema cache (jadual + kolum baharu).
notify pgrst, 'reload schema';
