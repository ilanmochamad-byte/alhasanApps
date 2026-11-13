# Redesain tampilan gelombang 2 — Fase 4 (ringkasan repo aplikasi)

13 November 2026 · Implementator Claude Code · Auditor berikutnya Codex · **siap audit**, bukan merge/rilis.

Laporan lengkap, daftar 75 rute K-10, bukti, penafsiran P4-1…P4-14, temuan T4-1…T4-5, batas uji, dan ringkasan seluruh gelombang 2 ada di repo web: `docs/redesain-tampilan-v2/fase-4/README.md` (branch `claude/redesain-tampilan-v2-fase-4`).

- Branch `claude/redesain-tampilan-v2-fase-4` dari `origin/main` `dfba0ad` (isi sama dengan koreksi audit Fase 3 `f2b0358`). Versi **1.7.0 → 1.8.0**.
- Hanya tampilan: `pembinaan/*`, `publikasi/[id]`, `rapor/*`, `kesehatan/*`, `keamanan/*` memakai kerangka ber-← baru (`src/components/halaman-stack.tsx`); kepala lama tanpa ← dihapus dari `ScreenHeader` (varian wajib). Endpoint, hak, kerahasiaan, idempotensi, versi optimistik, dan perlindungan `expo-screen-capture` tidak berubah (paritas pemanggilan 37 berkas identik; jaringan baseline vs fase 65 langkah sama / 344 permintaan). Tanpa dependensi baru; `package.json`/`package-lock.json` yang berubah di checkout milik pekerjaan lain dan tidak di-commit.
- Uji: tsc/lint exit 0, unit **113/0** (baru `tests/redesain-v2-fase4.test.ts`); Expo web suite fase 97/0 · 70/0 · 60/0 · 18/0 · K-10 **304/0**; regresi seluruh modul lain lulus tanpa melonggarkan oracle (kegagalan historis V3 portal web dan gelombang 1 identik baseline; suite V4 lama tidak dapat dijalankan, fixture hilang).
- Native: Android emulator — APK Release baru 1.8.0 start-up saja (cleartext ke API lokal HTTP diblokir), dev client Debug baru + Metro **34/0**; iOS simulator — build Release baru 1.8.0 **10/10** alur Maestro (terang, gelap, gelap + AX-XXXL, tautan saat aplikasi mati → ← Beranda). Perangkat fisik, build distribusi, iOS Debug, Push nyata, dan UAT belum diuji.
