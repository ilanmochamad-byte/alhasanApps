import assert from 'node:assert/strict';
import test from 'node:test';
import { kelompokPenugasan, kueri, labelStatusKasus, nadaKehadiran, nadaPembinaan, periksaRentang } from '../src/keamanan/format.ts';

test('Kueri Keamanan tanpa kunci kosong dan ter-encode', () => {
  assert.equal(kueri({}), '');
  assert.equal(kueri({ status: '', q: undefined, page: 1 }), '?page=1');
  assert.equal(kueri({ q: 'Santri & A', status: 'Dicatat' }), '?q=Santri%20%26%20A&status=Dicatat');
  assert.equal(kueri({ asal: null, hasil: 'berjalan' }), '?hasil=berjalan');
});

test('Rentang tanggal: opsional, format ISO, akhir tidak mendahului awal', () => {
  assert.equal(periksaRentang('', ''), null);
  assert.equal(periksaRentang('2026-10-01', ''), null);
  assert.equal(periksaRentang('2026-10-01', '2026-10-01'), null);
  assert.match(periksaRentang('2026-10-05', '2026-10-01') ?? '', /tidak boleh sebelum/);
  assert.match(periksaRentang('01-10-2026', '') ?? '', /awal tidak valid/);
  assert.match(periksaRentang('', '2026/10/01') ?? '', /akhir tidak valid/);
});

test('Nada lencana dan label status mengikuti halaman web Keamanan', () => {
  assert.equal(nadaPembinaan('Selesai'), 'primary');
  assert.equal(nadaPembinaan('Dibatalkan'), 'neutral');
  assert.equal(nadaPembinaan('Dicatat'), 'warning');
  assert.equal(nadaKehadiran('Hadir'), 'primary');
  assert.equal(nadaKehadiran('Alpa'), 'danger');
  assert.equal(nadaKehadiran(null), 'neutral');
  assert.equal(nadaKehadiran('Izin'), 'warning');
  assert.equal(labelStatusKasus('Dalam Pendampingan'), 'Dalam pendampingan');
  assert.equal(labelStatusKasus('Dibuka'), 'Dibuka');
});

test('Penugasan profil dikelompokkan per identitas (satu akun, dua identitas)', () => {
  assert.deepEqual(kelompokPenugasan([]), { guru: [], pengurus: [] });
  assert.deepEqual(kelompokPenugasan([
    { jenis: 'murobi', label: 'Murobi', identitas: 'guru' },
    { jenis: 'pembimbing', label: 'Pembimbing', identitas: 'pengurus' },
    { jenis: 'keamanan', label: 'Keamanan', identitas: 'pengurus' },
  ]), { guru: ['Murobi'], pengurus: ['Pembimbing', 'Keamanan'] });
});
