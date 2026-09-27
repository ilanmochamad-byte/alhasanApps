# PRD V3 Fase 5 — mobile

Branch `prd-v3-fase-5`, baseline origin/main `bd8b7f0368799239341b69e5b476548da9bae65f`. Implementator Codex satu agen; audit Claude Code belum dilakukan. Hanya Fase 5; tidak merge/deploy/build fisik atau mengubah Push ON/WhatsApp OFF.

Menu feature capability satu login: pembimbing santri/pelanggaran/rekomendasi/kasus/sesi/status, murobi Internal mengetahui/catatan, wali publikasi snapshot. Semua detail/deep-link mengambil server lagi setelah autentikasi. Data/form privat hanya memori, dibersihkan saat blur/background/pergantian akun; respons lama tidak kembali. Daftar/options 25 per halaman. Mutasi memakai guard idempotensi/retry payload sama dan klik ganda. Input privat menonaktifkan autocorrect/autofill; form memakai keyboard-aware view yang sudah ada. Fokus React Native Web tidak memanggil fungsi native yang tidak tersedia. Pesan 403 netral; 401 logout lokal, 409 muat ulang versi, timeout/offline/retry dapat ditindaklanjuti.

Tidak ada persist catatan konseling, log/analytics/clipboard otomatis/notifikasi lokal, atau penambahan nama/isi/token/credential pada payload push. Sumber token login tetap penyimpanan aman yang ada, bukan catatan konseling. Server mengatur cakupan/status/optimistic lock/transaksi/audit/outbox; mobile tidak mengambil keputusan akses sendiri.

## Bukti lokal

- `npx tsc --noEmit`: lulus seluruh proyek.
- `npm run lint`: lulus seluruh proyek.
- `npm run test:print-dialog`: 6 lulus / 0 gagal.
- Web repo `PERAPIHAN_AUDIT_DB=1 node tests/browser/uji-v3-fase5-mobile.mjs`: **20 lulus / 0 gagal**, Chromium Expo web 375 px dengan backend MariaDB uji lokal. Pelanggaran, rekomendasi fixture → kasus → dua sesi selesai, web membaca kasus sama, murobi mengetahui, wali snapshot, IDOR, konflik versi nyata, controlled empty/503/retry/401. Ini bukan bukti Android/iOS.

Server pengembangan: `CI=1 EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8940/api/v1 npx expo start --web --clear --port 8082`. Harness memblokir jaringan luar/mengarahkan API ke localhost dan menambahkan CORS di harness saja; bukan konfigurasi produksi. Cache bundler awal sempat menunjuk API nonlokal, login fixture gagal jaringan dan tidak menjadi bukti produksi; final run terisolasi.

Dokumentasi utama di WebAlHasan `docs/phase-v3-5/`: desain/akses/API/laporan, migrasi 019 (web saja), bukti lengkap, status penerimaan, panduan perangkat fisik/cPanel, risiko dan handoff Claude Code. Bukti server: V1/V2/fondasi 4.020 lulus; V3 Fase 2–5 lulus; Fase 1 diagnostics dua gagal karena 96 orphan outbox dan 24 audit fixture historis yang tidak dihapus. Verifier tetap mendeteksi temuan.

**MENUNGGU UJI FISIK:** APK/IPA dari SHA handoff pada Android+iOS, keyboard/safe area/aksesibilitas, jaringan/timeout/401/409/cold-start/deep-link, push murobi+publikasi nyata, receipt akhir. Bukti fisik Fase 4 bukan bukti UI Fase 5. **MENUNGGU PRODUKSI:** cPanel, backup/restore, cron, smoke Fase 3, pembersihan smoke, performa staging setara hosting dan receipt produksi. **MENUNGGU AUDIT:** Claude Code independen, tidak bersamaan pada folder/branch ini. Fase 5 belum selesai seluruhnya; jangan merge sebelum kriteria wajib terpenuhi.
