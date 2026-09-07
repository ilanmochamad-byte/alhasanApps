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
