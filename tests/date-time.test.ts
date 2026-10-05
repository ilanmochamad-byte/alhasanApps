import assert from 'node:assert/strict';
import test from 'node:test';
import { isLocalDateTime } from '../src/lib/date-time.ts';

test('tanggal/jam lokal lengkap termasuk tengah malam dan tahun kabisat', () => {
  for (const value of ['2026-10-04T00:05', '2024-02-29T23:59', '2026-12-31T23:59']) assert.equal(isLocalDateTime(value), true, value);
});
test('tolak bagian kosong, format manual salah dan tanggal yang dinormalisasi JS', () => {
  for (const value of ['', '2026-10-04T', 'T10:00', '04/10/2026 10:00', '2026-02-30T10:00', '2025-02-29T10:00', '2026-10-04T24:00', '2026-10-04T10:60']) assert.equal(isLocalDateTime(value), false, value);
});
