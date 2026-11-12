# Redesain tampilan aplikasi gelombang 2 — Fase 1 (ringkasan repo aplikasi)

Tanggal: 12 November 2026 · Implementator: Claude Code · Auditor berikutnya: Codex · **Siap audit**, bukan persetujuan merge atau rilis.

Rencana dan keputusan K-1…K-10: `docs/redesain-tampilan-v2/rencana.md` di repo WebAlHasan. Laporan lengkap, penafsiran P-1…P-9, temuan, bukti, tangkapan, dan cara mengulang uji: `docs/redesain-tampilan-v2/fase-1/README.md` di repo WebAlHasan (branch sama nama).

- Branch `claude/redesain-tampilan-v2-fase-1` dari `origin/main` `77f6240`; versi **1.4.0 → 1.5.0** (minor, `npm run versi:naik`), `versi:periksa` lulus. Tanpa worktree.
- **Hanya tampilan.** Endpoint, payload, hak, aturan bisnis, idempotensi, versi optimistik, alur sesi/password, dan `expo-screen-capture` tidak berubah. Tanpa dependensi/modul native baru, tanpa `react-native-svg`. `package.json`/`package-lock.json` salinan kerja milik pekerjaan lain tidak di-commit.

## Isi

| Bagian | Berkas |
| --- | --- |
| Token K-1 (krem, hijau lebih tua; warna status dikunci), tipe teks dan jarak §3.2 | `src/constants/colors.ts` (baru, murni), `src/constants/theme.ts`, `src/components/themed-text.tsx` |
| `ScreenHeader` varian `beranda` / `akar` / `stack` + menu ⋯; kepala lama tetap untuk layar fase berikutnya | `src/components/screen-header.tsx`, `src/components/brand-logo.tsx` |
| Tombol ← K-10 | `src/lib/kembali.ts`, `src/hooks/use-kembali.ts` |
| Komponen §3.3 | `src/components/ui/`: `hero-card`, `stat-card`, `search-bar`, `bottom-sheet`, `filter-pills`, `entity-row`, `avatar-inisial`, `status-pill`, `info-row`, `profile-header`, `segment-tabs`, `success-panel`, `receipt-card`, `bar-chart`, `fab`; diselaraskan: `app-button`, `ui/app-field`, `ui/menu-tile`, `ui/action-bar`, `screen-state` |
| Logo K-9 (1x/2x/3x dari berkas sumber, tanpa perubahan warna/bentuk) dan ikon garis baru | `assets/images/brand/`, `assets/images/icons/{arrow-left,camera,mail,phone,check-circle}*.png` |
| Layar | `src/app/login.tsx`, `ganti-password-wajib.tsx`, `akun/ganti-password.tsx`, `akun/edit-profil.tsx`, `(app)/(home)/index.tsx`, `(app)/(profil)/profil.tsx`, `src/components/profil-shared.tsx`, `src/app/_layout.tsx` (dua layar akun `headerShown: false`) |
| Uji unit | `tests/redesain-v2-kontras.test.ts`, `tests/redesain-v2-fase1.test.ts` |

## Hasil (rincian di repo web)

- `tsc --noEmit` exit 0, `expo lint` exit 0, unit **90/0** (baseline 80/0).
- Expo web: suite fase **175/0**; regresi profil **105/0** (baseline 105/0); Keamanan 46/0, kelas gabungan 57/0, pencarian 53/0 + 24/0, peserta 18/0, V6 F4 45/0, V7 F4 48/0, V5 F4 78/0, V5 F5 36/0.
- Permintaan API: baseline vs sesudah **23 langkah sama / 0 berbeda (143 permintaan)**.
- Android emulator (dev client Debug baru + Metro) dan iOS simulator (build Release baru, 13/13 alur Maestro): lihat laporan web.

## Batas

Perangkat fisik, build distribusi EAS, iOS Debug, Push nyata, MariaDB produksi/MySQL/cPanel, dan UAT belum diuji. Tab Jadwal dan Izin belum diberi ← (Fase 2). Tidak merge/deploy/rilis; Fase 2 belum dimulai.
