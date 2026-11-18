-- =============================================================================
-- Migrasi pantas: pengumuman kaunter (marquee) GLOBAL
-- =============================================================================
-- Jalankan fail ini SEKALI dalam Supabase Dashboard > SQL Editor selepas
-- mengemas kini aplikasi. Ia selamat dijalankan berulang kali (idempotent).
--
-- Hasil:
--   * jadual public.kiosk_announcement (satu baris: id = 'counter')
--     `message` menyimpan berbilang pengumuman — satu baris = satu entri marquee
--   * teks lalai diisi jika baris masih kosong
--   * awam (kiosk) hanya boleh SELECT; admin yang disahkan boleh tulis
--   * perubahan disiarkan secara realtime ke semua tablet outlet
--
-- Selepas itu: #/admin > Tetapan > Pengumuman Kaunter
-- =============================================================================

create table if not exists public.kiosk_announcement (
  id text primary key default 'counter' check (id = 'counter'),
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.kiosk_announcement (id, message)
values (
  'counter',
  'Selamat datang ke Gold Reserve. Harga emas dikemaskini setiap hari — sila hubungi kakitangan kaunter untuk sebarang pertanyaan.'
)
on conflict (id) do nothing;

comment on table public.kiosk_announcement is
  'Pengumuman kaunter global (marquee) yang dipaparkan di semua kiosk outlet.';

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

drop trigger if exists kiosk_announcement_set_updated_at on public.kiosk_announcement;
create trigger kiosk_announcement_set_updated_at
  before update on public.kiosk_announcement
  for each row execute function public.kiosk_set_updated_at();

-- RLS: awam baca sahaja; admin sahaja boleh tulis.
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

-- Siarkan perubahan pengumuman ke semua tablet outlet.
do $$
begin
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
