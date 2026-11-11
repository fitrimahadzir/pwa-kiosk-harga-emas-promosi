# Last Session Summary — Per-outlet Prices + HQ Warehouse Rename

## What Was Done

### 1. Outlet Picker on the Admin "Harga" Tab
- The prices tab is now a 2-step flow:
  - **Langkah 1 — Pilih outlet / kiosk**: dropdown `OutletSelect` listing every outlet; prices cannot be edited for an outlet before it is picked
  - **Langkah 2 — Harga emas {outlet}**: the familiar 3 purity price cards now edit the *selected outlet's* prices only
- Outlet switching lives ONLY in Langkah 1 (and the "Semua outlet" table) — the sidebar has no outlet dropdown
- Sidebar shows the **login identity** instead: the outlet name from `kiosk_outlets` (`sessionOutletName`), e.g. "HQ Warehouse" for the admin code — it stays fixed even when another outlet is picked for price editing
- Header of the editor card, stat cards, and the save-success message all show the selected outlet name
- Selecting an outlet with unsaved price edits asks for confirmation first (changes would be discarded)

### 2. "Semua outlet" Overview Table
- Card below the editor lists every outlet with its current 999 / 916 / 375 sell prices
- Each row has an "Ubah harga" button that switches the editor to that outlet (active row shows "Dipilih / Sedang diedit")

### 3. Outlet Renamed: HeadQuarters → HQ Warehouse
- Supabase `kiosk_outlets` kini ada satu outlet admin sahaja: **HQ Warehouse** (kod `HQ`)
- `loginWithOutletCode` / `refreshSession` guna nama outlet terus dari DB (tiada lagi hard-code 'HeadQuarters')
- Kod demo `HEADQUARTERS` dibuang; kod `HQ` → 'HQ Warehouse'
- `OUTLET_RENAMES` migration dalam `storage.ts`: data localStorage lama 'HeadQuarters' (outlet config + current outlet) ditukar automatik kepada 'HQ Warehouse'
- `supabase/schema.sql` seed dikemas kini + nota SQL untuk rename baris lama di DB

### 4. Draft State Sync Fixes (AdminModal)
- `draftPrices`, `draftPromos`, `draftSettings` now resync via `useEffect` whenever the outlet-scoped props change — previously switching outlets kept editing the *previous* outlet's data in the form

### 5. Storage / Sync Fixes
- `savePrices(prices, outletName?, { broadcast? })`:
  - Can save prices into a specific outlet (not just the active one)
  - Always stamps the correct `outletName` on the outlet config
  - `broadcast: false` is used when prices arrive from a realtime broadcast so kiosks no longer re-broadcast updates in an endless loop
- `useSupabaseRealtime` now saves broadcasts into the outlet they were meant for, fixing an existing TS error (`savePrices` called with 2 args)
- Same `outletName` stamp fix applied to `savePromos`, `saveSettings`, `saveHistory`

### 6. Outlet List Source (`syncRemoteOutlets`)
- New helper in `src/utils/storage.ts`:
  - Reads active outlets from `kiosk_outlets` and latest prices from `kiosk_prices` (Supabase)
  - Seeds any outlet not yet known locally (with its remote prices, default prices as fallback)
  - Without Supabase it seeds the local demo outlets (`LOCAL_DEMO_OUTLET_NAMES` from `src/lib/auth.ts`) so the feature is testable offline
- `App.tsx` runs it for admin sessions and keeps `availableOutlets` in state (also refreshed on BroadcastChannel syncs)
- Per-outlet price snapshot (`outletPrices`) is passed to AdminModal for the overview table

### 7. Verification
- `npm run lint` ✅ (also fixed a pre-existing `TS2554` error in `useSupabaseRealtime.ts`)
- `npm run build` ✅

## Flow After This Change
```
Admin (kod HQ) logs in → outlet 'HQ Warehouse' (nama dari kiosk_outlets)
syncRemoteOutlets() lists every outlet (DB atau demo lokal)
Admin opens tab Harga → picks e.g. Amanjaya Mall → drafts reload for that outlet
Admin edits prices → Simpan harga
→ saved into Amanjaya Mall config (localStorage) + history log
→ upsert into kiosk_prices (outlet_name = Amanjaya Mall) + Supabase broadcast
→ kiosks logged in as Amanjaya Mall update in real-time
```

## Files Modified
| File | Changes |
|------|---------|
| `src/components/AdminModal.tsx` | Outlet picker + all-outlets overview on Harga tab, draft resync, unsaved-edits guard, fallback nama 'HQ Warehouse'; sidebar tunjuk nama sesi login (`sessionOutletName`), tiada dropdown outlet |
| `src/App.tsx` | `availableOutlets` state, admin outlet sync effect, `outletPrices` memo, props passed down (`sessionOutletName` = nama dari `kiosk_outlets`) |
| `src/utils/storage.ts` | `savePrices` per-outlet + broadcast flag, `syncRemoteOutlets()`, `seedMissingOutlets()`, migrasi rename `OUTLET_RENAMES` (HeadQuarters → HQ Warehouse) |
| `src/hooks/useSupabaseRealtime.ts` | Save broadcasts into the correct outlet without re-broadcasting (fixes TS error) |
| `src/lib/auth.ts` | Guna nama outlet dari DB (buang hard-code 'HeadQuarters'), buang kod demo `HEADQUARTERS`, `HQ` → 'HQ Warehouse', export `LOCAL_DEMO_OUTLET_NAMES` + `OUTLET_RENAMES`, `loadSession` ikut rename |
| `supabase/schema.sql` | Seed 'HQ Warehouse' + nota SQL rename baris lama |
| `CHANGELOG.md` | New entries for this feature + rename |
| `last.md` | This summary |

## Next Steps (if needed)
- `kiosk_promos` / `kiosk_settings` tables so promos and settings sync per outlet across devices too
- Option to copy one outlet's prices to all outlets (bulk update)
- Show buy prices in the all-outlets overview (currently sell prices only, to keep rows compact)
