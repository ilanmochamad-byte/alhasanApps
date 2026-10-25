<?php
// Ganti seluruh identitas orang di DB sandbox aset toko dengan nama fiktif.
// DB sandbox diturunkan dari salinan DB pengembangan yang bisa memuat nama asli;
// nama asli tidak boleh muncul di aset toko publik.
//
//   WEB_REPO=/path/ke/WebAlHasan DB_NAME=test_store_aset_test php anonim.php
declare(strict_types=1);
$web = getenv('WEB_REPO') ?: exit("Setel WEB_REPO ke checkout WebAlHasan.\n");
require_once $web . '/app/bootstrap.php';
if (app_config('database.database') !== 'test_store_aset_test') { fwrite(STDERR, "Hanya untuk DB test_store_aset_test\n"); exit(2); }
$m = app_db();

$putra = ['Ahmad Fauzi', 'Muhammad Rizki', 'Fathan Hakim', 'Naufal Ramadhan', 'Zaid Alfarisi', 'Hafidz Maulana',
  'Ilham Syahputra', 'Rafi Anwar', 'Yusuf Habibi', 'Arkan Mubarak', 'Faris Hidayat', 'Daffa Firmansyah',
  'Rayhan Akbar', 'Azka Nurfaiz', 'Salman Alfarizi', 'Hanif Ibrahim', 'Abdullah Faqih', 'Luthfi Hamdani',
  'Umar Sidiq', 'Bilal Ramdani', 'Fikri Haikal', 'Akmal Fadhil', 'Haikal Prasetyo', 'Ridwan Kamil Syah'];
$putri = ['Aisyah Nurhaliza', 'Fatimah Azzahra', 'Khadijah Salsabila', 'Nabila Putri', 'Zahra Aulia', 'Hana Safira',
  'Syifa Rahmawati', 'Alya Mardhiyah', 'Nadia Khairunnisa', 'Rania Humaira', 'Kayla Ramadhani', 'Salma Inayah',
  'Laila Fitriani', 'Maryam Afifah', 'Hilya Najwa', 'Aqila Zulfa', 'Naura Hasanah', 'Tsabita Amalia'];
$guru = ['Ust. Fauzan Hamid', 'Ust. Mahmud Syarif', 'Ust. Rahmat Hidayat', 'Ust. Abdul Ghani', 'Ust. Zainal Arifin',
  'Ust. Hasan Basri', 'Ust. Ahmad Mujahid', 'Ust. Iqbal Maulana', 'Ustzh. Siti Maryam', 'Ustzh. Nurul Aini',
  'Ust. Ridwan Saleh', 'Ust. Imam Syafii', 'Ustzh. Halimah Sadiyah', 'Ust. Taufik Hidayat'];
$pengurus = ['Kak Faisal Rahman', 'Kak Dimas Pratama', 'Kak Annisa Rahma', 'Kak Yahya Mubarok', 'Kak Hilmi Aziz',
  'Kak Rizal Hakim', 'Kak Nur Aisyah', 'Kak Fadli Ramadhan', 'Kak Ikhsan Maulana', 'Kak Zulfa Hanum'];
$wali = ['Bapak Hendra Gunawan', 'Ibu Ratna Sari', 'Bapak Agus Salim', 'Ibu Dewi Lestari', 'Bapak Yusuf Mansur Hadi',
  'Ibu Rina Marlina', 'Bapak Dedi Kurniawan', 'Ibu Wulan Purnama', 'Bapak Asep Saepudin', 'Ibu Euis Komariah'];

// Nama ke-n setelah daftar habis diberi akhiran " A.", " B.", dst.
$pick = fn(array $a, int $i) => $a[$i % count($a)] . ($i >= count($a) ? ' ' . chr(65 + intdiv($i, count($a)) - 1) . '.' : '');

$st = $m->prepare("UPDATE santri SET nama_santri=?, nis=?, tempat_lahir='Ciamis', alamat='Alamat contoh', desa='-', kecamatan='-', nama_ayah='Ayah contoh', no_hp_ayah='', nama_ibu='Ibu contoh', no_hp_ibu='', foto='' WHERE id=?");
$res = $m->query('SELECT id, jenis_kelamin FROM santri ORDER BY id');
$iL = $iP = 0;
while ($r = $res->fetch_assoc()) {
  $p = in_array(strtoupper((string) $r['jenis_kelamin']), ['P', 'PEREMPUAN'], true);
  $nama = $p ? $pick($putri, $iP++) : $pick($putra, $iL++);
  $nis = sprintf('2026%04d', $r['id']);
  $st->bind_param('ssi', $nama, $nis, $r['id']);
  $st->execute();
}
foreach ([['guru', 'nama_guru', $guru], ['pengurus', 'nama', $pengurus], ['wali', 'nama', $wali]] as [$t, $c, $list]) {
  $u = $m->prepare("UPDATE $t SET $c=?, no_hp='' WHERE id=?");
  $res = $m->query("SELECT id FROM $t ORDER BY id");
  $i = 0;
  while ($r = $res->fetch_assoc()) { $n = $pick($list, $i++); $u->bind_param('si', $n, $r['id']); $u->execute(); }
}
// Nama akun mengikuti identitas tertaut; selebihnya generik.
$m->query("UPDATE users u JOIN guru g ON g.id=u.guru_id SET u.name=g.nama_guru");
$m->query("UPDATE users u JOIN pengurus p ON p.id=u.pengurus_id AND u.guru_id IS NULL SET u.name=p.nama");
$m->query("UPDATE users u JOIN wali w ON w.id=u.wali_id AND u.guru_id IS NULL AND u.pengurus_id IS NULL SET u.name=w.nama");
$m->query("UPDATE users SET name='Admin Pesantren' WHERE username IN ('sbx_admin','admin')");
$m->query("UPDATE users SET email=NULL, phone=NULL");
$m->query("UPDATE users SET name=CONCAT('Pengguna ', id) WHERE name LIKE 'SBX%' OR name LIKE 'sbx%'");
echo "anonim selesai\n";
