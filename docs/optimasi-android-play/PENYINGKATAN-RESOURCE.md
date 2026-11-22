# Penyingkatan resource yang dioptimalkan (1.9.2)

Menindaklanjuti rekomendasi Google Play untuk rilis 1.9.1 (21) pada 22 November 2026:
"Penyingkatan resource yang dioptimalkan tidak diaktifkan".

- `plugins/with-android-r8-optimize.js` kini juga menulis
  `android.r8.optimizedResourceShrinking=true` ke `android/gradle.properties` saat prebuild
  (mode opt-in AGP 8.6+, bawaan AGP 9). Tidak ada perubahan kode aplikasi, dependensi,
  manifest, hak, atau aturan keep. Versi 1.9.1 → **1.9.2** (patch).
- Rekomendasi kedua Play, "upgrade AGP ke 9.0", **tidak** dikerjakan: React Native 0.86 /
  Expo SDK 57 terikat AGP 8.12 (sudah patch terbaru 8.12.3).
- Rekomendasi API layar penuh (GP-2) tetap residual library yang tercatat di audit Codex.

Bukti lengkap (hash, `android analyze` STANDARD → OPTIMIZED, daftar resource yang terbuang,
uji native Release) ada di repo web:
`docs/optimasi-android-play/penyingkatan-resource/README.md`.
Implementasi Claude Code; menunggu audit independen Codex. Tidak merge/rilis/OTA.
