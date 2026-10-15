import assert from 'node:assert/strict';
import test from 'node:test';
import { keadaanMenuBeranda } from '../src/lib/home-menu.ts';
import { geserPekan, hariPekan } from '../src/lib/week.ts';

test('pekan dimulai Senin, termasuk ketika tanggal terpilih hari Minggu', () => {
  const rabu = hariPekan('2026-10-14');
  assert.deepEqual(rabu, [
    '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15',
    '2026-10-16', '2026-10-17', '2026-10-18',
  ]);
  assert.deepEqual(hariPekan('2026-10-18'), rabu);
  assert.deepEqual(hariPekan('2026-10-12'), rabu);
});

test('pekan melintasi pergantian bulan, tahun, dan 29 Februari', () => {
  assert.deepEqual(hariPekan('2026-12-31'), [
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
    '2027-01-01', '2027-01-02', '2027-01-03',
  ]);
  assert.equal(hariPekan('2028-03-01')[1], '2028-02-29');
});

test('geser pekan maju dan mundur mempertahankan hari', () => {
  assert.equal(geserPekan('2026-10-14', 1), '2026-10-21');
  assert.equal(geserPekan('2026-10-14', -2), '2026-09-30');
  assert.equal(geserPekan('2026-12-30', 1), '2027-01-06');
});

test('pesan tanpa menu hanya muncul setelah akses pembinaan selesai diperiksa', () => {
  assert.equal(keadaanMenuBeranda(2, 'memuat'), 'ada');
  assert.equal(keadaanMenuBeranda(0, 'memuat'), 'memuat');
  assert.equal(keadaanMenuBeranda(0, 'gagal'), 'gagal');
  assert.equal(keadaanMenuBeranda(0, 'siap'), 'kosong');
});
