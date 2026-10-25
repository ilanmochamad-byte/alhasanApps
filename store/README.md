# Aset toko — Al Hasan Apps

Mockup tampilan aplikasi untuk kelengkapan listing **Google Play Console** dan
**App Store Connect**. Semua berkas PNG 24-bit **tanpa kanal alfa** (syarat kedua toko)
dan sudah berada pada ukuran piksel persis yang diminta — tinggal unggah, tanpa
perlu diubah ukurannya.

Dibuat dari UI V2 (`redesign/ui-v2`, sudah di `main`): token warna, tipografi, radius,
ikon, dan susunan tiap layar diambil langsung dari kode di `src/app/(app)/` dan
`src/components/`. Diperbarui 6 September 2026.

---

## Google Play Console

Ketiga slot screenshot di Play **wajib rasio 16:9 atau 9:16**. Aplikasi ini dikunci
`orientation: portrait` di `app.json`, jadi semuanya dibuat 9:16 potret.

| Folder | Ukuran | Slot di Play Console |
|---|---|---|
| `playstore-phone/` | 1080 × 1920 (9:16) | Screenshot telepon |
| `playstore-tablet-7/` | 1080 × 1920 (9:16) | Screenshot tablet 7 inci |
| `playstore-tablet-10/` | 1440 × 2560 (9:16) | Screenshot tablet 10 inci |
| `playstore-listing/` | 1024 × 500 | Feature graphic |

Masing-masing berisi lima layar: Beranda, Jadwal, Perizinan, Laporan, Profil.
Play meminta minimal 2 per slot dan maksimal 8; lima ini juga melewati ambang
"minimal 4 screenshot pada resolusi ≥ 1080 px" yang jadi syarat kelayakan
rekomendasi. Slot 10 inci menuntut tiap sisi **1080–7680 px** (bukan 320–3840
seperti dua slot lainnya), sebab itu ukurannya dinaikkan ke 1440 × 2560.

Isi slot tablet memakai render tablet yang sebenarnya — kolom isi maksimal 760 pt
di tengah layar 1024 pt, persis seperti aplikasi pada layar lebar — bukan
screenshot ponsel yang direntangkan.

Unggah di: *Grow → Store presence → Main store listing*.
Teks deskripsi singkat dan lengkap ada di `listing-teks-play-store.md`.

---

## App Store Connect

| Folder | Ukuran | Slot |
|---|---|---|
| `appstore-iphone-6.9/` | 1320 × 2868 | iPhone layar 6,9" |
| `appstore-ipad-13/` | 2064 × 2752 | iPad layar 13" |

Set 6,9" menjadi sumber penskalaan untuk ukuran iPhone lain, jadi set 6,5" terpisah
tidak diperlukan. Set iPad **wajib** karena `app.json` menyetel
`ios.supportsTablet: true`; kalau iPad tidak jadi didukung, matikan opsi itu dulu.

**Berkas iPad tidak bisa dipakai untuk slot tablet Play.** Rasionya 3:4 — itu
rasio layar iPad yang sebenarnya dan diterima Apple, tetapi Play hanya menerima
16:9 atau 9:16. Itulah gunanya folder `playstore-tablet-7/` dan
`playstore-tablet-10/`.

### Header halaman produk dan hasil pencarian

| Folder | Berkas | Ukuran | Slot |
|---|---|---|---|
| `appstore-header-search/` | `header-3840x1646.png` | 3840 × 1646 (21:9) | Product page header |
| `appstore-header-search/` | `search-results-3840x2560.png` | 3840 × 2560 (3:2) | Search results |

Dibuat 25 Oktober 2026 mengikuti
[App Store asset best practices](https://developer.apple.com/app-store/asset-best-practices/)
dan [Creative assets specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications):
PNG RGB tanpa alfa, satu ide yang jelas, titik fokus di tengah, teks pendek
berbahasa Indonesia, tanpa harga/URL/©/logo platform lain/klaim penghargaan, layak 4+.
Apple tidak menyebut safe area dalam angka — periksa potongannya dengan tombol
**Preview** di App Store Connect sebelum dikirim.

Berbeda dari screenshot di atas (mockup UI V2, 6 September 2026), ketiga layar di
kedua gambar ini adalah **tangkapan aplikasi asli** sesudah redesain tampilan
14–15 Oktober 2026 — Beranda guru, Jadwal, dan ringkasan Kesehatan anak — dari
bundel Expo web commit `44ae015` yang tersambung ke API dan DB sandbox lokal.
Navigasi atas khusus web dipotong; bilah tab bawah iPhone tidak ditambahkan
secara buatan. Seluruh nama orang fiktif (lihat `_source/header-search/sandbox/`).

---

## `_source/` — Berkas sumber

`screen.html` (kelima layar, dibangun ulang dari kode; ikon dan logo sudah tertanam
sebagai data URI), `frame.html` (bingkai perangkat potret + kapsi), `feature.html`,
dan tiga skrip Playwright. Ubah teks/kapsinya lalu jalankan:

```bash
npm install @fontsource/inter playwright
node render-screens.js      # layar mentah (ponsel + tablet) → build/
node render-store.js        # iPhone, iPad, dan ponsel Play → out/
node render-play-tablet.js  # tablet 7" dan 10" Play → out/
```

Setelah render, ubah semua PNG ke RGB tanpa alfa sebelum diunggah:

```python
from PIL import Image
import glob
for f in glob.glob('out/*/*.png'):
    im = Image.open(f)
    if im.mode != 'RGB':
        bg = Image.new('RGB', im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        bg.save(f, 'PNG', optimize=True)
```

### Header dan hasil pencarian App Store

`header-search.html` menyusun kedua gambar dari tiga tangkapan di `header-search/`
(`layar-beranda.png`, `layar-jadwal.png`, `layar-kesehatan.png`), logo
`assets/images/Logo_alhasanApps_dark.png`, dan huruf Plus Jakarta Sans dari
`node_modules` akar repo (jalankan `npm install` di akar dulu). Ubah teks lalu:

```bash
node render-header-search.js   # → out/appstore-header-search/
```

Halaman tanpa transparansi, jadi PNG-nya sudah RGB tanpa alfa; periksa dengan
`sips -g hasAlpha out/appstore-header-search/*.png`.

Untuk menangkap ulang layar dari aplikasi asli (misalnya setelah UI berubah):

1. Di repo WebAlHasan, bangun DB sandbox lalu ganti nama orang dan isi data demo:

   ```bash
   V5F5_DB=test_store_aset_test bash tests/v5_phase5_db.sh
   WEB_REPO=$PWD DB_NAME=test_store_aset_test php /path/ke/alhasanApps/store/_source/header-search/sandbox/anonim.php
   WEB_REPO=$PWD DB_NAME=test_store_aset_test php /path/ke/alhasanApps/store/_source/header-search/sandbox/demo_seed.php
   ```

   `anonim.php` wajib: DB sandbox diturunkan dari salinan DB pengembangan yang
   bisa memuat nama asli. `demo_seed.php` membuat kunjungan klinik dan ringkasan
   wali lewat layanan aplikasi, bukan INSERT langsung.

2. Ekspor bundel web dari salinan kerja **tanpa** `.env*` (`.env.local` berisi API
   produksi dan tetap ikut terbundel), lalu pastikan bundel tidak memuat host produksi:

   ```bash
   EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8957/api/v1 npx expo export -p web --clear
   grep -rl alhasan.co.id dist   # harus kosong
   ```

3. Sajikan bundel dan API pada satu origin dari repo WebAlHasan, lalu tangkap:

   ```bash
   DB_NAME=test_store_aset_test php -S 127.0.0.1:8957 -t /path/ke/salinan/dist tests/phase5_web_router.php
   SANDBOX_PASSWORD=... node capture-header-search.js sbx_murobi_a "/,/schedules" murobi
   SANDBOX_PASSWORD=... node capture-header-search.js sbx_v5_wali_1 "/kesehatan/wali,klik:Ahmad Fauzi" wali
   ```

   Sandi akun sandbox ada di seed WebAlHasan (`tests/v5_phase1_seed.php`). Skrip
   hanya menerima `127.0.0.1` dan memblokir permintaan ke host lain. Hasilnya di
   `header-search/layar/`; salin yang dipakai ke `header-search/layar-*.png`.
   Layar Beranda dan Jadwal digeser 56 pt di `header-search.html` untuk membuang
   navigasi atas khusus web.

---

## Yang masih perlu disiapkan sendiri

Aset di sini hanya bagian gambar. Untuk lolos peninjauan, berikut yang belum tercakup:

**Google Play Console**

- Ikon aplikasi `512 × 512` PNG 32-bit (boleh beralfa), maks 1 MB — bisa diturunkan
  dari `assets/images/android-icon-foreground.png` + latar `#FFFFFF`.
- URL kebijakan privasi yang bisa diakses publik.
- Formulir **Data safety** — aplikasi mengirim token push (expo-notifications) dan
  menyimpan token sesi di `expo-secure-store`; keduanya harus dideklarasikan.
- Content rating, target audience, dan pernyataan iklan.

**App Store Connect**

- Ikon `1024 × 1024` tanpa alfa — sudah ada di `assets/images/ios-icon-default.png`.
- Subtitle maks 30 karakter (deskripsi lengkap boleh memakai teks Play).
- Nutrition label privasi (App Privacy), termasuk pengumpulan token push.
- `ITSAppUsesNonExemptEncryption: false` sudah diset di `app.json` — aman.
- `aps-environment` di arsip distribusi harus menjadi `production`; nilai `development`
  di sumber memang sengaja, Xcode/profil provisioning yang menggantinya.
- Akun demo untuk peninjau (username, sandi, dan cakupan peran) — aplikasi ini
  mewajibkan login, jadi tanpa akun demo App Review akan menolak.

---

## Catatan kejujuran isi

Data pada mockup (nama santri, jadwal, angka rekap) adalah contoh, bukan data nyata,
dan susunannya sama persis dengan tampilan aplikasi. Kedua toko mensyaratkan
screenshot mewakili aplikasi sungguhan — jadi sebelum unggah, pastikan build yang
dirilis masih memakai UI V2 ini. Kalau ada layar yang berubah, render ulang dari
`_source/` supaya gambar tidak mendahului aplikasinya.

**Per 25 Oktober 2026 mockup UI V2 sudah tertinggal.** Redesain tampilan 14–15
Oktober mengganti Beranda menjadi menu ubin dengan bilah 4 tab (mockup masih 5 tab),
dan modul pembinaan, rapor, serta kesehatan belum ada di mockup. Screenshot iPhone,
iPad, dan Play di atas perlu dibuat ulang sebelum dikirim; gambar header dan hasil
pencarian sudah memakai tangkapan UI terbaru.
