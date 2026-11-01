import assert from 'node:assert/strict';
import test from 'node:test';
import { daftarKelas, kelasGabungan, kelompokPeserta, labelKelas, namaKelasAsal } from '../src/lib/kelas-jadwal.ts';

const PA = { id: 11, name: '1 IBTIDA PA', level: 'Ibtida', is_primary: true };
const PI = { id: 12, name: '1 IBTIDA PI', level: 'Ibtida', is_primary: false };

test('server lama tanpa classes tetap terbaca sebagai satu kelas utama', () => {
  const lama = { class: { id: 11, name: '1 IBTIDA PA', level: 'Ibtida' } };
  assert.deepEqual(daftarKelas(lama), [{ id: 11, name: '1 IBTIDA PA', level: 'Ibtida', is_primary: true }]);
  assert.equal(labelKelas(lama), '1 IBTIDA PA');
  assert.equal(kelasGabungan(lama), false);
  // classes kosong diperlakukan sama dengan tidak ada.
  assert.equal(labelKelas({ ...lama, classes: [] }), '1 IBTIDA PA');
});

test('jadwal satu kelas dari server Fase 1 tidak ditandai gabungan', () => {
  const satu = { class: { id: 11, name: '1 IBTIDA PA', level: 'Ibtida' }, classes: [PA] };
  assert.equal(kelasGabungan(satu), false);
  assert.equal(labelKelas(satu), '1 IBTIDA PA');
});

test('kelas gabungan: utama lebih dahulu, tanpa ganda, label dipisah koma', () => {
  const gabungan = { class: { id: 11, name: '1 IBTIDA PA', level: 'Ibtida' }, classes: [PI, PA, PI] };
  assert.deepEqual(daftarKelas(gabungan).map((k) => k.id), [11, 12]);
  assert.equal(labelKelas(gabungan), '1 IBTIDA PA, 1 IBTIDA PI');
  assert.equal(kelasGabungan(gabungan), true);
});

test('peserta dikelompokkan per kelas asal mengikuti urutan kelas, urutan server dipertahankan', () => {
  const santri = [
    { student_id: 1, name: 'Aisyah', class: { id: 12, name: '1 IBTIDA PI' } },
    { student_id: 2, name: 'Ahmad', class: { id: 11, name: '1 IBTIDA PA' } },
    { student_id: 3, name: 'Fatimah', class: { id: 12, name: '1 IBTIDA PI' } },
    { student_id: 4, name: 'Umar', class: { id: 11, name: '1 IBTIDA PA' } },
  ];
  const kelompok = kelompokPeserta(santri, [PA, PI]);
  assert.deepEqual(
    kelompok.map((g) => [g.kelas?.name, g.items.map((s) => s.student_id)]),
    [['1 IBTIDA PA', [2, 4]], ['1 IBTIDA PI', [1, 3]]],
  );
  // Setiap santri tepat satu kali.
  assert.equal(kelompok.flatMap((g) => g.items).length, santri.length);
});

test('kelas asal di luar daftar dan peserta tanpa kelas tetap tampil, kelompok kosong dibuang', () => {
  const santri = [
    { student_id: 5, class: { id: 99, name: '2 IBTIDA PA' } },
    { student_id: 6 },
    { student_id: 7, class: { id: 11, name: '1 IBTIDA PA' } },
  ];
  const kelompok = kelompokPeserta(santri, [PA, PI]);
  assert.deepEqual(
    kelompok.map((g) => [g.kelas?.id ?? null, g.items.map((s) => s.student_id)]),
    [[11, [7]], [99, [5]], [null, [6]]],
  );
});

test('nama kelas asal memakai nama dari server, lalu daftar kelas, kosong bila tidak ada', () => {
  assert.equal(namaKelasAsal({ class: { id: 12, name: '1 IBTIDA PI' } }, [PA, PI]), '1 IBTIDA PI');
  assert.equal(namaKelasAsal({ class: { id: 12, name: '' } }, [PA, PI]), '1 IBTIDA PI');
  assert.equal(namaKelasAsal({ class: { id: 0, name: '' } }, [PA, PI]), '');
  assert.equal(namaKelasAsal({}, [PA, PI]), '');
});
