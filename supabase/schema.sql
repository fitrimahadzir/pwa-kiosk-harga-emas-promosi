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
--   values ('HQ2', 'HQ Warehouse', 'admin');
insert into public.kiosk_outlets (code, name, role)
values
  ('AMANJAYA', 'Amanjaya Mall', 'outlet'),
  ('HQ', 'HQ Warehouse', 'admin')
on conflict (code) do update
  set name = excluded.name,
      role = excluded.role,
      is_active = true,
      updated_at = now();

-- Previously seeded 'HeadQuarters'? Rename the old rows to 'HQ Warehouse':
--   update public.kiosk_outlets set name = 'HQ Warehouse' where name = 'HeadQuarters';
--   update public.kiosk_prices set outlet_name = 'HQ Warehouse' where outlet_name = 'HeadQuarters';

-- Gold prices per outlet, synced in real-time via Supabase Realtime.
-- Each row represents one outlet's price for a specific purity.
create table if not exists public.kiosk_prices (
  outlet_name text not null,
  purity text not null check (purity in ('999', '916', '375')),
  sell_price numeric not null,
  buy_price numeric not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (outlet_name, purity)
);

alter table public.kiosk_prices enable row level security;

-- Allow anyone to read prices (kiosk display reads only)
drop policy if exists "Kiosk prices are readable" on public.kiosk_prices;
create policy "Kiosk prices are readable"
  on public.kiosk_prices
  for select
  using (true);

-- Allow admins to update prices (via the admin panel)
drop policy if exists "Admins can update own outlet prices" on public.kiosk_prices;
create policy "Admins can update own outlet prices"
  on public.kiosk_prices
  for update
  using ((select role from public.kiosk_outlets where code = current_setting('app.outlet_code')) = 'admin');

-- Seed initial prices per outlet (same as default localStorage values)
drop policy if exists "Seed kiosk prices initial data" on public.kiosk_prices;
create policy "Seed kiosk prices initial data"
  on public.kiosk_prices
  for insert
  with check (true);
insert into public.kiosk_prices (outlet_name, purity, sell_price, buy_price)
select distinct outlet_name, purity, sell_price, buy_price
from (values
  ('HQ Warehouse', '999', 468.0, 422.0),
  ('HQ Warehouse', '916', 428.0, 382.0),
  ('HQ Warehouse', '375', 188.0, 142.0),
  ('Amanjaya Mall', '999', 468.0, 422.0),
  ('Amanjaya Mall', '916', 428.0, 382.0),
  ('Amanjaya Mall', '375', 188.0, 142.0)
) as t(outlet_name, purity, sell_price, buy_price)
on conflict (outlet_name, purity) do nothing;

-- Already ran an older version of this file that used `public.outlets`?
-- Rename it so it does not clash with the main site's own `outlets` table:
--   alter table public.outlets rename to kiosk_outlets;
-- (Then re-run this file so the policy and seed rows use the new name.)
