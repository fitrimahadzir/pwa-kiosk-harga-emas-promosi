Pelan pembangunan lengkap dan berstruktur untuk **PWA Sistem Harga Semasa Emas & Promosi** yang dioptimumkan khas untuk kegunaan jurujual (*sales tablet/counter display*):

---

### 1. Senibina Sistem & Cadangan Tech Stack

Untuk sistem yang laju, menyokong kemas kini masa nyata (*real-time*), dan mesra PWA:

* **Frontend:** **Next.js** atau **React (Vite)** + **Tailwind CSS**
  * *PWA:* `@vite-pwa/plugin` atau `next-pwa` (supaya tablet boleh *Install to Home Screen* dan berjalan tanpa URL bar).
* **Backend & Database:** **Supabase** atau **Firebase**
  * Sangat disyorkan kerana mempunyai fungsi **Realtime Database** (bila Admin tukar harga emas, tablet jurujual terus bertukar secara automatik tanpa perlu *refresh*).
  * Storage terbina untuk simpan fail gambar poster promosi.
  * Authentication sedia ada untuk login Admin.
* **UI Component:** **Shadcn UI** atau **Chakra UI** (kemas, moden, tema mewah/elegan).

---

### 2. Struktur Modul & Fungsi (2 Sisi)

#### A. Sisi Pengguna / Jurujual (User Side - Tablet View)
Dioptimumkan untuk skrin tablet (*landscape mode*):
1. **Papan Tanda Harga Emas (Live Gold Board):**
   * Paparan kad besar untuk **999 (24K)**, **916 (22K)**, dan **375 (9K)**.
   * Setiap gred memaparkan:
     * Harga Jualan (RM/gram).
     * Harga Belian Balik / *Trade-in* (RM/gram) *(pilihan)*.
     * Tarikh & masa kemas kini terakhir.
2. **Kalkulator Emas Pantas (*Sales Quick Calc*):**
   * Jurujual masukkan berat (gram) + upah tukang (RM).
   * Sistem terus kira jumlah harga untuk ditunjukkan kepada pelanggan (mengelakkan jurujual tersalah kira manual).
3. **Gelanggang Promosi (*Poster Carousel / Banner*):**
   * *Slider* poster promosi terkini di bahagian sisi atau bawah skrin.
   * Boleh ditekan untuk buka mod *Full-screen / Zoom* jika pelanggan mahu membaca terma promosi.
4. **Ciri Khas PWA Tablet:**
   * **Fullscreen Toggle:** Hilangkan navigasi pelayar web (seperti aplikasi natif).
   * **Offline Indicator:** Jika internet terputus, paparkan amaran *"Harga terakhir disegerakkan pada [Masa]"*.

#### B. Sisi Pentadbir (Admin Panel)
Boleh diakses dari telefon pintar atau komputer admin:
1. **Pengurusan Harga (Price Management):**
   * Borang mudah untuk tukar harga 999, 916, 375 (sekali tekan butang *Update*, semua tablet cawangan/kaunter terus bertukar).
   * Log sejarah harga (rekod bila dan siapa yang tukar).
2. **Pengurusan Poster Promosi:**
   * Muat naik (*upload*), susun giliran (*order*), dan padam poster.
   * Tetapan tarikh tamat tempoh (*auto-expire banner*).
3. **Pengurusan Akaun:**
   * Kawalan akses Admin (hanya staf yang diberi kuasa boleh ubah harga).

---

### 3. Reka Bentuk UI/UX Tablet (Layout Blueprint)

Paparan tablet paling efektif menggunakan nisbah skrin mendatar (*Landscape 70:30* atau *60:40*):

```text
+--------------------------------------------------------------------------+
|  LOGO KEDAI EMAS                [Live Time: 10:45 AM]   [Status: Online] |
+------------------------------------+-------------------------------------+
|         BAHAGIAN HARGA             |          BAHAGIAN PROMOSI           |
|                                    |                                     |
|  [ EMAS 999 ]                      |  +-------------------------------+  |
|  RM 465.00 / gram                  |  |                               |  |
|                                    |  |       SLIDER POSTER           |  |
|  [ EMAS 916 ]                      |  |       PROMOSI TERKINI         |  |
|  RM 425.00 / gram                  |  |                               |  |
|                                    |  |     (Auto-slide 5 saat /      |  |
|  [ EMAS 375 ]                      |  |      Tap to expand)           |  |
|  RM 185.00 / gram                  |  |                               |  |
|                                    |  +-------------------------------+  |
+------------------------------------+-------------------------------------+
| KALKULATOR PANTAS (SALES TOOL)     | BANNER BAWAH / RUNNING TEXT         |
| [Pilih Gred] [Gram] [Upah] = [TOTAL]| "Promosi Hari Ibu: Potongan Upah 50%"|
+------------------------------------+-------------------------------------+
```

* **Tema Visual:** Hitam/Gelap (*Dark Mode*) dengan aksen Emas (*Gold #D4AF37*) atau Putih Bersih dengan sentuhan *Emerald Green*. Memberikan persepsi mewah dan profesional di hadapan pelanggan.

---

### 4. Cadangan Struktur Pangkalan Data (Schema)

Jika menggunakan Supabase (PostgreSQL) atau Firebase Firestore:

1. **Table: `gold_prices`**
   * `id` (uuid)
   * `purity` (enum: '999', '916', '375')
   * `sell_price_per_gram` (decimal)
   * `buy_price_per_gram` (decimal - jika ada)
   * `updated_at` (timestamp)
   * `updated_by` (uuid)

2. **Table: `promotions`**
   * `id` (uuid)
   * `title` (string)
   * `image_url` (text)
   * `is_active` (boolean)
   * `priority_order` (integer)
   * `start_date` (timestamp)
   * `end_date` (timestamp)

---

### 5. Pelan Tindakan Pembangunan (Roadmap) - 1 Minggu

**Fasa 1: Setup Asas & Pangkalan Data (Hari 1)**
- Sediakan projek Next.js/Vite + Tailwind CSS.
- Setup Supabase (Authentication, Database Tables dan Storage Bucket untuk gambar poster).
- Sediakan struktur asas sistem dan konfigurasi projek.

**Fasa 2: Pembangunan UI Tablet (Hari 2 - 3)**
- Bina antaramuka pengguna untuk paparan tablet (*landscape*).
- Pastikan susun atur responsif dan mesra pengguna.
- Integrasikan komponen kalkulator pantas.
- Tambah fungsi *carousel* untuk paparan poster promosi.

**Fasa 3: Admin Dashboard (Hari 4 - 5)**
- Bina dashboard pentadbir untuk pengurusan kandungan.
- Tambah fungsi kemas kini harga emas.
- Integrasikan modul muat naik poster (*drag & drop*).
- Implementasi kompresi gambar automatik sebelum muat naik.

**Fasa 4: Integrasi & Pengujian (Hari 6)**
- Integrasikan Supabase Realtime untuk kemas kini harga secara langsung pada tablet.
- Konfigurasi PWA (manifest, ikon dan mod *standalone*).
- Setup Service Worker untuk cache offline asas.
- Uji fungsi utama sistem dan responsiviti paparan.

**Fasa 5: Pemasangan & Pelaksanaan (Hari 7)**
- Ujian akhir pada peranti tablet sebenar (iPad dan Samsung Tab).
- Kenal pasti dan baiki isu teknikal.
- Sesi *walkthrough* bersama pasukan jurujual.
- Persediaan sistem untuk digunakan di outlet.

### Tempoh Pembangunan: 7 Hari

**Nota:** Roadmap ini mengandaikan semua keperluan, aset poster dan akses Supabase telah tersedia. Tempoh ini sesuai untuk pembangunan MVP (*Minimum Viable Product*), dengan fungsi utama siap untuk diuji dan digunakan. Ciri offline lanjutan boleh ditambah dalam fasa seterusnya.