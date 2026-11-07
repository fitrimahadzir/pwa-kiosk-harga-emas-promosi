-- Kiosk tables for the Gold Reserve price & promo PWA.
-- Run this in the Supabase SQL editor once the project is ready.
--
-- IMPORTANT: this project shares the same Supabase database as the main site,
-- so every kiosk table uses the `kiosk_` prefix to avoid clashes.
-- Planned naming convention:
--   kiosk_outlets        -> outlet login codes (this file)
--   kiosk_prices         -> gold prices (future realtime sync)
--   kiosk_promos         -> promo posters (future)
--   kiosk_settings       -> shop/outlet settings (future)
--   kiosk_price_history  -> price change log (future)
--
-- Login is code-only (no password), so treat outlet codes like branch access
-- keys. Rotate a code here if it is leaked.

-- Admin and outlet accounts share this single table.
-- The `role` column decides access:
--   role = 'admin'  -> opens the admin panel (prices, promos, settings)
--   role = 'outlet' -> opens the read-only kiosk display
-- Admins are added exactly like outlets, just with role = 'admin'.

create table if not exists public.kiosk_outlets (
  code text primary key,
  name text not null,
  role text not null default 'outlet' check (role in ('admin', 'outlet')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kiosk_outlets enable row level security;

-- The login screen needs to look up a code before a session exists.
-- Only the columns needed by login are exposed.
drop policy if exists "Kiosk outlet codes are readable for login" on public.kiosk_outlets;
create policy "Kiosk outlet codes are readable for login"
  on public.kiosk_outlets
  for select
  using (is_active = true);

-- Replace these seed rows with your real outlets.
-- Add more admins by inserting another row with role = 'admin', for example:
--   insert into public.kiosk_outlets (code, name, role)
--   values ('HQ2', 'HeadQuarters', 'admin');
insert into public.kiosk_outlets (code, name, role)
values
  ('AMANJAYA', 'Amanjaya Mall', 'outlet'),
  ('HQ', 'HeadQuarters', 'admin')
on conflict (code) do update
  set name = excluded.name,
      role = excluded.role,
      is_active = true,
      updated_at = now();

-- Already ran an older version of this file that used `public.outlets`?
-- Rename it so it does not clash with the main site's own `outlets` table:
--   alter table public.outlets rename to kiosk_outlets;
-- (Then re-run this file so the policy and seed rows use the new name.)
