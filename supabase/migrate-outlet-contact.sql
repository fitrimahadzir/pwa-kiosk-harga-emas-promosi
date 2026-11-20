-- =============================================================================
-- Migrasi: alamat & nombor telefon setiap outlet dalam `kiosk_outlets`
-- =============================================================================
-- Jalankan sekali dalam Supabase SQL Editor. Idempotent — selamat diulang.
--
-- * Menambah kolum `address` dan `phone` pada jadual `kiosk_outlets` yang
--   sedia ada (TIADA jadual baru).
-- * Data sedia ada disalin dari `kiosk_settings` (sumber semasa tetapan resit).
-- * Alamat & telefon sengaja dibiarkan kosong — diisi oleh admin dalam panel
--   Tetapan > Maklumat outlet, kemudian disimpan ke Supabase.
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

-- 3. Alamat & telefon sengaja dibiarkan kosong --------------------------------
--    Admin akan mengisi nilai sebenar melalui panel Tetapan > Maklumat outlet.
--    Jika mahu mengosongkan data lama yang sudah tersimpan, jalankan secara
--    manual (SEKALI sahaja — jangan dimasukkan semula dalam migrasi ini):
--
--      update public.kiosk_outlets
--         set address = '', phone = '', updated_at = now()
--       where address <> '' or phone <> '';
--
--      update public.kiosk_settings
--         set address = '', phone = '', updated_at = now()
--       where outlet_name in (select name from public.kiosk_outlets)
--         and (address <> '' or phone <> '');
--

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

-- 5. Tulisan selamat oleh admin ----------------------------------------------
--    Klien TIADA grant UPDATE pada `kiosk_outlets`. Satu-satunya laluan tulis
--    ialah RPC ini; ia menyemak kiosk_admins dan (jika ditetapkan) had outlet
--    bagi admin berkenaan. `kiosk_settings` turut disegerakkan kerana resit
--    kiosk membaca tetapan dari jadual itu.
revoke all on public.kiosk_outlets from anon, authenticated;

create or replace function public.update_kiosk_outlet_contact(
  p_name text,
  p_address text,
  p_phone text
)
returns table (name text, address text, phone text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_address text := btrim(coalesce(p_address, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_admin_outlet text;
begin
  if auth.uid() is null or not public.is_kiosk_admin() then
    raise exception 'Akses ditolak: pentadbir sahaja.';
  end if;

  if v_name = '' then
    raise exception 'Nama outlet diperlukan.';
  end if;
  if char_length(v_address) > 500 then
    raise exception 'Alamat terlalu panjang (maksimum 500 aksara).';
  end if;
  if char_length(v_phone) > 50 then
    raise exception 'Nombor telefon terlalu panjang (maksimum 50 aksara).';
  end if;

  select a.outlet_name into v_admin_outlet
  from public.kiosk_admins a
  where a.user_id = auth.uid()
    and a.is_active
  limit 1;

  if coalesce(v_admin_outlet, '') <> '' and v_admin_outlet <> v_name then
    raise exception 'Akses ditolak: admin ini hanya dibenarkan untuk outlet %', v_admin_outlet;
  end if;

  update public.kiosk_outlets o
     set address = v_address,
         phone = v_phone,
         updated_at = now()
   where o.name = v_name
     and o.is_active
     and o.role = 'outlet';

  if not found then
    raise exception 'Outlet "%" tidak dijumpai atau tidak aktif.', v_name;
  end if;

  insert into public.kiosk_settings
    (outlet_name, shop_name, branch, phone, address, tagline, currency)
  values
    (v_name, '', '', v_phone, v_address, '', 'MYR')
  on conflict (outlet_name) do update
     set phone = excluded.phone,
         address = excluded.address,
         updated_at = now();

  return query
    select o.name, o.address, o.phone
      from public.kiosk_outlets o
     where o.name = v_name;
end;
$$;

revoke all on function public.update_kiosk_outlet_contact(text, text, text) from public;
grant execute on function public.update_kiosk_outlet_contact(text, text, text) to authenticated;

comment on function public.update_kiosk_outlet_contact(text, text, text) is
  'Admin sahaja: kemas kini alamat & telefon kiosk_outlets + kiosk_settings.';

-- 6. Realtime ----------------------------------------------------------------
--    `kiosk_settings` sudah berada dalam publication di schema utama. Tambah
--    `kiosk_outlets` supaya perubahan turut memaklumkan klien yang melanggan.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kiosk_outlets'
  ) then
    alter publication supabase_realtime add table public.kiosk_outlets;
  end if;
exception
  when undefined_object then
    raise notice 'Publication supabase_realtime not found — enable Realtime in the dashboard.';
end $$;

-- 7. Semakan hasil -----------------------------------------------------------
-- select name, address, phone from public.kiosk_outlet_details();

-- =============================================================================
-- SELESAI
-- =============================================================================
