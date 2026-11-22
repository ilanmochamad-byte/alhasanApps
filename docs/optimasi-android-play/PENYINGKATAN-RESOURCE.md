# Penyingkatan resource yang dioptimalkan (1.9.2)

Menindaklanjuti rekomendasi Google Play untuk rilis 1.9.1 (21) pada 22 November 2026:
"Penyingkatan resource yang dioptimalkan tidak diaktifkan".

- `plugins/with-android-r8-optimize.js` kini juga menulis
  `android.r8.optimizedResourceShrinking=true` ke `android/gradle.properties` saat prebuild
  (mode opt-in AGP 8.12+, bawaan AGP 9). Tidak ada perubahan kode aplikasi, dependensi,
  manifest, hak, atau aturan keep. Versi 1.9.1 → **1.9.2** (patch).
- Rekomendasi kedua Play, "upgrade AGP ke 9.0", **tidak** dikerjakan: React Native 0.86 /
  Expo SDK 57 terikat AGP 8.12 (sudah patch terbaru 8.12.3).
- Rekomendasi API layar penuh (GP-2) tetap residual library yang tercatat di audit Codex.

Bukti lengkap (hash, `android analyze` STANDARD → OPTIMIZED, daftar resource yang terbuang,
uji native Release) ada di repo web:
`docs/optimasi-android-play/penyingkatan-resource/README.md`.
Implementasi Claude Code; audit independen Codex selesai 23 November 2026.

## Hasil audit Codex — 23 November 2026

- Flag terverifikasi tanpa temuan kode baru: rebuild bersih dan kontrol membuktikan
  `STANDARD` → `OPTIMIZED`, DEX 10.497.352 → 10.104.488 B, resource 1.041 → 874.
  DEX, mapping, dan resource table rebuild identik dengan artefak implementator.
  Rebuild auditor arm64 saja, bukan binary EAS empat ABI/signing distribusi.
- TypeScript/lint lulus, unit **129/0**, native terarah **68/0** pada Android 12/15/16
  (tanggal, profil/foto/crop/password, cetak/berbagi PDF, layout Android 15 gelap2×
  tiga tombol+cutout). Satu pemeriksaan cache privat dilewati karena Release
  non-debuggable. Profil awal 0/1 akibat sesi uji sebelumnya dicatat terpisah;
  pengulangan bersih suite asli 24/0. Tidak mengulang seluruh matriks modul lama.
- GP-2 aktual **18 instruksi/10 kelas**, turun dari 20/11, **tetap F-1/P1 terbuka**.
  Batas F-3/P2 Android 12 pada audit sebelumnya belum seluruhnya ditutup.
  **Keseluruhan paket Optimasi Android belum lulus teknis lokal penuh**;
  EAS/Play/pre-launch 1.9.2, fisik, Push, upgrade/signing Play belum terkonfirmasi.
- Koreksi auditor hanya komentar AGP 8.12 (bukan 8.6), dokumentasi, dan helper tanggal
  web yang kini menolak XML usang serta keluar gagal bila assertion gagal.
  Tidak mengubah runtime/config/lock aplikasi. Versi tetap **1.9.2**.
- Checkout utama beserta edit paket pekerjaan lain tetap utuh; audit dari
  `/private/tmp/ors-codex-audit/mobile`. Laporan lengkap dan bukti di WebAlHasan:
  `docs/optimasi-android-play/penyingkatan-resource/AUDIT-CODEX.md`.

Commit/push hanya branch fitur; tidak merge/deploy/rilis/OTA/upload Play atau fase
lain. Keputusan residual dan produksi tetap Human Developer.
