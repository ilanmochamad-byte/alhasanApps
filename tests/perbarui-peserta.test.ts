import assert from 'node:assert/strict';
import test from 'node:test';

import { gabungDrafPeserta, ringkasPerubahanPeserta } from '../src/lib/perbarui-peserta.ts';

const bawaan = (s: { attendance?: { status: string; notes: string | null } | null }) => ({
  status: s.attendance?.status ?? 'Hadir',
  notes: s.attendance?.notes ?? '',
});

test('draf santri yang tetap tercantum dipertahankan, santri keluar dibuang, santri baru Hadir', () => {
  const lama = { 1: { status: 'Sakit', notes: 'demam' }, 2: { status: 'Izin', notes: '' } };
  const hasil = gabungDrafPeserta(lama, [{ student_id: 1 }, { student_id: 3 }], bawaan);
  assert.deepEqual(hasil, { 1: { status: 'Sakit', notes: 'demam' }, 3: { status: 'Hadir', notes: '' } });
});

test('santri baru yang sudah berabsensi memakai absensi tersimpan', () => {
  const hasil = gabungDrafPeserta({}, [{ student_id: 5, attendance: { status: 'Alpa', notes: 'x' } }], bawaan);
  assert.deepEqual(hasil, { 5: { status: 'Alpa', notes: 'x' } });
});

test('ringkasan perubahan', () => {
  assert.equal(
    ringkasPerubahanPeserta({ added: [1, 2], removed: [3], kept_with_attendance: [] }),
    'Daftar santri diperbarui: 2 santri ditambahkan, 1 santri dikeluarkan.',
  );
  assert.equal(
    ringkasPerubahanPeserta({ added: [], removed: [], kept_with_attendance: [] }),
    'Daftar santri sudah sesuai dengan penempatan kelas terbaru.',
  );
  assert.match(ringkasPerubahanPeserta({ added: [], removed: [], kept_with_attendance: [9] }), /tetap tercantum/);
  assert.equal(ringkasPerubahanPeserta(undefined), 'Daftar santri diperbarui.');
});
