# Optimasi Android Google Play — satu tahap

Keputusan Human Developer 21 November 2026: **Claude Code mengimplementasikan GP-1 DEX/R8 dan GP-2 API tampilan dalam satu paket; Codex mengaudit secara independen sesudah handoff.** Tidak berjalan bersamaan pada checkout yang sama.

Sumber kebenaran dan laporan lengkap di repo WebAlHasan (branch `claude/optimasi-android-play`):

- `docs/optimasi-android-play/rencana.md` — rencana dan kriteria K-1…K-7.
- `docs/optimasi-android-play/prompts-implementasi-audit.md` — prompt implementasi/audit.
- `docs/optimasi-android-play/IMPLEMENTASI.md` — laporan implementasi, angka DEX, peta simbol GP-2, hasil uji, batas.
- `docs/optimasi-android-play/manifest-bukti.md` — hash artefak dan lokasi privat (binary/mapping tidak di Git).

## Ringkasan implementasi (Claude Code, 21 November 2026)

Branch `claude/optimasi-android-play` dari `origin/main` `82f156a` (memuat dokumen persiapan). Versi **1.9.0 → 1.9.1** (patch, sekali); nomor build tetap EAS remote.

- `expo-build-properties` ~57.0.23: `enableMinifyInReleaseBuilds` dan `enableShrinkResourcesInReleaseBuilds` untuk Android release.
- `plugins/with-android-r8-optimize.js`: release memakai `proguard-android-optimize.txt` (template memakai `proguard-android.txt` yang berisi `-dontoptimize`) dan AGP disematkan ke patch **8.12.3** (template 8.12.0) agar metadata `r8.json` terbaca Play. Gagal keras bila pola template berubah.
- Tanpa aturan keep baru, tanpa patch `node_modules`, tanpa perubahan kode aplikasi, target SDK, edge-to-edge, atau perlindungan layar. Uji `tests/optimasi-android.test.ts`.
- AAB rilis 19 (asli EAS): 5 DEX, 46.992.180 B, tanpa R8. AAB final: **1 DEX, 10.411.972 B**, `r8.json` R8 8.12.22 dengan bagian tanpa obfuscation/optimasi/shrinking 19,17% / 19,68% / 19,05% (±80% teroptimasi), `proguard.map` disertakan.
- GP-2: seluruh pemanggil API warna bilah/cutout berada di library (React Native 0.86 core, Material 1.13.0 lewat react-native-screens, AndroidX, expo-image-picker crop). Patch terbaru dalam SDK 57 tidak mengubahnya. **Residual GP-2 tetap terbuka** sampai upgrade SDK/RN atau penerimaan eksplisit Human Developer.

Perubahan `package.json`/`package-lock.json` milik pekerjaan lain di checkout lokal **tidak** ikut di-commit; commit ini dibuat dari klon bersih dengan lock ter-commit + `expo-build-properties` saja.

Status: implementasi selesai untuk GP-1, residual GP-2 terbuka; **belum diaudit Codex**; build EAS, internal Play, perangkat fisik, Push nyata, dan Play App Signing **belum diuji**. Tidak merge, deploy, publikasi produksi, atau OTA.

## Audit independen Codex — 22 November 2026

Status implementasi di atas adalah riwayat handoff. **Audit telah dilakukan dan belum lulus paket utuh:** GP-1 memenuhi ketiga minimum lokal (80,32/80,83/80,95%), tetapi residual GP-2 menghalangi K-4 dan K-5 belum tervalidasi sepenuhnya. K-7 untuk final belum tersedia. Lihat [ringkasan audit](AUDIT-CODEX.md) dan laporan lengkap `docs/optimasi-android-play/AUDIT-CODEX.md` di WebAlHasan. Tidak merge/deploy/rilis.

## Tindak lanjut Claude Code — 22 November 2026

Commit `3705c2f`: patch SDK 57 diselaraskan (`expo` 57.0.33, RN 0.86.3) dan `plugins/with-ios-scene-lifecycle.js` menutup crash start UIScene pada SDK iOS 27 (smoke simulator iOS 27.2 Release lulus). GP-2 tetap terbuka: upgrade SDK 58/RN 0.88.1 yang diuji hanya mengurangi residual 20/11 → 15/7, tidak diadopsi. Android 12 belum teruji (emulator API31 macet). AAB EAS 1.9.1 (20) `6137013c…10c1` sudah dibangun; unggahan internal menunggu kunci akun layanan Play. Laporan lengkap di repo **WebAlHasan** `docs/optimasi-android-play/TINDAK-LANJUT-CLAUDE.md`. Bukan audit independen; tidak merge/deploy/OTA/publikasi.

## Audit ulang Codex — 22 November 2026

Lihat [audit ulang](AUDIT-ULANG-CODEX.md). R8 tetap lulus lokal (80,18/80,68/80,81%), dan F-2 iOS ditutup pada simulator Release baru. GP-2 20/11, kelengkapan Android 12 F-3 dan konfirmasi Play final masih terbuka; **paket belum lulus utuh**. Versi tetap 1.9.1; tidak merge/deploy/rilis oleh auditor.
