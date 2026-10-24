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
