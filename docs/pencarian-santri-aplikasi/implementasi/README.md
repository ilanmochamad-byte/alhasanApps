# Pencarian santri, IBTIDA PA/PI, dan versi aplikasi — implementasi (5 November 2026)

Implementator Claude Code, auditor berikutnya Codex. Branch `claude/pencarian-santri-absensi-ibtida` dari `origin/main` `bd7833f` (versi `1.2.0`). Rencana dan kriteria: repo web `docs/pencarian-santri-aplikasi/rencana.md`. **Laporan lengkap, bukti, dan batas uji ada di repo web `docs/pencarian-santri-aplikasi/implementasi/README.md`.** Tidak merge, deploy, atau rilis aplikasi.

## Perubahan aplikasi

| Bagian | Perubahan |
| --- | --- |
| Absensi `meeting/[id]` | Kolom cari nama/NIS (lokal, tanpa permintaan per ketikan; huruf besar/kecil, diakritik, urutan kata diabaikan; tombol hapus). Pertemuan gabungan: tab `Semua · n`, satu tab per kelas pertemuan (`PA · n`/`PI · n` bila nama kelas berbeda tepat pada kata PA/PI/Putra/Putri; selain itu nama kelas lengkap), dan `Kelas belum tercatat · n` bila ada peserta yang kelas asalnya kosong/di luar kelas pertemuan. Kelompok dari ID kelas asal snapshot (`students[].class.id`) ∩ `task.classes`, tidak pernah dari nama santri. Nomor urut stabil. Draf, ringkasan, progres, dan payload tetap seluruh `meeting.students`. Tombol menjadi `Semua hadir (N)` dengan keterangan dan petunjuk aksesibilitas bahwa berlaku untuk peserta yang tidak tampil. |
| Rincian laporan `report/[id]`, rincian kehadiran Keamanan | Cari + tab yang sama, hanya baca. |
| Daftar izin Keamanan | Kolom cari nama/NIS → `GET /keamanan/izin?q=` (server, seluruh halaman, kembali ke halaman 1). |
| Pelanggaran/konseling Keamanan | Placeholder "Nama atau NIS santri" (server kini juga mencocokkan NIS). |
| Daftar pembinaan (pelanggaran, kasus) | Kolom cari → `?q=` ke `/v3/pelanggaran` dan `/v3/konseling/kasus`; kolom tetap terpasang saat memuat. |
| `Chip` | `aria-selected` (tab) / `aria-checked` (radio): status terpilih kini terbaca pembaca layar web dan iOS ("radio button, checked"). |
| `AppButton` | Prop opsional `accessibilityHint`. |

Pembantu murni `src/lib/peserta-saring.ts` (uji `tests/peserta-saring.test.ts`). Tanpa dependensi atau modul native baru.

## Aturan versi

`app.json` `expo.version` = versi pengguna (major.minor.patch). Satu kenaikan per paket pekerjaan aplikasi terhadap baseline (`origin/main`), bukan per commit koreksi; tidak boleh turun atau melompat. Nomor build Android/iOS (versionCode/buildNumber) tetap diurus EAS (`appVersionSource: remote`, `autoIncrement`). Folder `ios/`/`android/` tidak dilacak Git; EAS menjalankan prebuild dari `app.json`.

```bash
npm run versi:naik -- minor
```

```bash
npm run versi:periksa
```

`versi:periksa` membandingkan commit HEAD dengan `origin/main` (tambahkan `-- --kerja` untuk salinan kerja, `-- --dasar <ref>` untuk baseline lain) dan gagal bila ada perubahan aplikasi tanpa kenaikan, versi turun, atau lompatan. `versi:naik` idempoten. Paket ini: `1.2.0 → 1.3.0` (minor). Uji `tests/versi-aplikasi.test.ts`.

## Bukti ringkas

Unit 77/0, TypeScript/lint exit 0, Expo web absensi 53/0 dan daftar 24/0, regresi Expo kelas gabungan F2 57/0 dan Keamanan F4 46/0, kontrol `main` lama gagal. Android emulator (APK Release 1.3.0 uji lokal) dan iOS simulator (build Release 1.3.0 baru) dengan alur Maestro, akun, pertemuan, dan proksi API yang sama: masing-masing 7/0. Perangkat fisik, build distribusi EAS, Push, dan UAT belum diuji.

Perubahan `package.json`/`package-lock.json` di salinan kerja milik pekerjaan lain tidak di-commit; commit hanya menambah tiga skrip `versi:*` pada `package.json` HEAD.
