# Gold Reserve - Kiosk Harga Emas & Promosi

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/gold-reserve/kiosk-harga-emas)
![GitHub language count](https://img.shields.io/github/languages/count/gold-reserve/kiosk-harga-emas)
![GitHub forks](https://img.shields.io/github/forks/gold-reserve/kiosk-harga-emas)
![GitHub stars](https://img.shields.io/github/stars/gold-reserve/kiosk-harga-emas)
![GitHub issues](https://img.shields.io/github/issues/gold-reserve/kiosk-harga-emas)

</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/gold-reserve/kiosk-harga-emas/main/public/banner-promosi.svg" alt="Gold Reserve Banner" width="100%" />
</div>

## 📖 Pengenalan

Aplikasi **Gold Reserve Kiosk** adalah Progressive Web App (PWA) yang direka khas untuk kegunaan kaunter tablet di kedai emas. Aplikasi ini membolehkan kakitangan kedai:

- Membaca **harga emas semasa** untuk ketumpatan 999, 916, dan 375
- Mengira **harga jualan & pembelian** dengan kalkulator integrasi
- Menampilkan **promosi dan slaid iklan** secara dinamik
- Mengurus ** quotation / tawaran harga** kepada pelanggan

Aplikasi ini berasaskan **React 19**, **Tailwind CSS v4**, dan **Supabase** untuk pengesanan pengguna (autentikasi kod outlets).

---

## ✨ Ciri-ciri Utama

| Ciri | Penerangan |
|------|------------|
| 📊 **Papan Harga Emas** | Paparan harga semasa untuk 999, 916, dan 375 dalam bentuk kad yang menarik |
| 🧮 **Kalkulator Jualan** | Kira harga jual, upah tukang, dan nilai trade-in emas lama |
| 🎠 **Promo Slaid** | Paparan slaid promosi dengan imej menarik untuk kegunaan kaunter |
| 🔐 **Autentikasi Kod Outlet** | Pengesanan kakitangan melalui kod outlet unik (Supabase) |
| 📱 **Progressive Web App** | Berfungsi sebagai aplikasi asli di peranti, sokongan offline |
| 🔄 **Real-time Sync** | Sync harga & promosi merentas tab pengguna menggunakan BroadcastChannel |
| 📴 **Offline Support** | Fungsi wajar tanpa sambungan 인터넷과 data disimpan dalam cache |

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
git clone https://github.com/gold-reserve/kiosk-harga-emas.git
cd kiosk-harga-emas

# 2. Install dependencies
npm install

# 3. Salin fail persekitaran
cp .env.example .env.local

# 4. Edit fail .env.local dengan kunci API anda
#    - GEMINI_API_KEY (wajib untuk Gemini AI)
#    - VITE_SUPABASE_URL (pilihan, untuk autentikasi)
#    - VITE_SUPABASE_ANON_KEY (pilihan, untuk autentikasi)

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
kiosk-harga-emas/
├── public/                    # Aset statik
│   ├── font/                  # Font The Seasons (self-hosted)
│   └── images/                # Imej banner dan slaid
├── src/
│   ├── components/            # Komponen React
│   │   ├── AdminModal.tsx     # Modal pengurusan harga & promosi
│   │   ├── CalculatorPage.tsx # Paparan kalkulator jualan
│   │   ├── GoldPriceBoard.tsx # Papan harga emas
│   │   ├── Header.tsx         # Bar navigasi atas
│   │   ├── LoginPage.tsx      # Paparan log masuk
│   │   ├── PromoCarousel.tsx  # Slaid promosi
│   │   ├── QuotationModal.tsx # Modal quotation
│   │   └── OfflineIndicator.tsx # Penunjuk status hubungan
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
├── tailwind.config.js         # Konfigurasi Tailwind CSS
└── README.md                  # Dokumentasi ini
```

---

## 🔧 Konfigurasi

### Persekitaran (.env.local)

```env
# API Kunci Gemini (wajib untuk fungsi AI)
GEMINI_API_KEY="your_gemini_api_key_here"

# Supabase Configuration (pilihan - untuk autentikasi outlet)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
```

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

1. Log masuk sebagai **admin** menggunakan kod outlet admin
2. Klik butang **"Admin"** untuk membuka panel pengurusan
3. Kemas kini harga emas untuk setiap ketumpatan (999, 916, 375)
4. Kemas kini atau tambah promosi baru
5. Simpan perubahan — data akan diselaraskan merentas semua tab

---

## 🐛 Pemulihan Ralat (Troubleshooting)

| Masalah | Penyelesaian |
|---------|--------------|
| Halaman log masuk berputar-putar | Pastikan `.env.local` mempunyai `GEMINI_API_KEY` |
| Harga tidak dikemas kini | Semak sambungan internet dan cuba muat semula |
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
