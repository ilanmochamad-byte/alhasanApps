# PRD V6 Fase 4 — aplikasi (keuangan santri/BSA)

Status audit 26 Oktober 2026: lihat [AUDIT-CODEX.md](AUDIT-CODEX.md). F-1 dikoreksi, runtime iOS dan validasi cold start tetap terbuka; belum lulus seluruh validasi lintas platform. Bukti implementator berikut dipertahankan sebagai handoff awal.

25–26 Oktober 2026. Implementator Claude Code; auditor berikutnya Codex. Branch `claude/prd-v6-fase-4` dari `origin/main` **`f8ebba0`** (diverifikasi dengan `git fetch`; tanpa worktree). Laporan lengkap, kriteria → bukti, penafsiran, temuan, bukti Expo web/Android/iOS, dan hash kedua repo ada di repositori web `docs/phase-v6-4/README.md` (branch `claude/prd-v6-fase-4`, dari audit Fase 3 `1f2dbca`).

## Perubahan

- `src/api/keuangan.ts` — klien `/api/v1/v6/bsa/*` (akses, santri, tagihan, pembayaran, transaksi tabungan, mutasi, setoran transfer, tunggakan, rekonsiliasi, pratinjau/penerbitan, setoran, penarikan/belanja, verifikasi/tolak, koreksi, pembayaran tunai/transfer, bayar dari tabungan, verifikasi/batal pembayaran, revisi/batal tagihan). Setiap mutasi membawa kunci idempotensi dari `useMutationGuard`.
- `src/keuangan/forms.ts` — format rupiah tanpa `Intl`, nominal dikirim sebagai teks angka (validasi akhir milik server), alasan 5–500 karakter, sidik jari isi, label periode/jenis, penunjuk notifikasi dan tautan `alhasanapps://keuangan/{tagihan|pembayaran|tabungan}/{id}`.
- `src/app/keuangan/*` — pintu (petugas/admin/wali), santri & saldo, rincian santri, transaksi (setoran/penarikan/belanja), rincian tagihan, catat pembayaran, bayar dari tabungan (wajib centang), revisi/batal tagihan (konflik versi → "Muat versi terbaru"), kuitansi pembayaran (verifikasi/tolak/batal), kuitansi tabungan (koreksi), daftar pembayaran, mutasi, verifikasi transfer, tunggakan, rekonsiliasi, penerbitan massal (pratinjau → terbit).
- `src/app/keuangan/_layout.tsx` — perlindungan native `expo-screen-capture` (pola navigator kesehatan V5) sebelum layar keuangan dimuat; binary tanpa modul gagal tertutup. Dipertahankan atas keputusan Human Developer 26 Oktober 2026 (T-1).
- `src/components/keuangan-shared.tsx`, `keuangan-setoran.tsx` — halaman dengan penutup saat tidak aktif, lencana status, angka, penomoran, kotak centang aksesibel, kartu setoran transfer.
- `src/app/(app)/(home)/index.tsx`, `src/app/_layout.tsx`, `src/app/notifikasi/[id].tsx`, `src/notifications/notification-context.tsx`, `src/rapor/forms.ts`, `src/api/types.ts`, `src/components/app-icon.tsx`, `assets/images/icons/wallet*` — ubin Keuangan/Keuangan anak, rute, tombol notifikasi keuangan, penunjuk bertahan melewati login, ikon dompet (PNG ber-tint seperti ikon lain).
- `tests/keuangan.test.ts` — 7 uji unit baru.
- Tanpa dependensi atau modul native baru, tanpa perubahan SDK, `app.json`, `eas.json`, `package.json`.

## Hasil

| Pemeriksaan | Hasil |
| --- | --- |
| TypeScript `tsc --noEmit` (tipe rute dibuat ulang) | exit 0 |
| `expo lint` | exit 0, 0 peringatan |
| Unit (`node --experimental-strip-types --test tests/*.test.ts`) | 36/0 (29 lama + 7 baru) |
| Expo web + API/DB nyata, Android emulator, iOS simulator | lihat repositori web `docs/phase-v6-4/` |

Salinan kerja berisi perubahan `package.json`/`package-lock.json` milik pekerjaan lain (Expo 57.0.15 → 57.0.31, dst.) yang **tidak di-commit**; `node_modules` terpasang mengikuti versi itu, sehingga seluruh uji aplikasi berjalan di atas paket 57.0.31 sedangkan `package.json` ter-commit tetap 57.0.15. Batas lain (perangkat fisik, Push nyata, cold start non-dev, iOS) dicatat di repositori web.
