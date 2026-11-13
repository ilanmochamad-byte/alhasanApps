# Tindak lanjut audit redesain tampilan gelombang 2 — ringkasan aplikasi

13 November 2026 · Branch `claude/tindak-lanjut-redesain-v2` · versi **1.8.0 → 1.9.0**

Laporan lengkap, bukti, dan batas ada di repositori WebAlHasan pada lokasi yang
sama: `docs/redesain-tampilan-v2/tindak-lanjut/README.md`.

**Pekerjaan ini tanpa auditor independen** (keputusan Human Developer 13 November
2026, khusus pekerjaan ini); isinya pemeriksaan mandiri implementator.

## Yang berubah di aplikasi

Hanya tampilan dan navigasi. Endpoint, parameter, payload, hak akses,
kerahasiaan, idempotensi, versi optimistik, dan `expo-screen-capture` tidak
berubah; dibuktikan paritas jaringan 180 langkah sama / 0 berbeda dari 905
permintaan terhadap baseline 1.8.0. Tanpa dependensi atau modul native baru;
manifest dan lockfile ter-commit sama dengan baseline.

- **Akun dan Beranda** — sapaan "Assalamu'alaikum" di layar Masuk; ubah/hapus
  foto profil lewat lembar bawah; Profil memisahkan kelompok Akun dan
  Pemberitahuan dengan halaman baru `akun/data-diri`; jarak atas Profil iOS;
  "Jadwal hari ini" memakai baris jam-kiri.
- **Pengajian dan izin** — tombol "Kirim absensi"; layar sukses "Pengajuan
  terkirim" + "Lihat pengajuan" untuk izin V2 dan V7; tindakan sekunder rincian
  izin pindah ke ⋯; "Muat ulang" izin wali jadi ikon kepala; sakelar Push.
- **Keuangan** — "Bayar dari tabungan" ke ⋯; pintasan Tagihan dan Mutasi
  tabungan pada kartu anak wali; pratinjau terbit satu santri memakai StatGrid.
- **Pembinaan, rapor, kesehatan** — tab Ringkasan/Sesi/Riwayat di rincian
  pembinaan; koreksi nilai dan sikap beralasan lewat lembar bawah; riwayat
  versi/akses kunjungan ke ⋯ dengan garis waktu; penanda privat dinaikkan.
- **Aksesibilitas** — token status hanya untuk ikon; pada teks > 1,35× bilah
  tindakan ikut digulir di akhir isi; status pil dibacakan pembaca layar.

## Bukti aplikasi

- `npx tsc --noEmit` dan `npm run lint` exit 0; unit **119 / 0**.
- Expo web: seluruh suite gelombang 2 dan regresi modul lain 0 gagal; K-10
  **308 / 0**.
- Uji sumber `tests/tindak-lanjut-v2.test.ts`: lulus pada kode akhir, **gagal 5
  dari 6** pada baseline (kontrol).
- **Android emulator** API 36, APK Debug **1.9.0 dibangun baru** dari sumber
  akhir: Fase 1 **71 / 0**, Fase 2 **13 / 0** dan **54 / 0**, Fase 3 **25 / 0**,
  Fase 4 **17 / 0**, **7 / 0**, **10 / 0** — termasuk gelap + 2,0×.
- **iOS simulator** iPhone 17 Pro iOS 26.2, build **Release 1.9.0 baru**
  (tanda tangan ad-hoc, nol host produksi di bundel): **47 alur Maestro lulus**
  pada keempat fase, termasuk gelap, AX-XL, AX-XXXL, cold start tautan, dan
  ketukan ganda setoran yang tetap menghasilkan satu transaksi.
- **TL-30** (tautan Android pada teks 2,0×) terbukti **bukan cacat aplikasi**.

## Batas

Perangkat fisik, Push nyata dan ketukan notifikasinya, build distribusi EAS,
iOS Debug, APK Release terhadap API HTTP lokal, MariaDB produksi, MySQL,
cPanel, dan UAT **belum diuji**. Gerbang produksi V5/V6/V7 tidak disentuh.
Tidak merge, deploy, atau rilis aplikasi.
