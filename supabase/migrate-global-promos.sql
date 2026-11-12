-- =============================================================================
-- Migrasi pantas: poster promosi GLOBAL (sama untuk semua outlet)
-- =============================================================================
-- Jalankan fail ini SEKALI dalam Supabase Dashboard > SQL Editor.
-- Ia menggantikan jadual kiosk_promos lama yang mempunyai kolum outlet_name
-- dengan struktur global: id, image_url, is_active, sort_order, timestamps.
--
-- AMARAN: rekod poster dalam jadual lama akan dipadam. Jika anda mahu
-- mengekalkannya, salin/ambil semula gambar terlebih dahulu.
-- =============================================================================

drop table if exists public.kiosk_promos;

create table public.kiosk_promos (
  id text primary key,
  image_url text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at (fungsi ini sudah wujud daripada schema.sql).
create or replace function public.kiosk_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kiosk_promos_set_updated_at on public.kiosk_promos;
create trigger kiosk_promos_set_updated_at
  before update on public.kiosk_promos
  for each row execute function public.kiosk_set_updated_at();

-- RLS: awam baca sahaja; admin sahaja boleh tulis.
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

-- Pastikan realtime menyiarkan perubahan poster ke semua outlet.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kiosk_promos'
  ) then
    alter publication supabase_realtime add table public.kiosk_promos;
  end if;
exception
  when undefined_object then
    raise notice 'Publication supabase_realtime not found — enable Realtime in the dashboard.';
end $$;
