# Audit Codex — Jadwal kelas gabungan Fase 2

Tanggal: 1 November 2026 (Asia/Jakarta).

**BELUM LULUS penuh Fase 2.** Alur fungsional yang diuji lulus, tetapi artefak Release iOS baru buatan implementator masih crash saat startup (`RCTEventEmitter.receiveEvent`, modul belum terdaftar). Binary Release audit lama dengan bundel Hermes Fase 2 hanya membuktikan perilaku aplikasi secara terbatas; belum menutup validasi build iOS utuh dari sumber/lock yang akan dirilis.

Audit seluruh commit `e1fd8a4` dan `586964c` dari baseline `b8d1825` pada branch `claude/jadwal-kelas-gabungan-fase-2`; backend web tetap hasil audit Fase 1 `9075522`, baseline merge `9aa2956`, handoff uji/dokumen `bfb5bc7`. Tidak ada koreksi kode aplikasi, paket, backend atau migrasi oleh auditor. Perubahan `package.json`/lock milik pekerjaan lain tetap dipertahankan dan di luar commit; uji memakai arsip HEAD dan lock ter-commit Expo 57.0.15 tanpa env produksi.

- Unit **53/0**, TypeScript/lint exit 0; Expo web nyata **57/0**, probe tambahan auditor **15/0**, regresi aplikasi Keamanan **46/0**.
- Satu kelas **5/0** pada kode kini dan baseline dengan assertion sama. Kontrol gabungan pada baseline **1/2**, berhenti karena kelas tambahan tidak tampil.
- **Android 16/API 36 emulator**, dev client **Debug yang sudah terpasang + Metro HEAD**, **24/0**; bukan APK rilis baru atau perangkat fisik.
- **iPhone 17 Pro simulator iOS 26.2**, binary Release audit lama + bundel Hermes HEAD buatan auditor: **10/0**; hasil kiriman cocok DB/REST laporan/HTML admin/CSV **4/0**. Ini bukti terbatas, tidak menutup crash build baru F-1.
- Regresi backend pengajian V1/API absensi/laporan **10/0 · 14/0 · 20/0**; integrasi gabungan **71/0**, HTTP **32/0**. Statis Fase 1 **46/1** karena oracle batas berkas fase lama, tidak dilonggarkan.
- Probe tambahan membuktikan refresh 409 menuju ID yang sama, kelas beku setelah jadwal diubah, kelima status dan catatan tetap terikat ID santri, POST guru lain ditolak dan `expires_at` lampau kembali ke login tanpa perubahan absensi. Suite penuh membandingkan hasil dengan web, API, CSV dan laporan, serta retry sesudah server commit tanpa duplikasi.

Laporan lengkap, temuan F-1, jenis build iOS yang benar-benar diuji, log mentah, skrip reproduksi dan batas uji ada di repositori **WebAlHasan**, `docs/jadwal-kelas-gabungan/fase-2/AUDIT-CODEX.md` dan `audit-codex/`.

**Fase 1 dan Fase 2 tidak dinyatakan siap produksi atau boleh dirilis terpisah.** F-1/build iOS utuh, build distribusi Android/iOS, perangkat fisik, Push nyata, MariaDB produksi/MySQL/cPanel, migrasi 034/smoke hosting, backup/pemulihan, UAT serta gerbang produksi terdahulu tetap terbuka. Merge/deploy/rilis tetap keputusan Human Developer. Commit/push hasil audit pada kedua branch fitur yang berubah, lalu berhenti.
