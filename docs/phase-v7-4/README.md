# PRD V7 Fase 4 — Paritas aplikasi izin orang tua melalui pembimbing (ringkasan mobile)

**27 Oktober 2026 · implementasi Claude Code, menunggu audit independen Codex.** Laporan lengkap, bukti, penafsiran S-1…S-5, dan batas ada di repositori web `docs/phase-v7-4/README.md` (branch `claude/prd-v7-fase-4`).

- Branch `claude/prd-v7-fase-4` dari `origin/main` `d3a7646` (memuat audit V6 Fase 5 `68a4121`, isi sama). Tanpa worktree; tidak menulis di `main`.
- Tanpa dependensi/modul native baru; Expo SDK 57 (lock ter-commit 57.0.15). Perubahan `package.json`/`package-lock.json` di salinan kerja milik pekerjaan lain tidak di-commit.
- Modul baru `src/app/izin-wali/*` (pintu per peran, buat, rincian, perbaiki) di atas `/api/v1/v7/izin/*`; klien `src/api/izin-wali.ts`; penjaga mutasi `useIzinWaliMutation` (kunci idempotensi sama saat retry/ketukan ganda; 401/403/404 menutup data; 409 → "Muat versi terbaru"); perlindungan `expo-screen-capture` pada navigator (S-1); tautan notifikasi `{tipe:"izin_wali", pengajuan_id}` dan `alhasanapps://izin-wali/{id}` bertahan melewati login; tombol di detail notifikasi; panel "Diajukan orang tua" di layar V2 bila server mengirim `asal: "Wali"`. Keputusan murobi/admin pengganti tetap layar V2 pada ID sama.
- Bukti lokal: tsc/lint lulus, unit 42/0; Expo web lintas peran; Android **emulator** 11 skenario; iOS **simulator** Release 5 skenario termasuk cold start dari tautan. **Perangkat fisik, Push nyata, Android cold start rilis, iOS Debug, cPanel/UAT belum diuji.**
- Commit implementasi mobile `7b1ae4d5f829d59f42fb5cc5a92b8eb15c21fd8a`; web `ba3e1d745bb4548cca32740990d177fcc7f0539d`. Commit sesudahnya hanya mencatat hash.
- Tidak merge, deploy, rilis aplikasi, atau memulai Fase 5.
