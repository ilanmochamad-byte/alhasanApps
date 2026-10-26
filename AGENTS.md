# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.


# PRD V4 Fase 5 — keputusan Human Developer 17 Oktober 2026

Codex mengimplementasikan hanya Fase 5 pada `codex/prd-v4-fase-5`, baseline mobile `origin/main` terverifikasi `dfae26d69fe776492cfda274d10fddf79a1590f2`. Baseline web audit Fase 4 `831017ac37a09d4465e9f64131f212f040410420`; PRD aktif ada di repositori WebAlHasan (`PRD-V4.md`). Claude Code mengaudit independen setelah handoff; tidak menjalankan kedua agen bersamaan pada checkout ini.

Dilarang implementasi di main, worktree, merge/deploy/migrasi produksi, pengiriman rilis aplikasi, atau PRD berikutnya dalam sesi ini. Bukti dan batas uji ada di `docs/phase-v4-5/` pada kedua repo. Uji lokal/emulator bukan persetujuan produksi. Dokumentasi Expo v57 telah dibaca sebelum perubahan mobile; tidak menaikkan SDK atau menambah mode login/role.

# PRD V5 Fase 4 — keputusan Human Developer 24 Oktober 2026

Claude Code mengimplementasikan hanya Fase 4 (paritas aplikasi kesehatan santri) pada `claude/prd-v5-fase-4`; Codex mengaudit sesudah handoff. PRD aktif `PRD-V5.md` di repositori WebAlHasan (branch web dengan nama sama, dari `ab2b952`). **Baseline mobile `ee6621a`** (audit V4 Fase 5) atas keputusan Human Developer, karena `origin/main` `7ac224e` belum memuat commit audit itu dan V4 belum dirilis. Bukti dan batas di `docs/phase-v5-4/` kedua repo. Jangan menjalankan uji dari checkout yang memiliki `.env.local` produksi: dev server Expo web tetap memuat berkas itu walau `EXPO_NO_DOTENV=1`; pakai salinan tanpa berkas tersebut. Tidak merge/deploy/rilis aplikasi atau Fase 5.

# Audit Codex V5 Fase 4 — 24 Oktober 2026

Audit independen atas `38e1850` dari baseline V4 `ee6621a`: **belum lulus seluruh kriteria**. Koreksi versi/revisi asal draf saat kembali dari latar dan perlindungan native khusus navigator kesehatan (`expo-screen-capture ~57.0.4`, wajib build ulang; tanpa modul/perlindungan data tidak dimuat) diterapkan. Probe kontrol implementator 10/8, koreksi 19/0; Expo web 79/0, unit 28/0, tsc/lint dan ekspor Hermes lulus. Android emulator Debug baru: petugas 5/0, sesi/wali/log/cache 13/0, lima peran/revokasi/proteksi 10/0; kontrak V4 12/0 termasuk hash PDF. iOS binary baru gagal toolchain/linker dan runtime terbaru belum lulus. Perangkat fisik, Push nyata dan cold start non-dev belum dibuktikan. Rincian di `docs/phase-v5-4/AUDIT-CODEX.md` kedua repo (laporan lengkap/bukti di web). Tetap Fase 4; tidak Fase 5, merge/deploy/rilis.


# V5 Fase 5 dan audit Codex — 24 Oktober 2026

Human Developer mengizinkan Fase 5 pada branch claude/prd-v5-fase-5 dari 33522f7 walau butir Fase 4 tetap terbuka (keputusan lengkap di AGENTS.md repo web). Audit atas b593d21: **belum lulus seluruh kriteria Fase 5/V5**, bukan siap produksi. Expo web 36/0, laporan Android emulator 15/0, tsc/lint/unit 29/0. Human Developer juga meminta ikon kesehatan diganti: tas medis bertanda tambah memakai aset PNG/tint yang ada. Tiga koreksi backend dan bukti di docs/phase-v5-5/AUDIT-CODEX.md repo web. iOS terbaru, fisik, Push nyata/cold start non-dev, cPanel dan UAT tetap terbuka. Tidak merge/deploy/rilis/migrasi produksi atau V6; berhenti setelah commit/push hasil audit kedua branch fitur.

# PRD V6 Fase 4 — keputusan Human Developer 25 Oktober 2026

Claude Code mengimplementasikan hanya Fase 4 V6 (paritas aplikasi keuangan santri/BSA untuk Petugas BSA, admin, dan orang tua) pada `claude/prd-v6-fase-4` dari `origin/main` `f8ebba0` (diverifikasi; tanpa worktree). PRD aktif `PRD-V6.md` di repositori WebAlHasan (branch web dengan nama sama, dari audit Fase 3 `1f2dbca`). Catatan larangan V6 pada bagian V5 di atas berlaku untuk sesi V5. Modul `src/app/keuangan/*` memakai `/api/v1/v6/bsa/*`; saldo, sisa, dan hak tetap diputuskan server; setiap mutasi lewat `useMutationGuard`. Navigator keuangan memakai `expo-screen-capture` seperti kesehatan (tanpa dependensi baru); **keputusan Human Developer 26 Oktober 2026 (T-1): perlindungan ini dipertahankan** — tangkapan/rekaman layar keuangan dicegah, kuitansi cetak/PDF dari website. Perubahan `package.json`/`package-lock.json` yang belum di-commit pada salinan kerja milik pekerjaan lain dan tidak di-commit. Bukti dan batas di `docs/phase-v6-4/` kedua repo. Codex mengaudit berikutnya. Tidak merge/deploy/rilis aplikasi atau Fase 5.


# Audit Codex V6 Fase 4 — 26 Oktober 2026

Audit `950ca35`/`12fb04a` dari `f8ebba0`, kedua branch tetap `claude/prd-v6-fase-4`: **belum lulus seluruh validasi lintas platform**, runtime iOS belum diuji (build simulator gagal linker). F-1 (P2) dikoreksi: penolakan POST 401/403/404 menutup data/draf lama melalui `usePrivateResource.reject()` dan `useKeuanganMutation`; probe delapan alur 8/8 → 16/0. Expo web 45/0, unit 36/0, tsc/lint lulus; regresi formulir V5 dari latar 19/0. Android Debug dev client + Metro paket ter-commit: BSA 6/0, wali/pencabutan/latar 5/0, tiga assertion peran tambahan; scan 45 berkas/1.364 baris logcat tanpa penanda yang diuji/bearer mentah, Recents hitam. URI setelah force-stop membuka dev launcher; cold start rilis/Push, perangkat fisik dan iOS tetap terbuka. Laporan lengkap/bukti di `docs/phase-v6-4/AUDIT-CODEX.md` repo web; ringkasan pada lokasi yang sama di repo ini. Paket milik pekerjaan lain tidak disentuh/di-commit. Tidak Fase 5, merge, deploy atau rilis; berhenti setelah commit/push kedua branch.

# Validasi lanjutan Claude — V6 Fase 4 (26 Oktober 2026)

Branch `claude/prd-v6-fase-4-validasi` dari `main` `6842f13`. Koreksi V-1: `useKeuanganMutation` mengosongkan pesan penjaga sesudah penolakan 401/403/404 agar pesan basi tidak tampil setelah akses dipulihkan. iOS simulator diuji lewat build Release bertanda tangan lokal ad-hoc (Debug masih gagal linker). Bukti di repositori web `docs/phase-v6-4/validasi-claude/`. Belum di-merge; tidak rilis aplikasi atau Fase 5.


# Audit ulang Codex V6 Fase 4 — 26 Oktober 2026

Audit `0097f91` dari `6842f13` pada `claude/prd-v6-fase-4-validasi`: **LULUS kriteria Fase 4 pada lingkungan uji tersedia**, tanpa koreksi kode auditor; V-1 diterima, F-1 tetap tertutup. Kontrol V-1 4/1 → 5/0; F-1 16/0, Expo 45/0, HTTP 63/0, statis 22/0, tsc/lint/unit 36/0. iOS Release arm64 simulator dibangun ulang auditor dengan tanda tangan lokal, paket ter-commit dan API fixture: transaksi/akses/cold start 6/0, wali/admin/token/relasi 8/0, privasi/cold start tanpa Metro 4/0; cache snapshot OS hitam dengan kontrol dekoder logo. Android emulator/bundel terbaru 3/0. Bukti lengkap di laporan `AUDIT-ULANG-CODEX.md` repo web; ringkasan pada lokasi sama repo ini. Fisik, Push nyata/cold start Push, Debug iOS, rekaman fisik, MySQL/cPanel/UAT/produksi tetap gerbang rilis, bukan klaim lulus. Paket milik pekerjaan lain dipertahankan. Tidak Fase 5/merge/deploy/rilis; berhenti setelah commit/push kedua branch validasi.

# PRD V6 Fase 5 — instruksi Human Developer 26 Oktober 2026

Claude Code mengimplementasikan hanya Fase 5 V6 pada `claude/prd-v6-fase-5` dari audit ulang Fase 4 `16bcdb7` (= isi `origin/main` `f1141e0`, diverifikasi; tanpa worktree). Mobile hanya menambah layar baca `src/app/keuangan/laporan.tsx` (`GET /v6/bsa/laporan`, di navigator keuangan yang dilindungi tangkapan layar), tombol pintu Petugas/admin/wali, tipe/klien, dan pembantu rentang periode + uji unit. Aplikasi tidak mengunduh ekspor CSV (berkas keuangan tidak disimpan di perangkat; ekspor di website). Tanpa dependensi/modul native baru. **Keputusan Human Developer 26 Oktober 2026 (R-10): santri nonaktif bersaldo hanya dilaporkan**, tanpa jalur mutasi baru. Perubahan `package.json`/`package-lock.json` milik pekerjaan lain tetap tidak di-commit. Bukti dan batas di `docs/phase-v6-5/` kedua repo. Codex mengaudit berikutnya. Tidak merge/deploy/rilis aplikasi atau V7.


# Audit Codex V6 Fase 5 — 27 Oktober 2026

Audit aplikasi atas `18fe095`/`ecfbe10` dari `16bcdb7` pada `claude/prd-v6-fase-5`: lulus teknis lokal; **gerbang akhir/produksi tagihan dan tabungan belum tertutup**. Expo web 20/0, tsc/lint dan unit 37/0, iOS Release arm64 simulator ad-hoc dari sumber HEAD/paket lock Expo 57.0.15 build berhasil dan matriks laporan admin/BSA/wali/pencabutan 7/0. Privasi: 123 berkas/68.058 baris log tanpa penanda yang diuji/bearer mentah. Laporan `docs/phase-v6-5/AUDIT-CODEX.md`; bukti lengkap dan tiga koreksi backend auditor di repo web. Tidak ada koreksi kode mobile; perubahan paket kerja milik pekerjaan lain tetap di luar commit. Android native Fase 5, fisik, Push nyata, Debug iOS, MySQL/cPanel, UAT dan rekonsiliasi dana nyata tetap terbuka. Tidak merge/deploy/migrasi produksi/rilis atau mulai V7; keputusan bersama tetap Human Developer.
