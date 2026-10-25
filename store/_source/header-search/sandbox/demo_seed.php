<?php
// Data demo untuk tangkapan aset App Store. Hanya DB test_store_aset_test,
// dijalankan SESUDAH anonim.php. Kunjungan dan ringkasan wali dibuat lewat
// layanan aplikasi (bukan INSERT langsung), jadi tampil persis seperti produksi.
//
//   WEB_REPO=/path/ke/WebAlHasan DB_NAME=test_store_aset_test php demo_seed.php
declare(strict_types=1);
$web = getenv('WEB_REPO') ?: exit("Setel WEB_REPO ke checkout WebAlHasan.\n");
require_once $web . '/app/bootstrap.php';
if (app_config('database.database') !== 'test_store_aset_test') { fwrite(STDERR, "Hanya untuk DB test_store_aset_test\n"); exit(2); }
$db = app_db();
$x = static function (string $sql) use ($db): void { if (!$db->query($sql)) throw new RuntimeException($db->error . ' :: ' . $sql); };
$val = static fn (string $sql): mixed => $db->query($sql)?->fetch_row()[0] ?? null;

// Nama rapi untuk santri, kelas, dan kamar yang tampil.
$x("UPDATE santri SET nama_santri='Ahmad Fauzi' WHERE id=1705");
$x("UPDATE santri SET nama_santri='Muhammad Rizki' WHERE id=1670");
$x("UPDATE santri SET nama_santri='Naufal Ramadhan' WHERE id=1672");
$x("UPDATE santri SET nama_santri='Fathan Hakim' WHERE id=1707");
$x("UPDATE santri SET nama_santri='Yusuf Habibi' WHERE id=1708");
$x("UPDATE santri SET nama_santri='Arkan Mubarak' WHERE id=1706");
foreach (['SBX Kelas 1' => '7A Putra', 'SBX Kelas 2' => '7B Putra', 'SBX T7 Kelas 30' => '8A Putra', 'SBX T7 Kelas Baru' => '8B Putra',
  'SBX V5 Kelas Kosong' => '9B Putra', 'SBX V5 Kelas X' => '9A Putra', 'SBX V5 Kelas Y' => '9C Putra'] as $a => $b) {
  $x("UPDATE kelas SET nama_kelas='$b' WHERE nama_kelas='$a'");
}
foreach (['SBX Kamar A' => 'Kamar Abu Bakar', 'SBX Kamar B' => 'Kamar Umar', 'SBX Kamar C' => 'Kamar Utsman',
  'SBX V5 Kamar A' => 'Kamar Ali', 'SBX V5 Kamar B' => 'Kamar Hamzah'] as $a => $b) {
  $x("UPDATE kamar SET nama_kamar='$b' WHERE nama_kamar='$a'");
}

// Topik kitab jadwal sandbox (aslinya 'Kitab SBX'), sesuai fan ilmunya.
$x("UPDATE jadwal_ngaji SET nama_kitab = CASE fan_ilmu WHEN 'Fathul Qarib' THEN 'Bab Thaharah'
  WHEN 'Tafsir Jalalain' THEN 'Surat Al-Mulk' WHEN 'Ta''lim Muta''allim' THEN 'Adab menuntut ilmu'
  WHEN 'Akhlak' THEN 'Washoya' ELSE nama_kitab END WHERE nama_kitab='Kitab SBX'");

// Anak sbx_v5_wali_1 (santri 1705) perlu penempatan aktif agar tampil di kelas.
$tahun = (int) $val("SELECT id FROM tahun_ajaran WHERE status='Aktif' AND archived_at IS NULL LIMIT 1");
$kelasX = (int) $val("SELECT id FROM kelas WHERE nama_kelas='9A Putra'");
if ((int) $val("SELECT COUNT(*) FROM plotting_kelas WHERE id_santri=1705 AND status='Aktif'") === 0) {
  $x("INSERT INTO plotting_kelas (id_santri,id_kelas,id_tahun,tanggal_mulai,status,created_by) VALUES (1705,$kelasX,$tahun,CURDATE()-INTERVAL 60 DAY,'Aktif',1)");
}

$petugas = ['id' => (int) $val("SELECT id FROM users WHERE username='sbx_v5_petugas_f'"), 'roles' => []];
$klinik = kesehatan_service();
$ringkasan = kesehatan_ringkasan_service();
$n = 0; $kunci = static function (string $l) use (&$n): string { return 'demo-aset-' . $l . '-' . (++$n) . '-' . bin2hex(random_bytes(3)); };

$buat = static fn (string $l, int $s, string $w, array $isi) => $klinik->buat($petugas, ['idempotency_key' => $kunci($l), 'santri_id' => $s, 'waktu_kunjungan' => $w, 'status' => 'Tercatat'] + $isi, 'web')['id'];
$obat = static fn (string $nama, string $j, string $sat, string $pet): array => ['nama_obat' => $nama, 'jumlah' => $j, 'satuan' => $sat, 'petunjuk' => $pet];

$k1 = $buat('k1', 1705, date('Y-m-d', strtotime('-1 day')) . ' 19:30', [
  'keluhan' => 'Demam dan pusing sejak sore', 'catatan_klinis' => 'Suhu 38,2 °C, tenggorokan sedikit merah.', 'tindakan' => 'Kompres hangat dan istirahat di ruang klinik',
  'obat' => [$obat('Parasetamol 500 mg', '1', 'tablet', '3× sehari sesudah makan'), $obat('Vitamin C', '1', 'tablet', '1× sehari')],
  'tindak_lanjut' => [['uraian' => 'Cek suhu ulang besok pagi', 'tanggal_target' => date('Y-m-d')]],
]);
$k2 = $buat('k2', 1707, date('Y-m-d') . ' 07:45', [
  'keluhan' => 'Nyeri lambung setelah sarapan', 'catatan_klinis' => 'Riwayat maag, tidak muntah.', 'tindakan' => 'Minum air hangat, istirahat 1 jam',
  'obat' => [$obat('Antasida', '1', 'tablet', 'Dikunyah sebelum makan')],
]);
$k3 = $buat('k3', 1708, date('Y-m-d', strtotime('-2 day')) . ' 10:15', [
  'keluhan' => 'Luka lecet di lutut saat olahraga', 'catatan_klinis' => 'Luka superfisial ±2 cm, bersih.', 'tindakan' => 'Luka dibersihkan dan ditutup kasa',
  'obat' => [$obat('Povidon iodin', '1', 'oles', 'Ganti kasa tiap pagi')],
]);
$k4 = $buat('k4', 1706, date('Y-m-d', strtotime('-3 day')) . ' 13:00', [
  'keluhan' => 'Sakit gigi geraham kanan', 'catatan_klinis' => 'Gigi berlubang, gusi tidak bengkak.', 'tindakan' => 'Pereda nyeri dan rujukan ke klinik gigi',
  'obat' => [$obat('Parasetamol 500 mg', '1', 'tablet', 'Bila nyeri')],
  'rujukan' => [['tujuan' => 'Klinik Gigi Ciamis', 'tanggal_rujukan' => date('Y-m-d', strtotime('-2 day')), 'alasan' => 'Penambalan gigi']],
]);

$versi = (int) $klinik->detail($petugas, $k1, 'web')['versi'];
$m = ['kunjungan_versi' => $versi, 'revisi_ringkasan' => 0,
  'ringkasan' => 'Ananda datang ke klinik pesantren dengan demam ringan. Sudah diberi obat penurun panas dan beristirahat. Kondisinya membaik dan sudah bisa makan dengan baik.',
  'tindakan_umum' => 'Diberi obat penurun panas, vitamin, dan istirahat.', 'tindak_lanjut_wali' => 'Mohon doakan kesembuhannya. Klinik akan memantau suhu Ananda besok pagi.', 'alasan' => null];
$p = $ringkasan->pratinjau($petugas, $k1, $m);
$ringkasan->terbitkan($petugas, $k1, $m + ['konfirmasi' => true, 'pratinjau_hash' => $p['pratinjau_hash'], 'idempotency_key' => $kunci('terbit')], 'web');
echo "demo selesai: $k1 $k2 $k3 $k4\n";
