# Upgrade Expo SDK 58 — AGP 9 dan sisa GP-2 (23 November 2026)

Ringkasan implementator Claude Code (bukan audit independen). Laporan lengkap dan bukti: repo WebAlHasan `docs/optimasi-android-play/upgrade-sdk-58/README.md`.

- Expo 58.0.26 / React Native 0.88.1; versi **1.9.2 → 1.10.0**. AAB lokal: **AGP 9.2.1**, R8 9.2.14 full mode, resource OPTIMIZED, optimasi/obfuscation/shrinking ±77%.
- `plugins/with-android-r8-optimize.js` tidak lagi menyematkan AGP 8.12.3; AGP diambil dari katalog React Native.
- Residual GP-2 **18/10 → 15/7**, seluruhnya di library (RN `WindowUtilKt`, AndroidX core/splashscreen/compose, react-native-screens FormSheet, expo-image-picker crop). Belum nol; menunggu rilis upstream atau keputusan Human Developer.
- tsc/lint 0, unit 130/0, expo-doctor 20/20; Expo web probe 35/0; Android 16 APK uji Release R8 f1 70/1 (gulir teks 2,0× tidak stabil, ulang 53/0), profil 24/0, izin 54/0, pengajian 13/0, keuangan 25/0; iOS Release simulator cold start lulus.
- Belum diuji: EAS/Play/pre-launch 1.10.0, Android 12/15, fisik, Push nyata, upgrade bersesi, iOS Debug. Binary baru wajib. Tidak merge/OTA/unggah Play.
