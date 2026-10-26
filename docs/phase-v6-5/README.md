# PRD V6 Fase 5 — aplikasi (laporan keuangan santri/BSA)

**Pembaruan audit 27 Oktober 2026:** aplikasi lulus audit teknis lokal (Expo web 20/0, iOS Release simulator 7/0, tsc/lint/unit 37/0 pada paket lock ter-commit Expo 57.0.15). Gerbang akhir/produksi tetap terbuka; lihat [AUDIT-CODEX.md](AUDIT-CODEX.md). Catatan implementator di bawah dipertahankan sebagai riwayat 26 Oktober, bukan status audit terbaru.

26 Oktober 2026. Implementator Claude Code; auditor berikutnya Codex. Branch `claude/prd-v6-fase-5` dari audit ulang Fase 4 **`16bcdb7`** (diverifikasi: `origin/main` `f1141e0` memuatnya dan `git diff` kosong; tanpa worktree). Laporan lengkap, kriteria → bukti, penafsiran, batas, dan hash kedua repo ada di repositori web `docs/phase-v6-5/README.md` (branch web dengan nama sama, dari audit ulang Fase 4 `75cb144`).

Commit implementasi mobile `18fe095`; web `8108012`. Keduanya sudah di-push ke branch `claude/prd-v6-fase-5`.

## Perubahan

- `src/app/keuangan/laporan.tsx` — layar **Laporan keuangan**. Pilihan periode: Bulan ini, Bulan lalu, 3 bulan, atau Tahun ini. Isinya:
  - tagihan dan tabungan, serta kas dan perpindahan internal (petugas/admin);
  - pembatalan dan koreksi beralasan (petugas/admin);
  - ringkasan per bulan;
  - per santri/per anak dengan pencarian dan penomoran, ketuk untuk membuka rincian;
  - santri nonaktif bersaldo (admin, R-10).

  Hanya `GET /v6/bsa/laporan`; angka tidak dihitung ulang di aplikasi.
- `src/api/keuangan.ts` — tipe `LaporanKeuangan`/`LaporanSantri` dan `keuangan.laporan()`. Aplikasi sengaja **tidak** memanggil ekspor CSV: berkas keuangan tidak disimpan di perangkat, dan ekspor tersedia di website sesuai hak.
- `src/app/keuangan/_layout.tsx` — rute `laporan` di navigator keuangan yang dilindungi `expo-screen-capture` (T-1).
- `src/app/keuangan/index.tsx` — tombol "Laporan per periode" (petugas/admin) dan "Laporan keuangan anak" (orang tua).
- `src/keuangan/forms.ts` — `rentangLaporan()`/`PILIHAN_RENTANG` (hanya permintaan; server memvalidasi rentang ≤ 12 bulan dan tidak di masa depan).
- `tests/keuangan.test.ts` — 1 uji unit baru (rentang lintas tahun).
- Tanpa dependensi atau modul native baru, tanpa perubahan SDK, `app.json`, `eas.json`, `package.json`.

## Hasil

| Pemeriksaan | Hasil |
| --- | --- |
| TypeScript `tsc --noEmit` (tipe rute dibuat ulang) | exit 0 |
| `expo lint` | exit 0, 0 peringatan |
| Unit (`node --experimental-strip-types --test tests/*.test.ts`) | 37/0 (36 lama + 1 baru) |
| Expo web + API/DB nyata (375 px) | lihat repositori web `docs/phase-v6-5/bukti/aplikasi-expo-web.txt` |

Batas: layar laporan **hanya diuji di Expo web** (Chromium). Android/iOS native (emulator, simulator, maupun perangkat fisik) untuk layar ini **belum diuji**; build native tidak diperlukan oleh Fase 5 karena tidak ada modul baru. Salinan kerja berisi perubahan `package.json`/`package-lock.json` milik pekerjaan lain (Expo 57.0.15 → 57.0.31) yang **tidak di-commit**. `node_modules` mengikuti versi itu, sehingga uji berjalan di atas paket 57.0.31.
