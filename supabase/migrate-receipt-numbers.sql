-- ============================================================================
-- Migrasi: nombor resit GRJ-[KOD]-[DDMMYY]-[HHMMSS]
-- ============================================================================
-- Jalankan sekali dalam Supabase SQL Editor selepas migrate-receipts.sql.
--
-- * Nombor resit dijana SEBULAT-BULATNYA di server (RPC SECURITY DEFINER).
-- * Kod outlet diambil daripada kiosk_outlets.code — klien tidak pernah
--   menghantar atau mengubah kod. Hanya 3 huruf depan (nombor dibuang):
--     AJM001 -> AJM    |    KJM-22 -> KJM    |    outlet-abc -> OUT
-- * Masa guna clock_timestamp() dalam timezone Asia/Kuala_Lumpur, 24 jam.
-- * created_at disimpan dari cap masa transaksi yang sama dengan nombor resit.
-- * UNIQUE pada receipt_number + advisory lock + retry selepas pertembungan.
-- * Resit lama TIDAK diubah — receipt_number mereka kekal NULL dan paparan
--   menggunakan quote_id lama sebagai fallback.
-- ============================================================================

-- 1. Kolum baru (boleh null untuk mengekalkan rekod sejarah).
alter table public.kiosk_receipts
  add column if not exists receipt_number text;

-- 2. UNIQUE secara database-level (idempotent).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kiosk_receipts_receipt_number_key'
      and conrelid = 'public.kiosk_receipts'::regclass
  ) then
    alter table public.kiosk_receipts
      add constraint kiosk_receipts_receipt_number_key unique (receipt_number);
  end if;
end $$;

comment on column public.kiosk_receipts.receipt_number is
  'Nombor resit rasmi GRJ-KOD-DDMMYY-HHMMSS (NULL = resit lama).';

-- 3. Gantikan RPC. Return type bertukar bigint -> jsonb, jadi kena DROP dulu.
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
  v_code text;
  v_ts timestamptz;
  v_number text;
  v_attempt integer := 0;
begin
  if v_quote_id is null or v_outlet is null then
    raise exception 'quoteId dan outletName diperlukan';
  end if;

  -- Kod outlet DIAMBIL DARI DB, bukan dari payload klien.
  -- 3 huruf depan sahaja; sebarang nombor / simbol dibuang.
  select upper(substring(regexp_replace(o.code, '[^A-Za-z]', '', 'g') from 1 for 3))
  into v_code
  from public.kiosk_outlets o
  where o.name = v_outlet
    and o.is_active = true
    and o.role = 'outlet';

  if v_code is null or length(v_code) <> 3 then
    raise exception 'Kod resit outlet tidak sah / belum didaftarkan: %', v_outlet;
  end if;

  -- Serialkan penjanaan bagi outlet yang sama. Outlet berbeza ada kod berbeza.
  perform pg_advisory_xact_lock(hashtextextended('grj-receipt:' || v_code, 0));

  loop
    v_attempt := v_attempt + 1;

    -- Cap masa transaksi sebenar (bukan masa load halaman).
    v_ts := clock_timestamp();
    v_number :=
      'GRJ-' || v_code || '-' ||
      to_char(v_ts at time zone 'Asia/Kuala_Lumpur', 'DDMMYY-HH24MISS');

    begin
      insert into public.kiosk_receipts (
        receipt_number,
        quote_id,
        outlet_name,
        created_at,
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
        v_number,
        v_quote_id,
        v_outlet,
        v_ts,
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

      exit;
    exception when unique_violation then
      if v_attempt >= 30 then
        raise exception 'Gagal menjana nombor resit unik selepas % cubaan', v_attempt;
      end if;
      -- Tunggu masuk ke saat berikutnya, kemudian jana semula nombor.
      perform pg_sleep(1.02);
    end;
  end loop;

  return jsonb_build_object(
    'id', v_id,
    'receiptNumber', v_number,
    'quoteId', v_quote_id,
    'createdAt', to_char(v_ts at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI:SS')
  );
end;
$$;

revoke all on function public.record_kiosk_receipt(jsonb) from public;
grant execute on function public.record_kiosk_receipt(jsonb) to anon, authenticated;

comment on function public.record_kiosk_receipt(jsonb) is
  'Tulis resit kiosk dan jana nombor resit GRJ di server secara atomik.';
