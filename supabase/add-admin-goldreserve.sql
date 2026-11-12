-- ===========================================================================
-- Daftar admin@goldreserve.com.my sebagai pentadbir kiosk.
--
-- PRASYARAT:
--   Akaun Supabase Auth dengan e-mel ini MESTI sudah wujud.
--   Cipta di: Supabase Dashboard > Authentication > Users > Add user
--   (atau melalui sign-up), kemudian jalankan fail ini di SQL Editor.
--
-- Keselamatan:
--   * Hanya user_id yang sepadan dalam auth.users akan didaftarkan.
--   * is_active = true membolehkan RLS `is_kiosk_admin()` menerima tulis.
--   * Tidak ada kata laluan disimpan dalam jadual ini.
-- ===========================================================================

do $$
declare
  v_email   text := lower(trim('admin@goldreserve.com.my'));
  v_user_id uuid;
begin
  select u.id
    into v_user_id
  from auth.users u
  where lower(trim(u.email)) = v_email
  limit 1;

  if v_user_id is null then
    raise exception
      'Akaun Supabase Auth % belum wujud. Cipta pengguna di Authentication > Users dahulu, kemudian jalankan SQL ini semula.',
      v_email;
  end if;

  insert into public.kiosk_admins (user_id, email, is_active)
  values (v_user_id, v_email, true)
  on conflict (user_id) do update
    set email      = excluded.email,
        is_active  = true,
        updated_at = now();

  raise notice 'Berjaya: % didaftarkan sebagai admin (user_id = %).', v_email, v_user_id;
end
$$;

-- Pengesahan: sepatutnya memulangkan 1 baris dengan is_active = true.
select a.user_id, a.email, a.is_active, a.created_at, a.updated_at
from public.kiosk_admins a
where lower(a.email) = lower('admin@goldreserve.com.my');
