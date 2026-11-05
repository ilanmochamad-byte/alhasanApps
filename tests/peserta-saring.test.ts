import assert from 'node:assert/strict';
import test from 'node:test';

import { daftarKelas } from '../src/lib/kelas-jadwal.ts';
import {
  cocokSantri,
  labelPendekKelas,
  LABEL_TANPA_KELAS,
  nomorUrut,
  saringPeserta,
  tabKelas,
  TAB_SEMUA,
  TAB_TANPA_KELAS,
} from '../src/lib/peserta-saring.ts';

const PA = { id: 11, name: '1 IBTIDA PA', is_primary: true };
const PI = { id: 12, name: '1 IBTIDA PI', is_primary: false };
const task = { class: { id: 11, name: '1 IBTIDA PA' }, classes: [PA, PI] };

const santri = [
  { student_id: 1, name: 'Ahmad Fauzi', nis: '26001', class: { id: 11, name: '1 IBTIDA PA' } },
  { student_id: 2, name: 'Siti Aisyah', nis: '26002', class: { id: 12, name: '1 IBTIDA PI' } },
  { student_id: 3, name: 'Ahmad Fauzi', nis: '26003', class: { id: 12, name: '1 IBTIDA PI' } },
  { student_id: 4, name: 'Budi', nis: '26004', class: { id: 99, name: '2 IBTIDA PA' } },
  { student_id: 5, name: 'Zahra Ṣāliḥah', nis: '26005', class: null },
  { student_id: 6, name: 'Umar', nis: '26006', class: { id: 11, name: '1 IBTIDA PA' } },
];

test('cari nama/NIS tanpa membedakan huruf besar, diakritik, dan urutan kata', () => {
  assert.equal(cocokSantri(santri[0], 'ahmad'), true);
  assert.equal(cocokSantri(santri[0], 'AHMAD'), true);
  assert.equal(cocokSantri(santri[0], 'fauzi ahmad'), true);
  assert.equal(cocokSantri(santri[0], '26001'), true);
  assert.equal(cocokSantri(santri[0], '6001'), true);
  assert.equal(cocokSantri(santri[0], 'siti'), false);
  assert.equal(cocokSantri(santri[4], 'saliha'), true);
  assert.equal(cocokSantri(santri[0], '   '), true);
  assert.equal(cocokSantri(santri[0], ''), true);
});

test('label tab IBTIDA menjadi PA/PI; gabungan non-IBTIDA memakai nama lengkap', () => {
  assert.deepEqual([...labelPendekKelas([PA, PI]).values()], ['PA', 'PI']);
  assert.deepEqual([...labelPendekKelas([{ id: 1, name: '1 Ula' }, { id: 2, name: '2 Ula' }]).values()], ['1 Ula', '2 Ula']);
  assert.deepEqual([...labelPendekKelas([{ id: 1, name: 'Tahfidz' }, { id: 2, name: 'Tahfidz' }]).values()], ['Tahfidz', 'Tahfidz']);
  assert.deepEqual([...labelPendekKelas([PA]).values()], ['1 IBTIDA PA']);
  // Akhiran yang sama (mis. penanda fixture/angkatan) tetap menjadi PA/PI.
  assert.deepEqual([...labelPendekKelas([{ id: 1, name: '1 IBTIDA PA 2026' }, { id: 2, name: '1 IBTIDA PI 2026' }]).values()], ['PA', 'PI']);
  assert.deepEqual([...labelPendekKelas([{ id: 1, name: '1 Ibtida Putra' }, { id: 2, name: '1 Ibtida Putri' }]).values()], ['Putra', 'Putri']);
  // Berbeda lebih dari satu kata atau bukan bagian PA/PI: nama lengkap.
  assert.deepEqual([...labelPendekKelas([{ id: 1, name: '1 IBTIDA PA' }, { id: 2, name: '2 IBTIDA PI' }]).values()], ['1 IBTIDA PA', '2 IBTIDA PI']);
  assert.deepEqual([...labelPendekKelas([{ id: 1, name: '1 Ula A' }, { id: 2, name: '1 Ula B' }]).values()], ['1 Ula A', '1 Ula B']);
  assert.deepEqual([...labelPendekKelas([{ id: 1, name: '1 IBTIDA PA' }, { id: 2, name: '1 IBTIDA PA' }]).values()], ['1 IBTIDA PA', '1 IBTIDA PA']);
});

test('tab Semua/PA/PI menghitung peserta unik; kelas hilang atau di luar daftar = Kelas belum tercatat', () => {
  const kelas = daftarKelas(task);
  const tabs = tabKelas([...santri, santri[1]], kelas);
  assert.deepEqual(
    tabs.map((t) => [t.key, t.label, t.count]),
    [
      [TAB_SEMUA, 'Semua', 6],
      ['kelas-11', 'PA', 2],
      ['kelas-12', 'PI', 2],
      [TAB_TANPA_KELAS, LABEL_TANPA_KELAS, 2],
    ],
  );
  // Tanpa peserta tak tercatat, tab itu tidak muncul.
  assert.equal(tabKelas(santri.slice(0, 3), kelas).some((t) => t.key === TAB_TANPA_KELAS), false);
});

test('tab PA hanya peserta kelas asal PA; nama sama di PI tidak ikut', () => {
  const kelas = daftarKelas(task);
  const pa = saringPeserta(santri, kelas, { tab: 'kelas-11', kataKunci: '' });
  assert.deepEqual(pa.map((g) => g.nama), ['1 IBTIDA PA']);
  assert.deepEqual(pa[0].items.map((s) => s.student_id), [1, 6]);
  const pi = saringPeserta(santri, kelas, { tab: 'kelas-12', kataKunci: 'ahmad' });
  assert.deepEqual(pi.flatMap((g) => g.items.map((s) => s.student_id)), [3]);
  const semua = saringPeserta(santri, kelas, { tab: TAB_SEMUA, kataKunci: 'ahmad' });
  assert.deepEqual(semua.map((g) => [g.nama, g.items.map((s) => s.nis)]), [
    ['1 IBTIDA PA', ['26001']],
    ['1 IBTIDA PI', ['26003']],
  ]);
  const tanpa = saringPeserta(santri, kelas, { tab: TAB_TANPA_KELAS, kataKunci: '' });
  assert.deepEqual(tanpa.flatMap((g) => g.items.map((s) => s.student_id)), [4, 5]);
  assert.deepEqual(saringPeserta(santri, kelas, { tab: 'kelas-12', kataKunci: 'umar' }), []);
});

test('satu kelas dan server lama: satu kelompok tanpa judul', () => {
  const lama = daftarKelas({ class: { id: 11, name: '1 IBTIDA PA' } });
  const hasil = saringPeserta(santri, lama, { tab: 'kelas-12', kataKunci: '' });
  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].nama, null);
  assert.equal(hasil[0].items.length, santri.length);
});

test('nomor urut stabil terhadap pencarian dan tab', () => {
  const kelas = daftarKelas(task);
  const nomor = nomorUrut(santri, kelas);
  assert.deepEqual([...nomor.entries()], [[1, 1], [6, 2], [2, 3], [3, 4], [4, 5], [5, 6]]);
});

test('saringan tidak mengubah array sumber (draf/payload tetap seluruh peserta)', () => {
  const kelas = daftarKelas(task);
  const salinan = JSON.stringify(santri);
  saringPeserta(santri, kelas, { tab: 'kelas-11', kataKunci: 'ahmad' });
  tabKelas(santri, kelas);
  assert.equal(JSON.stringify(santri), salinan);
});
