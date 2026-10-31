# Penugasan lintas guru/pengurus — Fase 4 (aplikasi): Keamanan hanya baca dan akun dua identitas

**Status (31 Oktober 2026): LULUS audit teknis lokal Codex; lihat `AUDIT-CODEX.md`.** Belum merge, belum rilis aplikasi. Fase 5 belum dimulai.

Laporan lengkap (cakupan, bukti, penafsiran PF4-1…PF4-8, temuan, batas, handoff) ada di repo web
`WebAlHasan/docs/penugasan-keamanan/fase-4/README.md`. Rancangan: `WebAlHasan/docs/penugasan-keamanan/rancangan.md` (PK-1, PK-T2, PK-T3, PK-T4).

| Butir | Nilai |
| --- | --- |
| Branch | `claude/penugasan-keamanan-fase-4` dari `origin/main` `367ae5d` (PR #22) |
| Dependensi/modul native baru | Tidak ada (`expo-screen-capture ~57.0.4` sudah ada sejak V5 Fase 4) |
| Kontrak server | REST baca-saja `/api/v1/keamanan/*` dan `GET /profile/identitas` (web branch yang sama); `/profile` tidak berubah |
| Tidak di-commit | Perubahan `package.json`/`package-lock.json` yang belum di-commit milik pekerjaan lain |

## Yang ditambahkan

- `src/api/keamanan.ts` — klien sembilan GET, tanpa metode tulis.
- `src/keamanan/format.ts` — pembantu murni (query, rentang tanggal, nada/label status, pengelompokan penugasan per identitas); diuji `tests/keamanan.test.ts`.
- `src/components/keamanan-shared.tsx` — `useKeamananAkses`, `KeamananProtection` (tangkapan/rekaman layar dicegah dan cuplikan pengalih aplikasi kosong sebelum layar mana pun dimuat; gagal tertutup), `Halaman` (isi ditutup saat tidak aktif).
- `src/app/keamanan/*` — pintu, kehadiran, perizinan, pelanggaran, konseling (daftar + rincian), seluruhnya hanya baca. Cetak/PDF dan unduhan lampiran tetap di website.
- `src/app/(app)/(home)/index.tsx` — ubin "Keamanan" dari `/keamanan/akses`; `src/app/_layout.tsx` — rute di balik sesi.
- `src/api/akun.ts`, `src/app/(app)/(profil)/profil.tsx`, `src/api/types.ts` — bagian "Identitas & penugasan" (Sebagai guru / Sebagai pengurus, penugasan aktif per identitas) dari `GET /profile/identitas`; server lama (404) → bagian tidak tampil.

## Bukti (ringkas; berkas di repo web `docs/penugasan-keamanan/fase-4/bukti/`)

- tsc 0, lint 0, unit **47/0** (lock ter-commit Expo 57.0.15).
- Expo **web** 375 px lintas lima akun: **46/0**, bundel host produksi 0 (Chromium, bukan perangkat).
- Android **emulator** (dev client Debug + Metro) 9 skenario: ubin, FLAG_SECURE (screencap hitam di Keamanan, normal di Beranda), Recents hitam, rincian izin lengkap, konseling tanpa Rahasia, pencabutan penugasan saat layar terbuka, logcat tanpa isi/token, profil dua identitas akun guru.

## Batas

Perangkat fisik, iOS (simulator/fisik), build rilis, Push nyata, dan UAT belum diuji. Temuan lama TF4-1: di Expo web 375 px akun guru meluap 33 px pada bilah tab web sejak `367ae5d` (tidak diubah).
