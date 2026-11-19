-- ============================================================================
-- Migrasi: butiran pakej untuk poster promosi
-- ============================================================================
-- Jalankan fail ini dalam Supabase SQL Editor jika jadual `kiosk_promos`
-- sudah wujud. Ia menambah tiga kolum baru tanpa memadam data sedia ada:
--   title         - tajuk pakej yang dipaparkan di halaman detail poster
--   description   - penerangan ringkas pakej
--   package_price - harga tetap pakej (RM), digunakan oleh "Beli Pantas"
--
-- Fail schema.sql terkini juga mengandungi kenyataan yang sama, jadi untuk
-- pangkalan data baru tidak perlu menjalankan migrasi ini.
-- ============================================================================

alter table public.kiosk_promos
  add column if not exists title text not null default '',
  add column if not exists description text not null default '',
  add column if not exists package_price numeric(12, 2) not null default 0;

comment on column public.kiosk_promos.title is 'Tajuk pakej promosi';
comment on column public.kiosk_promos.description is 'Penerangan pakej promosi';
comment on column public.kiosk_promos.package_price is 'Harga pakej dalam RM (0 = tiada harga)';
