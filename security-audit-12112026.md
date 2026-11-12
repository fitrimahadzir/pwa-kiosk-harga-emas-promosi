# Laporan Audit Keselamatan / Security Audit Report

**Projek:** Gold Reserve — PWA Sistem Harga Emas & Promosi
**Laluan:** `C:\Users\user\Desktop\PWA Sistem Harga Emas & Promosi Semasa`
**Tarikh:** 12 November 2026
**Kaedah:** Semakan statik ke atas semua source, config, SQL, dokumentasi, CI dan artifak build; sapuan rahsia melalui `git ls-files` / `git log --all`; pemeriksaan klaim JWT (role sahaja). **Tiada ujian langsung (live probing) ke atas projek Supabase dijalankan.**

---

## Kandungan

1. [Keputusan (Verdict)](#1-keputusan-verdict)
2. [Seni Bina & Sempadan Kepercayaan](#2-seni-bina--sempadan-kepercayaan)
3. [Ringkasan Penemuan](#3-ringkasan-penemuan)
4. [Penemuan Kritikal](#4-penemuan-kritikal)
5. [Penemuan Tinggi](#5-penemuan-tinggi)
6. [Supabase & Kebenaran Pangkalan Data](#6-supabase--kebenaran-pangkalan-data)
7. [Keselamatan API](#7-keselamatan-api)
8. [Kawalan yang Betul (Disahkan)](#8-kawalan-yang-betul-disahkan)
9. [Pelan Pemulihan Berkeutamaan](#9-pelan-pemulihan-berkeutamaan)
10. [Cara Mengesahkan Pembaikan](#10-cara-mengesahkan-pembaikan)
11. [Batasan Audit](#11-batasan-audit)

---

## 1. Keputusan (Verdict)

> **Risiko keseluruhan: KRITIKAL — jangan dedahkan build ini kepada internet sehingga C-01…C-05 dan H-01…H-02 dibaiki.**

Aplikasi ini **tiada lapisan server**. Browser berkomunikasi terus dengan Supabase REST + Realtime menggunakan kunci `anon` yang bersifat awam. Oleh itu *RLS Supabase ialah satu-satunya sempadan keselamatan yang wujud* — dan pada masa ini ia terbuka di tiga tempat, manakala "authentication" hanyalah carian kod di sisi klien yang mana kod itu sendiri boleh dibaca secara awam.

Senario terburuk yang realistik hari ini, tanpa akaun dan tanpa pengetahuan dalaman:

1. Baca semua kod outlet dan role daripada `kiosk_outlets` menggunakan kunci anon.
2. Atau langkau kod sepenuhnya dengan `H%` pada skrin log masuk.
3. Atau set `role: "admin"` dalam localStorage dan jalankan secara offline.
4. Kemudian tolak harga emas sewenang-wenangnya ke semua kiosk melalui siaran Realtime tanpa pengesahan.

Itu adalah **penipuan harga yang berhadapan terus dengan pelanggan** (customer-facing price fraud), bukan sekadar kebocoran data.

| Tahap | Bilangan |
|---|---|
| Kritikal | 5 |
| Tinggi | 4 |
| Sederhana | 13 |
| Rendah / Info | 10 |

---

## 2. Seni Bina & Sempadan Kepercayaan

```
Browser (React SPA, tiada server)
  ├─ localStorage  ← semua state perniagaan: harga, promosi, tetapan, sejarah, role sesi
  ├─ Supabase REST (anon key, awam)  → kiosk_outlets, kiosk_prices
  └─ Supabase Realtime broadcast "gold_prices" (channel awam)
```

Kesan yang mendorong kebanyakan penemuan:

- **Tiada BFF / Edge Function / server Express.** `express`, `dotenv`, `@google/genai` ialah dependency tetapi **tidak pernah diimport** — tiada kod server dan tiada panggilan Gemini di mana-mana.
- **Semua keputusan kebenaran berlaku dalam browser** (`role` daripada localStorage), jadi ia bersifat nasihat sahaja.
- `supabase/schema.sql` ialah keseluruhan definisi backend, dan klien melakukan penulisan yang sebenarnya tidak dibenarkan oleh schema (lihat H-01), jadi UI melaporkan kejayaan sedangkan pangkalan data tidak pernah dikemas kini.

---

## 3. Ringkasan Penemuan

| ID | Tahap | Penemuan |
|---|---|---|
| C-01 | Kritikal | Mana-mana pengguna tanpa nama boleh membaca semua kod log masuk outlet dan role |
| C-02 | Kritikal | Wildcard injection melalui `ilike` → log masuk admin tanpa kod (`H%`) |
| C-03 | Kritikal | Fallback admin `HQ` yang hardcoded, **tidak** dihadkan kepada dev |
| C-04 | Kritikal | Sesi admin localStorage boleh dipalsukan; pengesahan semula gagal **terbuka** (fail open) |
| C-05 | Kritikal | Siaran Realtime tanpa pengesahan boleh menulis semula harga pada semua kiosk |
| H-01 | Tinggi | `kiosk_prices`: INSERT tanpa nama dibenarkan; polisi UPDATE admin tidak berfungsi |
| H-02 | Tinggi | Kod admin dikomit dalam repo/dokumen dan dihidupkan semula apabila seed dijalankan semula |
| H-03 | Tinggi | Tiada pengasingan multi-tenant; klien memilih outlet sasaran untuk penulisan |
| H-04 | Tinggi | Tiada tamat tempoh/pembatalan sesi; kelayakan disimpan dalam bentuk teks biasa di sisi klien |
| M-01 | Sederhana | Tiada had kadar, lockout, atau anti-enumerasi |
| M-02 | Sederhana | DB bukan sumber kebenaran; harga lapuk disiarkan semula; ralat penulisan ditelan |
| M-03 | Sederhana | Ketiadaan FK/UNIQUE/CHECK/jejak audit/trigger `updated_at` |
| M-04 | Sederhana | RLS diaktifkan tetapi tidak FORCED; polisi terpakai kepada `PUBLIC`; tiada grants/REVOKE |
| M-05 | Sederhana | Kiosk berkongsi projek Supabase laman utama + kunci anon awam yang sama |
| M-06 | Sederhana | Tiada CSP / security headers; font pihak ketiga tanpa SRI; risiko clickjacking |
| M-07 | Sederhana | Muat naik promosi: tiada pengesahan MIME/saiz, base64 ke localStorage → DoS kuota |
| M-08 | Sederhana | Log keluar meninggalkan semua harga/promosi/tetapan/sejarah outlet pada tablet |
| M-09 | Sederhana | Dependency production tidak digunakan termasuk pakej install-script; dua lockfile |
| M-10 | Sederhana | Action CI dipin mengikut tag; tiada blok `permissions:` |
| M-11 | Sederhana | `adminPin: '1234'` yang mati menormalkan backdoor masa depan |
| M-12 | Sederhana | Drift schema/klien: promosi/tetapan/sejarah tidak pernah disimpan; `onConflict` tidak sah |
| M-13 | Sederhana | URL imej promosi jauh sewenang-wenangnya (tracking / kebergantungan ketersediaan) |
| L-01 | Rendah | Payload Realtime ditulis ke storage tanpa pengesahan |
| L-02 | Rendah | Query log masuk tidak menyemak `is_active` secara langsung |
| L-03 | Rendah | ID sebut harga boleh dijangka |
| L-04 | Rendah | Service worker `dev-dist/` dijejaki; SW diaktifkan dalam dev |
| L-05 | Rendah | Dokumentasi menuntut kunci Gemini untuk ciri yang tidak wujud |
| L-06 | Rendah | `user-scalable=no`; `robots.txt` dianggap sebagai kawalan akses |
| I-01…04 | Info | Kunci anon dalam bundle adalah mengikut reka bentuk; **tiada** `service_role`; tiada sink XSS; tiada SQLi |

---

## 4. Penemuan Kritikal

### C-01 — Setiap kod outlet dan role boleh dibaca secara awam

**Bukti:** `supabase/schema.sql:35-39`, digunakan oleh `src/lib/auth.ts:66-70`

```sql
create policy "Kiosk outlet codes are readable for login"
  on public.kiosk_outlets
  for select
  using (is_active = true);
```

Polisi ini hanya peringkat baris, terpakai kepada `PUBLIC`, dan mendedahkan **semua kolum** — termasuk `code` dan `role`. Kunci anon berada dalam bundle yang diedarkan mengikut reka bentuk, jadi:

```
GET /rest/v1/kiosk_outlets?select=code,name,role&is_active=eq.true
```

mengembalikan kod admin. Authentication oleh itu bukan kawalan sama sekali.

**Pembaikan:** revoke SELECT daripada `anon`/`authenticated`; sahkan kod melalui RPC `SECURITY DEFINER` yang hanya mengembalikan nama/role outlet, sebaiknya selepas hashing. Jangka panjang: Supabase Auth.

```sql
revoke select on public.kiosk_outlets from anon, authenticated;

create or replace function public.kiosk_login(p_code text)
returns table (outlet_name text, outlet_role text)
language sql
security definer
set search_path = public
as $$
  select name, role
  from public.kiosk_outlets
  where code = upper(trim(p_code)) and is_active
  limit 1;
$$;

revoke all on function public.kiosk_login(text) from public;
grant execute on function public.kiosk_login(text) to anon;
```

> Nota: RPC sahaja tidak menghalang brute force atau enumerasi melalui prefix — pasangkan dengan had kadar (M-01) dan kod rawak panjang (H-02).

### C-02 — Wildcard injection dalam carian log masuk memberikan akses admin

**Bukti:** `src/lib/auth.ts:49-51`, `:66-70`, `:113-117`; `src/components/LoginPage.tsx:79-91`

```ts
export function normalizeOutletCode(code: string): string {
  return code.trim().toUpperCase();     // % dan _ dikekalkan
}
...
.ilike('code', code)                    // input pengguna menjadi corak LIKE
.maybeSingle();
```

`supabase-js` menghantar ini sebagai `code=ilike.<nilai>`; PostgREST menganggap `%`/`_` sebagai wildcard. Dengan kod admin 2 aksara yang di-seed, **`H_`, `H%`, `_Q` semuanya memadankan baris admin** dan mengembalikan `role: 'admin'`. Tiada pengetahuan kod diperlukan. Primitif yang sama digunakan oleh `refreshSession` (`auth.ts:116`), jadi sesi tersimpan yang direka boleh dinaik taraf kepada admin semasa boot.

**Pembaikan:** padanan tepat serta pengesahan ketat, sebelum query:

```ts
if (!/^[A-Z0-9][A-Z0-9-]{5,31}$/.test(code)) {
  throw new Error('Kod outlet tidak sah.');
}
.eq('code', code)
```

### C-03 — Fallback admin hardcoded dihantar dalam production

**Bukti:** `src/lib/auth.ts:24-27`, `:60-61`, `:91-97`

```ts
const LOCAL_OUTLETS = {
  AMANJAYA: { outletName: 'Amanjaya Mall', role: 'outlet' },
  HQ:       { outletName: 'HQ Warehouse', role: 'admin' },
};
```

Hanya *hint* pada skrin dihadkan kepada dev (`LoginPage.tsx:119`), bukan fallback-nya. Mana-mana build dengan `VITE_SUPABASE_URL` atau `ANON_KEY` yang hilang/kosong (preview deploy, artifak CI, host tersalah konfigurasi) berjalan **tanpa kebergantungan rangkaian sama sekali**, dan `HQ` membuka panel admin secara offline. Kod juga terdapat dalam `dist/assets/index-o3Pigg96.js`, jadi ia hidup dalam build semasa.

**Pembaikan:** buang `LOCAL_OUTLETS` daripada laluan production; gagal tertutup (fail closed) apabila Supabase tidak dikonfigurasi (`service unavailable`), dan hanya benarkan modul demo di bawah `import.meta.env.DEV`.

### C-04 — Sesi admin localStorage boleh dipalsukan; pengesahan semula gagal terbuka

**Bukti:** `src/lib/auth.ts:111`, `:119-120`, `:135-159`; `src/App.tsx:85`, `:312-361`, `:376-399`

```ts
if (!supabase) return session;          // tiada semakan server (mod demo)
...
// Network / temporary failure: keep working with the stored session.
if (error) return session;              // GAGAL TERBUKA
```

Sesi ialah objek JSON tanpa tandatangan dalam `localStorage['emaspos_auth_session_v1']`, dan `App.tsx:85` memaparkannya **secara segerak** sebelum pengesahan semula async pada `:317` selesai. PoC:

```js
localStorage.setItem('emaspos_auth_session_v1',
  JSON.stringify({ code: '%', outletName: 'x', role: 'admin' }));
location.reload();
```

Jika Supabase disekat/offline — atau jika `code: '%'` menyebabkan `maybeSingle()` mengembalikan berbilang baris — `refreshSession` memasuki cabang `error` dan **mengekalkan sesi admin**. Komen kod pada `auth.ts:100-103` yang mendakwa ini menghalang akses admin palsu adalah tidak tepat.

**Pembaikan:** jangan simpan role di sisi klien; simpan JWT legap yang dikeluarkan server dengan tamat tempoh; gagal **tertutup** apabila ralat pengesahan semula; paparkan loading gate sehingga pengesahan semula selesai.

### C-05 — Sesiapa sahaja boleh menyiarkan harga palsu ke setiap kiosk

**Bukti:** `src/utils/storage.ts:190-231` (subscribe), `:237-274` (publish); `src/hooks/useSupabaseRealtime.ts:20-25`; `src/App.tsx:140`

```ts
priceChannel = supabase.channel('gold_prices');       // channel awam
priceChannel.on('broadcast', { event: 'prices-changed' }, (payload) => {
  const raw = payload.payload as { outletName?, prices? } | null;
  if (raw?.prices && !Array.isArray(raw.prices)) {
    onPrices(raw.prices, raw.outletName ?? 'default'); // tiada auth, tiada pengesahan
  }
});
```

Listener didaftarkan **sebelum** login gate (`App.tsx:140` vs `:364`), iaitu pada skrin log masuk juga, dan menulis terus ke localStorage. Mana-mana pemegang kunci anon awam boleh menyiarkan `{ topic: "gold_prices", event: "prices-changed", payload: { outletName, prices } }` dan mengubah harga yang dipaparkan pada setiap kiosk yang bersambung, atau menyasarkan mana-mana outlet mengikut nama.

**Pembaikan:** buang laluan penulisan broadcast klien; gunakan `postgres_changes` yang dilindungi RLS dan anggap mana-mana mesej sebagai *isyarat untuk fetch semula*, bukan sebagai data. Jika broadcast dikekalkan, aktifkan Realtime Authorization (RLS `realtime.messages`, channel peribadi) dan sahkan `purity ∈ {999,916,375}`, `Number.isFinite`, positif, `buy ≤ sell`, nama outlet yang diketahui, had saiz.

---

## 5. Penemuan Tinggi

### H-01 — Kebenaran `kiosk_prices` terlalu terbuka dan tidak berfungsi

**Bukti:** `supabase/schema.sql:81-92`; `src/utils/storage.ts:254`

```sql
create policy "Admins can update own outlet prices"
  on public.kiosk_prices for update
  using ((select role from public.kiosk_outlets
          where code = current_setting('app.outlet_code')) = 'admin');  -- GUC tidak pernah di-set

create policy "Seed kiosk prices initial data"
  on public.kiosk_prices for insert
  with check (true);                                                    -- boleh ditulis oleh semua
```

- `current_setting('app.outlet_code')` **tidak pernah di-set** oleh klien atau PostgREST, jadi polisi UPDATE ralat atau menolak. `upsert` memerlukan INSERT **dan** UPDATE, jadi simpanan harga admin yang sah gagal.
- Polisi INSERT seed kekal dalam production dengan `with check (true)` — sesiapa boleh memasukkan outlet/harga sewenang-wenangnya, yang kemudiannya dipaparkan oleh `syncRemoteOutlets`.
- `void supabase...upsert(...)` tidak ditunggu (fire-and-forget) dan tidak pernah menyemak `error`, manakala `AdminModal.tsx:226-231` terus memaparkan "berjaya dikemaskini dan disegerakkan". Admin diberitahu sync berjaya sedangkan ia tidak.
- `onConflict: 'outlet_name, purity'` mengandungi ruang; PostgREST menjangka `outlet_name,purity`.

**Pembaikan:** buang kedua-dua polisi; benarkan penulisan melalui `auth.uid()`/klaim JWT atau RPC `SECURITY DEFINER`; `await` panggilan; paparkan ralat; betulkan sasaran konflik; jadikan DB sebagai sumber kebenaran.

### H-02 — Kod admin diterbitkan dan seed menghidupkannya semula

**Bukti:** `supabase/schema.sql:45-53`, `last.md`, `CHANGELOG.md`, `src/lib/auth.ts:24-27`

Kod admin yang di-seed ialah 2 aksara dan muncul dalam schema, dokumentasi, changelog, dan **repositori GitHub awam**. Lebih teruk, seed menggunakan:

```sql
on conflict (code) do update set role = excluded.role, is_active = true, updated_at = now();
```

jadi menjalankan semula `schema.sql` (langkah penyelesaian masalah yang biasa) **menghidupkan semula admin yang sengaja dilumpuhkan dan menetapkan semula role-nya**. Memutar kod dengan mengedit seed mencipta baris *baharu* dan membiarkan admin lama aktif.

**Tindakan segera:** putar sekarang, dengan andaian ia telah dikompromi:

```sql
update public.kiosk_outlets set is_active = false, updated_at = now()
where code = 'HQ';                        -- lumpuhkan baris yang bocor secara eksplisit

insert into public.kiosk_outlets (code, name, role, is_active)
values ('<new-random-16+-char-code>', 'HQ Warehouse', 'admin', true);

-- tukar seed supaya tidak merosakkan:
--   on conflict (code) do nothing;
```

Tambah `check (char_length(code) >= 12)` dan indeks unik tidak sensitif huruf besar/kecil; buang kod daripada dokumentasi.

### H-03 — Tiada pengasingan tenant, tiada kebenaran di sisi server

**Bukti:** `src/lib/auth.ts:83-88`; `src/utils/storage.ts:246-254`; pemilih outlet `AdminModal.tsx`

Tiada klaim `outlet_id`, tiada semakan pemilikan, tiada `auth.uid()` di mana-mana. "Tenant" ialah kod mana pun yang sepadan, dan laluan penulisan menerima mana-mana `outletName` (`storage.ts:247-254`). Mana-mana admin boleh mengedit setiap outlet, dan mana-mana klien boleh menyiarkan untuk mana-mana outlet. Nota sejarah harga ialah teks bebas tanpa pelaku yang disahkan, jadi perubahan tidak boleh diatribusikan.

**Pembaikan:** `outlet_id` dalam JWT yang disahkan, RLS `using (outlet_id = auth.jwt()->>'outlet_id')`, baris audit yang ditulis server dengan pelaku yang disahkan.

### H-04 — Tiada kitaran hayat sesi

**Bukti:** `src/lib/auth.ts:5-9`, `:18`, `:156-159`

`AuthSession = { code, outletName, role }` dalam localStorage teks biasa; tiada token, issued-at, tamat tempoh, refresh, atau senarai pembatalan. Log keluar hanya membuang satu kunci itu — kod statik kekal sah selama-lamanya di server. Kod yang dilihat pada kiosk, dalam tangkapan skrin, atau dalam jadual awam ialah kelayakan kekal.

**Pembaikan:** Supabase Auth dengan access JWT jangka pendek + refresh token berputar; sesi per-peranti; step-up re-auth sebelum perubahan harga; putar semua kod selepas migrasi.

---

## 6. Supabase & Kebenaran Pangkalan Data

### Matriks kebenaran

| Jadual | RLS | anon SELECT | anon INSERT | anon UPDATE | anon DELETE |
|---|---|---|---|---|---|
| `kiosk_outlets` | diaktifkan, **tidak forced** | **Semua baris aktif, semua kolum** (`code`,`role`) | tidak | tidak | tidak |
| `kiosk_prices` | diaktifkan, **tidak forced** | Semua baris | **Ya** (`with check (true)`) | Polisi wujud tetapi tidak berfungsi (GUC tidak di-set) | tidak |

### Jurang DB tambahan (M-03/M-04)

- Tiada `force row level security`; polisi tidak menyatakan `TO` (terpakai kepada `PUBLIC`); tiada `REVOKE`/grant kolum.
- `kiosk_prices.outlet_name` **tiada FK** ke `kiosk_outlets`; `kiosk_outlets.name` **tidak UNIQUE** tetapi digunakan sebagai kunci harga.
- Tiada `CHECK (sell_price >= 0)`, tiada `buy_price <= sell_price`, `numeric` tanpa precision.
- Tiada trigger `updated_at` (upsert tidak menyertakannya, jadi ia kekal pada masa insert).
- **Tiada jejak audit di sisi server.** "Sejarah harga" hanya localStorage, dipotong kepada 50 entri, dan boleh diedit melalui devtools — ia bukan bukti.
- `kiosk_promos`, `kiosk_settings`, `kiosk_price_history` disenaraikan sebagai "dirancang" tetapi tidak wujud; promosi/tetapan/sejarah hanya di klien (M-12).

### Pengerasan yang disyorkan, mengikut urutan

```sql
alter table public.kiosk_outlets force row level security;
alter table public.kiosk_prices  force row level security;

alter table public.kiosk_outlets add constraint kiosk_outlets_name_key unique (name);
alter table public.kiosk_prices
  alter column sell_price type numeric(12,2),
  alter column buy_price  type numeric(12,2),
  add constraint kiosk_prices_nonnegative check (sell_price >= 0 and buy_price >= 0),
  add constraint kiosk_prices_buy_lte_sell check (buy_price <= sell_price),
  add constraint kiosk_prices_outlet_fkey
    foreign key (outlet_name) references public.kiosk_outlets(name)
    on update cascade on delete restrict;
```

Kemudian sahkan pangkalan data **yang digunakan** (deployed), bukan hanya fail:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename like 'kiosk_%';

select relname, relrowsecurity, relforcerowsecurity
from pg_class where relname like 'kiosk_%';
```

---

## 7. Keselamatan API

**Tiada API tersuai.** Tiada `server.js`, tiada penggunaan Express, tiada penggunaan Gemini, tiada Edge Function, tiada bucket Storage. Permukaan serangan ialah Supabase REST/Realtime, jadi kebimbangan klasik (konfigurasi CORS, auth route, SSRF, middleware pengesahan input) tidak terpakai — dan tiada kawalan pampasan di sisi server yang wujud sama sekali.

| Kebimbangan | Status |
|---|---|
| Pendedahan kunci istimewa | ✅ **Baik** — tiada `service_role`/`sb_secret` dalam source, `.env*`, dokumen, `dist/`, atau mana-mana commit (`git log --all -S`). Hanya JWT `anon`, yang awam mengikut reka bentuk. |
| Rahsia dikomit ke git | ✅ **Baik** — `.env.local` diabaikan (`.gitignore:7`) dan tidak dijejaki; hanya `.env.example` dijejaki. `GEMINI_API_KEY` dalam `.env.local` ialah placeholder literal. |
| Kebenaran sisi server | ❌ Tiada. Semua keputusan dalam browser. |
| Pengesahan input sebelum query | ❌ `.ilike()` dengan input tidak di-escape (C-02); payload realtime di-cast, bukan disahkan (L-01). |
| Had kadar / kawalan penyalahgunaan | ❌ Tiada (M-01); hanya had platform Supabase generik. |
| Pengendalian ralat / kebocoran maklumat | ⚠️ Mesej "tidak dijumpai" vs "tidak sah" berbeza; butiran PostgREST dikembalikan kepada klien melalui `error.message` (log ke console). |
| CORS / sekatan origin | ⚠️ N/A — kunci anon berfungsi dari mana-mana origin, jadi RLS satu-satunya pintu. |
| Log permintaan kelayakan | ⚠️ Kod log masuk bergerak dalam **query string** (`?code=ilike.HQ`), jadi ia boleh masuk ke log proksi/APM/Supabase. |
| Kebolehpercayaan penulisan | ❌ Penulisan tidak di-await; kegagalan disembunyikan; UI menunjukkan kejayaan palsu (H-01/M-02). |
| Jejari letupan dikongsi | ⚠️ Kiosk berkongsi pangkalan data laman utama, jadi mana-mana kesilapan RLS laman utama boleh dicapai dengan kunci kiosk yang diterbitkan (M-05). |

Pengerasan percuma: buang `express`, `dotenv`, `@google/genai`, `@types/express`, `tsx` jika tidak digunakan. `@google/genai@2.32.0` ialah dependency production tidak digunakan dengan **install script** (`bun.lock`), iaitu pelaksanaan kod semasa `npm ci` tanpa sebarang manfaat. Kekalkan satu lockfile sahaja, bukan kedua-dua `package-lock.json` dan `bun.lock`.

---

## 8. Kawalan yang Betul (Disahkan)

Ini adalah kawalan sebenar, tetapi ia tidak mengimbangi penemuan kritikal di atas:

1. **Tiada kunci istimewa di mana-mana** — kiraan `service_role` ialah 0 dalam `src/`, `dist/`, dan semua sejarah git. Kunci bundle menyahkod kepada `role: anon`.
2. **`.env.local` tidak pernah dikomit** — diabaikan dan tidak dijejaki; tiada rahsia dalam sejarah.
3. **Tiada sink XSS** — sifar `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`; React meng-escape semua teks DB/promosi.
4. **Tiada SQL injection melalui PostgREST** — pengecam jadual/kolum statik; nilai berparameter. C-02 ialah kelemahan corak LIKE/kebenaran, bukan SQLi.
5. **RLS diaktifkan** pada kedua-dua jadual, dan `kiosk_outlets` **tiada** polisi tulis, jadi anon tidak boleh mencipta/mengubah akaun (hanya membacanya — iaitu C-01).
6. **Tiada polisi DELETE** pada `kiosk_prices`, jadi baris tidak boleh dipadam melalui API.
7. **Tiada muatan sumber `http://`**; hanya font/Unsplash HTTPS. Tiada telemetri/analitik. Tiada rahsia atau PII dilog.
8. **Service worker hanya cache app shell** — tiada respons Supabase, jadi CacheStorage tidak menyimpan data sensitif.
9. **Tiada permukaan routing URL untuk dilangkau** — routing hash sahaja; admin digated oleh `session.role` (kelemahannya, bukan lencongan laluan).
10. **CI menggunakan `npm ci` dengan lockfile dikomit**; tiada `.npmrc` atau registry tidak dipercayai.

---

## 9. Pelan Pemulihan Berkeutamaan

### Segera (hari ini)

1. **Putar kod admin** dan semua kod outlet; tetapkan `is_active = false` secara eksplisit pada baris admin lama. Anggap semua kod telah dikompromi.
2. **Buang polisi INSERT awam** pada `kiosk_prices` (`schema.sql:88-92`). Sehingga auth wujud, sekat semua penulisan harga dan bukan meninggalkan `with check (true)`.
3. **Sekat SELECT `kiosk_outlets`** — `revoke select ... from anon`. Tanpa ini, setiap pembaikan lain hanya kosmetik.
4. **Buang laluan penulisan broadcast Realtime** atau jadikan channel peribadi dengan RLS `realtime.messages`.

### Minggu ini

5. Gantikan `ilike` dengan `.eq` + regex ketat (C-02), dan buang fallback demo yang tidak dihadkan kepada dev (C-03).
6. Gagal tertutup dalam `refreshSession`; hentikan rendering admin daripada role localStorage yang di-cache (C-04).
7. Betulkan laluan penulisan: `await`, semak `error`, `onConflict: 'outlet_name,purity'`, tiada mesej kejayaan sehingga disahkan (H-01/M-02).
8. Tambah audit sisi server: `kiosk_price_history` ditulis oleh trigger/RPC, dengan `changed_by`.

### 30 hari

9. Berhijrah ke **Supabase Auth** dengan klaim `role`/`outlet_id` dalam JWT, RLS berasaskan `auth.uid()`, rahsia outlet di-hash, had kadar/lockout, mesej ralat generik.
10. Jadikan DB sebagai sumber kebenaran untuk kiosk: fetch semasa log masuk dan pada setiap isyarat realtime, semakan versi/`updated_at`, offline = cache baca-sahaja dengan banner "stale" yang jelas.
11. Pengerasan schema (FK, UNIQUE, CHECK, trigger `updated_at`, `force row level security`, `TO`/grants eksplisit), serta sahkan polisi yang digunakan terhadap `pg_policies`.
12. Buang `adminPin`, kosongkan semua data `emaspos_*` semasa log keluar, tambah tindakan "clear device data"; kuatkuasakan had muat naik promosi.
13. Tambah CSP/HSTS/`X-Frame-Options`/`Referrer-Policy` pada host; host sendiri Poppins; tambah SRI jika CSS jauh kekal.

### Berterusan

14. Asingkan projek Supabase (atau schema khusus + kunci berskop) untuk kiosk.
15. Pin action CI kepada SHA, tambah `permissions: contents: read`, jalankan `npm audit`/Dependabot, buang dependency tidak digunakan dan lockfile tambahan.
16. Tambah playbook insiden untuk memutar kod kongsi dan semakan bahawa tiada kod muncul dalam dokumen/sejarah.

---

## 10. Cara Mengesahkan Pembaikan

```bash
# 1. Kod TIDAK boleh dienumerasi (jangka 401/403 atau kosong, bukan baris)
curl "https://<project>.supabase.co/rest/v1/kiosk_outlets?select=code,name,role" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# 2. Insert tanpa nama mesti gagal (jangka 401/403)
curl -X POST "https://<project>.supabase.co/rest/v1/kiosk_prices" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d '{"outlet_name":"x","purity":"999","sell_price":1,"buy_price":1}'

# 3. Wildcard tidak boleh authenticate: cuba H% / H_ / _Q — semuanya mesti gagal
# 4. Sesi palsu: set role=admin dalam localStorage, sekat Supabase, reload —
#    UI admin TIDAK boleh dipaparkan (fail closed).
```

Dalam aplikasi itu sendiri, sahkan juga: simpanan harga admin biasa sampai ke `kiosk_prices` (bukan sekadar toast), peranti kedua memaparkan perubahan, dan log keluar membuang semua kunci `emaspos_*`.

---

## 11. Batasan Audit

- Projek Supabase **yang digunakan** mungkin berbeza daripada `supabase/schema.sql`; penemuan menganggap fail itu digunakan seperti yang dikomit. Uji semula C-01/H-01 terhadap projek sebenar.
- **Realtime Authorization** ialah tetapan peringkat projek yang tidak kelihatan dalam repo. Jika channel peribadi telah diaktifkan, laluan tulis C-05 disekat — tetapi klien masih mempercayai payload tidak disahkan (L-01).
- Tiada imbasan CVE dapat dijalankan secara offline; penemuan dependency adalah berdasarkan versi/kebersihan, bukan pengesahan advisory.
- Header/TLS peringkat hosting tidak dapat diperhatikan daripada repositori.
- Tangkapan skrin `.aistudio` tidak dianalisis untuk data perniagaan yang dipaparkan.

**Pengendalian rahsia:** semua nilai kunci disembunyikan (redacted) dalam laporan ini; rujukan projek Supabase sengaja tidak didedahkan. Tiada kelayakan dihantar, disalin, atau ditulis ke cakera semasa audit.

**Nota:** Tiada fail projek diubah suai semasa audit ini selain penciptaan fail laporan ini.
