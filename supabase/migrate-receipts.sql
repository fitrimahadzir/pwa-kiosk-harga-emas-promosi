-- ============================================================================
-- Migrasi: resit / sebut harga yang disahkan staf di kiosk
-- ============================================================================
-- Jalankan fail ini dalam Supabase SQL Editor.
--
-- Model keselamatan:
--   * Kiosk (anon)  -> HANYA boleh menulis melalui RPC
--                      public.record_kiosk_receipt(jsonb) (SECURITY DEFINER).
--                      Tiada INSERT terus pada jadual.
--   * Admin         -> baca resit melalui polisi RLS (Peranan `authenticated`
--                      + baris aktif dalam public.kiosk_admins).
--
-- Nota: jadual ini sengaja TIDAK di-FORCE RLS supaya fungsi SECURITY DEFINER
-- (milik pemilik jadual) boleh memasukkan baris. Sama seperti
-- kiosk_price_history yang ditulis oleh trigger audit.
--
-- >>> Untuk nombor resit format GRJ, jalankan JUGA
--     supabase/migrate-receipt-numbers.sql selepas fail ini. <<<
-- ============================================================================

create table if not exists public.kiosk_receipts (
  id bigint generated always as identity primary key,
  quote_id text not null,
  outlet_name text not null,
  created_at timestamptz not null default now(),
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

-- ----------------------------------------------------------------------------
-- Kebenaran: admin baca, kiosk tulis melalui RPC sahaja
-- ----------------------------------------------------------------------------
alter table public.kiosk_receipts enable row level security;

drop policy if exists "Admins read kiosk receipts" on public.kiosk_receipts;
drop policy if exists "Anon can insert receipts" on public.kiosk_receipts;

create policy "Admins read kiosk receipts"
  on public.kiosk_receipts
  for select to authenticated
  using (public.is_kiosk_admin());

revoke all on public.kiosk_receipts from anon, authenticated;
grant select on public.kiosk_receipts to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: satu resit disimpan setiap kali "Jana Sebut Harga" ditekan
-- ----------------------------------------------------------------------------
create or replace function public.record_kiosk_receipt(p_payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_quote_id text := nullif(btrim(p_payload ->> 'quoteId'), '');
  v_outlet text := nullif(btrim(p_payload ->> 'outletName'), '');
begin
  -- Elak baris sampah daripada panggilan tidak sengaja.
  if v_quote_id is null or v_outlet is null then
    raise exception 'quoteId dan outletName diperlukan';
  end if;

  insert into public.kiosk_receipts (
    quote_id,
    outlet_name,
    purity,
    karat,
    weight,
    price_per_gram,
    gold_cost,
    workmanship,
    subtotal,
    discount_amount,
    has_trade_in,
    trade_in_purity,
    trade_in_weight,
    trade_in_rate,
    trade_in_amount,
    final_total,
    package_price,
    package_title
  )
  values (
    v_quote_id,
    v_outlet,
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
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_kiosk_receipt(jsonb) from public;
grant execute on function public.record_kiosk_receipt(jsonb) to anon, authenticated;

comment on table public.kiosk_receipts is
  'Sebut harga yang disahkan staf di kiosk (satu baris = satu resit).';
comment on function public.record_kiosk_receipt(jsonb) is
  'Tulis satu resit dari kiosk tanpa memberi INSERT terus kepada anon.';
