import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { nadaStatusKesehatan } from '../src/kesehatan/forms.ts';
import { labelKerahasiaan, nadaStatusPembinaan } from '../src/lib/pembinaan-tampilan.ts';
import { tujuanKembali } from '../src/lib/kembali.ts';

const akar = new URL('../src/', import.meta.url);
const baca = (jalur: string) => readFileSync(new URL(jalur, akar), 'utf8');

/** Semua berkas layar di bawah `dir` kecuali `_layout`. */
function layar(dir: string): string[] {
  return readdirSync(new URL(dir, akar)).flatMap((nama) => {
    const jalur = `${dir}/${nama}`;
    if (statSync(new URL(jalur, akar)).isDirectory()) return layar(jalur);
    return nama.endsWith('.tsx') && nama !== '_layout.tsx' && !nama.startsWith('.') ? [jalur] : [];
  });
}

const FASE4 = [...layar('app/kesehatan'), ...layar('app/keamanan'), ...layar('app/pembinaan'), ...layar('app/rapor'), 'app/publikasi/[id].tsx'];

test('K-7/K-10: setiap layar Fase 4 memakai kerangka ber-judul (← di luar area gulir)', () => {
  assert.equal(FASE4.length, 12 + 9 + 4 + 5 + 1, 'seluruh 31 layar Fase 4 diperiksa');
  for (const jalur of FASE4) {
    const isi = baca(jalur);
    assert.match(isi, /<(Halaman|HalamanStack|RaporPage)\s+title=/, `${jalur} memakai kerangka berjudul`);
    assert.doesNotMatch(isi, /<(Halaman|HalamanStack|RaporPage)>/, `${jalur}: tidak ada kerangka tanpa kepala`);
    assert.doesNotMatch(isi, /return <(LoadingState|ErrorState|EmptyState)\b/, `${jalur}: keadaan memuat/galat/kosong tetap ber-←`);
    assert.doesNotMatch(isi, /contentInsetAdjustmentBehavior="automatic"/, `${jalur}: tidak lagi bergantung kepala native`);
  }
});

test('K-10 menyeluruh: setiap rute selain Beranda, Masuk, dan Ganti password wajib menggambar ←', () => {
  const semua = layar('app');
  const kecuali = new Set(['app/login.tsx', 'app/ganti-password-wajib.tsx', 'app/(app)/(home)/index.tsx']);
  const kerangka = /<(Halaman|HalamanStack|HalamanStackKeadaan|HalamanKeadaan|RaporPage|StackScreen)\b|variant="(akar|stack)"|<IzinWaliPage\b/;
  for (const jalur of semua) {
    if (kecuali.has(jalur)) continue;
    assert.match(baca(jalur), kerangka, `${jalur} memakai kerangka ber-←`);
  }
  // Beranda: logo, tanpa ← (K-9).
  assert.match(baca('app/(app)/(home)/index.tsx'), /variant="beranda"/);
  // Kepala lama tanpa ← sudah dihapus: varian wajib.
  const kepala = baca('components/screen-header.tsx');
  assert.match(kepala, /variant: 'beranda' \| 'akar' \| 'stack';/);
  assert.doesNotMatch(kepala, /KepalaLama/);
  // Tujuan ← tanpa riwayat: Beranda; dengan riwayat: sebelumnya; tab: Beranda.
  assert.equal(tujuanKembali('stack', false), 'beranda');
  assert.equal(tujuanKembali('stack', true), 'sebelumnya');
  assert.equal(tujuanKembali('akar', true), 'beranda');
});

test('kepala native dimatikan untuk navigator dan rute Fase 4', () => {
  for (const tata of ['app/kesehatan/_layout.tsx', 'app/keamanan/_layout.tsx']) {
    assert.match(baca(tata), /headerShown: false/, tata);
  }
  const akarTata = baca('app/_layout.tsx');
  for (const nama of ['pembinaan/index', 'pembinaan/daftar', 'pembinaan/buat', 'pembinaan/detail', 'rapor/index', 'rapor/nilai', 'rapor/sikap', 'rapor/verifikasi', 'rapor/[id]', 'publikasi/[id]']) {
    assert.match(akarTata, new RegExp(`name="${nama.replace(/[[\]]/g, '\\$&')}" options=\\{\\{ title: '[^']+', headerShown: false \\}\\}`), nama);
  }
});

test('perlindungan expo-screen-capture Kesehatan dan Keamanan tetap dipasang sebelum layar mana pun', () => {
  const kes = baca('app/kesehatan/_layout.tsx');
  assert.match(kes, /preventScreenCaptureAsync\(key\)/);
  assert.match(kes, /enableAppSwitcherProtectionAsync\(1\)/);
  assert.match(kes, /if \(status !== 'ready'\) return <HalamanKeadaan/);
  const kea = baca('components/keamanan-shared.tsx');
  assert.match(kea, /preventScreenCaptureAsync\(key\)/);
  assert.match(kea, /enableAppSwitcherProtectionAsync\(1\)/);
  assert.match(kea, /if \(status !== 'ready'\) return <HalamanKeadaan/);
  assert.match(baca('app/keamanan/_layout.tsx'), /<KeamananProtection>/);
});

test('Keamanan hanya baca: layar tidak memanggil mutasi atau menggambar tombol tindakan', () => {
  const MUTASI = /<(AppButton|Chip)[^>]*label="(Ajukan|Setujui|Tolak|Simpan|Catat|Koreksi|Batalkan|Teruskan|Tandai|Unduh|Hapus|Kirim|Putuskan|Terbitkan)/;
  for (const jalur of layar('app/keamanan')) {
    const isi = baca(jalur);
    assert.doesNotMatch(isi, MUTASI, jalur);
    assert.doesNotMatch(isi, /method: 'POST'|useMutationGuard/, jalur);
  }
});

test('Kesehatan: catatan klinis ditandai privat; ringkasan wali terpisah; laporan tanpa pembanding karangan', () => {
  assert.match(baca('app/kesehatan/kunjungan/[id].tsx'), /<PenandaPrivat text="Privat:/);
  assert.match(baca('app/kesehatan/catat.tsx'), /<PenandaPrivat/);
  assert.match(baca('app/kesehatan/ringkasan.tsx'), /terpisah dari catatan klinis/);
  const laporan = baca('app/kesehatan/laporan.tsx');
  assert.doesNotMatch(laporan, /↑|↓|%|dibanding|bulan lalu naik/i);
  assert.match(laporan, /data\.per_kelas\.length > 1 \?/, 'grafik per kelas hanya bila respons memuat ≥ 2 kelas');
  assert.match(laporan, /data\.per_bulan\.length > 1 \?/, 'grafik per bulan hanya bila respons memuat ≥ 2 bulan');
});

test('Pembinaan: kerahasiaan tampil dengan gembok; Rahasia tetap mengikuti server', () => {
  const daftar = baca('app/pembinaan/daftar.tsx');
  assert.match(daftar, /icon="lock"/);
  assert.doesNotMatch(daftar, /filter\([^)]*kerahasiaan/, 'aplikasi tidak menyaring Rahasia sendiri');
  assert.equal(labelKerahasiaan('Rahasia'), 'Rahasia — pemilik kasus dan admin');
  assert.equal(labelKerahasiaan('Internal'), 'Internal — pembimbing dan murobi terkait');
  assert.equal(labelKerahasiaan(undefined), null);
});

test('Rapor: koreksi beralasan, versi sebelumnya, dan unduh PDF tetap', () => {
  assert.match(baca('app/rapor/nilai.tsx'), /label="Koreksi nilai beralasan"/);
  assert.match(baca('app/rapor/sikap.tsx'), /label="Koreksi sikap beralasan"/);
  const lihat = baca('app/rapor/[id].tsx');
  assert.match(lihat, /'Versi sebelumnya'/);
  assert.match(lihat, /label="Unduh PDF rapor"/);
  assert.match(lihat, /downloadReport\(id, version/);
});

test('nada status kesehatan dan pembinaan: ikon + teks, menunggu = jam, selesai = centang, batal = silang', () => {
  assert.equal(nadaStatusKesehatan('Draf'), 'warning');
  assert.equal(nadaStatusKesehatan('Menunggu hasil'), 'warning');
  assert.equal(nadaStatusKesehatan('Tercatat'), 'success');
  assert.equal(nadaStatusKesehatan('Terbit'), 'success');
  assert.equal(nadaStatusKesehatan('Ditarik'), 'danger');
  assert.equal(nadaStatusKesehatan('Berakhir'), 'danger');
  assert.equal(nadaStatusKesehatan('Lain'), 'neutral');
  assert.equal(nadaStatusPembinaan('Selesai'), 'success');
  assert.equal(nadaStatusPembinaan('Dibatalkan'), 'danger');
  assert.equal(nadaStatusPembinaan('Dalam Pendampingan'), 'warning');
  assert.equal(nadaStatusPembinaan('Lain'), 'neutral');
});
