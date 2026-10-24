# PRD V5 Fase 4 — aplikasi (kesehatan santri)

24 Oktober 2026. Implementator Claude Code; auditor berikutnya Codex. Branch `claude/prd-v5-fase-4` dari **`ee6621a`** (audit V4 Fase 5) atas keputusan Human Developer: `origin/main` `7ac224e` belum memuat commit audit itu dan V4 belum dirilis. Laporan lengkap, kriteria → bukti, temuan T-1/T-2, penafsiran, dan bukti Expo web/Android/iOS ada di repositori web `docs/phase-v5-4/README.md` (branch `claude/prd-v5-fase-4`).

## Perubahan

- `src/api/kesehatan.ts` — klien `/api/v1/v5/kesehatan/*` (akses, pemilih santri per kelas, kunjungan, koreksi, hasil rujukan, versi, riwayat akses, ringkasan internal/pratinjau/terbit/tarik, wali, penugasan admin).
- `src/kesehatan/forms.ts` — bentuk kiriman (keadaan lengkap koreksi, baris baru kosong diabaikan, waktu asli dipertahankan), alasan wajib, label perubahan versi, tautan `alhasanapps://kesehatan/wali/{id}`, pengelompokan kelas.
- `src/app/kesehatan/*` — hub, daftar + penyaring, catat/koreksi/draf, detail, hasil rujukan, riwayat versi, riwayat akses (admin), ringkasan wali (petugas/admin/pembaca), penugasan (admin), wali daftar/detail.
- `src/components/kesehatan-shared.tsx` — halaman dengan penutup saat tidak aktif, proyeksi wali yang sama untuk pratinjau/internal/wali, ubin Beranda.
- `src/notifications/notification-context.tsx`, `src/rapor/forms.ts` — tujuan `kesehatan_ringkasan` (penunjuk bertahan melewati 401/login seperti rapor), tautan skema kesehatan.
- `src/app/(app)/(home)/index.tsx`, `src/app/_layout.tsx`, `src/app/notifikasi/[id].tsx`, `src/api/types.ts` — ubin, rute, tombol notifikasi, `tautan.ringkasan_id`.
- Tanpa dependensi/modul native baru, tanpa perubahan SDK, `app.json`, atau `eas.json`.

## Hasil

| Pemeriksaan | Hasil | Berkas |
| --- | --- | --- |
| TypeScript `tsc --noEmit` | exit 0 | `mobile-tsc.txt` |
| `expo lint` | exit 0 | `mobile-lint.txt` |
| Unit (`node --test tests/*.test.ts`) | 28/0 (21 lama + 7 baru di `tests/kesehatan.test.ts`) | `mobile-unit.txt` |
| Ekspor bundel Hermes iOS + Android | exit 0, 0 kemunculan host produksi | `native-bundles.txt` |
| Expo web + API/DB nyata, Android emulator, iOS simulator | lihat repositori web | `docs/phase-v5-4/bukti/` (web) |

Batas: tanpa perangkat fisik, tanpa Push nyata, cold start dari tautan pada dev client membuka peluncur (perlu build preview/rilis), dan cuplikan pengalih aplikasi Android masih memuat isi (T-1, menunggu keputusan `FLAG_SECURE`). Tidak ada rilis aplikasi.
