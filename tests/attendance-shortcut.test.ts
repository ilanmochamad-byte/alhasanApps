import assert from 'node:assert/strict';
import test from 'node:test';
import { attendanceShortcut } from '../src/lib/attendance-shortcut.ts';

test('Absensi kembali ke daftar jadwal saat hari kosong atau seluruh sesi selesai', () => {
  assert.equal(attendanceShortcut([]), null);
  assert.equal(attendanceShortcut([{ meeting: { status: 'Selesai' } }]), null);
});

test('Absensi memilih sesi pertama yang belum selesai, termasuk yang belum dibuka', () => {
  const selesai = { id: 1, meeting: { status: 'Selesai' } };
  const berlangsung = { id: 2, meeting: { status: 'Berlangsung' } };
  const belum = { id: 3, meeting: null };
  assert.equal(attendanceShortcut([selesai, berlangsung, belum]), berlangsung);
  assert.equal(attendanceShortcut([selesai, belum, berlangsung]), belum);
});
