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

-- Admin = pengguna Supabase Auth yang didaftarkan di sini.
create table if not exists public.kiosk_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
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
insert into public.kiosk_outlets (code, name, role)
select
  'outlet-' || replace(gen_random_uuid()::text, '-', ''),
  v.name,
  'outlet'
from (values ('Amanjaya Mall'), ('HQ Warehouse')) as v(name)
where not exists (
  select 1 from public.kiosk_outlets o where o.name = v.name
);

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
exception
  when undefined_object then
    raise notice 'Publication supabase_realtime not found — enable Realtime in the dashboard.';
end $$;

-- =============================================================================
-- SELESAI
-- Peringatan: outlet (anon) kini tiada INSERT/UPDATE/DELETE pada mana-mana
-- jadual kiosk. Jika outlet masih boleh menulis, semak:
--   select * from pg_policies where schemaname = 'public';
--   select grantee, table_name, privilege_type
--     from information_schema.role_table_grants
--    where table_name like 'kiosk_%';
-- =============================================================================
