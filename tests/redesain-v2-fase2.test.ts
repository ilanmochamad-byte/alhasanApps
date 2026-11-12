import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { langkahTahap } from '../src/izin-wali/forms.ts';
import { fabMelewatiSetengahLayar, waktuRelatif } from '../src/lib/tampilan.ts';

const baca = (jalur: string) => readFileSync(new URL(`../src/${jalur}`, import.meta.url), 'utf8');

test('K-10: setiap layar Fase 2 menggambar kepala ber-← (akar atau stack) dan kepala native dimatikan', () => {
  for (const tab of ['app/(app)/(schedules)/schedules.tsx', 'app/(app)/(izin)/perizinan.tsx']) {
    assert.match(baca(tab), /<ScreenHeader\s+variant="akar"/, `${tab} memakai kepala akar`);
    assert.doesNotMatch(baca(tab), /<ScreenHeader\s+title=/, `${tab} tidak lagi memakai kepala lama`);
  }
  const stack = [
    'app/schedule/[id].tsx', 'app/meeting/[id].tsx', 'app/reports.tsx', 'app/report/[id].tsx',
    'app/izin/buat.tsx', 'app/izin/[id].tsx', 'app/izin/laporan.tsx',
    'app/notifikasi/index.tsx', 'app/notifikasi/[id].tsx', 'app/notifikasi/perangkat.tsx',
  ];
  for (const layar of stack) {
    const isi = baca(layar);
    assert.match(isi, /<StackScreen\b/, `${layar} memakai kerangka stack`);
    // Setiap `return` komponen layar yang menggambar isi harus berada di dalam kerangka ber-←.
    assert.doesNotMatch(isi, /return <(LoadingState|ErrorState)\b/, `${layar}: keadaan memuat/galat tetap ber-←`);
  }
  for (const layar of ['app/izin-wali/index.tsx', 'app/izin-wali/buat.tsx', 'app/izin-wali/[id].tsx', 'app/izin-wali/perbaiki.tsx']) {
    const isi = baca(layar);
    assert.match(isi, /<Halaman\s+title=/, `${layar} memakai Halaman berjudul`);
    assert.doesNotMatch(isi, /<Halaman>/, `${layar}: tidak ada Halaman tanpa kepala`);
    assert.doesNotMatch(isi, /return <(LoadingState|ErrorState)\b/, `${layar}: keadaan memuat/galat tetap ber-←`);
  }
  assert.match(baca('components/izin-wali-shared.tsx'), /<StackScreen title=\{title\}/);
  const akar = baca('app/_layout.tsx');
  for (const rute of ['schedule/[id]', 'meeting/[id]', 'report/[id]', 'izin/buat', 'izin/[id]', 'izin/laporan', 'notifikasi/index', 'notifikasi/[id]', 'notifikasi/perangkat']) {
    const baris = akar.split('\n').find((b) => b.includes(`name="${rute}"`));
    assert.ok(baris && baris.includes('headerShown: false'), `${rute}: kepala native dimatikan`);
  }
  assert.match(baca('app/izin-wali/_layout.tsx'), /headerShown: false/);
});

test('K-8: FAB hanya di Perizinan dan daftar izin wali, tinggi 56, ruang bawah FAB + 16', () => {
  const fab = baca('components/ui/fab.tsx');
  assert.match(fab, /FAB_TINGGI = 56/);
  assert.match(fab, /FAB_RUANG_BAWAH = FAB_TINGGI \+ 16/);
  // Tinggi bilah tab dari sistem: area aman react-native-screens, bukan angka tetap.
  assert.match(fab, /react-native-screens\/experimental/);
  assert.doesNotMatch(fab, /BottomTabInset/);
  const pemakai = ['app/(app)/(izin)/perizinan.tsx', 'app/izin-wali/index.tsx'];
  for (const layar of pemakai) {
    assert.match(baca(layar), /<FabArea\b/);
    assert.match(baca(layar), /FAB_RUANG_BAWAH/);
  }
  // Syarat tampil Perizinan tidak berubah: berhak membuat pengajuan dan bukan cakupan orang tua.
  assert.match(baca(pemakai[0]), /capabilities\.aksi\.dapat_membuat_pengajuan && !orangTua/);
  assert.match(baca(pemakai[0]), /accessibilityLabel="Ajukan izin baru"/);
});

test('K-8: alternatif tombol atas dipakai hanya bila FAB dapat melewati setengah layar', () => {
  assert.equal(fabMelewatiSetengahLayar(1, 375), false);
  assert.equal(fabMelewatiSetengahLayar(1.3, 375), false);
  assert.equal(fabMelewatiSetengahLayar(1.35, 360), true);
  assert.equal(fabMelewatiSetengahLayar(2, 412), true);
  assert.equal(fabMelewatiSetengahLayar(3.1, 402), true);
  assert.equal(fabMelewatiSetengahLayar(2, 768), false);
});

test('§4.3: "Perbarui daftar" berada di menu ⋯ dan payload absensi tetap seluruh peserta', () => {
  const layar = baca('app/meeting/[id].tsx');
  assert.match(layar, /label: 'Perbarui daftar', icon: 'refresh'/);
  assert.doesNotMatch(layar, /<AppButton\s+label="Perbarui daftar"/);
  // Payload dibangun dari seluruh `meeting.students`, bukan dari hasil saringan.
  assert.match(layar, /students: meeting\.students\.map\(/);
  assert.doesNotMatch(layar, /students: kelompok/);
});

test('§4.5: garis waktu tahap mengikuti tahap dan status server, selalu berketerangan teks', () => {
  const keadaan = (tahap: Parameters<typeof langkahTahap>[0], status: string) => langkahTahap(tahap, status).map((l) => l.keadaan);
  assert.deepEqual(keadaan('pembimbing', 'Menunggu Pembimbing'), ['selesai', 'aktif', 'belum']);
  assert.deepEqual(keadaan('penetapan_pembimbing', 'Perlu Penetapan Pembimbing'), ['selesai', 'aktif', 'belum']);
  assert.deepEqual(keadaan('perbaikan_wali', 'Perlu Perbaikan Wali'), ['aktif', 'belum', 'belum']);
  assert.deepEqual(keadaan('murobi', 'Diajukan'), ['selesai', 'selesai', 'aktif']);
  assert.deepEqual(keadaan('penetapan_murobi', 'Perlu Penetapan Admin'), ['selesai', 'selesai', 'aktif']);
  assert.deepEqual(keadaan('selesai', 'Disetujui'), ['selesai', 'selesai', 'selesai']);
  assert.deepEqual(keadaan('selesai', 'Ditolak'), ['selesai', 'selesai', 'selesai']);
  assert.deepEqual(keadaan('selesai', 'Ditolak Pembimbing'), ['selesai', 'berhenti', 'belum']);
  assert.deepEqual(keadaan('selesai', 'Dibatalkan'), ['selesai', 'belum', 'belum']);
  assert.deepEqual(keadaan('tidak_dikenal', 'Entah'), ['belum', 'belum', 'belum']);
  const langkah = langkahTahap('murobi', 'Diajukan');
  assert.deepEqual(langkah.map((l) => l.label), ['Wali', 'Pembimbing', 'Murobi']);
  assert.ok(langkah.every((l) => l.keterangan.length > 0));
});

test('§4.11: waktu relatif notifikasi dari waktu server WIB; tidak mengarang di luar jangkauan', () => {
  const sekarang = new Date(Date.UTC(2026, 10, 12, 10, 0, 0)); // 17.00 WIB
  assert.equal(waktuRelatif('2026-11-12 16:59:40', sekarang), 'Baru saja');
  assert.equal(waktuRelatif('2026-11-12 16:55:00', sekarang), '5 menit lalu');
  assert.equal(waktuRelatif('2026-11-12 14:00:00', sekarang), '3 jam lalu');
  assert.equal(waktuRelatif('2026-11-11 16:00:00', sekarang), 'Kemarin');
  assert.equal(waktuRelatif('2026-11-08 17:00:00', sekarang), '4 hari lalu');
  assert.equal(waktuRelatif('2026-10-01 08:00:00', sekarang), '2026-10-01 08:00:00');
  assert.equal(waktuRelatif('2026-11-12 18:00:00', sekarang), '2026-11-12 18:00:00');
  assert.equal(waktuRelatif('kemarin sore', sekarang), 'kemarin sore');
});

test('layar tab: jarak atas tidak ganda di iOS (inset otomatis native tabs), tetap area aman + 8 di Android/web', async () => {
  const { jarakAtasLayarTab } = await import('../src/lib/tampilan.ts');
  assert.equal(jarakAtasLayarTab('ios', 62), 8);
  assert.equal(jarakAtasLayarTab('android', 24), 32);
  assert.equal(jarakAtasLayarTab('web', 0), 8);
});
