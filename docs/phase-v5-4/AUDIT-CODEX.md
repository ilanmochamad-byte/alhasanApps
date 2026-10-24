# Audit independen Codex — V5 Fase 4 mobile

**24 Oktober 2026 · BELUM LULUS seluruh kriteria.** Audit atas seluruh commit `38e1850` di atas baseline V4 `ee6621a` pada `claude/prd-v5-fase-4`. Baseline dipilih Human Developer; `main` mobile `7ac224e` belum memuat audit V4. Claude dikonfirmasi idle. Tidak merge, mengirim rilis, atau memulai Fase 5.

Laporan lengkap, pengujian web/API/aplikasi dan batas perangkat berada di repo **WebAlHasan**, `docs/phase-v5-4/AUDIT-CODEX.md` pada branch dengan nama sama. Bukti auditor server/aplikasi disimpan di `docs/phase-v5-4/bukti/audit-codex/` repo web, terpisah dari hasil implementator.

## Koreksi

- **P1 — draf melewati latar mengadopsi versi baru.** Draf lama versi 1 dapat dikirim dengan versi 2 setelah petugas lain mengoreksi di latar, sehingga perubahan petugas lain tertimpa dengan respons 200. Formulir koreksi, hasil rujukan dan ringkasan/penarikan kini mempertahankan versi/revisi asal sampai dibersihkan bersama draf. Revalidasi akses tetap dilakukan. Probe final yang sama pada kode implementator **10/8**, pada koreksi **19/0** (satu asersi reload hanya dapat dijalankan sesudah 409 ditolak dengan benar).
- **P2 — cuplikan pengalih Android memuat nama dan isi kesehatan.** Direproduksi auditor. Tambah `expo-screen-capture ~57.0.4`, lockfile aditif, gate navigator kesehatan sebelum anak layar/fetch dimuat, dan perlindungan selama navigator masih terpasang. Android `FLAG_SECURE`; iOS juga meminta proteksi pengalih. Jika modul/perlindungan gagal, informasi tidak dimuat. Gate tidak berlaku pada navigator modul lain. **Build native baru wajib**; ini bukan perubahan JS yang dapat diandalkan pada binary lama. Tidak ada perubahan SDK, app version, `app.json`, EAS, atau penyimpanan klinis offline.

## Bukti dan batas

- TypeScript, lint: exit 0; unit **28/0** termasuk regresi penunjuk V4. `mobile-*-audit.txt`.
- Expo web + API/DB nyata seluruh peran: **79/0**; probe independen latar/pencabutan **19/0**. Kesetaraan web/API/aplikasi, duplikasi, konflik dan peran diuji pada fixture lokal, bukan produksi.
- Ekspor Hermes iOS/Android berhasil. Ini bukan bukti build native atau runtime iOS.
- Android **emulator** Medium_Phone Android 16: binary Debug dibangun ulang, dipasang lokal, alur mutasi dan sesi diuji ulang; cuplikan pengalih sesudah koreksi kosong. Hasil akhir: petugas **5/0**, sesi/wali/log/cache **13/0**, lima peran/revokasi/proteksi **10/0**. Pemeriksaan kontrak HTTP V4 termasuk hash PDF **12/0**. Hasil terperinci ada di laporan web.
- iOS **simulator** iPhone 17 Pro iOS 26.2: binary lama memuat layar masuk. Build binary baru gagal pada ketidakcocokan Swift precompiled lalu interface JSI/linker React Native; percobaan dari source dan cache JSI bersih dicatat. Runner login juga mempunyai batas keyboard. **Runtime kesehatan terbaru belum lulus**; jangan memakai hasil iOS implementator pada binary lama sebagai bukti versi ini.
- **Perangkat fisik tidak diuji. Ketukan Push provider Expo/FCM/APNs foreground/background/cold start tidak diuji. Cold start non-dev belum terbukti.** URI/InApp dan parser unit tidak menggantikan bukti itu.

Pemakaian `node_modules` symlink di salinan uji menyebabkan impor dinamis Metro salah-resolusi; diganti salinan APFS lokal. Diagnostik sementara tidak masuk sumber repo. Seluruh uji aplikasi memakai salinan tanpa `.env.local` dan API localhost/DB sintetis. Tidak ada request provider atau izin membuka produksi.

**Handoff tetap Fase 4:** lengkapi build/runtime iOS yang memuat modul privasi, ketukan notifikasi/login ulang/pencabutan/cold start pada build yang sesuai, dan log/cache perangkat yang benar-benar diuji sebelum audit penutupan. Fase 5 belum diizinkan.
