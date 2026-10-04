# Perbaikan formulir pembinaan — 4 Oktober 2026

Implementator Codex, auditor Claude Code; branch `codex/perbaikan-form-pembinaan`, baseline aplikasi `02a917f`. Permintaan Human Developer: kalender/jam, retensi isian saat screenshot/layar mati, dropdown kerahasiaan, dropdown katalog tanpa navigasi halaman.

Laporan lengkap dan keputusan sumber kebenaran: repositori WebAlHasan `docs/perbaikan-form-pembinaan/handoff.md` dan `PRD-V3.md` §5.5b; baseline web `c9aea0f`. Perubahan retensi menggantikan aturan background pada handoff Fase 5 lama untuk formulir buat/detail saja. Draf dalam memori; keluar layar/logout/akses ditolak tetap menghapus. Force-stop/proses dibunuh OS belum memulihkan draf.

TypeScript/lint lulus, unit tanggal/cetak 8/0, Chromium dengan API sintetis 15/0. Harness di WebAlHasan `tests/browser/uji-form-pembinaan.mjs` menjalankan Expo localhost:8082. Suite API nyata + website 26/0 dan runner backend Fase 5 exit 0 pada MariaDB uji lokal. Preflight awal terhalang sandbox, kemudian berhasil dengan akses lokal yang sesuai. Android/iOS fisik dan audit Claude Code belum dilakukan. Jangan mengklaim lulus produksi atau merge sebelum audit dan kriteria wajib terpenuhi.
