# Optimasi Android Google Play — satu tahap

Keputusan Human Developer 21 November 2026: **Claude Code mengimplementasikan GP-1 DEX/R8 dan GP-2 API tampilan dalam satu paket; Codex mengaudit secara independen sesudah handoff.** Tidak berjalan bersamaan pada checkout yang sama.

Sumber kebenaran lengkap di repo WebAlHasan:

- [Rencana dan kriteria K-1…K-7](../../../Documents/GitHub/webalhasan/WebAlHasan/docs/optimasi-android-play/rencana.md) — path repo web: `docs/optimasi-android-play/rencana.md`.
- [Prompt implementasi dan audit](../../../Documents/GitHub/webalhasan/WebAlHasan/docs/optimasi-android-play/prompts-implementasi-audit.md).

Baseline main saat persiapan: mobile `84ddebbbdedc022dae42f323cd37ae9fcc471cc2` (1.9.0), web `37e67ef652ab598644fb2c7314b079d4c34abd48`. Branch dokumen kedua repo `codex/rencana-optimasi-android-play`; branch implementasi/audit `claude/optimasi-android-play`. Fetch dan verifikasi ulang saat mulai. Jika branch dokumen belum digabung, gunakan sebagai dasar fitur; bila sudah, gunakan main yang memuat dokumen. Tidak implementasi di main dan tidak worktree.

Perubahan lokal `package.json`/`package-lock.json` milik pekerjaan lain harus dipertahankan, tidak dicampurkan atau dipakai diam-diam sebagai bukti sumber build. Paket ini dapat menambah plugin build/patch dependensi yang benar-benar diperlukan, terpisah dari edit tersebut. Versi patch naik tepat sekali saat implementasi (1.9.1 bila main masih 1.9.0), nomor build diurus EAS.

Status persiapan: **dokumen saja**. Belum ada implementasi R8/API, build, audit binary atau unggahan Play. Hasil berikutnya harus membedakan audit teknis lokal dari konfirmasi Play/fisik/Push serta keputusan produksi Human Developer. Laporan lengkap berikutnya di web; ringkasan aktual ditambahkan di direktori ini.
