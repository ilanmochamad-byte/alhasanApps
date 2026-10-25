import assert from 'node:assert/strict';
import test from 'node:test';
import { galatAlasan, galatNominal, keuanganLinkTarget, labelJenis, labelPeriode, lokasiKeuangan, nominalKirim, periodeKini, ruteKeuangan, rupiah, sidikJari, tanggalKini } from '../src/keuangan/forms.ts';
import { notificationTarget } from '../src/rapor/forms.ts';

test('Rupiah ditampilkan bulat dengan titik ribuan tanpa Intl', () => {
  assert.equal(rupiah(0), 'Rp0');
  assert.equal(rupiah(70000), 'Rp70.000');
  assert.equal(rupiah(1250000), 'Rp1.250.000');
  assert.equal(rupiah(-25000), '−Rp25.000');
  assert.equal(rupiah(null), '—');
});

test('Nominal dikirim sebagai teks angka; pecahan dan huruf diteruskan agar server menolak', () => {
  assert.equal(nominalKirim('100.000'), '100000');
  assert.equal(nominalKirim('Rp 1.250.000'), '1250000');
  assert.equal(nominalKirim(' 30000 '), '30000');
  assert.equal(nominalKirim('100.5'), '100.5');
  assert.equal(galatNominal(''), 'Nominal wajib diisi.');
  assert.match(galatNominal('100,50') ?? '', /rupiah bulat/);
  assert.match(galatNominal('0') ?? '', /lebih dari 0/);
  assert.equal(galatNominal('100.000'), null);
});

test('Alasan koreksi wajib 5–500 karakter seperti website', () => {
  assert.ok(galatAlasan('abc'));
  assert.equal(galatAlasan('Salah catat'), null);
  assert.ok(galatAlasan('x'.repeat(501)));
});

test('Sidik jari sama untuk isi sama (retry memakai kunci yang sama) dan berbeda bila isi berubah', () => {
  assert.equal(sidikJari('setoran', 7, { nominal: '100000' }), sidikJari('setoran', 7, { nominal: '100000' }));
  assert.notEqual(sidikJari('setoran', 7, { nominal: '100000' }), sidikJari('setoran', 7, { nominal: '100001' }));
  assert.notEqual(sidikJari('setoran', 7, {}), sidikJari('setoran', 8, {}));
});

test('Label periode, jenis, dan nilai awal tanggal', () => {
  assert.equal(labelPeriode('2026-10'), 'Oktober 2026');
  assert.equal(labelPeriode('salah'), 'salah');
  assert.equal(labelJenis('PembayaranTagihan'), 'Bayar tagihan');
  assert.equal(labelJenis('Pembalik'), 'Koreksi');
  assert.equal(periodeKini(new Date(2026, 0, 5)), '2026-01');
  assert.equal(tanggalKini(new Date(2026, 9, 5)), '2026-10-05');
});

test('Penunjuk notifikasi keuangan hanya id; tipe/kunci lain ditolak', () => {
  assert.deepEqual(notificationTarget({ tipe: 'bsa_tagihan', tagihan_id: 12 }), { tipe: 'bsa_tagihan', id: 12 });
  assert.deepEqual(notificationTarget({ tipe: 'bsa_pembayaran', pembayaran_id: '5' }), { tipe: 'bsa_pembayaran', id: 5 });
  assert.deepEqual(notificationTarget({ tipe: 'bsa_tabungan', transaksi_id: 9 }), { tipe: 'bsa_tabungan', id: 9 });
  assert.equal(notificationTarget({ tipe: 'bsa_tagihan', pembayaran_id: 5 }), null);
  assert.equal(notificationTarget({ tipe: 'bsa_tabungan', transaksi_id: -1 }), null);
  assert.equal(notificationTarget({ tipe: 'bsa_lain', transaksi_id: 3 }), null);
  assert.equal(ruteKeuangan('bsa_pembayaran'), '/keuangan/pembayaran/[id]');
  assert.equal(lokasiKeuangan('bsa_tabungan', 4), '/keuangan/tabungan/4');
});

test('Tautan skema keuangan hanya menerima jalur yang dikenal', () => {
  assert.deepEqual(keuanganLinkTarget('alhasanapps://keuangan/tagihan/15'), { tipe: 'bsa_tagihan', id: 15 });
  assert.deepEqual(keuanganLinkTarget('alhasanapps://keuangan/tabungan/2?santri=99'), { tipe: 'bsa_tabungan', id: 2 });
  assert.equal(keuanganLinkTarget('https://contoh.test/keuangan/tagihan/15'), null);
  assert.equal(keuanganLinkTarget('alhasanapps://keuangan/santri/15'), null);
  assert.equal(keuanganLinkTarget('alhasanapps://keuangan/tagihan/0'), null);
  assert.equal(keuanganLinkTarget(null), null);
});
