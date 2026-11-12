# Gold Reserve - Kiosk Harga Emas & Promosi

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/fitrimahadzir/pwa-kiosk-harga-emas-promosi)
![GitHub language count](https://img.shields.io/github/languages/count/fitrimahadzir/pwa-kiosk-harga-emas-promosi)
![GitHub forks](https://img.shields.io/github/forks/fitrimahadzir/pwa-kiosk-harga-emas-promosi)
![GitHub stars](https://img.shields.io/github/stars/fitrimahadzir/pwa-kiosk-harga-emas-promosi)
![GitHub issues](https://img.shields.io/github/issues/fitrimahadzir/pwa-kiosk-harga-emas-promosi)

</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/fitrimahadzir/pwa-kiosk-harga-emas-promosi/main/public/banner-promosi.svg" alt="Gold Reserve Banner" width="100%" />
</div>

## 📖 Pengenalan

Aplikasi **Gold Reserve Kiosk** adalah Progressive Web App (PWA) yang direka khas untuk kegunaan kaunter tablet di kedai emas. Aplikasi ini membolehkan kakitangan kedai:

- Membaca **harga emas semasa** untuk ketumpatan 999, 916, dan 375
- Mengira **harga jualan & pembelian** dengan kalkulator integrasi
- Menampilkan **promosi dan slaid iklan** secara dinamik
- Mengurus ** quotation / tawaran harga** kepada pelanggan

Aplikasi ini berasaskan **React 19**, **Tailwind CSS v4**, dan **Supabase** (baca harga secara awam + Supabase Auth untuk pentadbir). Kiosk/outlet adalah **baca-sahaja** dan tidak mempunyai akses tulis ke pangkalan data.

---

## ✨ Ciri-ciri Utama

| Ciri | Penerangan |
|------|------------|
| 📊 **Papan Harga Emas** | Paparan harga semasa untuk 999, 916, dan 375 dalam bentuk kad yang menarik |
| 🧮 **Kalkulator Jualan** | Kira harga jual, upah tukang, dan nilai trade-in emas lama |
| 🎠 **Promo Slaid** | Paparan slaid promosi dengan imej menarik untuk kegunaan kaunter |
| 🔐 **Akses Pentadbir** | Log masuk admin melalui Supabase Auth (e-mel + kata laluan); kiosk hanya membaca data |
| 📱 **Progressive Web App** | Berfungsi sebagai aplikasi asli di peranti, sokongan offline |
| 🔄 **Real-time Sync** | Sync harga & promosi merentas tab pengguna menggunakan BroadcastChannel |
| 📴 **Offline Support** | Fungsi wajar tanpa sambungan dan data disimpan dalam cache |

---

## 🎨 Reka Bentuk & Warna

Aplikasi ini menggunakan palet warna **Gold Reserve** yang konsisten:

| Warna | Hex | Kegunaan |
|-------|-----|----------|
| Maroon Deep | `#3b0707` | Background paling gelap |
| Maroon | `#5d0d0d` | Background utama |
| Gold | `#d4a13a` | Aksen utama & butang CTA |
| Cream | `#ece2d0` | Teks utama |
| Line | `#7a2a18` | Border & divider |

**Font yang digunakan:**
- **The Seasons** — Font tajuk dan branding (self-hosted)
- **Poppins** — Font UI dan teks badan (Google Fonts)

---

## 🚀 Pemasangan & Penggunaan

### Prasyarat

- **Node.js** v20 keatas
- **npm** atau **bun** untuk pengurusan pakej

### Pemasangan

```bash
# 1. Clone repository
git clone https://github.com/fitrimahadzir/pwa-kiosk-harga-emas-promosi.git
cd pwa-kiosk-harga-emas-promosi

# 2. Install dependencies
npm install

# 3. Salin fail persekitaran
cp .env.example .env.local

# 4. Edit fail .env.local dengan kunci API anda
#    - VITE_SUPABASE_URL (wajib)
#    - VITE_SUPABASE_ANON_KEY (wajib)
#    - GEMINI_API_KEY (pilihan)

# 5. Jalankan dalam mod pembangunan
npm run dev
```

### Build untuk Pengeluaran

```bash
npm run build
npm run preview   # Paparkan build dalam mod preview
```

---

## 📦 Struktur Projek

```
pwa-kiosk-harga-emas-promosi/
├── public/                    # Aset statik
│   ├── font/                  # Font The Seasons (self-hosted)
│   └── images/                # Imej banner dan slaid
├── src/
│   ├── components/            # Komponen React
│   ├── hooks/                 # React hooks custom
│   ├── lib/                   # Logik pembantu
│   ├── types/                 # Definisi jenis TypeScript
│   ├── utils/                 # Fungsi utiliti
│   ├── index.css              # CSS global + Tailwind
│   ├── main.tsx               # Titik masuk React
│   └── App.tsx                # Komponen utama aplikasi
├── supabase/                  # Skrip pangkalan data Supabase
├── .env.example               # Template pembolehubah persekitaran
├── package.json               # Metadata npm & skrip
├── vite.config.ts             # Konfigurasi Vite + PWA
├── tsconfig.json              # Konfigurasi TypeScript
└── README.md                  # Dokumentasi ini
```

---

## 🔧 Konfigurasi

### Persekitaran (.env.local)

```env
# Supabase (wajib — baca harga awam + Supabase Auth pentadbir)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"

# Pilihan — hanya jika fungsi AI digunakan
GEMINI_API_KEY="your_gemini_api_key_here"
```

### Persediaan Supabase (sekali sahaja)

1. Jalankan `supabase/schema.sql` dalam **Supabase SQL Editor**. Fail ini idempotent dan akan:
   - mengaktifkan RLS pada semua jadual `kiosk_*`;
   - membuang **semua** INSERT/UPDATE/DELETE untuk `anon` (kiosk tidak boleh menulis);
   - membenarkan tulis hanya untuk pengguna yang tersenarai dalam `public.kiosk_admins`.
2. **Authentication → Users → Add user** — cipta akaun admin (e-mel + kata laluan).
3. Daftarkan akaun itu sebagai pentadbir:

```sql
insert into public.kiosk_admins (user_id, email)
select id, email from auth.users where email = 'admin@kedai.com'
on conflict (user_id) do update set is_active = true;
```

4. Buka `#/admin` pada aplikasi untuk log masuk pentadbir. Menutup panel akan log keluar.

### Tailwind CSS

Projek ini menggunakan **Tailwind CSS v4** dengan konfigurasi custom untuk palet warna Gold Reserve.

### PWA Configuration

Aplikasi ini disediakan sebagai PWA dengan sokongan:
- **Offline mode** — Aplikasi berfungsi tanpa sambungan internet
- **Installable** — Boleh dipasang sebagai aplikasi asli di peranti
- **Background sync** — Sync data apabila hubungan pulih

---

## 🧪 Pembangunan

### Memulakan Server Pembangunan

```bash
npm run dev
```

Aplikasi akan berjalan pada `http://localhost:3000`

### Type Checking

```bash
npm run lint
```

### Kemas Kini Harga & Promosi

1. Pada skrin kiosk, klik ikon **perisai** di penjuru atas (atau buka `#/admin`).
2. Log masuk dengan **e-mel + kata laluan** akaun pentadbir Supabase Auth.
3. Pilih outlet dan kemas kini harga emas (999, 916, 375).
4. Klik **Simpan harga** — penulisan disahkan oleh RLS di server; kegagalan akan dipaparkan, bukan didiamkan.
5. Promosi dan tetapan kedai disimpan pada cache peranti (tidak ditulis ke server).

---

## 🐛 Pemulihan Ralat (Troubleshooting)

| Masalah | Penyelesaian |
|---------|--------------|
| Halaman log masuk berputar-putar | Pastikan `.env.local` mempunyai `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` |
| Log masuk admin ditolak | Pastikan pengguna Auth didaftarkan dalam `public.kiosk_admins` (`is_active = true`) |
| "Gagal menyimpan harga ke server" | Sesi admin tamat atau RLS menolak — log masuk semula dan jalankan `supabase/schema.sql` |
| Font tidak muncul | Pastikan fail font berada di `public/font/The Seasons/` |
| PWA tidak boleh dipasang | Pastikan HTTPS aktif atau gunakan localhost |

---

## 🤝 Sumbangan (Contributing)

Kami menyambut sumbangan! Sila ikuti langkah berikut:

1. **Fork** repository ini
2. Buat cawangan baru (`git checkout -b feature/fitur-baru`)
3. Lakukan perubahan dan komit (`git commit -am 'Tambah fitur baru'`)
4. Push ke cawangan (`git push origin feature/fitur-baru`)
5. Buka **Pull Request**

### Panduan Sumbangan

- Pastikan kod melalui `npm run lint` tanpa ralat
- Ikut konvensi penulisan kod yang sedia ada
- Kemas kini dokumentasi jika perlu
- Sertakan ujian jika mengubah logik utama

---

## 📜 Lesen (License)

Projek ini adalah hak milik **Gold Reserve** dan tidak dibenarkan digunakan, digandakan, atau diedit tanpa kebenaran bertulis.

---

## 👥 Pasukan & Pertanggungjawaban

| Peranan | Nama | Email |
|---------|------|-------|
| Project Lead | — | — |
| Pembangun Utama | — | — |

---

## 🔗 Pautan Penting

- **Gold Reserve Website**: [https://www.goldreserve.com.my](https://www.goldreserve.com.my)
- **Supabase Dashboard**: [https://supabase.com](https://supabase.com)
- **Gemini API Docs**: [https://ai.google.dev](https://ai.google.dev)
- **Tailwind CSS v4**: [https://tailwindcss.com](https://tailwindcss.com)

---

## 📊 Metadata

| Butiran | Maklumat |
|---------|----------|
| Nama Projek | Gold Reserve - Kiosk Harga Emas & Promosi |
| Versi | 1.0.0 |
| Bahasa Pemprograman | TypeScript |
| Kerangka | React 19 |
| CSS Framework | Tailwind CSS v4 |
| Backend | Supabase (pilihan) |
| AI API | Google Gemini |
| Jenis Aplikasi | Progressive Web App (PWA) |

---

<div align="center">

### Dibuat dengan ❤️ oleh Pasukan Gold Reserve

</div>
