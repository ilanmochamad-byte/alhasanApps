# PRD V7 Fase 5 — Regresi, keamanan, dan kesiapan rilis (ringkasan mobile)

**27 Oktober 2026 · audit independen Codex selesai; penerimaan penuh Fase 5/gerbang akhir V7 BELUM LULUS.** F5-1 dikoreksi sesuai keputusan Human Developer; ulangan iOS parsial, T-1 dan gerbang produksi tetap terbuka. Lihat `AUDIT-CODEX.md`. Laporan lengkap, bukti, temuan, dan batas ada di repositori web `docs/phase-v7-5/README.md` (branch `claude/prd-v7-fase-5`).

- Branch `claude/prd-v7-fase-5` dari commit audit Fase 4 `7478f7cb153e4f8af1a1b85791ce843a29733bd2` (`origin/main` `c747ebd`, merge PR #20, isi sama: `git diff 7478f7c origin/main` kosong). Tanpa worktree; tidak menulis di `main`.
- **Fase 5 tidak mengubah kode aplikasi.** Commit ini hanya menambah ringkasan ini. Tidak ada dependensi atau modul native baru. Perubahan `package.json`/`package-lock.json` di salinan kerja milik pekerjaan lain tetap tidak di-commit.
- Manifest rilis web (`docs/phase-v7-5/manifest-migrasi.json`) mencatat SHA-256 `package.json`, `package-lock.json`, dan `app.json` dari **HEAD Git** mobile, bukan salinan kerja.
- Bukti aplikasi Fase 5 berasal dari salinan `git archive 7478f7c` tanpa `.env*` dengan `node_modules` dari lock ter-commit: tsc/lint dan unit, serta suite Expo **web** Fase 4 (lintas peran, probe audit F-1/F-2, regresi jalur pengurus V2) yang dijalankan ulang pada server web Fase 5. Angka ada di README web.
- **Tidak diuji ulang pada Fase 5:** Android emulator dan iOS simulator native (kode aplikasi sama dengan yang diaudit Codex di Fase 4). **Belum pernah diuji:** perangkat fisik, Push nyata/ketukan/cold start Push, Android cold start build rilis, iOS Debug, UAT.
- Tidak merge, deploy, rilis aplikasi, atau memulai V8.

**Bukti auditor Fase 5:** Android emulator Debug 8/0 dan iOS Release simulator 7/0 diulang menggunakan binary Fase 4 yang sama dan backend Fase 5; paritas web/API 2/0. Ini memperbarui butir "tidak diuji ulang" implementator di atas, tanpa mengubahnya menjadi klaim build baru/perangkat fisik/Push nyata. Kode mobile dan lock tetap identik.

**Tindak lanjut F5-1:** murobi tujuan asal Wali wajib tetap mencakup santri. Koreksi backend diverifikasi pada layanan, web, Expo dan Android (9/0); kode mobile/paket tidak berubah. Probe layanan asli 6/0, aplikasi 5/0, matriks 24/0, worker palsu 5/0 dan formulir basi 11/0. Ulangan iOS parsial gagal pelaksanaan pada login alat uji (0/1 dua percobaan) dan belum dibuktikan; hasil iOS audit awal tidak dipakai untuk menyatakan kasus ini lulus. Seluruh batas fisik/Push nyata/cPanel/MySQL/UAT/produksi tetap terbuka.
