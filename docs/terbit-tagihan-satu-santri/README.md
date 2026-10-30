# "Terbitkan tagihan" satu santri dari tarif

**Status (30 Oktober 2026):** diimplementasikan Claude Code atas permintaan Human Developer ("Ya, tambahkan"), **menunggu audit independen Codex**. Belum merge, belum rilis aplikasi. Branch `claude/terbit-tagihan-satu-santri` dari `origin/main` `92caea4`, tanpa worktree.

Petugas BSA kini dapat menerbitkan tagihan bulanan untuk satu santri dari rincian santri: **Terbitkan tagihan** → periode/jatuh tempo → **Tampilkan tagihan** (rincian dari tarif unit ± penyesuaian) → **Terbitkan tagihan Rp…** → rincian tagihan baru. Nominal, hak, dan satu tagihan per santri–bulan diputuskan server. Isian komponen manual dan tarif tetap di website.

Memerlukan server dengan perbaikan web PR #100 (`santri_id` pada pratinjau/penerbitan). Pada server lama layar menolak penerbitan (`pratinjauSatuSantriSah`), sehingga tidak pernah menerbitkan seluruh unit.

Berkas: `src/app/keuangan/terbit-santri.tsx` (baru), `src/app/keuangan/santri/[id].tsx`, `src/app/keuangan/_layout.tsx`, `src/api/keuangan.ts`, `src/keuangan/forms.ts`, `tests/keuangan.test.ts`. Paket tidak berubah; perubahan `package.json`/`package-lock.json` milik pekerjaan lain tidak di-commit.

Bukti di repo ini (`bukti/`): tsc exit 0, lint exit 0, unit 43/0 (paket ter-commit Expo 57.0.15). Uji Expo web 27/0, kontrol penjaga dimatikan 15/1, regresi aplikasi V6 Fase 4 45/0 dan Fase 5 20/0, penafsiran Q-1…Q-4, dan batas di repo WebAlHasan `docs/terbit-tagihan-satu-santri-app/README.md`. Perangkat native, perangkat fisik, Push, MySQL/cPanel belum diuji.
