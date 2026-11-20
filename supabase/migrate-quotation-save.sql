-- =============================================================================
-- Migrasi: "Simpan Rekod" sebut harga kiosk — idempoten + audit pengguna
-- =============================================================================
-- Jalankan sekali dalam Supabase SQL Editor SELEPAS migrate-receipts.sql dan
-- migrate-receipt-numbers.sql (atau schema.sql terkini).
--
-- * Guna SEMULA jadual `kiosk_receipts` — TIADA jadual baru.
-- * `quote_id` + `outlet_name` jadi kunci idempotensi: tekan "Simpan Rekod"
--   berulang kali memulangkan nombor resit yang SAMA, bukan menulis baris baru.
-- * `created_by` / `created_by_email` menyimpan identiti pengguna Supabase
--   Auth bila ada sesi. Kiosk awam (tanpa sesi) kekal NULL — ini disengajakan.
-- * `kiosk_admins.outlet_name` (pilihan) menghadkan admin kepada outlet
--   tertentu. Kosong = tingkah laku lama (admin baca semua resit).
-- * anon TIADA SELECT/INSERT terus. Semua tulisan melalui RPC SECURITY DEFINER.
--   Service role key TIDAK pernah diperlukan / dimasukkan di frontend.
-- =============================================================================

-- 1. Kolum audit pada jadual sedia ada -------------------------------------
alter table public.kiosk_receipts
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists created_by_email text not null default '';

alter table public.kiosk_admins
  add column if not exists outlet_name text not null default '';

comment on column public.kiosk_receipts.created_by is
  'Pengguna Supabase Auth yang menjana sebut harga (NULL = kiosk awam).';
comment on column public.kiosk_admins.outlet_name is
  'Outlet yang dibenarkan untuk admin. Kosong = baca semua outlet (keserasian lama).';

-- 2. RLS: admin hanya baca resit outletnya (jika ditetapkan) ---------------
drop policy if exists "Admins read kiosk receipts" on public.kiosk_receipts;
drop policy if exists "Admins read receipts within their outlet" on public.kiosk_receipts;

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

-- Kekalkan grant sedia ada: anon tiada apa-apa, admin baca sahaja.
revoke all on public.kiosk_receipts from anon, authenticated;
grant select on public.kiosk_receipts to authenticated;

-- 3. RPC idempoten (return type jsonb — drop dulu kerana tandatangan berubah)
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
      v_created_by := null;  -- payload cacat tidak boleh gagalkan resit
    end;
  end if;

  -- Kod outlet DIAMBIL DARI DB, bukan dari payload klien.
  select upper(substring(regexp_replace(o.code, '[^A-Za-z]', '', 'g') from 1 for 3))
    into v_code
  from public.kiosk_outlets o
  where o.name = v_outlet
    and o.is_active = true
    and o.role = 'outlet';

  if v_code is null or length(v_code) <> 3 then
    raise exception 'Kod resit outlet tidak sah / belum didaftarkan: %', v_outlet;
  end if;

  -- Serialkan penjanaan nombor DAN semakan idempotensi.
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
      'createdAt', to_char(
        v_existing_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI:SS'
      ),
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
               created_by_email = case
                 when created_by_email = '' then v_created_by_email
                 else created_by_email
               end
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

comment on function public.record_kiosk_receipt(jsonb) is
  'Simpan sebut harga kiosk secara idempoten (quote_id + outlet) dan jana nombor GRJ di server.';

-- =============================================================================
-- SELESAI. Frontend tidak memerlukan service role key — anon + RPC sahaja.
-- =============================================================================
