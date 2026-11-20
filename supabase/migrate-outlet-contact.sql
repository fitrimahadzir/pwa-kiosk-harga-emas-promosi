-- =============================================================================
-- Migrasi: alamat & nombor telefon setiap outlet dalam `kiosk_outlets`
-- =============================================================================
-- Jalankan sekali dalam Supabase SQL Editor. Idempotent — selamat diulang.
--
-- * Menambah kolum `address` dan `phone` pada jadual `kiosk_outlets` yang
--   sedia ada (TIADA jadual baru).
-- * Data sedia ada disalin dari `kiosk_settings` (sumber semasa tetapan resit).
-- * Outlet yang belum ada tetapan diisi dengan nilai lalai aplikasi
--   (DEFAULT_SETTINGS dalam src/utils/storage.ts) — SEMAK DAN KEMAS KINI
--   mengikut maklumat sebenar cawangan.
-- * `code` dan `role` kekal tersembunyi. Awam hanya boleh membaca nama,
--   alamat dan telefon melalui fungsi SECURITY DEFINER di bawah.
-- =============================================================================

-- 1. Kolum baru ---------------------------------------------------------------
alter table public.kiosk_outlets
  add column if not exists address text not null default '',
  add column if not exists phone text not null default '';

comment on column public.kiosk_outlets.address is
  'Alamat fizikal cawangan untuk dipaparkan pada resit sebut harga.';
comment on column public.kiosk_outlets.phone is
  'Nombor telefon cawangan untuk dipaparkan pada resit / WhatsApp.';

-- 2. Salin dari kiosk_settings (jika sudah dikonfigurasi) --------------------
update public.kiosk_outlets o
set
  address = case
    when nullif(btrim(o.address), '') is null then coalesce(s.address, '')
    else o.address
  end,
  phone = case
    when nullif(btrim(o.phone), '') is null then coalesce(s.phone, '')
    else o.phone
  end,
  updated_at = now()
from public.kiosk_settings s
where s.outlet_name = o.name
  and (
    nullif(btrim(o.address), '') is null
    or nullif(btrim(o.phone), '') is null
  );

-- 3. Nilai lalai untuk outlet dikenali yang masih kosong ---------------------
--    (sama seperti DEFAULT_SETTINGS dalam frontend — sila sahkan.)
update public.kiosk_outlets o
set
  address = case when nullif(btrim(o.address), '') is null then v.address else o.address end,
  phone = case when nullif(btrim(o.phone), '') is null then v.phone else o.phone end,
  updated_at = now()
from (values
  (
    'Amanjaya Mall',
    'No. 18-G, Jalan Sultan Ismail, 50250 Kuala Lumpur',
    '012-8899 375'
  ),
  ('HQ Warehouse', '', '')
) as v(name, address, phone)
where o.name = v.name;

-- -----------------------------------------------------------------------------
-- Contoh kemas kini manual (tukar nilai sebenar cawangan anda):
--
-- update public.kiosk_outlets
--    set address = 'No. 1, Jalan Contoh, 05000 Alor Setar, Kedah',
--        phone   = '04-123 4567',
--        updated_at = now()
--  where name = 'Amanjaya Mall';
-- -----------------------------------------------------------------------------

-- 4. Akses awam selamat: nama + alamat + telefon sahaja ----------------------
--    `code` / `role` TIDAK pernah didedahkan. `kiosk_outlets` tiada grant
--    terus kepada anon; fungsi SECURITY DEFINER ini satu-satunya laluan baca.
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

comment on function public.kiosk_outlet_details() is
  'Maklumat awam outlet (nama, alamat, telefon) untuk paparan kiosk/resit.';

-- 5. Semakan hasil -----------------------------------------------------------
-- select name, address, phone from public.kiosk_outlet_details();

-- =============================================================================
-- SELESAI
-- =============================================================================
