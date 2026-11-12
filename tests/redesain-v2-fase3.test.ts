import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import {
  BATAS_TAGIHAN_SANTRI, labelPeriodePendek, nadaStatusKeuangan, nominalBertanda, putaranArah, rupiah, seriPerBulan, sisaTagihanTerbuka,
} from '../src/keuangan/forms.ts';

const akar = new URL('../src/', import.meta.url);
const baca = (jalur: string) => readFileSync(new URL(jalur, akar), 'utf8');

/** Semua berkas layar `src/app/keuangan/**` kecuali `_layout`. */
function layarKeuangan(dir = 'app/keuangan'): string[] {
  return readdirSync(new URL(dir, akar)).flatMap((nama) => {
    const jalur = `${dir}/${nama}`;
    if (statSync(new URL(jalur, akar)).isDirectory()) return layarKeuangan(jalur);
    return nama.endsWith('.tsx') && nama !== '_layout.tsx' ? [jalur] : [];
  });
}

test('K-7/K-10: setiap layar Keuangan memakai kerangka ber-← dan kepala native dimatikan', () => {
  const layar = layarKeuangan();
  assert.equal(layar.length, 18, 'seluruh 18 layar keuangan diperiksa');
  for (const jalur of layar) {
    const isi = baca(jalur);
    assert.match(isi, /<Halaman\s+title=/, `${jalur} memakai Halaman berjudul`);
    assert.doesNotMatch(isi, /<Halaman>/, `${jalur}: tidak ada Halaman tanpa kepala`);
    assert.doesNotMatch(isi, /return <(LoadingState|ErrorState|EmptyState)\b/, `${jalur}: keadaan memuat/galat/kosong tetap ber-←`);
  }
  const tata = baca('app/keuangan/_layout.tsx');
  assert.match(tata, /headerShown: false/);
  // Perlindungan tangkapan layar navigator Keuangan (keputusan T-1 V6) tetap dipasang sebelum layar mana pun.
  assert.match(tata, /preventScreenCaptureAsync\(key\)/);
  assert.match(tata, /enableAppSwitcherProtectionAsync\(1\)/);
  assert.match(tata, /if \(status !== 'ready'\) return <HalamanKeadaan/);
});

test('cetak/PDF tetap dari website: layar Keuangan tidak menambah tombol Bagikan atau cetak', () => {
  for (const jalur of layarKeuangan()) {
    const isi = baca(jalur);
    assert.doesNotMatch(isi, /expo-print|expo-sharing|Share\.share|label="Bagikan|label="Cetak/, `${jalur} tanpa bagikan/cetak`);
  }
});

test('istilah BSA: tidak ada "pendapatan" atau "laba" di layar Keuangan', () => {
  for (const jalur of layarKeuangan()) {
    assert.doesNotMatch(baca(jalur), /pendapatan|laba\b/i, jalur);
  }
});

test('nada status: Menunggu = jam (bukan centang); sah/lunas = centang; batal/tolak = silang', () => {
  assert.deepEqual(nadaStatusKeuangan('Menunggu'), { tone: 'warning', icon: 'clock' });
  assert.deepEqual(nadaStatusKeuangan('Sah'), { tone: 'success', icon: 'check' });
  assert.deepEqual(nadaStatusKeuangan('Lunas'), { tone: 'success', icon: 'check' });
  assert.deepEqual(nadaStatusKeuangan('Sebagian'), { tone: 'warning', icon: 'wallet' });
  assert.deepEqual(nadaStatusKeuangan('Belum dibayar'), { tone: 'warning', icon: 'info' });
  assert.deepEqual(nadaStatusKeuangan('Dibatalkan'), { tone: 'danger', icon: 'close' });
  assert.deepEqual(nadaStatusKeuangan('Ditolak'), { tone: 'danger', icon: 'close' });
  assert.deepEqual(nadaStatusKeuangan('Lain'), { tone: 'neutral', icon: 'info' });
});

test('nominal bertanda dan arah ikon dari arah ledger; rupiah tetap bertitik', () => {
  assert.equal(nominalBertanda('Masuk', 100000), '+Rp100.000');
  assert.equal(nominalBertanda('Keluar', 30000), '−Rp30.000');
  assert.equal(putaranArah('Masuk'), 90);
  assert.equal(putaranArah('Keluar'), -90);
  assert.equal(rupiah(1250000), 'Rp1.250.000');
});

test('sisa tagihan: hanya tagihan Terbit; daftar mencapai batas server → null (bukan angka karangan)', () => {
  assert.equal(sisaTagihanTerbuka([{ status: 'Terbit', sisa: 50000 }, { status: 'Dibatalkan', sisa: 70000 }, { status: 'Terbit', sisa: 0 }]), 50000);
  assert.equal(sisaTagihanTerbuka([]), 0);
  const penuh = Array.from({ length: BATAS_TAGIHAN_SANTRI }, () => ({ status: 'Terbit', sisa: 1 }));
  assert.equal(sisaTagihanTerbuka(penuh), null);
  assert.equal(sisaTagihanTerbuka(penuh.slice(1)), BATAS_TAGIHAN_SANTRI - 1);
});

test('grafik per bulan hanya bila respons memuat seri (≥ 2 bulan); nilai apa adanya', () => {
  assert.equal(seriPerBulan([{ periode: '2026-10', setoran: 5 }], 'setoran'), null);
  assert.deepEqual(seriPerBulan([{ periode: '2026-10', setoran: 100000 }, { periode: '2026-11', setoran: 0 }], 'setoran'), [
    { key: '2026-10', label: 'Okt 2026', value: 100000, display: 'Rp100.000' },
    { key: '2026-11', label: 'Nov 2026', value: 0, display: 'Rp0' },
  ]);
  assert.equal(labelPeriodePendek('2026-01'), 'Jan 2026');
  assert.equal(labelPeriodePendek('x'), 'x');
});
