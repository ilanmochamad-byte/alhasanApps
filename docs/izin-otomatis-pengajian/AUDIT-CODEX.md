# Audit independen Codex — status “Izin” otomatis

23 November 2026, satu tahap. Branch `claude/izin-otomatis-absensi`; seluruh commit mobile `02268ad`/`7b85efc`, baseline remote terverifikasi `d80320b7f6f6760f5a98d9f591ecfd94da1f6e91`. Web `3e6592a`/`2c58a50` dari `044b0e7`. Versi tepat satu minor **1.10.0 → 1.11.0**, tanpa perubahan package/lock/modul native.

**K-1–K-7 dan K-9 lulus teknis lokal. Keseluruhan BELUM LULUS secara literal karena K-8 (oracle historis).** Tidak ditemukan regresi fungsional atau cacat runtime yang memerlukan koreksi. Runtime mobile tidak diubah auditor.

K-8: integrasi peserta absensi **36/0 baseline → 35/1 final**, karena array `participant_changes` persis menolak dua kunci aditif yang diwajibkan rencana. Statis Profil **71/0 → 69/2** pada klon bersih: “035 migrasi terakhir” dan cakupan berkas Profil menolak fitur/migrasi 036. Oracle tetap utuh; pengecualian tidak dianggap telah diterima Human Developer.

Bukti independen: unit **141/0**, TypeScript/Expo lint exit 0, pemeriksaan versi lulus minor. Expo web asli **34/0** di 1280/768/375; probe UI auditor **14/0** untuk pembatalan saat draf terbuka, isian manual, usulan baru, “Semua hadir”, dan respons simpan hilang sesudah commit (dua PUT dengan kunci sama, satu penyimpanan). Draf/penanda, catatan, Hadir tersimpan Hadir, sinkronisasi, server lama tanpa `izin`, dan rincian laporan/Keamanan terbukti. Klien HTTP/token, mekanisme idempotensi, in-flight guard, serta navigator/perlindungan layar privat tidak berubah.

K-9 Android: emulator Android 16/API 36 arm64, **APK Release R8 baru**, bundel tertanam tanpa Metro, API fixture loopback; draf Izin → Hadir/catatan kosong → simpan → laporan, satu penyimpanan. SHA-256 APK `c9e63e41a03ec89567e2973f6bbc5e6db38a0743c1cb866d978fd3015d56c0de`.

K-9 iOS: simulator iPhone 17 Pro iOS 27.2, **Release arm64 baru**, signing ad-hoc lokal, bundel tertanam tanpa Metro. Login berhasil dengan dictionary entitlement simulator kosong. Percobaan entitlement tambahan/cert lokal ditolak saat launch; tidak diklaim lulus. Maestro sempat mengetik sandi fixture ke username; setelah fokus diperbaiki, login berhasil saat keyboard ditutup, sehingga ketukan Masuk tambahan salah. Assertion K-9 asli dilanjutkan dari sesi yang sudah masuk dan seluruhnya lulus: Izin → Hadir → simpan → laporan, satu penyimpanan. Ini bukan arsip/distribusi iOS.

Web/server: fitur statis/integrasi/HTTP **32/0 · 44/0 · 18/0**, probe auditor **46/0**, migrasi/preservasi 123 tabel **20/0**; kontrol sesudah rollback identik baseline. Regresi 26 suite berpasangan, HTTP redesain Tahap 4/7 **132/0 · 122/0**. Kegagalan historis/fixture yang identik baseline dicatat; kontrol receipt V2 Fase 5 dengan rantai fixture asli **143/0** kedua kode. Log Android **10.082** dan iOS **18.585** baris: 0 penanda privat, bearer, atau sandi fixture yang diuji; log debug alat uji dipisahkan dari log aplikasi.

Audit dari klon bersih `/private/tmp/iop-codex-audit/mobile`, tanpa worktree/subagen. Checkout `~/alhasanApps` dan dua edit paket serta lima direktori web pekerjaan lain tetap; **100/100 berkas kontrol identik**. Perubahan auditor mobile hanya laporan dan AGENTS.md.

Laporan lengkap, hitungan per suite, diagnostik alat dan bukti: repo web `WebAlHasan`, `docs/izin-otomatis-pengajian/AUDIT-CODEX.md` dan `bukti-audit/` pada branch yang sama.

Belum diuji: MariaDB 10.6/cPanel/produksi, perangkat fisik, distribusi/signing EAS/Play/App Store, Push nyata/ketukan/cold start Push, iOS Debug, UAT dan cetak fisik. Gerbang lama tetap. Tidak merge/deploy/migrasi produksi/rilis/OTA atau pekerjaan berikutnya; commit/push fitur lalu berhenti.
