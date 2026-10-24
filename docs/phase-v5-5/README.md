# PRD V5 Fase 5 — Laporan layanan klinik (aplikasi)

**Status (24 Oktober 2026):** diimplementasikan Claude Code, menunggu audit independen Codex. Belum merge, tanpa rilis aplikasi atau build distribusi. Bukti, batas, dan handoff lengkap ada di repo web: `docs/phase-v5-5/README.md`.

| Butir | Nilai |
| --- | --- |
| Branch | `claude/prd-v5-fase-5` dari `33522f7` (audit Fase 4 Codex; `origin/main` `9f913e2` = merge PR #14, `git diff 33522f7 origin/main` kosong) |
| Izin | Human Developer mengizinkan Fase 5 dimulai pada 24 Oktober 2026 walaupun audit Fase 4 belum meluluskan butir iOS terbaru, ketukan Push provider, dan cold start non-dev; butir itu tetap terbuka |
| Kontrak | `GET /api/v1/v5/kesehatan/laporan` (aditif, hanya baca). Tidak ada perubahan kontrak lama, modul native, versi aplikasi, atau EAS |

## Perubahan

- `src/app/kesehatan/laporan.tsx` — layar **Laporan layanan klinik**: periode (Bulan ini, Bulan lalu, 30 hari, Atur), kelas saat ini, angka kunjungan/obat/rujukan/tindak lanjut/ringkasan wali, daftar rujukan menunggu hasil dan tindak lanjut belum selesai (ketuk → detail kunjungan yang diperiksa ulang server), per kelas, per bulan, dan bagian pengawasan admin bila server mengirimnya. Angka Draf hanya tampil bila server mengirim angka (bukan `null`).
- Pintu kesehatan: tombol "Laporan layanan klinik" untuk pembaca internal (petugas, admin, pembimbing/murobi). Menyembunyikan tombol bukan kontrol akses; wali yang membuka alamat langsung menerima penolakan server.
- Layar berada di bawah navigator kesehatan, sehingga gate `expo-screen-capture` Fase 4 dan penutup saat aplikasi tidak aktif juga berlaku. Respons hanya di memori layar; tidak ada cache disk, analytics, atau log isi.
- `src/api/kesehatan.ts` tipe `Laporan`/`Tertunda` + `kesehatan.laporan()`; `src/kesehatan/forms.ts` `periodeLaporan()` dan `namaBulan()` dengan uji unit.

## Bukti lokal

| Pemeriksaan | Hasil | Berkas |
| --- | --- | --- |
| TypeScript `tsc --noEmit` | exit 0 | `mobile-tsc.txt` |
| `expo lint` | exit 0 | `mobile-lint.txt` |
| Unit `node --test` (termasuk periode laporan lintas tahun/kabisat) | 29/0 | `mobile-unit.txt` |
| Expo **web** (Chromium 375 px) + API/DB uji nyata: lima peran internal angka = API, Draf/pengawasan sesuai hak, santri di luar cakupan tidak tampil, wali/pengurus biasa ditolak, storage/konsol bersih, 0 permintaan ke luar localhost | 36/0 | repo web `docs/phase-v5-5/bukti/aplikasi-expo-web.txt` |

**Tidak diuji pada fase ini:** build native Android/iOS baru, emulator/simulator untuk layar laporan, perangkat fisik, Push nyata. Expo web bukan bukti native. Butir Fase 4 yang terbuka (runtime iOS terbaru, ketukan Push provider, cold start non-dev) tetap terbuka.
