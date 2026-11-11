# Changelog

Semua perubahan penting kepada projek ini akan didokumentasikan dalam fail ini.

Format ini berasaskan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan projek ini mematuhi formulasi [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Multi-outlet pricing: setiap outlet boleh ada harga, promosi dan setting sendiri
- Admin panel kini ada pilihan outlet untuk tukar konfigurasi per outlet
- Tab "Harga" admin: pemilihan outlet/kiosk (Langkah 1) sebelum kemaskini harga — setiap outlet disimpan harga sendiri
- Tab "Harga" admin: jadual "Semua outlet" memaparkan harga jual 999/916/375 setiap outlet dengan butang pantas "Ubah harga"
- `syncRemoteOutlets()` menarik senarai outlet aktif (`kiosk_outlets`) dan harga terkini (`kiosk_prices`) dari Supabase, dan seed outlet yang belum ada secara lokal
- Demo outlet lokal (tanpa Supabase) turut tersenarai dalam pemilih outlet admin
- Notifikasi pengesahan jika tukar outlet sementara ada perubahan harga belum disimpan
- Real-time multi-kios menggunakan Supabase Realtime broadcast (tak perlu table baru)
- Hook `useSupabaseRealtime` untuk langganan harga/promosi
- OutletConfig type dan helper outlet-scoped di `src/utils/storage.ts`
- Kalkulator jualan pantas untuk kegunaan kaunter
- Paparan promosi slaid untuk promosi kedai
- Autentikasi kod outlet menggunakan Supabase
- Sync data merentas tab menggunakan BroadcastChannel
- Mode offline untuk kegunaan tanpa sambungan

### Changed
- Sidebar admin: nama di bawah logo kini tunjuk nama outlet sesi login dari `kiosk_outlets` (teks statik, contoh "HQ Warehouse") — kekal walaupun admin pilih outlet lain semasa edit harga
- Dropdown outlet pada sidebar admin dibuang — pemilihan outlet hanya pada Langkah 1 tab "Harga" (kad profil admin dikekalkan)
- Nama outlet admin disatukan kepada **HQ Warehouse** (mengikut `kiosk_outlets` dalam Supabase); nama outlet kini diambil terus dari DB semasa log masuk, bukan dihard-code
- Kod demo `HEADQUARTERS` dibuang — admin log masuk dengan kod `HQ` sahaja
- Data lokal lama 'HeadQuarters' ditukar secara automatik kepada 'HQ Warehouse' (migrasi dalam `loadOutlets` / `loadCurrentOutletName`)
- Awalan projek sebagai repositori GitHub

### Fixed
- `savePrices()` kini simpan harga ke outlet yang betul apabila menerima kemas kini realtime dari outlet lain (sebelum ini boleh tertulis ke outlet semasa)
- Kemas kini realtime tidak disiarkan semula (elak gelung broadcast berulang antara kiosk)
- Draft harga/promosi/tetapan admin kini disegerakkan semula apabila tukar outlet (sebelum ini borang kekal menunjukkan data outlet lama)
- Ralat TypeScript pada `useSupabaseRealtime` (panggilan `savePrices` dengan 2 argumen)

---

## [1.0.0] - 2026-02-01

### Added
- Versi pertama aplikasi Gold Reserve Kiosk
- Paparan harga emas penduduk
- Kalkulator jualan asas
- Paparan slaid promosi
- Log masuk menggunakan kod outlet
- Sokongan offline

### Changed
- Awalan projek

---

*Note: This changelog was auto-generated based on the project's initial release.*
