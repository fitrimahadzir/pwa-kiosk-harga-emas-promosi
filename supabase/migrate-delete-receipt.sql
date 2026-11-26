-- =============================================================================
-- Migrasi: padam resit dari Laporan admin
-- =============================================================================
-- Jalankan sekali dalam Supabase SQL Editor (idempotent — selamat diulang).
--
-- * Klien TIADA DELETE terus pada `kiosk_receipts` (RLS admin = baca sahaja).
--   Semua pemadaman melalui RPC SECURITY DEFINER ini.
-- * Hanya admin Supabase Auth yang aktif dibenarkan.
-- * Jika `kiosk_admins.outlet_name` ditetapkan, admin hanya boleh memadam
--   resit outletnya sendiri (sama seperti had pembacaan laporan).
-- =============================================================================

create or replace function public.delete_kiosk_receipt(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outlet text;
  v_allowed boolean := false;
begin
  if p_id is null or p_id <= 0 then
    return jsonb_build_object('ok', false, 'error', 'ID resit tidak sah.');
  end if;

  if auth.uid() is null or not public.is_kiosk_admin() then
    raise exception 'Hanya admin yang boleh memadam resit.';
  end if;

  select r.outlet_name
    into v_outlet
  from public.kiosk_receipts r
  where r.id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Resit tidak dijumpai.');
  end if;

  select exists (
    select 1
    from public.kiosk_admins a
    where a.user_id = auth.uid()
      and a.is_active = true
      and (
        nullif(btrim(a.outlet_name), '') is null
        or a.outlet_name = v_outlet
      )
  ) into v_allowed;

  if not v_allowed then
    raise exception 'Admin ini tidak dibenarkan memadam resit outlet berkenaan.';
  end if;

  delete from public.kiosk_receipts where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id::text);
end;
$$;

revoke all on function public.delete_kiosk_receipt(bigint) from public, anon;
grant execute on function public.delete_kiosk_receipt(bigint) to authenticated;

notify pgrst, 'reload schema';
