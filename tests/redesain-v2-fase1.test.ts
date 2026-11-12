import assert from 'node:assert/strict';
import test from 'node:test';
import { labelKembali, tujuanKembali } from '../src/lib/kembali.ts';
import { barisKisi, inisialNama, tinggiBatang } from '../src/lib/tampilan.ts';

test('K-10: layar tab selalu kembali ke Beranda, berlabel "Kembali ke Beranda"', () => {
  assert.equal(tujuanKembali('akar', true), 'beranda');
  assert.equal(tujuanKembali('akar', false), 'beranda');
  assert.equal(labelKembali('akar'), 'Kembali ke Beranda');
});

test('K-10: layar stack kembali ke halaman sebelumnya; tanpa riwayat membuka Beranda', () => {
  assert.equal(tujuanKembali('stack', true), 'sebelumnya');
  assert.equal(tujuanKembali('stack', false), 'beranda');
  assert.equal(labelKembali('stack'), 'Kembali');
});

test('avatar inisial: kata pertama dan terakhir, melewati kata berawalan angka', () => {
  assert.equal(inisialNama('Ahmad Fauzi Rahman'), 'AR');
  assert.equal(inisialNama('  siti  '), 'S');
  assert.equal(inisialNama('01 SBX Santri A1'), 'SA');
  assert.equal(inisialNama('Élodie Ñandú'), 'ÉÑ');
  assert.equal(inisialNama(''), '?');
  assert.equal(inisialNama('123 456'), '?');
});

test('grafik batang: tinggi relatif terhadap nilai terbesar, tanpa nilai negatif atau NaN', () => {
  assert.deepEqual(tinggiBatang([10, 5, 0]), [1, 0.5, 0]);
  assert.deepEqual(tinggiBatang([0, 0]), [0, 0]);
  assert.deepEqual(tinggiBatang([]), []);
  assert.deepEqual(tinggiBatang([4, -2, Number.NaN]), [1, 0, 0]);
});

test('kisi statistik: 2 kolom, butir ganjil terakhir sendiri; 1 kolom pada teks besar', () => {
  assert.deepEqual(barisKisi([1, 2, 3], 2), [[1, 2], [3]]);
  assert.deepEqual(barisKisi([1, 2, 3], 1), [[1], [2], [3]]);
  assert.deepEqual(barisKisi([], 2), []);
});
