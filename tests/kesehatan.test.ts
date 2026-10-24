import assert from 'node:assert/strict';
import test from 'node:test';
import { drafDariKunjungan, drafKosong, kelompokKelas, kesehatanLinkTarget, payloadKunjungan, sidikJari, teksPerubahan, waktuLokal, wajibAlasan } from '../src/kesehatan/forms.ts';
import { notificationTarget } from '../src/rapor/forms.ts';

const kunjungan = {
  id: 7, santri: { id: 3, nis: 'V5S0201', nama: 'Santri Uji' }, waktu_kunjungan: '2026-10-24 08:15:30', dicatat_pada: '2026-10-24 08:20:00',
  status: 'Tercatat' as const, versi: 2, petugas: { nama: 'Petugas' }, keluhan: 'K', catatan_klinis: null, tindakan: 'T', diperbarui_pada: '',
  obat: [{ id: 11, nama_obat: 'Obat A', jumlah: '2', satuan: 'tablet', petunjuk: null, waktu_pemberian: '2026-10-24 08:15:30' }],
  rujukan: [{ id: 21, tujuan: 'Puskesmas', tanggal_rujukan: '2026-10-24', alasan: null, status: 'Menunggu hasil' as const, hasil: null, tanggal_hasil: null }],
  tindak_lanjut: [{ id: 31, uraian: 'Kontrol', tanggal_target: null, status: 'Terbuka' as const, tanggal_selesai: null }],
  akses: { baca: true, catat: true, sumber: 'petugas' as const, cakupan: 'seluruh' as const, riwayat_akses: false, riwayat_versi: true, binaan: { pembimbing: false, murobi: false } },
};

test('Koreksi mengirim keadaan lengkap: rincian lama ber-id dipertahankan, waktu asli tidak bergeser', () => {
  const d = drafDariKunjungan(kunjungan);
  const p = payloadKunjungan(d);
  assert.equal(p.waktu_kunjungan, '2026-10-24 08:15:30');
  assert.equal(p.status, '');
  assert.deepEqual(p.obat, [{ id: 11, nama_obat: 'Obat A', jumlah: '2', satuan: 'tablet', petunjuk: '', waktu_pemberian: '2026-10-24 08:15:30' }]);
  assert.equal(p.rujukan[0].id, 21);
  assert.equal(p.tindak_lanjut[0].id, 31);
  // Waktu diubah pengguna → dikirim dalam bentuk formulir.
  assert.equal(payloadKunjungan({ ...d, waktu_kunjungan: '2026-10-24T09:00' }).waktu_kunjungan, '2026-10-24T09:00');
  // Baris lama yang dihapus pengguna tidak dikirim (server membatalkannya pada versi baru).
  assert.equal(payloadKunjungan({ ...d, obat: [] }).obat.length, 0);
});

test('Baris baru yang seluruhnya kosong diabaikan; baris lama kosong tetap dikirim agar server menolaknya', () => {
  const d = drafKosong(new Date(2026, 9, 24, 7, 5));
  assert.equal(d.waktu_kunjungan, '2026-10-24T07:05');
  d.obat.push({ nama_obat: '  ', jumlah: '', satuan: '', petunjuk: '' }, { nama_obat: 'Paracetamol', jumlah: '1', satuan: '', petunjuk: '' });
  d.rujukan.push({ tujuan: '', tanggal_rujukan: '2026-10-24', alasan: '', hasil: '', tanggal_hasil: '' });
  d.tindak_lanjut.push({ uraian: '', tanggal_target: '', status: 'Terbuka', tanggal_selesai: '' });
  const p = payloadKunjungan(d);
  assert.deepEqual(p.obat.map(o => o.nama_obat), ['Paracetamol']);
  assert.equal(p.rujukan.length, 0);
  assert.equal(p.tindak_lanjut.length, 0);
  const lama = drafDariKunjungan(kunjungan);
  lama.obat[0].nama_obat = '';
  assert.equal(payloadKunjungan(lama).obat.length, 1);
});

test('Alasan wajib minimal lima karakter, maksimal 1000; sidik jari berubah bila isi berubah', () => {
  assert.ok(wajibAlasan('    '));
  assert.ok(wajibAlasan('abcd'));
  assert.equal(wajibAlasan('Salah ketik'), null);
  assert.ok(wajibAlasan('a'.repeat(1001)));
  assert.notEqual(sidikJari('k', 1, { a: 1 }), sidikJari('k', 1, { a: 2 }));
  assert.equal(sidikJari('k', 1, { a: 1 }), sidikJari('k', 1, { a: 1 }));
  assert.match(waktuLokal(new Date(2026, 0, 2, 3, 4)), /^2026-01-02T03:04$/);
});

test('Penunjuk notifikasi kesehatan hanya ringkasan_id valid; isi/tautan lain diabaikan', () => {
  assert.deepEqual(notificationTarget({ tipe: 'kesehatan_ringkasan', ringkasan_id: 5, nama: 'X', url: 'https://evil.test' }), { tipe: 'kesehatan_ringkasan', id: 5 });
  assert.deepEqual(notificationTarget({ tipe: 'kesehatan_ringkasan', ringkasan_id: '8' }), { tipe: 'kesehatan_ringkasan', id: 8 });
  for (const id of [0, -1, {}, [], true, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.equal(notificationTarget({ tipe: 'kesehatan_ringkasan', ringkasan_id: id }), null);
  assert.equal(notificationTarget({ tipe: 'kesehatan_ringkasan', kunjungan_id: 5 }), null);
});

test('Deep-link kesehatan hanya skema aplikasi dan rute ringkasan wali', () => {
  assert.equal(kesehatanLinkTarget('alhasanapps://kesehatan/wali/12'), 12);
  assert.equal(kesehatanLinkTarget('alhasanapps:///kesehatan/wali/12/'), 12);
  for (const url of [null, '', 'https://alhasan.co.id/kesehatan/wali/12', 'alhasanapps://kesehatan/kunjungan/12', 'alhasanapps://kesehatan/wali/0',
    'alhasanapps://kesehatan/wali/abc', 'alhasanapps://kesehatan/wali/12?x=1#y/../13', 'alhasanapps://rapor/12']) {
    assert.equal(kesehatanLinkTarget(url), url === 'alhasanapps://kesehatan/wali/12?x=1#y/../13' ? 12 : null, String(url));
  }
});

test('Teks perubahan versi memakai label manusia', () => {
  assert.equal(teksPerubahan({ bagian: 'kunjungan', id: null, jenis: 'ubah', kolom: 'keluhan', sebelum: 'A', sesudah: 'B' }), 'Kunjungan · Keluhan: A → B');
  assert.equal(teksPerubahan({ bagian: 'obat', id: 3, jenis: 'tambah', kolom: null, sebelum: null, sesudah: { nama_obat: 'Obat B' } }), 'Obat ditambahkan: Obat B');
  assert.equal(teksPerubahan({ bagian: 'rujukan', id: 4, jenis: 'hapus', kolom: null, sebelum: { tujuan: 'RS' }, sesudah: null }), 'Rujukan dihapus: RS');
});

test('Hasil pencarian santri dikelompokkan per kelas; belum ditempatkan paling akhir', () => {
  const rows = [
    { id: 1, nis: 'A', nama: 'Ali', kelas: null },
    { id: 2, nis: 'B', nama: 'Budi', kelas: { id: 9, nama: 'Kelas 1' } },
    { id: 3, nis: 'C', nama: 'Cici', kelas: { id: 8, nama: 'Kelas 2' } },
    { id: 4, nis: 'D', nama: 'Dodi', kelas: { id: 9, nama: 'Kelas 1' } },
  ];
  const g = kelompokKelas(rows);
  assert.deepEqual(g.map(([n, a]) => [n, a.map(s => s.id)]), [['Kelas 1', [2, 4]], ['Kelas 2', [3]], ['Belum ditempatkan di kelas', [1]]]);
});
