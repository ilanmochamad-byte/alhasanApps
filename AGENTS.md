# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.


# PRD V4 Fase 5 — keputusan Human Developer 17 Oktober 2026

Codex mengimplementasikan hanya Fase 5 pada `codex/prd-v4-fase-5`, baseline mobile `origin/main` terverifikasi `dfae26d69fe776492cfda274d10fddf79a1590f2`. Baseline web audit Fase 4 `831017ac37a09d4465e9f64131f212f040410420`; PRD aktif ada di repositori WebAlHasan (`PRD-V4.md`). Claude Code mengaudit independen setelah handoff; tidak menjalankan kedua agen bersamaan pada checkout ini.

Dilarang implementasi di main, worktree, merge/deploy/migrasi produksi, pengiriman rilis aplikasi, atau PRD berikutnya dalam sesi ini. Bukti dan batas uji ada di `docs/phase-v4-5/` pada kedua repo. Uji lokal/emulator bukan persetujuan produksi. Dokumentasi Expo v57 telah dibaca sebelum perubahan mobile; tidak menaikkan SDK atau menambah mode login/role.

# PRD V5 Fase 4 — keputusan Human Developer 24 Oktober 2026

Claude Code mengimplementasikan hanya Fase 4 (paritas aplikasi kesehatan santri) pada `claude/prd-v5-fase-4`; Codex mengaudit sesudah handoff. PRD aktif `PRD-V5.md` di repositori WebAlHasan (branch web dengan nama sama, dari `ab2b952`). **Baseline mobile `ee6621a`** (audit V4 Fase 5) atas keputusan Human Developer, karena `origin/main` `7ac224e` belum memuat commit audit itu dan V4 belum dirilis. Bukti dan batas di `docs/phase-v5-4/` kedua repo. Jangan menjalankan uji dari checkout yang memiliki `.env.local` produksi: dev server Expo web tetap memuat berkas itu walau `EXPO_NO_DOTENV=1`; pakai salinan tanpa berkas tersebut. Tidak merge/deploy/rilis aplikasi atau Fase 5.
