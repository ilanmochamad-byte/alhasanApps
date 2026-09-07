# Teks listing Play Store — Al Hasan Apps

Tinggal salin blok di bawah ke Play Console:
*Grow → Store presence → Main store listing.*

---

## Deskripsi singkat (Short description) — 74/80 karakter

Jadwal, absensi, perizinan santri, dan rekap kehadiran Pesantren Al Hasan.

### Alternatif (keduanya 74 karakter)

Absensi kelas, perizinan santri, dan laporan kehadiran Pesantren Al Hasan.

Aplikasi ustaz & pengurus: absensi, jadwal mengajar, dan perizinan santri.

---

## Deskripsi lengkap (Full description) — 2.807/4.000 karakter

Al Hasan Apps adalah aplikasi resmi Pesantren Al Hasan untuk ustaz, pengurus asrama, murobi, dan orang tua santri. Satu aplikasi untuk mencatat kehadiran di kelas, mengurus perizinan santri, dan menariknya menjadi laporan yang siap dicetak.

Aplikasi ini memerlukan akun yang diterbitkan pesantren. Menu yang muncul menyesuaikan peran akun Anda, dan setiap permintaan tetap diperiksa cakupannya di server.

JADWAL DAN ABSENSI
• Kartu sesi hari ini menunjukkan satu tugas mengajar terdekat, lengkap dengan jam, kelas, dan ruangan.
• Buka pertemuan langsung dari kartu itu, lalu tandai kehadiran santri: Hadir, Izin, Terlambat, Sakit, atau Alpa.
• Jadwal sebulan penuh dikelompokkan per tanggal, dengan pilihan rentang 7 hari, 30 hari, atau tanggal kustom.
• Membuka pertemuan dan menyimpan absensi memakai kunci idempoten, sehingga ketukan ganda atau sinyal yang terputus tidak membuat data tercatat dua kali.

PERIZINAN SANTRI
• Ajukan izin lengkap dengan tanggal berangkat, tanggal kembali, dan alasan.
• Antrean tindakan memisahkan pengajuan yang benar-benar menunggu keputusan Anda dari daftar keseluruhan.
• Pengurus dan murobi memutuskan menyetujui atau menolak; admin menetapkan murobi dan dapat mengoreksi keputusan yang keliru.
• Riwayat setiap pengajuan tersimpan: siapa yang memutuskan, kapan, dan dengan alasan apa.
• Orang tua dapat memantau izin anaknya secara baca-saja.

LAPORAN
• Rekap kehadiran menampilkan proporsi setiap status beserta jumlah dan persentasenya.
• Saring menurut rentang tanggal, status, dan jadwal, lalu buka detail per pertemuan.
• Cetak laporan kehadiran maupun laporan perizinan menjadi PDF A4, atau ekspor daftar izin ke CSV, langsung dari aplikasi.

SATU AKUN, BANYAK PERAN
Banyak ustaz memegang lebih dari satu peran sekaligus — mengajar, mengurus asrama, sekaligus menjadi murobi. Cakupan perizinan dapat dipindah dari dalam aplikasi tanpa perlu keluar dan masuk kembali.

NOTIFIKASI
• Pemberitahuan saat ada pengajuan baru, keputusan, atau penetapan yang menyangkut Anda.
• Riwayat notifikasi dan daftar perangkat yang terhubung dapat dilihat dan dikelola dari tab Profil.

DIBUAT UNTUK DIPAKAI SEHARI-HARI
• Mengikuti tema terang dan gelap perangkat.
• Menghormati setelan ukuran teks sistem, sehingga tetap terbaca saat font diperbesar.
• Warna status kehadiran dipilih agar tetap dapat dibedakan oleh pengguna dengan buta warna, dan warna tidak pernah menjadi satu-satunya penanda — selalu ada labelnya.

PRIVASI DAN KEAMANAN
• Masuk dengan akun pesantren; token sesi disimpan pada penyimpanan terenkripsi perangkat.
• Menekan Keluar mencabut token sesi di server dan di perangkat sekaligus.
• Tidak ada iklan di dalam aplikasi.

Belum memiliki akun? Hubungi admin pesantren untuk mendapatkannya. Tanpa akun dari pesantren, aplikasi ini tidak dapat digunakan.

---

## Catatan

- Kalimat "memerlukan akun yang diterbitkan pesantren" sengaja diletakkan di
  paragraf kedua. Play menolak listing yang menyembunyikan bahwa aplikasi tidak
  bisa dipakai tanpa akun, dan calon pengguna juga perlu tahu sebelum memasang.
- Klaim di teks ini sudah dicocokkan dengan kode: PDF A4 lanskap lewat
  `expo-print`, ekspor CSV lewat `expo-file-system`, token sesi di
  `expo-secure-store`, dan logout mencabut token di server + perangkat.
- Tidak ada SDK iklan atau analitik pihak ketiga di `package.json`, jadi baris
  "Tidak ada iklan" aman dan konsisten dengan formulir Data safety.
- Untuk App Store Connect, deskripsi lengkap ini bisa dipakai ulang; batasnya
  4.000 karakter juga. Yang berbeda hanya "subtitle" (maks 30 karakter), mis.
  "Absensi & izin santri".
