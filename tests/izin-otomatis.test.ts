import assert from 'node:assert/strict';
import test from 'node:test';

import {
  drafAwalSantri,
  gabungDrafIzin,
  jumlahBerizin,
  labelIzinSampai,
  ringkasPerubahanIzin,
  tandaiSemuaHadir,
  tanggalSingkat,
  ubahStatusDraf,
} from '../src/lib/izin-otomatis.ts';

const izin = { pengajuan_id: 123, keterangan: 'Izin No. 123 — disetujui murobi s.d. 25 Nov', sampai: '2026-11-25' };

test('draf awal: usulan izin → Izin + keterangan; tanpa izin → Hadir; absensi tersimpan menang', () => {
  assert.deepEqual(drafAwalSantri({ student_id: 1, attendance: null, izin }), { status: 'Izin', notes: izin.keterangan });
  assert.deepEqual(drafAwalSantri({ student_id: 2, attendance: null, izin: null }), { status: 'Hadir', notes: '' });
  assert.deepEqual(drafAwalSantri({ student_id: 3, attendance: { status: 'Hadir', notes: null }, izin }), { status: 'Hadir', notes: '' });
});

test('server lama tanpa kunci izin tetap Hadir (K-7)', () => {
  assert.deepEqual(drafAwalSantri({ student_id: 1, attendance: null }), { status: 'Hadir', notes: '' });
});

test('ubah status: catatan otomatis dikosongkan hanya bila masih sama dengan keterangan', () => {
  assert.deepEqual(ubahStatusDraf({ status: 'Izin', notes: izin.keterangan }, 'Hadir', izin), { status: 'Hadir', notes: '' });
  assert.deepEqual(ubahStatusDraf({ status: 'Izin', notes: 'pulang lebih cepat' }, 'Hadir', izin), { status: 'Hadir', notes: 'pulang lebih cepat' });
  assert.deepEqual(ubahStatusDraf({ status: 'Hadir', notes: '' }, 'Izin', izin), { status: 'Izin', notes: izin.keterangan });
  assert.deepEqual(ubahStatusDraf({ status: 'Hadir', notes: 'x' }, 'Sakit', null), { status: 'Sakit', notes: 'x' });
});

test('Semua hadir melewati santri ber-izin', () => {
  const peserta = [{ student_id: 1, izin }, { student_id: 2, izin: null }, { student_id: 3 }];
  const { draf, diubah } = tandaiSemuaHadir({ 1: { status: 'Izin', notes: izin.keterangan }, 2: { status: 'Alpa', notes: '' }, 3: { status: 'Sakit', notes: '' } }, peserta);
  assert.equal(draf[1].status, 'Izin');
  assert.equal(draf[2].status, 'Hadir');
  assert.equal(draf[3].status, 'Hadir');
  assert.deepEqual(diubah.sort(), [2, 3]);
  assert.equal(jumlahBerizin(peserta), 1);
});

test('sesudah perbarui: belum diubah guru mengikuti usulan terbaru; diubah guru & berabsensi dipertahankan', () => {
  const lama = { 1: { status: 'Hadir', notes: '' }, 2: { status: 'Sakit', notes: 'demam' }, 3: { status: 'Izin', notes: izin.keterangan }, 4: { status: 'Alpa', notes: '' } };
  const peserta = [
    { student_id: 1, attendance: null, izin },                 // izin baru → Izin
    { student_id: 2, attendance: null, izin },                 // diubah guru → tetap
    { student_id: 3, attendance: null, izin: null },           // izin dibatalkan → Hadir
    { student_id: 4, attendance: { status: 'Alpa', notes: null }, izin }, // berabsensi → tetap
    { student_id: 5, attendance: null, izin },                 // santri baru
  ];
  const hasil = gabungDrafIzin(lama, peserta, new Set([2]));
  assert.deepEqual(hasil, {
    1: { status: 'Izin', notes: izin.keterangan },
    2: { status: 'Sakit', notes: 'demam' },
    3: { status: 'Hadir', notes: '' },
    4: { status: 'Alpa', notes: '' },
    5: { status: 'Izin', notes: izin.keterangan },
  });
});

test('penanda dan ringkasan', () => {
  assert.equal(labelIzinSampai(izin), 'Izin s.d. 25 Nov');
  assert.equal(labelIzinSampai({ ...izin, sampai: null }), 'Izin s.d. 25 Nov');
  assert.equal(tanggalSingkat('2026-05-01'), '1 Mei');
  assert.equal(ringkasPerubahanIzin({ izin_suggested: 2, izin_cleared: 1 }), 'Izin: 2 usulan izin diisi, 1 usulan izin dihapus.');
  assert.equal(ringkasPerubahanIzin({}), '');
  assert.equal(ringkasPerubahanIzin(undefined), '');
});
