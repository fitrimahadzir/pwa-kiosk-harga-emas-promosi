# Changelog

Semua perubahan penting kepada projek ini akan didokumentasikan dalam fail ini.

Format ini berasaskan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan projek ini mematuhi formulasi [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Multi-outlet pricing: setiap outlet boleh ada harga, promosi dan setting sendiri
- Admin panel kini ada pilihan outlet untuk tukar konfigurasi per outlet
- Real-time multi-kios menggunakan Supabase Realtime broadcast (tak perlu table baru)
- Hook `useSupabaseRealtime` untuk langganan harga/promosi
- OutletConfig type dan helper outlet-scoped di `src/utils/storage.ts`
- Kalkulator jualan pantas untuk kegunaan kaunter
- Paparan promosi slaid untuk promosi kedai
- Autentikasi kod outlet menggunakan Supabase
- Sync data merentas tab menggunakan BroadcastChannel
- Mode offline untuk kegunaan tanpa sambungan

### Changed
- Awalan projek sebagai repositori GitHub

### Fixed
- Awalan projek sebagai repositori GitHub

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
