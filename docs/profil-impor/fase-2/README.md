# Profil pengguna aplikasi — Fase 2 (kartu Beranda, Profil, Edit Profil, foto, Ganti Password)

**Status audit 4 November 2026:** lulus teknis setelah koreksi. Hasil independen dan gerbang rilis ada di [Audit Codex](AUDIT-CODEX.md). Catatan implementator di bawah dipertahankan sebagai riwayat.

Implementator **Claude Code**, auditor berikutnya **Codex** (`AGENTS.md` repo web, workstream "Profil pengguna aplikasi dan impor guru/pengurus"). Sumber kebutuhan: `PRD-PROFIL-IMPORT.md` §6 Fase 2 (repo WebAlHasan). Kontrak API: `docs/profil-impor/fase-1/README.md` dan audit `docs/profil-impor/fase-1/AUDIT-CODEX.md` (repo web).

- **Mobile** `claude/profil-impor-fase-2` dari `origin/main` `b9a4e10` (memuat audit kelas gabungan Fase 2 `ec6cdf6` + versi 1.0.1). Tanpa worktree; tidak menulis di `main`.
- **Web** `claude/profil-impor-fase-2` dari `origin/main` `18539cd` (PR #113, memuat audit Fase 1 `c4647be`; `git diff` kosong) **hanya uji dan dokumen**. Kode aplikasi web, API, dan migrasi tidak berubah: tidak ada perbaikan server yang diselipkan.
- Tidak ada merge, deploy, migrasi produksi, atau rilis aplikasi.

## Ringkasan perubahan aplikasi

| Bagian | Isi |
| --- | --- |
| Kartu identitas Beranda (`src/components/profil-shared.tsx`, `(home)/index.tsx`) | Anak **pertama** wadah isi Beranda di bawah area aman: tanggal + lonceng, foto atau inisial, "Assalamu'alaikum", nama lengkap utuh (tanpa elipsis), chip seluruh `status` server, satu baris per `binaan` ("Murobi · Kamar …", "Pembimbing · Kelas …"). Ketuk → tab Profil. Teks sistem > 1,35×: avatar di atas nama. Sapaan lama dipindah ke dalam kartu. |
| Sumber data tunggal (`src/profil/profil-context.tsx`) | `ProfilProvider` memuat `GET /profile/pribadi` untuk akun yang masuk; dimuat ulang saat Beranda/Profil difokuskan, saat kembali ke latar depan, dan setelah mutasi (`terapkan`). Respons akun lain/usang diabaikan; data dibuang saat keluar/sesi wajib ganti password. 404/503 → `tidak_tersedia` (server lama). Foto dimuat dari `GET /profile/foto` berbearer menjadi `data:` URI, `expo-image` `cachePolicy="none"`. |
| Tab Profil (`(profil)/profil.tsx`) | Kepala hijau dengan foto/inisial, `@username`, chip status; tombol **Edit profil**; **Data diri** (NIP/NIK bila ada, tempat-tanggal lahir, alamat satu baris, HP, email; kosong = "Belum diisi"); **Rincian penugasan aktif** per jenis (target kamar/kelas, mapel–kelas, jenjang/gelombang, tahun ajaran; "(sebagai pengurus)" untuk identitas pengurus milik guru); **Mata pelajaran & kelas** dikelompokkan per mapel dari `mengajar`; baris **Ganti password**. Bagian Fase 4 "Identitas & penugasan" tetap. Semua hanya baca. |
| Edit Profil (`src/app/akun/edit-profil.tsx`) | Seluruh isian `dapat_diubah` (nama, tempat/tanggal lahir, alamat rumah, kelurahan, kecamatan, kabupaten, provinsi, HP, email). Username, NIP/NIK dalam blok "Diatur admin (hanya baca)". Kirim **hanya kunci yang berubah** + `versi`; validasi awal selaras server; galat 422/409 per isian; 409 versi → "Muat data terbaru (draf dibuang)". Berhasil → Profil & kartu langsung memakai respons server. |
| Foto | `expo-image-picker` `launchImageLibraryAsync` (Android Photo Picker / PHPicker iOS) dengan potong persegi; JPEG/PNG/WebP ≤ 2 MiB diperiksa lebih dulu; unggah multipart; ganti/hapus (konfirmasi). Pesan foto tampil di panel foto. Salinan lokal pemilih/pemotong dihapus setelah dikirim. |
| Ganti Password (`src/components/ganti-password-form.tsx`, `akun/ganti-password.tsx`) | Password saat ini, baru, ulangan; aturan website (12+, besar, kecil, angka, ≤ 72 byte, tanpa NUL) diperiksa awal, server penentu. Mengirim `device_id` instalasi (PF-11). Password hanya di state komponen, dikosongkan saat berhasil. |
| Password sementara (PI-1, `ganti-password-wajib.tsx`, `auth-context.tsx`, `client.ts`) | Login mengirim `izinkan_password_sementara: true`. Token terbatas → navigator hanya berisi layar "Ganti password sementara" (+ Keluar). Pemulihan sesi atau respons 403 `PASSWORD_CHANGE_REQUIRED` dari endpoint mana pun (PF-1: admin mereset saat sesi berjalan) memindahkan sesi ke layar itu tanpa membuang token. Setelah berhasil, `/profile` penuh dimuat dan menu tampil. |
| Klien API (`src/api/client.ts`, `src/api/profil.ts`, `src/api/types.ts`) | Tipe kontrak Fase 1; `requestMultipart` lewat `XMLHttpRequest` (lihat T-1), `requestImage` hanya menerima `image/jpeg|png|webp`. Tidak ada parameter pemilik pada endpoint mana pun. |
| Pembantu murni (`src/profil/format.ts`, uji `tests/profil.test.ts`) | Draf/perubahan, validasi awal, aturan password, label status/binaan, kelompok mapel–kelas, rincian penugasan, alamat, jenis/ukuran foto, base64. |

### Dependensi dan izin (keputusan implementator, menunggu tinjauan auditor)

- **Ditambahkan `expo-image-picker ~57.0.20`** (versi `npx expo install` untuk Expo 57.0.15 lock ter-commit; ikut `expo-image-loader 57.0.1`). Butuh **binary native baru** (Android dan iOS).
- `app.json`: plugin `expo-image-picker` dengan `photosPermission/cameraPermission/microphonePermission: false`; `android.blockedPermissions` untuk `READ/WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES/VIDEO/VISUAL_USER_SELECTED` (kamera dan mikrofon diblokir plugin). APK Debug baru: **tidak ada** izin media, penyimpanan, kamera, atau mikrofon (`bukti/android-izin-apk.txt`); Info.plist iOS Release tanpa kunci izin foto/kamera/mikrofon. Pemilih sistem menyatakan "alhasanApps will only have access to the photos you select".
- **Berkas paket salinan kerja milik pekerjaan lain:** `package.json`/`package-lock.json` di salinan kerja sudah berisi kenaikan versi Expo yang belum di-commit. Commit ini memuat **HEAD + `expo-image-picker` saja** (dibentuk dari salinan bersih). Pada salinan kerja ditambahkan satu baris `expo-image-picker` di `package.json` dan dua entri lock (`npm install --package-lock-only`) agar perubahan lain itu tidak tampak menghapus dependensi baru; selain itu tidak disentuh (cadangan sebelum perubahan disimpan implementator di luar repo).

## Penafsiran implementator (PF2-*, menunggu tinjauan auditor)

- **PF2-1** Kartu = anak pertama wadah isi Beranda; tanggal dan lonceng dipindah ke dalam kartu agar tidak ada isi di atasnya. Lonceng di luar area tekan kartu (tanpa tombol bersarang).
- **PF2-2** Kartu menampilkan status dan target binaan; mapel–kelas hanya di Profil (kartu tetap ringkas untuk Guru Mapel dengan banyak pasangan).
- **PF2-3** Server lama (404) atau 035 belum dipasang (503): kartu memakai nama dan role sesi; Edit Profil/Ganti Password tidak ditawarkan; Profil tampilan Fase 4.
- **PF2-4** Data profil sendiri tidak disembunyikan saat aplikasi ke latar (berbeda dengan modul kesehatan/keuangan yang berpelindung layar); dimuat ulang saat aktif kembali agar penugasan yang dicabut hilang.
- **PF2-5** Simpan Edit Profil hanya mengirim kunci yang berubah (dikosongkan = `''`); tombol nonaktif tanpa perubahan. Ganti foto menaikkan `versi`; draf teks dipertahankan dan versinya diperbarui hanya bila isian server tidak berubah.
- **PF2-6** Edit Profil menawarkan "Kosongkan tanggal lahir" karena pemilih tanggal native tidak bisa mengosongkan.
- **PF2-7** Pemotong persegi `allowsEditing` (kualitas 0,8) dipakai agar foto kecil dan rapi untuk avatar; foto tetap dari pemilih sistem.
- **PF2-8** Lupa password di layar Ganti Password mengarahkan ke admin (PRD §4).

## Temuan selama implementasi (sudah dikoreksi pada commit ini)

- **T-1** Unggah foto native gagal "offline": `fetch` global Expo tidak mengirim berkas `{uri,name,type}` dalam FormData. Diganti `XMLHttpRequest` (Android emulator dan iOS lulus; web tetap `File`).
- **T-2** Pesan hasil foto tampil di dasar formulir di luar layar; dipindah ke panel foto.
- **T-3** Salinan foto hasil pemilih/pemotong tertinggal di cache aplikasi setelah unggah dan keluar; kini dihapus dan folder cache `ImagePicker` disapu setelah setiap unggahan (Android `cache/ImagePicker` 0 berkas, iOS `Library/Caches/ImagePicker` 0 berkas). Salinan sementara PHPicker di `tmp/` iOS dikelola OS.

## Hasil uji implementator (`bukti/`)

Lingkungan: PHP 8.4.14, MariaDB 12.3.2 lokal, DB `test_pif2_app_test` (rantai `tests/profil_impor_f1_db.sh` + `tests/profil_impor_f2_app_seed.php`, data sintetis), salinan aplikasi tanpa `.env*` dengan lock ter-commit (Expo 57.0.15) + `expo-image-picker`. Skrip uji ada di repo web `tests/browser/uji-profil-impor-f2-app.mjs` dan `uji-profil-impor-f2-android.mjs`.

| Uji | Jenis build / perangkat | Hasil | Cakupan |
| --- | --- | --- | --- |
| TypeScript `tsc --noEmit`, `expo lint` | — | exit 0 · exit 0 | `mobile-tsc-lint.txt` |
| Unit `node --test tests/*.test.ts` | — | **64/0** (53 lama + 11 baru) | `mobile-unit.txt` |
| Expo **web** (Chromium 375 px) | dev server Metro | **102/0** | `aplikasi-expo-web.txt`: kartu = isi pertama untuk Admin, Guru/Murobi, Pengurus/Pembimbing, Orang Tua, banyak tugas (nama 83 karakter), Guru Mapel; status/target = API; Kamar vs Kelas; tanpa kamar rekaan; inisial; 7 pasangan mapel–kelas per mapel; edit setiap isian → Profil & kartu tanpa masuk ulang, DB pengurus+akun sinkron, satu audit; HP salah lokal; 409 email akun lain; 409 versi basi + muat terbaru; GIF/>2 MB ditolak di klien, PNG/JPEG unggah/ganti, foto data berotorisasi, foto akun lain 404, tulis username/role 422, hapus → inisial; password lemah/beda tanpa permintaan, salah ditolak, berhasil → token lain 401, password lama tidak berlaku, sesi ini tetap; password sementara → hanya layar ganti, token `ganti_password` → `penuh`; PF-1 reset saat sesi berjalan → layar ganti; pencabutan Murobi → hilang dari kartu/Profil; offline; server lama 404; sesi kedaluwarsa → login; 0 permintaan luar, password tidak di penyimpanan/konsol |
| **Android emulator** Medium_Phone API 36 (Android 16) | APK **Debug dev client baru** (prebuild + `assembleDebug` arm64) + Metro | **25/0** | `android-emulator.txt`: kartu paling atas, nama panjang + empat status + Kelas/Kamar pada teks **1,0× dan 2,0×**; Android Photo Picker sistem tanpa dialog izin; pemotong; unggah; cache pemilih 0 berkas; ubah isian tampil tanpa masuk ulang; paket tanpa izin media/penyimpanan/kamera; foto di kartu; password salah ditolak, berhasil; password sementara → layar khusus → Beranda; logcat tanpa password/bearer |
| **iOS simulator** iPhone 17 Pro iOS 26.2 | **Release arm64 baru** (ad-hoc lokal, empat build; bukti akhir build ke-4) | lulus (manual) | `ios-simulator.txt`: startup Release baru tanpa crash, kartu, Profil, PHPicker tanpa dialog izin, unggah/ganti foto + cache kosong, edit isian, Dynamic Type AX-XL, keluar, password sementara + PI-2, sesi kedaluwarsa, kontainer & log tanpa password/bearer |
| Regresi aplikasi (Expo web) | dev server Metro | Keamanan F4 **46/0** · kelas gabungan F2 **57/0** | `regresi/`; identik dengan hasil audit sebelumnya |
| Kontrol baseline | kode mobile `origin/main` `b9a4e10` + uji baru | **0/1** (gagal) | `kontrol-baseline-web.txt`: kode lama tanpa kartu identitas, uji berhenti pada B-A |

Semua dijalankan di emulator/simulator lokal dengan data sintetis; **bukan perangkat fisik**.

## Batas pengujian

- **Perangkat fisik Android/iOS, build distribusi (AAB/IPA/TestFlight), iOS Debug/dev client, dan Push nyata belum diuji.** iOS dijalankan manual lewat alat simulator (injeksi teks tidak andal; isian lewat papan klip), bukan skrip yang dapat diulang.
- Teks sangat besar: Android `font_scale` 2,0 dan iOS `accessibility-extra-large`; perubahan ukuran teks iOS saat aplikasi berjalan menyisakan tata letak lama sampai aplikasi dibuka ulang (perilaku React Native).
- Web: bilah tab web akun guru/admin meluap 33 px sejak baseline (TF4-1 penugasan Keamanan Fase 4); isi layar baru tidak meluap.
- Server: MariaDB 12.3.2 lokal; MariaDB 10.6.28 produksi, MySQL/cPanel, migrasi 035 produksi dan UAT tidak diuji. Fixture `sbx_sandi_wajib` tidak bisa masuk aplikasi (guru tanpa data master); password sementara diuji pada `sbx_murobi_c`.
- Gerbang produksi terdahulu (V5/V6/V7, kelas gabungan) tidak berubah.

## Handoff audit Codex

Periksa kriteria penerimaan PRD Fase 2, PF2-1…PF2-8, keputusan dependensi `expo-image-picker` + konfigurasi izin, T-1…T-3, perlakuan berkas paket salinan kerja, serta batas di atas. Ulangi Expo web, Android, dan iOS dengan build baru (modul native baru). Jangan merge, deploy, atau merilis aplikasi.
