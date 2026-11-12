# Redesain tampilan aplikasi gelombang 2 — Fase 2 (ringkasan repo aplikasi)

Tanggal: 12 November 2026 · Implementator: Claude Code · Auditor berikutnya: Codex · **Siap audit**, bukan persetujuan merge atau rilis.

Rencana dan keputusan K-1…K-10: `docs/redesain-tampilan-v2/rencana.md` di repo WebAlHasan. Laporan lengkap, penafsiran P2-1…P2-17, temuan, bukti, tangkapan, dan cara mengulang uji: `docs/redesain-tampilan-v2/fase-2/README.md` di repo WebAlHasan (branch sama nama).

- Branch `claude/redesain-tampilan-v2-fase-2` dari `origin/main` `707b7b7` (PR #30; isi sama dengan koreksi audit Fase 1 `8c8e025`); versi **1.5.0 → 1.6.0** (minor, `npm run versi:naik`), `versi:periksa` lulus. Tanpa worktree.
- **Hanya tampilan.** Endpoint, parameter, payload, hak, aturan bisnis, idempotensi, versi optimistik, dan `expo-screen-capture` tidak berubah. Tanpa dependensi/modul native baru. `package.json`/`package-lock.json` salinan kerja milik pekerjaan lain tidak di-commit.

## Isi

| Bagian | Berkas |
| --- | --- |
| Kerangka layar stack (kepala ← · judul · ⋯ di luar area gulir) dan kotak pemberitahuan | `src/components/screen-shell.tsx`, `src/components/ui/notice.tsx` |
| FAB K-8: lapisan yang mengikuti bilah tab sistem dan papan ketik | `src/components/ui/fab.tsx` (`FabArea`, `useKeyboardVisible`) |
| Perluasan komponen Fase 1 | `ui/entity-row.tsx`, `ui/search-bar.tsx`, `ui/filter-pills.tsx`, `ui/info-row.tsx`, `app-button.tsx`, `screen-header.tsx`, `ui/week-strip.tsx` |
| Komponen pengajian/perizinan | `schedule-card.tsx`, `status-selector.tsx`, `peserta-saring.tsx`, `izin-card.tsx`, `izin-wali-shared.tsx` |
| Pembantu murni | `src/lib/tampilan.ts` (`waktuRelatif`, `fabMelewatiSetengahLayar`, `jarakAtasLayarTab`), `src/izin-wali/forms.ts` (`langkahTahap`) |
| Layar | `(app)/(schedules)/schedules.tsx`, `(app)/(izin)/perizinan.tsx`, `schedule/[id].tsx`, `meeting/[id].tsx`, `reports.tsx`, `report/[id].tsx`, `izin/buat.tsx`, `izin/[id].tsx`, `izin/laporan.tsx`, `izin-wali/{index,buat,[id],perbaiki}.tsx`, `notifikasi/{index,[id],perangkat}.tsx`; `_layout.tsx` dan `izin-wali/_layout.tsx` (`headerShown: false`) |
| Uji unit | `tests/redesain-v2-fase2.test.ts` (baru), `tests/redesain-v2-kontras.test.ts` (pasangan Fase 2) |

## Keputusan tampilan yang perlu diketahui

- **K-10:** setiap rute fase punya tepat satu ←. Jadwal/Perizinan → Beranda; layar stack → halaman sebelumnya atau Beranda bila tanpa riwayat; alur berlangkah kembali ke langkah sebelumnya dulu.
- **K-8:** FAB "Ajukan izin" 56 pt di kanan bawah Perizinan dan daftar izin wali (orang tua). Tinggi bilah tab diambil sistem (`SafeAreaView` bawah `react-native-screens/experimental` di iOS; inset native tabs di Android). Bila FAB dapat melewati setengah layar pada teks sangat besar, dipakai alternatif tombol lebar penuh di atas kotak cari.
- "Perbarui daftar" (absensi), Cetak/Bagikan (laporan kehadiran), dan "Tandai semua dibaca" (notifikasi) pindah ke menu ⋯.
- Draf, ringkasan, dan payload absensi tetap seluruh peserta; keputusan izin tetap memerlukan alasan (divalidasi server).

## Hasil (rincian di repo web)

- `tsc --noEmit` exit 0, `expo lint` exit 0, unit **97/0** (baseline 90/0).
- Expo web: suite fase **67/0** (pengajian) + **144/0** (izin); regresi **669/0** (Fase 1 159/0, profil 105/0, kelas gabungan 57/0, pencarian 53/0 + 24/0, peserta 18/0, V7 F4 48/0, Keamanan F4 46/0, V6 F4 45/0, V5 F4 78/0, V5 F5 36/0).
- Permintaan API: baseline vs fase **54 langkah sama / 0 berbeda (230 permintaan)**, termasuk buka pertemuan, kirim absensi, perbarui daftar, buat/setujui/tolak izin, ajukan/teruskan/perbaiki izin wali, dan tandai notifikasi dibaca.
- Android emulator (dev client Debug baru 1.6.0 + Metro): izin **54/0**, pengajian **13/0**. iOS simulator (build Release baru 1.6.0): **17 alur Maestro lulus**, ukur FAB **4/0**.

## Batas

Perangkat fisik, build distribusi EAS, iOS Debug, APK rilis, Push nyata, MariaDB produksi/MySQL/cPanel, dan UAT belum diuji. Layar izin wali dilindungi `expo-screen-capture` sehingga tangkapan native-nya hitam; buktinya berupa pernyataan uji dan ukuran dari hierarki. Tidak merge/deploy/rilis; Fase 3 belum dimulai.
