## Ringkasan Perubahan

### 1. Hapus Total Fitur Koin
**Frontend dihapus:**
- `src/pages/CoinTopup.tsx`, `src/pages/SpinWheel.tsx`, `src/components/CoinPanel.tsx`
- Route `/coin-topup`, `/spin`, `/cart`, `/payment` di `App.tsx`
- File `src/pages/Cart.tsx`, `src/pages/Payment.tsx`, `src/contexts/CartContext.tsx`
- Tombol Coin & Cart di `Header.tsx`, link Spin di `Index.tsx`
- Section Spin/Coin/Topup/Voucher di `OwnerPanel.tsx` & `AdminPanelPage.tsx`
- Field `coin_price` di `ShowCatalog.tsx`, replay-unlock pakai koin di `ReplayShow.tsx`, level berbasis topup di `MyPage.tsx`

**Database (migration):**
- Drop tabel: `coin_balances`, `coin_transactions`, `coin_topup_requests`, `user_spins`, `spin_prizes`, `spin_results`, `replay_purchases`, `user_levels`, `level_rewards`, `vouchers`, `voucher_usage`
- Drop fungsi: `spend_coins`, `purchase_replay`, `spin_wheel`, `allocate_spins_on_purchase`, `create_coin_balance_for_user`, `create_user_level_for_profile`, `increment_voucher_used`, `guard_user_spins_update`
- Drop kolom `coin_price` di `products`

### 2. Pembelian Langsung ke WhatsApp
- Tombol Beli di `ShowCatalog.tsx` & `ProductCard.tsx` → buka `https://wa.me/6282135963767?text=...` dengan template:
  ```
  Halo Owner, saya {username} (#{profile_code}) ingin membeli:
  • {nama produk} — Rp{harga}
  Mohon konfirmasi pembayarannya. Terima kasih!
  ```
- `Cart`/`Payment` dihapus total. Header tombol cart hilang.

### 3. Fitur Oshi (1 member) di MyPage
- Tambah kolom `oshi_member_id` (int, nullable) di `profiles`.
- Komponen baru `OshiPicker` (dialog grid member dari `src/data/members.ts`, exclude yang `group === 'JKT48TV'`).
- Di `MyPage.tsx`: card "Oshi-ku" — kalau belum ada, tombol "Pilih Oshi"; kalau ada, tampil foto besar + nama + tombol ganti/hapus.
- Update via `supabase.from('profiles').update({ oshi_member_id })`.

### 4. Performa Playlist & Site (anti-delay)
- `Playlist.tsx`: preload `metadata` saja, gunakan single `<audio>`/`<video>` element ref (jangan re-mount tiap ganti lagu), pakai `useMemo` untuk list, hapus animasi berat.
- Tambah `React.lazy` + `Suspense` untuk halaman besar (OwnerPanel, AdminPanelPage, Playlist, ReplayShow, GroupChat, LiveStream, PaidLiveStream, Members, ShowCatalog, MyPage).
- Tambah `<link rel="preconnect">` ke Supabase URL di `index.html`.
- `useRealtimeTable`: pastikan unsubscribe rapi, debounce refetch.

### 5. Realtime
- Sudah pakai postgres_changes di banyak tempat. Tambah subscribe `profiles` (untuk oshi update live) di MyPage.

## Hal Teknis Penting
- `purchases` & `purchase_items` **tetap** untuk Ranking & Riwayat (status manual oleh admin lewat WA).
- `Header` cart/coin icon → diganti tombol shortcut Playlist & Members.
- Memory akan diperbarui: Coin economy & Spin wheel & Voucher dihapus dari index.

## Files Touched (perkiraan)
Hapus: 6 file. Edit: ~14 file. Migration: 1.