# Upgrade Expo SDK 58 — AGP 9 dan sisa GP-2 (23 November 2026)

Ringkasan implementator Claude Code (bukan audit independen). Laporan lengkap dan bukti: repo WebAlHasan `docs/optimasi-android-play/upgrade-sdk-58/README.md`.

- Expo 58.0.26 / React Native 0.88.1; versi **1.9.2 → 1.10.0**. AAB lokal: **AGP 9.2.1**, R8 9.2.14 full mode, resource OPTIMIZED, optimasi/obfuscation/shrinking ±77%.
- `plugins/with-android-r8-optimize.js` tidak lagi menyematkan AGP 8.12.3; AGP diambil dari katalog React Native.
- Residual GP-2 **18/10 → 15/7**, seluruhnya di library (RN `WindowUtilKt`, AndroidX core/splashscreen/compose, react-native-screens FormSheet, expo-image-picker crop). Belum nol; menunggu rilis upstream atau keputusan Human Developer.
- tsc/lint 0, unit 130/0, expo-doctor 20/20; Expo web probe 35/0; Android 16 APK uji Release R8 f1 70/1 (gulir teks 2,0× tidak stabil, ulang 53/0), profil 24/0, izin 54/0, pengajian 13/0, keuangan 25/0; iOS Release simulator cold start lulus.
- Belum diuji: EAS/Play/pre-launch 1.10.0, Android 12/15, fisik, Push nyata, upgrade bersesi, iOS Debug. Binary baru wajib. Tidak merge/OTA/unggah Play.


## Audit independen Codex — 23 November 2026

**AGP 9 terverifikasi lokal, tetapi paket Optimasi Android belum lulus penuh dan Play/produksi belum terkonfirmasi.** F-1/P1 GP-2 tetap 15/7; F-3/P2 Android 12 cutout + 3 tombol + 2× belum tervalidasi karena crash System UI. Tidak menerima residual atas nama Human Developer.

Koreksi kode `0e002d5`: tunggu File.write sebelum berbagi CSV izin/PDF rapor. Kontrol fungsi asli 0/5→5/0; unit 135/0, TypeScript/lint exit 0, doctor 20/20, web 35/0. AAB rebuild arm64 AGP 9.2.1/R8 9.2.14 full mode/OPTIMIZED, metrik76,89/77,46/77,68%, DEX 10.536.500 B; mapping/DEX cocok dengan handoff. Native Android 12/15/16 dan 8 alur iOS Release simulator diuji; APK uji terpisah DEX-identik, distribusi tanpa override HTTP. Versi tetap 1.10.0, EAS remote.

Profil Android 16 24/0 dengan satu inspeksi cache privat dilewati; upgrade lokal Android 16 10/0 dan Android 12 9/0. Profil Android 12 asli 9/2 tetap terbuka sebagai hasil suite, kontrol kartu 2× baseline/final sama 4/1 dan fallback DocumentsUI crop/unggah diuji terarah. Tidak mengeklaim fisik/Push nyata/EAS/Play/pre-launch/signing upgrade Play/iOS Debug-distribusi atau gerbang produksi lama lulus.

Laporan lengkap, seluruh percobaan awal/koreksi alat, hash AAB/APK, pemenuhan K-1…K-7, reproduksi dan batas ada di repository WebAlHasan: `docs/optimasi-android-play/upgrade-sdk-58/AUDIT-CODEX.md` dan `audit-codex/`. Audit memakai klon bersih, dua edit paket checkout utama dan 100/100 berkas kontrol terjaga. Tanpa merge/deploy/OTA/unggah Play/publikasi atau fase berikutnya; keputusan berikutnya Human Developer.
