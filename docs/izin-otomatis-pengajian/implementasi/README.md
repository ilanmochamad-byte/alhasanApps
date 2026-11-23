# Status "Izin" otomatis pada absensi pengajian — ringkasan aplikasi

Implementator Claude Code, 23 November 2026; **auditor Codex berikutnya**. Satu tahap web + REST + aplikasi atas keputusan Human Developer 23 November 2026 (revisi keputusan S, IP-1…IP-6). Sumber kebenaran, bukti lengkap, penafsiran, dan batas: repo web `WebAlHasan`, `docs/izin-otomatis-pengajian/implementasi/README.md` (branch `claude/izin-otomatis-absensi`).

- Branch `claude/izin-otomatis-absensi` dari `origin/main` `d80320b` (1.10.0), dikerjakan dari klon bersih; checkout utama dan perubahan `package.json`/`package-lock.json` pekerjaan lain tidak disentuh.
- Versi `expo.version` **1.10.0 → 1.11.0** (satu minor, `npm run versi:naik minor`; `versi:periksa --kerja` LULUS). Tanpa dependensi atau modul native baru; lockfile tidak berubah.

## Perubahan

- `src/lib/izin-otomatis.ts` (baru) + `tests/izin-otomatis.test.ts`: draf awal (absensi tersimpan → status tersimpan; belum berabsensi + `izin` → "Izin" + keterangan; selain itu "Hadir"), aturan catatan saat status diubah, "Semua hadir" melewati santri izin, penggabungan draf sesudah "Perbarui daftar", penanda "Izin s.d. 25 Nov", ringkasan `izin_suggested`/`izin_cleared`.
- `src/app/meeting/[id].tsx`: draf awal, penanda (ikon + teks) yang tetap tampil walau status diubah, tombol "Semua hadir (N)" dengan N = peserta tanpa izin + teks penjelas, sinkron sesudah perbarui (ubahan per santri dipertahankan), ringkasan konfirmasi menyebut jumlah Izin.
- `src/app/report/[id].tsx`, `src/app/keamanan/kehadiran/[id].tsx`: keterangan usulan izin (Keamanan: label baru dengan fallback "Sedang izin #" untuk server/pertemuan lama).
- `src/api/types.ts`, `src/api/keamanan.ts`: kunci opsional `izin`, `participant_changes.izin_suggested/izin_cleared`.
- Payload simpan absensi, kunci idempotensi, penjaga ketukan ganda, hak, dan `expo-screen-capture` tidak berubah. Server lama tanpa kunci `izin` → draf "Hadir" seperti 1.10.0.

## Bukti (rincian di repo web)

| Uji | Hasil |
| --- | --- |
| Unit `node --test tests/*.test.ts` | **141/0** (6 uji baru) |
| `tsc --noEmit` / `expo lint` (dengan `expo-env.d.ts` buatan Expo, tidak di-commit) | exit 0 / exit 0 |
| Expo web 1280/768/375 (`tests/browser/uji-izin-otomatis-absensi-app.mjs` di repo web) | **34/0** |
| Android emulator API 36, APK uji Release R8 tanpa Metro (cleartext hanya 127.0.0.1) | alur K-9 lulus; DB menyimpan Hadir, satu penyimpanan |
| iOS simulator iPhone 17 Pro iOS 27.2, build Release arm64 ad-hoc tanpa Metro | alur K-9 lulus; DB menyimpan Hadir, satu penyimpanan |

## Batas

Perangkat fisik, build distribusi EAS, iOS Debug, Push nyata, MariaDB 10.6/cPanel, dan UAT belum diuji. Aplikasi ≤ 1.10.0 tetap berfungsi tetapi tanpa draf Izin otomatis; manfaat penuh baru terasa sesudah guru memperbarui aplikasi. Tidak merge, deploy, atau rilis aplikasi.
