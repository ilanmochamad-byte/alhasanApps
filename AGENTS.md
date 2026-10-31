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

# PRD V7 Fase 4 — instruksi Human Developer 27 Oktober 2026

Claude Code mengimplementasikan hanya Fase 4 V7 (paritas aplikasi pengajuan izin orang tua melalui pembimbing) pada `claude/prd-v7-fase-4` dari `origin/main` `d3a7646` (= isi audit V6 Fase 5 `68a4121`; tanpa worktree). PRD aktif `PRD-V7.md` di repositori WebAlHasan (branch web sama nama, dari audit V7 Fase 3 `2e2acc7`). Modul `src/app/izin-wali/*` memakai `/api/v1/v7/izin/*`; hak, tahap, versi, dan idempotensi diputuskan server; mutasi lewat `useIzinWaliMutation`. Navigator memakai `expo-screen-capture` (pola V5/V6, penafsiran S-1 menunggu tinjauan). Keputusan murobi/admin pengganti tetap layar V2 `izin/[id]` pada ID sama. Uji Metro dari salinan: `node_modules` harus direktori nyata, bukan symlink ke luar akar proyek (`import()` dinamis gagal). Perubahan `package.json`/`package-lock.json` milik pekerjaan lain tidak di-commit. Bukti dan batas di `docs/phase-v7-4/` kedua repo. Codex mengaudit berikutnya. Tidak merge/deploy/rilis aplikasi atau Fase 5.


## Audit Codex — V7 Fase 4 (27 Oktober 2026)

- Audit hanya Fase 4 pada kedua branch `claude/prd-v7-fase-4`, handoff web `1c49df3`/`ba3e1d7` dari `2e2acc7`, mobile `b427d0d`/`7b1ae4d` dari `d3a7646`. **Audit teknis lokal selesai setelah dua koreksi; penerimaan penuh Fase 4 belum tertutup karena ketukan Push nyata belum dibuktikan.** URI, notifikasi in-app, emulator dan simulator tidak diklaim sebagai Push/perangkat fisik.
- F-1: draf perbaikan terikat isi/versi asal sehingga kembali dari latar tidak menimpa perubahan perangkat kedua. F-2: detail keputusan V2 membersihkan data/draf pada latar dan penolakan akses, terikat akun/ID/mode; pengajuan wali dilindungi native juga pada keputusan V2. Backend/hak/SQL/endpoint tidak dikoreksi auditor, tanpa dependensi baru.
- Probe identik 2/3 → 5/0; HTTP 54/0, Expo web 48/0 + tambahan 7/0, statis 31/0, tsc/lint exit 0 dan unit 42/0. Android emulator Debug+Metro 8/0; iOS Release arm64 simulator ad-hoc membuktikan cold URI/login, konflik draf dari latar, pembatalan dan pencabutan relasi; paritas native dengan web/API 2/0. Rincian regresi, diagnostik pembantu dan privasi di `docs/phase-v7-4/AUDIT-CODEX.md` web, ringkasan pada lokasi sama di mobile.
- Perangkat fisik, Push nyata/ketukan/cold start Push, Android cold start rilis, iOS Debug, MySQL/cPanel/produksi dan UAT tetap terbuka; gerbang produksi V6 tidak berubah. Perubahan paket mobile serta direktori pekerjaan lain tidak disentuh/di-commit. Tidak merge/deploy/migrasi produksi/rilis atau memulai Fase 5; berhenti sesudah commit/push kedua branch.

## Audit Codex — V7 Fase 5 dan gerbang akhir (27 Oktober 2026)

Audit atas mobile `74c331d` dari `7478f7c` dan web `971b369` dari `851ef0a`, kedua branch `claude/prd-v7-fase-5`: **penerimaan penuh Fase 5/gerbang akhir V7 BELUM LULUS**. Kode mobile/lock tidak berubah. Expo web 48/0 + 7/0 + 5/0, tsc/lint exit 0, unit 42/0; Android emulator Debug+Metro 8/0 dan iOS Release simulator 7/0 memakai binary audit Fase 4/sumber identik dan backend fixture Fase 5; paritas web/API 2/0. Dua koreksi alat preservasi web (audit lama ikut snapshot dan pengodean hash tak ambigu) dibuktikan 4/4 → 8/0. F5-1 pencabutan cakupan murobi sebagian tetap terbuka: API/aplikasi masih membaca dan memutus; probe layanan 3/3 dan aplikasi/API 1/4 tidak dilonggarkan. T-1 retry pengurus V2 tetap 6 respons 500 dari 8 proses, satu baris/ID. Bukti lengkap di `docs/phase-v7-5/AUDIT-CODEX.md` web dan ringkasan di sini. Fisik, Push nyata/ketukan/cold start, Android cold start rilis, iOS Debug, MySQL/cPanel/produksi, UAT dan gerbang V5/V6 tetap terbuka. Paket kerja milik pekerjaan lain tidak disentuh/dikommit. Berhenti setelah commit/push kedua branch; tidak merge/deploy/migrasi produksi/rilis atau mulai V8.

## Keputusan dan koreksi audit — V7 F5-1 (27 Oktober 2026)

- Human Developer memilih **“Tutup akses; wajib tetap mencakup santri”**. Pada asal Wali, murobi tujuan wajib masih mempunyai penugasan aktif yang cocok dengan santri pada tanggal/tahun kini. Penugasan lain tidak mempertahankan hak detail/riwayat, daftar/hitungan, keputusan/retry, laporan/ekspor/cetak dan notifikasi. Penetapan admin juga wajib mencakup santri; admin pengganti beralasan tetap tersedia. Jalur asal Pengurus V2 tetap dipertahankan.
- Koreksi terarah di web pada branch Fase 5; mobile hanya memperbarui dokumen. Kode mobile/paket tetap, perubahan paket pekerjaan lain tidak di-commit. E2E83/0, HTTP40/0, browser95/0, rilis/restore37/0, Expo48/0+7/0+5/0, tsc/lint0 dan unit42/0. Probe asli layanan6/0/aplikasi5/0, matriks24/0, worker palsu5/0, formulir basi11/0, Android emulator9/0. Ulangan iOS parsial belum selesai (input login alat uji,0/1 dua percobaan); iOS awal7/0 bukan bukti kasus parsial. Rincian/batas dan regresi lanjutan93 suite pada laporan web.
- T-1, iOS lanjutan, perangkat fisik, Push nyata, MySQL/cPanel/smoke hosting, UAT dan gerbang produksi V5/V6/V7 tetap terbuka. Penerimaan penuh belum dinyatakan lulus. Tidak merge/deploy/migrasi produksi/rilis atau V8; auditor berhenti setelah commit/push kedua branch. Keputusan merge/deploy/rilis tetap Human Developer.

## Keputusan Human Developer — Terbit tagihan satu santri dari tarif (30 Oktober 2026)

Atas permintaan Human Developer ("Ya, tambahkan") sesudah perbaikan web PR #100, Claude Code menambah tombol **Terbitkan tagihan** di rincian santri (hanya Petugas BSA berhak kelola) dan layar `src/app/keuangan/terbit-santri.tsx` pada `claude/terbit-tagihan-satu-santri` dari `origin/main` `92caea4` (tanpa worktree). Pratinjau `santri_id` → terbit berhash pratinjau dan idempotensi → rincian tagihan; isian manual/tarif tetap di website. `pratinjauSatuSantriSah` menolak respons server tanpa PR #100. Paket tidak berubah; perubahan paket milik pekerjaan lain tidak di-commit. tsc/lint exit 0, unit 43/0; uji Expo web 27/0 dan regresi di repo web `docs/terbit-tagihan-satu-santri-app/`. Codex mengaudit berikutnya. Tidak merge/rilis aplikasi.


## Audit Codex — tombol satu santri (30 Oktober 2026)

Audit handoff `a815d45` (web `f8ded4e`): **LULUS teknis lokal setelah koreksi P2 F-1** respons pratinjau lama pada layar `terbit-santri.tsx`. Probe identik1/2 →3/0, Expo27/0, regresi Fase4 45/0 dan Fase5 20/0, tsc/lint0, unit43/0, build baru iOS Release simulator7/0. Laporan `docs/terbit-tagihan-satu-santri/AUDIT-CODEX.md`; bukti lengkap di repo web `docs/terbit-tagihan-satu-santri-app/`. Backend/paket tidak berubah; paket kotor pekerjaan lain tidak di-commit. Android native perubahan ini, fisik, Push, cPanel/produksi dan UAT belum diuji; gerbang akhir bersama tagihan/tabungan V6 tetap terbuka. Tidak merge/deploy/rilis atau mulai fase/PRD lain; keputusan berikutnya Human Developer.


## Audit Codex — Penugasan lintas guru/pengurus dan Keamanan Fase 4 (31 Oktober 2026)

- Audit hanya Fase 4 pada branch `claude/penugasan-keamanan-fase-4` kedua repo,
  mobile `10d13c3` dari `367ae5d`, web `933f8a1` dari `6ebdc24`: **LULUS
  audit teknis lokal setelah satu koreksi P3 validasi saringan di backend**.
  Kode mobile/paket tidak dikoreksi; perubahan paket pekerjaan lain dipertahankan.
- Probe web identik **31/10 → 41/0**; HTTP **66/0**, statis **35/0**, Expo web
  **46/0**, tsc/lint 0, unit **47/0**. Android emulator Debug + Metro sumber
  ter-commit **8/0 + 2/0** (baca/kerahasiaan/revokasi/proteksi/profil guru).
  Rincian dan regresi di laporan web `docs/penugasan-keamanan/fase-4/AUDIT-CODEX.md`;
  ringkasan repo ini `docs/penugasan-keamanan-fase-4/AUDIT-CODEX.md`.
- iOS runtime, fisik, build distribusi, Push nyata, MySQL/cPanel/produksi dan
  UAT belum diuji; gerbang V5/V6/V7 tidak ditutup. Tidak worktree/subagen,
  merge/deploy/migrasi produksi/rilis atau Fase 5. Berhenti setelah commit/push
  hasil audit kedua branch yang sama.
