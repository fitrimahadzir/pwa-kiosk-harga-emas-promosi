-- =============================================================================
-- Gold Reserve Kiosk — hardened schema (Supabase Auth for admins)
-- =============================================================================
-- Model keselamatan:
--   * Kiosk / outlet  -> HANYA baca (anon, read-only). Tiada kod, tiada tulis.
--   * Admin           -> Supabase Auth (e-mel + kata laluan) + baris dalam
--                        public.kiosk_admins. Hanya pengguna ini boleh tulis.
--
-- Cara guna:
--   1. Jalankan fail ini dalam Supabase SQL Editor (sekali; ia idempotent).
--   2. Dashboard > Authentication > Users > Add user (e-mel + kata laluan).
--   3. Daftarkan pengguna itu sebagai admin:
--        insert into public.kiosk_admins (user_id, email)
--        select id, email from auth.users where email = 'admin@kedai.com'
--        on conflict (user_id) do update set is_active = true;
--   4. Pastikan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY diset semasa build.
--
-- JANGAN tambah polisi `with check (true)` pada jadual perniagaan.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Jadual asas
-- ---------------------------------------------------------------------------
create table if not exists public.kiosk_outlets (
  -- `code` dikekalkan untuk keserasian sejarah tetapi TIDAK LAGI digunakan
  -- untuk log masuk. Ia tidak boleh dibaca oleh anon.
  code text primary key,
  name text not null,
  -- Maklumat awam cawangan untuk resit / WhatsApp (bukan kelayakan log masuk).
  address text not null default '',
  phone text not null default '',
  role text not null default 'outlet' check (role in ('admin', 'outlet')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kiosk_prices (
  outlet_name text not null,
  purity text not null check (purity in ('999', '916', '375')),
  sell_price numeric not null,
  buy_price numeric not null,
  -- Catatan admin untuk entri harga ini (disalin ke sejarah oleh trigger).
  note text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (outlet_name, purity)
);

-- Poster promosi GLOBAL — satu set poster yang sama untuk semua outlet.
-- Struktur lama (mengikut outlet) akan diganti secara automatik.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'kiosk_promos'
      and column_name = 'outlet_name'
  ) then
    drop table public.kiosk_promos;
  end if;
end $$;

create table if not exists public.kiosk_promos (
  id text primary key,
  image_url text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Butiran pakej bagi setiap poster (dipaparkan pada halaman detail promosi).
-- `add column if not exists` juga menaik taraf jadual sedia ada.
alter table public.kiosk_promos
  add column if not exists title text not null default '',
  add column if not exists description text not null default '',
  add column if not exists package_price numeric(12, 2) not null default 0;

-- Tetapan paparan / resit bagi setiap outlet.
create table if not exists public.kiosk_settings (
  outlet_name text primary key,
  shop_name text not null default '',
  branch text not null default '',
  phone text not null default '',
  address text not null default '',
  tagline text not null default '',
  currency text not null default 'MYR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pengumuman kaunter GLOBAL — satu teks marquee untuk semua outlet.
-- `message` boleh menyimpan berbilang pengumuman: satu baris = satu entri.
create table if not exists public.kiosk_announcement (
  id text primary key default 'counter' check (id = 'counter'),
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Benih teks lalai supaya pita pengumuman sudah kelihatan selepas pemasangan.
insert into public.kiosk_announcement (id, message)
values (
  'counter',
  'Selamat datang ke Gold Reserve. Harga emas dikemaskini setiap hari — sila hubungi kakitangan kaunter untuk sebarang pertanyaan.'
)
on conflict (id) do nothing;

-- Admin = pengguna Supabase Auth yang didaftarkan di sini.
create table if not exists public.kiosk_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  -- Pilihan: hadkan admin kepada satu outlet. Kosong = baca semua resit
  -- (keserasian dengan admin sedia ada).
  outlet_name text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Jejak audit sebenar (ditulis oleh trigger, bukan oleh klien).
create table if not exists public.kiosk_price_history (
  id bigint generated always as identity primary key,
  outlet_name text not null,
  purity text not null,
  old_sell numeric(12, 2),
  new_sell numeric(12, 2),
  old_buy numeric(12, 2),
  new_buy numeric(12, 2),
  changed_by uuid references auth.users (id),
  note text,
  changed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Had / kekangan data
-- ---------------------------------------------------------------------------
alter table public.kiosk_prices
  alter column sell_price type numeric(12, 2),
  alter column buy_price type numeric(12, 2);

-- Migrasi untuk pangkalan data sedia ada (idempotent).
alter table public.kiosk_prices
  add column if not exists note text not null default '';

alter table public.kiosk_promos
  add column if not exists image_url text not null default '',
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.kiosk_settings
  add column if not exists shop_name text not null default '',
  add column if not exists branch text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists address text not null default '',
  add column if not exists tagline text not null default '',
  add column if not exists currency text not null default 'MYR',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Naik taraf pangkalan data sedia ada (idempotent).
alter table public.kiosk_outlets
  add column if not exists address text not null default '',
  add column if not exists phone text not null default '';

alter table public.kiosk_receipts
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists created_by_email text not null default '';

alter table public.kiosk_admins
  add column if not exists outlet_name text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'kiosk_outlets_name_key'
      and conrelid = 'public.kiosk_outlets'::regclass
  ) then
    begin
      alter table public.kiosk_outlets
        add constraint kiosk_outlets_name_key unique (name);
    exception
      when unique_violation then
        raise notice 'Duplicate outlet names exist — dedupe kiosk_outlets.name before adding the unique constraint.';
    end;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'kiosk_prices_nonnegative'
      and conrelid = 'public.kiosk_prices'::regclass
  ) then
    alter table public.kiosk_prices
      add constraint kiosk_prices_nonnegative
      check (sell_price >= 0 and buy_price >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'kiosk_prices_buy_lte_sell'
      and conrelid = 'public.kiosk_prices'::regclass
  ) then
    alter table public.kiosk_prices
      add constraint kiosk_prices_buy_lte_sell
      check (buy_price <= sell_price) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'kiosk_prices_outlet_fkey'
      and conrelid = 'public.kiosk_prices'::regclass
  ) then
    begin
      alter table public.kiosk_prices
        add constraint kiosk_prices_outlet_fkey
        foreign key (outlet_name) references public.kiosk_outlets (name)
        on update cascade on delete restrict not valid;
    exception
      when others then
        raise notice 'Could not add kiosk_prices -> kiosk_outlets FK (check duplicate outlet names).';
    end;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Seed outlet (kod rawak; kod bukan lagi kelayakan log masuk)
-- ---------------------------------------------------------------------------
insert into public.kiosk_outlets (code, name, role, address, phone)
select
  'outlet-' || replace(gen_random_uuid()::text, '-', ''),
  v.name,
  'outlet',
  v.address,
  v.phone
from (values
  ('Amanjaya Mall', 'No. 18-G, Jalan Sultan Ismail, 50250 Kuala Lumpur', '012-8899 375'),
  ('HQ Warehouse', '', '')
) as v(name, address, phone)
where not exists (
  select 1 from public.kiosk_outlets o where o.name = v.name
);

-- Salin alamat/telefon dari kiosk_settings jika sudah dikonfigurasi.
update public.kiosk_outlets o
set
  address = case when nullif(btrim(o.address), '') is null then coalesce(s.address, '') else o.address end,
  phone = case when nullif(btrim(o.phone), '') is null then coalesce(s.phone, '') else o.phone end,
  updated_at = now()
from public.kiosk_settings s
where s.outlet_name = o.name
  and (nullif(btrim(o.address), '') is null or nullif(btrim(o.phone), '') is null);

-- Lumpuhkan/mutar kod legasi yang pernah diterbitkan (HQ / AMANJAYA).
update public.kiosk_outlets
set code = 'legacy-' || replace(gen_random_uuid()::text, '-', ''),
    updated_at = now()
where code in ('HQ', 'AMANJAYA');

-- Seeder harga awal (dijalankan sebagai pemilik jadual, bukan klien).
insert into public.kiosk_prices (outlet_name, purity, sell_price, buy_price)
select t.outlet_name, t.purity, t.sell_price, t.buy_price
from (values
  ('HQ Warehouse', '999', 468.0, 422.0),
  ('HQ Warehouse', '916', 428.0, 382.0),
  ('HQ Warehouse', '375', 188.0, 142.0),
  ('Amanjaya Mall', '999', 468.0, 422.0),
  ('Amanjaya Mall', '916', 428.0, 382.0),
  ('Amanjaya Mall', '375', 188.0, 142.0)
) as t(outlet_name, purity, sell_price, buy_price)
where not exists (
  select 1 from public.kiosk_prices p
  where p.outlet_name = t.outlet_name and p.purity = t.purity
);

-- ---------------------------------------------------------------------------
-- 4. Trigger updated_at + audit
-- ---------------------------------------------------------------------------
create or replace function public.kiosk_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kiosk_outlets_set_updated_at on public.kiosk_outlets;
create trigger kiosk_outlets_set_updated_at
  before update on public.kiosk_outlets
  for each row execute function public.kiosk_set_updated_at();

drop trigger if exists kiosk_prices_set_updated_at on public.kiosk_prices;
create trigger kiosk_prices_set_updated_at
  before update on public.kiosk_prices
  for each row execute function public.kiosk_set_updated_at();

drop trigger if exists kiosk_promos_set_updated_at on public.kiosk_promos;
create trigger kiosk_promos_set_updated_at
  before update on public.kiosk_promos
  for each row execute function public.kiosk_set_updated_at();

drop trigger if exists kiosk_settings_set_updated_at on public.kiosk_settings;
create trigger kiosk_settings_set_updated_at
  before update on public.kiosk_settings
  for each row execute function public.kiosk_set_updated_at();

drop trigger if exists kiosk_announcement_set_updated_at on public.kiosk_announcement;
create trigger kiosk_announcement_set_updated_at
  before update on public.kiosk_announcement
  for each row execute function public.kiosk_set_updated_at();

create or replace function public.kiosk_log_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.kiosk_price_history
      (outlet_name, purity, old_sell, new_sell, old_buy, new_buy, changed_by, note)
    values
      (new.outlet_name, new.purity, null, new.sell_price, null, new.buy_price,
       auth.uid(), nullif(new.note, ''));
  else
    insert into public.kiosk_price_history
      (outlet_name, purity, old_sell, new_sell, old_buy, new_buy, changed_by, note)
    values
      (new.outlet_name, new.purity, old.sell_price, new.sell_price,
       old.buy_price, new.buy_price, auth.uid(), nullif(new.note, ''));
  end if;

  return new;
end;
$$;

drop trigger if exists kiosk_prices_log_change on public.kiosk_prices;
create trigger kiosk_prices_log_change
  after insert or update on public.kiosk_prices
  for each row execute function public.kiosk_log_price_change();

-- ---------------------------------------------------------------------------
-- 5. Fungsi kebenaran
-- ---------------------------------------------------------------------------
create or replace function public.is_kiosk_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.kiosk_admins
    where user_id = auth.uid()
      and is_active
  );
$$;

revoke all on function public.is_kiosk_admin() from public;
grant execute on function public.is_kiosk_admin() to authenticated;

-- Senarai nama outlet awam. Fungsi SECURITY DEFINER ini hanya mendedahkan
-- `name` — bukan `code`/`role` — dan mengelakkan isu column-level grant + RLS.
create or replace function public.kiosk_outlet_names()
returns table (name text)
language sql
stable
security definer
set search_path = public
as $$
  select o.name
  from public.kiosk_outlets o
  where o.is_active
    and o.role = 'outlet'   -- baris role admin tidak dipaparkan di kiosk
  order by o.name;
$$;

revoke all on function public.kiosk_outlet_names() from public;
grant execute on function public.kiosk_outlet_names() to anon, authenticated;

-- Maklumat awam outlet (nama, alamat, telefon) untuk resit / WhatsApp.
-- `code` dan `role` tidak pernah didedahkan kepada klien.
create or replace function public.kiosk_outlet_details()
returns table (name text, address text, phone text)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, o.address, o.phone
  from public.kiosk_outlets o
  where o.is_active
    and o.role = 'outlet'
  order by o.name;
$$;

revoke all on function public.kiosk_outlet_details() from public;
grant execute on function public.kiosk_outlet_details() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. RLS + GRANT (inti "block outlet daripada input")
-- ---------------------------------------------------------------------------
alter table public.kiosk_outlets enable row level security;

alter table public.kiosk_prices enable row level security;
alter table public.kiosk_prices force row level security;

alter table public.kiosk_admins enable row level security;
alter table public.kiosk_admins force row level security;

-- NOTA:
--  * `kiosk_outlets` TIDAK di-FORCE supaya fungsi SECURITY DEFINER
--    public.kiosk_outlet_names() (milik pemilik jadual) boleh membaca nama.
--    Klien tetap tiada grant SELECT langsung.
--  * `kiosk_price_history` TIDAK di-FORCE kerana trigger audit menulis ke sini.
--    Klien tetap tiada INSERT/UPDATE/DELETE kerana grant telah dibuang.
alter table public.kiosk_price_history enable row level security;

-- ---- kiosk_outlets: awam hanya boleh lihat NAMA outlet ----
drop policy if exists "Kiosk outlet codes are readable for login" on public.kiosk_outlets;
drop policy if exists "Public outlet names" on public.kiosk_outlets;

create policy "Public outlet names"
  on public.kiosk_outlets
  for select to anon, authenticated
  using (is_active = true);

-- Tiada akses terus kepada jadual: nama outlet diambil melalui
-- public.kiosk_outlet_names() sahaja. `code` kekal tersembunyi.
revoke all on public.kiosk_outlets from anon, authenticated;

-- ---- kiosk_prices: awam baca; hanya admin tulis ----
drop policy if exists "Kiosk prices are readable" on public.kiosk_prices;
drop policy if exists "Admins can update own outlet prices" on public.kiosk_prices;
drop policy if exists "Seed kiosk prices initial data" on public.kiosk_prices;
drop policy if exists "Kiosk prices readable" on public.kiosk_prices;
drop policy if exists "Kiosk admins can insert prices" on public.kiosk_prices;
drop policy if exists "Kiosk admins can update prices" on public.kiosk_prices;
drop policy if exists "Kiosk admins can delete prices" on public.kiosk_prices;

create policy "Kiosk prices readable"
  on public.kiosk_prices
  for select to anon, authenticated
  using (true);

create policy "Kiosk admins can insert prices"
  on public.kiosk_prices
  for insert to authenticated
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can update prices"
  on public.kiosk_prices
  for update to authenticated
  using (public.is_kiosk_admin())
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can delete prices"
  on public.kiosk_prices
  for delete to authenticated
  using (public.is_kiosk_admin());

revoke all on public.kiosk_prices from anon, authenticated;
grant select on public.kiosk_prices to anon, authenticated;
grant insert, update, delete on public.kiosk_prices to authenticated;

-- ---- kiosk_admins: pengguna hanya boleh baca rekod sendiri ----
drop policy if exists "Admin reads own record" on public.kiosk_admins;
create policy "Admin reads own record"
  on public.kiosk_admins
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.kiosk_admins from anon;
revoke insert, update, delete on public.kiosk_admins from authenticated;
grant select on public.kiosk_admins to authenticated;

-- ---- kiosk_price_history: admin baca sahaja; tulis melalui trigger ----
drop policy if exists "Admins read price history" on public.kiosk_price_history;
create policy "Admins read price history"
  on public.kiosk_price_history
  for select to authenticated
  using (public.is_kiosk_admin());

revoke all on public.kiosk_price_history from anon, authenticated;
grant select on public.kiosk_price_history to authenticated;

-- ---- kiosk_promos: awam baca; hanya admin tulis ----
alter table public.kiosk_promos enable row level security;
alter table public.kiosk_promos force row level security;

drop policy if exists "Kiosk promos readable" on public.kiosk_promos;
drop policy if exists "Kiosk admins can insert promos" on public.kiosk_promos;
drop policy if exists "Kiosk admins can update promos" on public.kiosk_promos;
drop policy if exists "Kiosk admins can delete promos" on public.kiosk_promos;

create policy "Kiosk promos readable"
  on public.kiosk_promos
  for select to anon, authenticated
  using (true);

create policy "Kiosk admins can insert promos"
  on public.kiosk_promos
  for insert to authenticated
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can update promos"
  on public.kiosk_promos
  for update to authenticated
  using (public.is_kiosk_admin())
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can delete promos"
  on public.kiosk_promos
  for delete to authenticated
  using (public.is_kiosk_admin());

revoke all on public.kiosk_promos from anon, authenticated;
grant select on public.kiosk_promos to anon, authenticated;
grant insert, update, delete on public.kiosk_promos to authenticated;

-- ---- kiosk_settings: awam baca; hanya admin tulis ----
alter table public.kiosk_settings enable row level security;
alter table public.kiosk_settings force row level security;

drop policy if exists "Kiosk settings readable" on public.kiosk_settings;
drop policy if exists "Kiosk admins can insert settings" on public.kiosk_settings;
drop policy if exists "Kiosk admins can update settings" on public.kiosk_settings;
drop policy if exists "Kiosk admins can delete settings" on public.kiosk_settings;

create policy "Kiosk settings readable"
  on public.kiosk_settings
  for select to anon, authenticated
  using (true);

create policy "Kiosk admins can insert settings"
  on public.kiosk_settings
  for insert to authenticated
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can update settings"
  on public.kiosk_settings
  for update to authenticated
  using (public.is_kiosk_admin())
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can delete settings"
  on public.kiosk_settings
  for delete to authenticated
  using (public.is_kiosk_admin());

revoke all on public.kiosk_settings from anon, authenticated;
grant select on public.kiosk_settings to anon, authenticated;
grant insert, update, delete on public.kiosk_settings to authenticated;

-- ---- kiosk_announcement: awam baca; hanya admin tulis ----
alter table public.kiosk_announcement enable row level security;
alter table public.kiosk_announcement force row level security;

drop policy if exists "Kiosk announcement readable" on public.kiosk_announcement;
drop policy if exists "Kiosk admins can insert announcement" on public.kiosk_announcement;
drop policy if exists "Kiosk admins can update announcement" on public.kiosk_announcement;
drop policy if exists "Kiosk admins can delete announcement" on public.kiosk_announcement;

create policy "Kiosk announcement readable"
  on public.kiosk_announcement
  for select to anon, authenticated
  using (true);

create policy "Kiosk admins can insert announcement"
  on public.kiosk_announcement
  for insert to authenticated
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can update announcement"
  on public.kiosk_announcement
  for update to authenticated
  using (public.is_kiosk_admin())
  with check (public.is_kiosk_admin());

create policy "Kiosk admins can delete announcement"
  on public.kiosk_announcement
  for delete to authenticated
  using (public.is_kiosk_admin());

revoke all on public.kiosk_announcement from anon, authenticated;
grant select on public.kiosk_announcement to anon, authenticated;
grant insert, update, delete on public.kiosk_announcement to authenticated;

-- ---------------------------------------------------------------------------
-- 6b. Supabase Storage — bucket poster promosi
-- ---------------------------------------------------------------------------
-- Gambar poster disimpan di sini; URL awam disimpan dalam kiosk_promos.
-- Awam hanya boleh BACA fail; hanya admin boleh muat naik / padam.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promo-posters',
  'promo-posters',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Promo posters are publicly readable" on storage.objects;
drop policy if exists "Kiosk admins can upload promo posters" on storage.objects;
drop policy if exists "Kiosk admins can update promo posters" on storage.objects;
drop policy if exists "Kiosk admins can delete promo posters" on storage.objects;

create policy "Promo posters are publicly readable"
  on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'promo-posters');

create policy "Kiosk admins can upload promo posters"
  on storage.objects
  for insert to authenticated
  with check (bucket_id = 'promo-posters' and public.is_kiosk_admin());

create policy "Kiosk admins can update promo posters"
  on storage.objects
  for update to authenticated
  using (bucket_id = 'promo-posters' and public.is_kiosk_admin())
  with check (bucket_id = 'promo-posters' and public.is_kiosk_admin());

create policy "Kiosk admins can delete promo posters"
  on storage.objects
  for delete to authenticated
  using (bucket_id = 'promo-posters' and public.is_kiosk_admin());

-- ---------------------------------------------------------------------------
-- 7. Realtime (postgres_changes) untuk harga
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kiosk_prices'
  ) then
    alter publication supabase_realtime add table public.kiosk_prices;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kiosk_promos'
  ) then
    alter publication supabase_realtime add table public.kiosk_promos;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kiosk_settings'
  ) then
    alter publication supabase_realtime add table public.kiosk_settings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kiosk_announcement'
  ) then
    alter publication supabase_realtime add table public.kiosk_announcement;
  end if;
exception
  when undefined_object then
    raise notice 'Publication supabase_realtime not found — enable Realtime in the dashboard.';
end $$;

-- ---------------------------------------------------------------------------
-- 9. Resit / sebut harga kiosk (satu baris = satu resit yang disahkan)
-- ---------------------------------------------------------------------------
-- Kiosk (anon) tiada INSERT terus: hanya RPC SECURITY DEFINER di bawah.
-- Admin (authenticated + kiosk_admins) boleh baca melalui RLS.
-- Jadual ini sengaja tidak di-FORCE supaya RPC milik owner boleh menulis.
create table if not exists public.kiosk_receipts (
  id bigint generated always as identity primary key,
  receipt_number text,
  quote_id text not null,
  outlet_name text not null,
  created_at timestamptz not null default now(),
  -- Audit pengguna Supabase Auth (NULL = kiosk awam tanpa sesi).
  created_by uuid references auth.users (id) on delete set null,
  created_by_email text not null default '',
  purity text not null,
  karat text not null default '',
  weight numeric(12, 4) not null default 0,
  price_per_gram numeric(12, 2) not null default 0,
  gold_cost numeric(12, 2) not null default 0,
  workmanship numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  has_trade_in boolean not null default false,
  trade_in_purity text not null default '',
  trade_in_weight numeric(12, 4) not null default 0,
  trade_in_rate numeric(12, 2) not null default 0,
  trade_in_amount numeric(12, 2) not null default 0,
  final_total numeric(12, 2) not null default 0,
  package_price numeric(12, 2) not null default 0,
  package_title text not null default ''
);

create index if not exists kiosk_receipts_created_at_idx
  on public.kiosk_receipts (created_at desc);
create index if not exists kiosk_receipts_outlet_name_idx
  on public.kiosk_receipts (outlet_name, created_at desc);

-- Nombor resit unik secara database-level (NULL dibenarkan untuk resit lama).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'kiosk_receipts_receipt_number_key'
      and conrelid = 'public.kiosk_receipts'::regclass
  ) then
    alter table public.kiosk_receipts
      add constraint kiosk_receipts_receipt_number_key unique (receipt_number);
  end if;
end $$;

comment on column public.kiosk_receipts.receipt_number is
  'Nombor resit rasmi GRJ-KOD-DDMMYY-HHMMSS (NULL = resit lama).';

alter table public.kiosk_receipts enable row level security;

drop policy if exists "Admins read kiosk receipts" on public.kiosk_receipts;
drop policy if exists "Admins read receipts within their outlet" on public.kiosk_receipts;
-- Admin hanya baca resit outletnya jika `kiosk_admins.outlet_name` ditetapkan.
-- Kosong = keserasian lama (baca semua resit).
create policy "Admins read receipts within their outlet"
  on public.kiosk_receipts
  for select to authenticated
  using (
    public.is_kiosk_admin()
    and exists (
      select 1
      from public.kiosk_admins a
      where a.user_id = auth.uid()
        and a.is_active = true
        and (
          nullif(btrim(a.outlet_name), '') is null
          or a.outlet_name = public.kiosk_receipts.outlet_name
        )
    )
  );

revoke all on public.kiosk_receipts from anon, authenticated;
grant select on public.kiosk_receipts to authenticated;

-- Nombor resit GRJ dijana di server. Idempoten pada (quote_id, outlet_name).
-- Return type bertukar -> DROP dulu.
drop function if exists public.record_kiosk_receipt(jsonb);

create or replace function public.record_kiosk_receipt(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_quote_id text := nullif(btrim(coalesce(p_payload ->> 'quoteId', '')), '');
  v_outlet text := nullif(btrim(coalesce(p_payload ->> 'outletName', '')), '');
  v_created_by uuid;
  v_created_by_email text := btrim(coalesce(p_payload ->> 'createdByEmail', ''));
  v_code text;
  v_ts timestamptz;
  v_number text;
  v_attempt integer := 0;
  v_existing_number text;
  v_existing_at timestamptz;
begin
  if v_quote_id is null or v_outlet is null then
    raise exception 'quoteId dan outletName diperlukan';
  end if;

  -- ID pengguna adalah pilihan: kiosk berjalan tanpa Supabase Auth.
  if nullif(btrim(coalesce(p_payload ->> 'createdBy', '')), '') is not null then
    begin
      v_created_by := btrim(p_payload ->> 'createdBy')::uuid;
    exception when others then
      v_created_by := null;
    end;
  end if;

  -- Kod outlet dari DB (3 huruf depan kiosk_outlets.code), bukan dari klien.
  select upper(substring(regexp_replace(o.code, '[^A-Za-z]', '', 'g') from 1 for 3))
  into v_code
  from public.kiosk_outlets o
  where o.name = v_outlet
    and o.is_active = true
    and o.role = 'outlet';

  if v_code is null or length(v_code) <> 3 then
    raise exception 'Kod resit outlet tidak sah / belum didaftarkan: %', v_outlet;
  end if;

  -- Serialkan penjanaan nombor dan semakan idempotensi.
  perform pg_advisory_xact_lock(hashtextextended('grj-receipt:' || v_code, 0));
  perform pg_advisory_xact_lock(hashtextextended('grj-quote:' || v_quote_id, 0));

  -- Sudah disimpan? Pulangkan nombor sedia ada — JANGAN insert lagi.
  select id, receipt_number, created_at
    into v_id, v_existing_number, v_existing_at
  from public.kiosk_receipts
  where quote_id = v_quote_id
    and outlet_name = v_outlet
  order by created_at desc
  limit 1;

  if v_id is not null and coalesce(v_existing_number, '') <> '' then
    return jsonb_build_object(
      'id', v_id,
      'receiptNumber', v_existing_number,
      'quoteId', v_quote_id,
      'createdAt', to_char(v_existing_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI:SS'),
      'alreadySaved', true
    );
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_ts := clock_timestamp();
    v_number :=
      'GRJ-' || v_code || '-' ||
      to_char(v_ts at time zone 'Asia/Kuala_Lumpur', 'DDMMYY-HH24MISS');

    begin
      if v_id is not null then
        -- Resit lama tanpa nombor GRJ: tampal nombor, jangan dupa baris.
        update public.kiosk_receipts
           set receipt_number = v_number,
               created_by = coalesce(created_by, v_created_by),
               created_by_email = case when created_by_email = '' then v_created_by_email else created_by_email end
         where id = v_id;
      else
        insert into public.kiosk_receipts (
          receipt_number, quote_id, outlet_name, created_at,
          created_by, created_by_email,
          purity, karat, weight, price_per_gram, gold_cost, workmanship,
          subtotal, discount_amount, has_trade_in, trade_in_purity,
          trade_in_weight, trade_in_rate, trade_in_amount,
          final_total, package_price, package_title
        )
        values (
          v_number, v_quote_id, v_outlet, v_ts,
          v_created_by, v_created_by_email,
          coalesce(nullif(p_payload ->> 'purity', ''), '000'),
          coalesce(p_payload ->> 'karat', ''),
          coalesce((p_payload ->> 'weight')::numeric, 0),
          coalesce((p_payload ->> 'pricePerGram')::numeric, 0),
          coalesce((p_payload ->> 'goldCost')::numeric, 0),
          coalesce((p_payload ->> 'workmanship')::numeric, 0),
          coalesce((p_payload ->> 'subtotal')::numeric, 0),
          coalesce((p_payload ->> 'discountAmount')::numeric, 0),
          coalesce((p_payload ->> 'hasTradeIn')::boolean, false),
          coalesce(p_payload ->> 'tradeInPurity', ''),
          coalesce((p_payload ->> 'tradeInWeight')::numeric, 0),
          coalesce((p_payload ->> 'tradeInRate')::numeric, 0),
          coalesce((p_payload ->> 'tradeInAmount')::numeric, 0),
          coalesce((p_payload ->> 'finalTotal')::numeric, 0),
          coalesce((p_payload ->> 'packagePrice')::numeric, 0),
          coalesce(p_payload ->> 'packageTitle', '')
        );
      end if;

      exit;
    exception when unique_violation then
      if v_attempt >= 30 then
        raise exception 'Gagal menjana nombor resit unik selepas % cubaan', v_attempt;
      end if;
      perform pg_sleep(1.02);
    end;
  end loop;

  return jsonb_build_object(
    'id', v_id,
    'receiptNumber', v_number,
    'quoteId', v_quote_id,
    'createdAt', to_char(v_ts at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI:SS'),
    'alreadySaved', false
  );
end;
$$;

revoke all on function public.record_kiosk_receipt(jsonb) from public;
grant execute on function public.record_kiosk_receipt(jsonb) to anon, authenticated;

-- =============================================================================
-- SELESAI
-- Peringatan: outlet (anon) kini tiada INSERT/UPDATE/DELETE pada mana-mana
-- jadual kiosk. Jika outlet masih boleh menulis, semak:
--   select * from pg_policies where schemaname = 'public';
--   select grantee, table_name, privilege_type
--     from information_schema.role_table_grants
--    where table_name like 'kiosk_%';
-- =============================================================================
