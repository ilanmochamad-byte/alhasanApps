# Audit Codex — PRD V6 Fase 5 (mobile dan gerbang akhir)

27 Oktober 2026. **Aplikasi Fase 5 lulus audit teknis pada lingkungan uji yang tersedia. Gerbang akhir/produksi V6 belum tertutup.** Tagihan dan tabungan dinilai bersama; tidak ada izin merge, deploy atau rilis aplikasi. Laporan lengkap, koreksi server, bukti keuangan dan pemulihan, serta keputusan akhir lintas repo berada di WebAlHasan `docs/phase-v6-5/AUDIT-CODEX.md` pada branch `claude/prd-v6-fase-5`.

## Sumber dan batas perubahan

- Baseline mobile audit ulang Fase 4 `16bcdb7a7dc475f785c328cfdae90ad6b3072e6b`; implementasi `18fe0959980d1a4b333d8cdd3368a1a74030a730`, handoff `ecfbe1099ac14cacefa7e1ad0f6546f1a667c6f5`. Hash remote diverifikasi.
- Baseline web `75cb144685d02d10df563f67eb1e23a67eec030b`; implementasi `8108012`, handoff `cd3bdf5`. Audit web menutup tiga temuan: kelengkapan hash uang manifest restore, CHECK MariaDB nonaktif, dan pencarian nama yang menyembunyikan selisih rekonsiliasi agregat. Tidak mengubah transaksi, migrasi, kapabilitas, kontrak API atau sumber aplikasi mobile.
- Auditor hanya memperbarui dokumen mobile. `package.json`/`package-lock.json` kerja milik pekerjaan lain tetap tidak disentuh atau di-commit. Tidak membuat worktree atau menjalankan agen paralel.

## Eksekusi independen aplikasi

Semua pengujian memakai salinan sumber HEAD tanpa `.env*` produksi, API loopback dan fixture sintetis `test_*_test`. Dependensi mengikuti lock ter-commit **Expo 57.0.15**, bukan paket 57.0.31 milik pekerjaan lain.

| Pemeriksaan | Hasil |
| --- | --- |
| TypeScript / Expo lint | exit 0 / exit 0 tanpa keluaran peringatan |
| Unit mobile | 37/0 |
| Expo web 375px + API/DB nyata, admin/BSA/unit/wali dua anak/pencabutan | 20/0 |
| iOS Release arm64 simulator ad-hoc lokal, iPhone 17 Pro iOS 26.2, Xcode 27.1 | build berhasil; 7/0 |
| Privasi simulator | 123 berkas terbaca, 0 tidak terbaca; 68.058 baris log proses 20 menit; 0 penanda yang diuji/bearer mentah |
| Manifest migrasi/rollback/dependensi web dan 3 berkas HEAD mobile | 39/39 SHA cocok; bundle iOS 0 host produksi |

Tujuh pemeriksaan native: (1) admin membaca tagihan Rp100.000, saldo Rp62.000, kas baru Rp132.000 dan selisih Rp0; (2) admin melihat R-10 santri nonaktif; (3) BSA hanya santri aktif dengan saldo Rp50.000/kas Rp120.000; (4) penugasan BSA dicabut saat di latar menutup data laporan lama; (5) wali dua anak melihat hanya anaknya tanpa kas/rekonsiliasi internal; (6) satu relasi dicabut saat di latar memperbarui saldo menjadi Rp0 dan menyisakan anak lain; (7) seluruh pembacaan tidak mengubah ledger/pembayaran/saldo.

Bukti terpisah di repo web `docs/phase-v6-5/audit-codex/`: sumber dan hasil Maestro, metadata/hash build, `ios-privasi.json`, TypeScript/lint/unit, dan Expo web. Pembantu native sempat memakai nama fixture yang salah, mengasumsikan tujuan laporan langsung sesudah login, serta tidak menggulir lagi setelah refresh kembali ke atas. Kontrol 1/1, 2/1, 5/1 dipertahankan; pembantu diperbaiki tanpa koreksi kode aplikasi, lalu matriks akhir 7/0. T-1 dipertahankan; tidak mematikan perlindungan layar untuk uji.

## Gerbang yang tetap terbuka

- **Perangkat fisik iOS/Android, Push provider nyata/ketukan/cold start Push, proteksi rekaman/tangkapan fisik, TalkBack/VoiceOver** belum diuji. Skema URI simulator bukan Push. Tidak membuat IPA/arsip distribusi atau merilis aplikasi.
- **Android native Fase 5** belum diuji ulang; bukti Android Fase 4 tetap historis. iOS yang dibangun di sini adalah Release simulator, bukan Debug/dev client atau perangkat fisik.
- Pemindaian privasi hanya direktori data aplikasi simulator dan log proses yang disebutkan; bukan RAM/Keychain atau seluruh penyimpanan OS. Token autentikasi yang diperlukan tetap di SecureStore. Laporan di aplikasi tidak menyimpan CSV; audit rincian lengkap/ekspor dilakukan di website.
- **MySQL/cPanel/produksi, smoke bersama, UAT dan rekonsiliasi dana nyata** belum dijalankan. Tinjauan penugasan lama, V5 yang ikut terbawa migrasi, kebijakan pengembalian saldo R-10 serta gerbang V5 tetap keputusan/pelaksanaan Human Developer.

Tagihan dan tabungan **tidak boleh dirilis terpisah**. Commit/push ringkasan audit hanya pada branch fase yang sama, kemudian berhenti menyerahkan keputusan merge/deploy/rilis kepada Human Developer. Tidak memulai V7.
