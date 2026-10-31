# Penugasan lintas guru/pengurus — Fase 5 (rilis): ringkasan mobile

**31 Oktober 2026 · implementasi Claude Code selesai, menunggu audit Codex.** Belum merge, belum rilis aplikasi. Laporan lengkap (alat rilis, bukti, batas, handoff) ada di repo web `WebAlHasan/docs/penugasan-keamanan/fase-5/README.md`, beserta runbook `runbook-rilis-pemulihan.md` dan `checklist-smoke.md` di folder yang sama. Rancangan: `WebAlHasan/docs/penugasan-keamanan/rancangan.md` §4 Fase 5.

| Butir | Nilai |
| --- | --- |
| Branch | `claude/penugasan-keamanan-fase-5` dari `origin/main` `d4d792a` (merge PR #23); isi sama dengan commit audit Fase 4 `c514e4f` (`git diff c514e4f origin/main` kosong). Tanpa worktree; tidak menulis di `main`. |
| Kode aplikasi | **Tidak berubah.** Commit ini hanya menambah ringkasan ini. Tidak ada dependensi atau modul native baru. |
| Manifest rilis | `WebAlHasan/docs/penugasan-keamanan/fase-5/manifest-migrasi.json` mencatat SHA-256 `package.json`, `package-lock.json`, dan `app.json` dari **HEAD Git** mobile, bukan salinan kerja. |
| Tidak di-commit | Perubahan `package.json`/`package-lock.json` di salinan kerja milik pekerjaan lain. |

## Bukti Fase 5

- Salinan `git archive HEAD` (`d4d792a`) tanpa `.env`/`.env.local`, `node_modules` dari lock ter-commit (SHA-256 `a874dd88…`, Expo 57.0.15): **tsc 0, lint 0, unit 47/0**.
- Layar aplikasi tidak diuji ulang karena kodenya identik dengan yang diaudit Codex di Fase 4 (Expo web 46/0, Android emulator Debug 8/0 + 2/0).
- Kontrak server yang dipakai aplikasi (`/api/v1/keamanan/*`, `GET /profile/identitas`) dibaca ulang lewat uji E2E rilis web E-3, termasuk penolakan mutasi 405 dan pencabutan token lama E-4/E-5.

## Urutan rilis aplikasi

1. Web/API dan migrasi 032–033 dirilis dan diverifikasi lebih dahulu (runbook web §3).
2. Build rilis aplikasi. Aplikasi lama tetap berjalan terhadap server baru. Aplikasi baru terhadap server lama menyembunyikan ubin Keamanan dan bagian "Identitas & penugasan" (server menjawab 404).
3. Smoke perangkat sesuai checklist web S-15.

## Batas (belum pernah diuji)

Runtime iOS (inventaris simulator tidak selesai di Fase 4), perangkat fisik iOS/Android, build distribusi, Push nyata, UAT, dan produksi. Tidak merge, deploy, atau rilis aplikasi.
