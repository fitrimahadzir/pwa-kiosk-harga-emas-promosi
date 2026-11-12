# Laporan Keselamatan — Bahagian Pentadbir (Admin)

**Projek:** Gold Reserve — PWA Sistem Harga Emas & Promosi
**Laluan:** `C:\Users\user\Desktop\PWA Sistem Harga Emas & Promosi Semasa`
**Tarikh:** 12 November 2026
**Skop:** Akaun pentadbir, laluan tulis ke server, dan sekatan outlet daripada menulis data.
**Kaedah:** Semakan statik kod + reka bentuk semula kebenaran pangkalan data. **Tiada ujian langsung (live probing) ke atas projek Supabase dijalankan**, kerana `supabase/schema.sql` perlu dijalankan sendiri dalam Supabase SQL Editor.

> Laporan audit penuh sebelum ini kekal di `security-audit-12112026.md`. Dokumen ini khusus tentang admin dan perubahan yang telah dilaksanakan.

---

## 1. Premis yang Diuji

> "Admin sahaja boleh input data ke server. Outlet hanya login dan papar harga."

Sebelum pembaikan, premis ini **tidak benar**:

- Aplikasi tiada lapisan server. Browser bercakap terus dengan Supabase REST menggunakan kunci `anon` yang awam.
- Satu-satunya "pagar" admin ialah `if (session.role === 'admin')` dalam React, dan `role` dibaca daripada `localStorage`.
- Laluan tulis tunggal (`storage.ts` → `upsert kiosk_prices`) boleh dipanggil oleh sesiapa sahaja yang mempunyai kunci anon, tanpa melalui UI langsung.
- Polisi DB `with check (true)` membenarkan INSERT tanpa had.

Kesimpulan: **sekatan outlet mesti dibuat di pangkalan data (RLS/GRANT), bukan di React.**

---

## 2. Ringkasan Penemuan & Status

| ID | Tahap | Penemuan | Status selepas pembaikan |
|---|---|---|---|
| **A-01** | Kritikal | Admin dan outlet berkongsi log masuk kod 2 aksara yang boleh dibaca awam | **Selesai** — log masuk kod dibuang; admin guna Supabase Auth e-mel/kata laluan |
| **A-02** | Kritikal | Wildcard `H%` / `H_` menjadikan sesiapa admin | **Selesai** — tiada lagi perbandingan kod; laluan ini tidak wujud |
| **A-03** | Kritikal | `role: "admin"` daripada localStorage terus membuka panel; refresh gagal terbuka | **Selesai** — sesi disahkan ke `kiosk_admins` setiap boot; gagal tertutup |
| **A-04** | Kritikal | Fallback admin `HQ` hardcoded apabila env hilang | **Selesai** — tiada kod demo; aplikasi gagal tertutup dengan mesej konfigurasi |
| **A-05** | Kritikal | Server tidak bezakan admin/outlet/anon untuk tulis (`with check (true)`) | **Selesai** — `anon` tiada INSERT/UPDATE/DELETE; polisi tulis guna `is_kiosk_admin()` |
| **A-06** | Tinggi | Siaran Realtime = saluran tulis tanpa auth ke semua kiosk | **Selesai** — broadcast dibuang; `postgres_changes` hanya mencetuskan fetch semula |
| **A-07** | Tinggi | Tiada jejak audit admin; "history" hanya localStorage | **Selesai (server)** — trigger `kiosk_log_price_change` merekod `auth.uid()` |
| **A-08** | Tinggi | Tiada tamat tempoh/pembatalan sesi admin | **Dibaiki** — sesi Supabase Auth + semakan `is_active` + log keluar bila panel ditutup |
| **A-09** | Sederhana | Tiada had kadar/lockout pada log masuk | **Selesai sebahagian** — had kadar terbina Supabase Auth; disyorkan aktifkan CAPTCHA |
| **A-10** | Sederhana | Kegagalan tulis ditelan; admin nampak "berjaya" palsu | **Selesai** — tulis async; ralat dipaparkan; kejayaan hanya selepas server sahkan |
| **A-11** | Sederhana | Admin boleh tulis ke mana-mana outlet tanpa skop | **Dikekalkan (reka bentuk)** — admin ialah global; setiap outlet aktif dibenarkan |
| **A-12** | Sederhana | Kiosk berkongsi DB + kunci anon yang sama | **Dikurangkan** — anon kini baca-sahaja; kunci anon memang awam dan tidak lagi berbahaya |

---

## 3. Seni Bina Baharu

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ KIOSK / OUTLET (anon)        │        │ ADMIN (Supabase Auth)        │
│                              │        │                              │
│  Pilih nama outlet           │        │  #/admin → e-mel + kata laluan│
│  Baca harga (SELECT)         │        │  Sesi disahkan ke kiosk_admins│
│  Tiada INSERT/UPDATE/DELETE  │        │  Tulis harga (RLS semak)     │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │                                       │
               └───────────────┬───────────────────────┘
                               ▼
                 ┌─────────────────────────────┐
                 │ Supabase Postgres (RLS)     │
                 │                             │
                 │ kiosk_outlets  — nama sahaja│
                 │ kiosk_prices   — baca awam  │
                 │                  tulis admin│
                 │ kiosk_admins   — allow-list │
                 │ kiosk_price_history — audit │
                 └─────────────────────────────┘
```

Prinsip:

1. **Kiosk tidak mempunyai identiti.** Harga memang awam, jadi outlet tidak perlu kelayakan untuk membacanya.
2. **Admin ialah pengguna Supabase Auth** yang didaftarkan dalam `public.kiosk_admins`.
3. **Semua kebenaran tulis disemak dalam Postgres**, bukan dalam React.
4. **Realtime bukan saluran tulis.** Ia hanya isyarat untuk fetch semula.

---

## 4. Perubahan Kod

| Fail | Perubahan |
|---|---|
| `supabase/schema.sql` | Ditulis semula. `kiosk_admins`, `is_kiosk_admin()`, RLS ketat, `revoke` tulis untuk anon, kekangan nama/FK/CHECK, trigger `updated_at` + audit, penerbitan Realtime, putaran kod legasi. |
| `src/lib/auth.ts` | Ditulis semula: `signInAdmin`, `getAdminSession`, `signOutAdmin`. Gagal tertutup; ralat log masuk generik. |
| `src/lib/supabase.ts` | Klien Auth dengan `persistSession`, `autoRefreshToken`, `detectSessionInUrl: false`. |
| `src/utils/storage.ts` | Broadcast dibuang. Tambah `fetchOutletPrices`, `pushOutletPrices`, `subscribeToOutletPrices`, `clearCurrentOutletName`. `savePrices` kini **localStorage sahaja**. `onConflict` dibetulkan kepada `'outlet_name,purity'`. |
| `src/hooks/useSupabaseRealtime.ts` | Ditulis semula: `(outletName, onRemoteChange)`, `postgres_changes` sahaja. |
| `src/components/LoginPage.tsx` | Dua varian: `outlet` (pilih nama, tanpa kod) dan `admin` (e-mel/kata laluan). Mesej gagal tertutup jika env tiada. |
| `src/components/AdminModal.tsx` | `adminLabel`, `onUpdatePrices` async, keadaan `priceSaving`/`priceError`, butang `Menyimpan...`, ralat dipaparkan. |
| `src/components/Header.tsx` | Butang perisai untuk buka `#/admin`; butang keluar dilabel "Tukar outlet". |
| `src/App.tsx` | Ditulis semula: outlet sebagai pilihan awam, sesi admin disahkan, `#/admin` sebagai satu-satunya laluan panel, tulis async ke server, fetch + poll 60s, realtime sebagai isyarat. |
| `src/types/gold.ts` | `adminPin` dibuang. |
| `README.md`, `.env.example` | Arahan persediaan Supabase Auth + amaran keselamatan. |

### Laluan tulis tunggal yang tinggal

```ts
// src/utils/storage.ts
await supabase
  .from('kiosk_prices')
  .upsert(priceData, { onConflict: 'outlet_name,purity' });
```

Ia hanya dipanggil oleh `pushOutletPrices()` daripada `handleUpdatePrices()` di `App.tsx`, yang memerlukan `adminSession`. Walaupun seseorang memanggil REST terus, RLS menolak mereka.

---

## 5. Persediaan Supabase (wajib, sekali sahaja)

> **Penting:** pembaikan kod tidak berkuat kuasa sehingga SQL dijalankan. Sebelum itu, DB lama masih terbuka.

1. Buka **Supabase Dashboard → SQL Editor → New query**.
2. Tampal dan jalankan seluruh `supabase/schema.sql`. Fail ini idempotent (selamat dijalankan berulang).
3. Cipta akaun admin: **Authentication → Users → Add user** (e-mel + kata laluan).
   - Elakkan "Auto Confirm" dimatikan tanpa SMTP; sahkan pengguna secara manual jika perlu.
   - Di **Authentication → Providers → Email**, matikan **"Allow new users to sign up"** supaya tiada pendaftaran awam. Akaun di luar `kiosk_admins` tidak boleh menulis, tetapi menutup pendaftaran mengurangkan permukaan serangan.
4. Daftarkan pengguna itu sebagai admin:

```sql
insert into public.kiosk_admins (user_id, email)
select id, email
from auth.users
where email = 'admin@kedai.com'
on conflict (user_id) do update set is_active = true;
```

5. Pastikan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` diset semasa build.
6. Buka `#/admin` untuk log masuk. **Menutup panel akan log keluar.**

### Nota tentang `kiosk_outlets.code`

- `code` dikekalkan untuk keserasian sejarah tetapi **tidak lagi digunakan untuk log masuk**.
- Nilainya diputar (`legacy-<uuid>`) untuk `HQ` dan `AMANJAYA` supaya kod lama tidak sah.
- `anon` tidak mempunyai hak SELECT pada jadual itu. Nama outlet diambil melalui fungsi `public.kiosk_outlet_names()`, yang hanya memulangkan `name` untuk baris `role = 'outlet'` — baris role admin tidak dipaparkan di kiosk.

---

## 6. Ujian Penerimaan

Jalankan dengan kunci anon sebenar (`$ANON`) dan URL projek (`$SUPABASE`).

### 6.1 Outlet / orang awam tidak boleh menulis

```bash
# INSERT terus → mesti 401 / 403 / "permission denied"
curl -i -X POST "$SUPABASE/rest/v1/kiosk_prices" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d '[{"outlet_name":"Amanjaya Mall","purity":"999","sell_price":1,"buy_price":1}]'

# UPDATE → mesti ditolak
curl -i -X PATCH "$SUPABASE/rest/v1/kiosk_prices?outlet_name=eq.Amanjaya%20Mall" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d '{"sell_price":1}'

# DELETE → mesti ditolak
curl -i -X DELETE "$SUPABASE/rest/v1/kiosk_prices?outlet_name=eq.Amanjaya%20Mall" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

### 6.2 Kod outlet tidak lagi boleh dibaca

```bash
# Mesti gagal (permission denied untuk lajur code)
curl -i "$SUPABASE/rest/v1/kiosk_outlets?select=code,name" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# Mesti hanya memulangkan { name } — tiada code/role
curl -s -X POST "$SUPABASE/rest/v1/rpc/kiosk_outlet_names" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -d '{}'
```

### 6.3 Admin sahaja boleh menulis

```bash
# Dapatkan token admin melalui log masuk app, atau:
# POST /auth/v1/token?grant_type=password  { email, password }

# Sebagai admin → 201 / 200
curl -i -X POST "$SUPABASE/rest/v1/kiosk_prices" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"outlet_name":"Amanjaya Mall","purity":"999","sell_price":468,"buy_price":422}]'

# Baris audit mesti bertambah dengan changed_by = auth.uid() admin
curl -s "$SUPABASE/rest/v1/kiosk_price_history?select=outlet_name,purity,changed_by,changed_at&order=changed_at.desc&limit=3" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 6.4 Ujian UI

| Ujian | Jangkaan |
|---|---|
| Buka `#/admin` tanpa log masuk | Skrin log masuk pentadbir, bukan panel |
| Set `role: "admin"` / apa-apa dalam localStorage, reload | Panel admin **tidak** muncul |
| Log masuk dengan e-mel bukan admin (tapi sah) | Ditolak dengan mesej generik |
| Tutup panel admin | Sesi Supabase Auth dibuang; kembali ke kiosk |
| `H%`, `H_`, `_Q` pada skrin | Tiada lagi medan kod; tiada kesan |
| Buka kiosk, ubah harga dari admin lain | Kiosk fetch semula dalam masa nyata/poll 60s |
| Siaran `broadcast` palsu ke channel `gold_prices` | Kiosk tidak berubah (tiada listener tulis) |
| Simpan harga semasa offline | Ralat dipaparkan; **tiada** mesej "berjaya" palsu |

---

## 7. Risiko Baki & Cadangan

| # | Risiko | Cadangan |
|---|---|---|
| R-01 | **Promosi & tetapan kedai masih localStorage sahaja.** Ia tidak disegerakkan ke server dan tidak terjejas oleh RLS. | Jika perlu sync, tambah `kiosk_promos` / `kiosk_settings` dengan baca awam + tulis admin. |
| R-02 | **Tiada MFA untuk admin.** Kata laluan sahaja. | Aktifkan MFA (TOTP) dalam Supabase Auth untuk akaun admin. |
| R-03 | **Had kadar log masuk bergantung pada konfigurasi Supabase.** | Aktifkan CAPTCHA + semak had kadar Auth; pertimbangkan tempoh JWT yang lebih pendek. |
| R-04 | **Admin global:** mana-mana admin boleh mengubah semua outlet. | Jika perlu, tambah `outlet_name` pada `kiosk_admins` dan skopkan polisi tulis. |
| R-05 | **SQL belum dijalankan.** Selagi `schema.sql` tidak dijalankan, DB lama masih terbuka. | Jalankan segera; sahkan dengan ujian 6.1–6.3. |
| R-06 | **`dist/` mengandungi kunci anon.** Ini normal untuk Supabase; keselamatan terletak pada RLS. | Jangan sesekali masukkan `service_role` ke klien. |
| R-07 | **Cache localStorage boleh diedit** (harga/promosi dipaparkan). | Paparan kiosk sentiasa dihidrasi semula daripada server; jangan percaya cache untuk keputusan perniagaan. |
| R-08 | **Jejak audit tidak dipaparkan dalam UI.** | Tambah tab "Sejarah" yang membaca `kiosk_price_history` dari server. |
| R-09 | **Pendaftaran awam Supabase Auth mungkin aktif.** Pengguna yang mendaftar sendiri tetap bukan admin, tetapi lebih baik ditutup. | Matikan "Allow new users to sign up" dan tetapkan kata laluan minimum yang kukuh. |

---

## 8. Kesimpulan

Selepas perubahan ini:

- **Outlet tidak boleh menulis ke server** — bukan kerana UI menyembunyikan butang, tetapi kerana `anon` tidak mempunyai INSERT/UPDATE/DELETE dan semua polisi tulis memanggil `is_kiosk_admin()`.
- **Admin ialah identiti sebenar** (Supabase Auth) yang disahkan semula di server pada setiap permintaan tulis.
- **Tiada lagi laluan "jadi admin" melalui kod, wildcard, localStorage, atau fallback hardcoded.**
- **Kegagalan tidak lagi didiamkan** — admin melihat ralat sebenar jika server menolak penulisan.

**Tindakan pengguna yang masih diperlukan:** jalankan `supabase/schema.sql`, cipta pengguna Auth, daftarkan dalam `kiosk_admins`, dan lulus ujian penerimaan di Seksyen 6.
