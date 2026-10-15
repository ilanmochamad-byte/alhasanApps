import assert from 'node:assert/strict';
import test from 'node:test';
import { statusSesi } from '../src/lib/schedule-status.ts';

const HARI_INI = '2026-10-15';

test('sesi hari ini yang belum dibuka atau belum selesai ditandai perlu absen', () => {
  assert.deepEqual(statusSesi(null, HARI_INI, HARI_INI), {
    label: 'Belum diabsen', nada: 'menunggu', ikon: 'clock', perluAbsen: true,
  });
  assert.equal(statusSesi({ status: 'Dibuka' }, HARI_INI, HARI_INI).perluAbsen, true);
  assert.equal(statusSesi({ status: 'Draf' }, HARI_INI, HARI_INI).perluAbsen, true);
});

test('sesi selesai tidak pernah meminta absen, kapan pun tanggalnya', () => {
  for (const tanggal of ['2026-10-14', HARI_INI, '2026-10-16']) {
    const status = statusSesi({ status: 'Selesai' }, tanggal, HARI_INI);
    assert.equal(status.label, 'Absensi selesai');
    assert.equal(status.perluAbsen, false);
  }
});

test('sesi hari lain tidak diberi penanda absen dan dibedakan masa depan/lampau', () => {
  assert.deepEqual(statusSesi(null, '2026-10-18', HARI_INI), {
    label: 'Belum dimulai', nada: 'netral', ikon: null, perluAbsen: false,
  });
  assert.equal(statusSesi(null, '2026-10-01', HARI_INI).label, 'Belum dibuka');
  assert.equal(statusSesi({ status: 'Dibuka' }, '2026-10-14', HARI_INI).perluAbsen, false);
  // Pergantian bulan/tahun dibandingkan sebagai string ISO, bukan angka hari.
  assert.equal(statusSesi(null, '2027-01-02', '2026-12-31').label, 'Belum dimulai');
});
