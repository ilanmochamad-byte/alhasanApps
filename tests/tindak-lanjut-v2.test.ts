import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { fabMelewatiSetengahLayar } from '../src/lib/tampilan.ts';

/**
 * Tindak lanjut audit redesain gelombang 2 (13 November 2026): pemeriksaan
 * sumber yang mengunci keputusan tampilan TL-xx agar tidak kembali diam-diam.
 * Hanya membaca berkas; tidak menjalankan komponen.
 */
const akar = new URL('../src/', import.meta.url);
const baca = (jalur: string) => readFileSync(new URL(jalur, akar), 'utf8');
function semua(dir = ''): string[] {
  return readdirSync(new URL(dir || '.', akar)).flatMap((nama) => {
    const jalur = dir ? `${dir}/${nama}` : nama;
    if (statSync(new URL(jalur, akar)).isDirectory()) return semua(jalur);
    return /\.tsx?$/.test(nama) ? [jalur] : [];
  });
}

test('TL-20: warna status kehadiran hanya untuk ikon/batang, bukan teks biasa', () => {
  for (const berkas of semua()) {
    if (berkas === 'constants/colors.ts') continue;
    baca(berkas).split('\n').forEach((baris, i) => {
      if (/theme\.status(Hadir|Izin|Terlambat|Sakit|Alpa)\b/.test(baris)) {
        assert.ok(berkas === 'components/ui/status-recap.tsx', `${berkas}:${i + 1} memakai token status langsung`);
      }
      if (/palette\[/.test(baris)) {
        assert.ok(/<AppIcon\b.*color=\{palette\[/.test(baris) || /backgroundColor: palette\[/.test(baris), `${berkas}:${i + 1} palette status bukan untuk ikon/latar batang`);
      }
    });
  }
});

test('TL-01: layar Masuk menyapa; penanda Beranda (sapaan berkoma) tetap khusus Beranda', () => {
  const masuk = baca('app/login.tsx');
  assert.match(masuk, /Assalamu&rsquo;alaikum\n/);
  assert.doesNotMatch(masuk, /Assalamu&rsquo;alaikum,/);
  assert.match(baca('components/profil-shared.tsx'), /Assalamu&rsquo;alaikum,/);
});

test('TL-03: Profil memecah Akun dan Pemberitahuan; Data diri berupa rincian sendiri', () => {
  const profil = baca('app/(app)/(profil)/profil.tsx');
  assert.match(profil, /<Overline>Akun<\/Overline>/);
  assert.match(profil, /<Overline>Pemberitahuan<\/Overline>/);
  assert.doesNotMatch(profil, /Akun &amp; pemberitahuan/);
  assert.match(profil, /\/akun\/data-diri/);
  assert.match(baca('app/_layout.tsx'), /name="akun\/data-diri"/);
});

test('TL-10: aturan perkiraan FAB native tidak berubah; web memakai lebar terukur', () => {
  assert.equal(fabMelewatiSetengahLayar(1, 375), false);
  assert.equal(fabMelewatiSetengahLayar(1.6, 375), true);
  assert.match(baca('components/ui/fab.tsx'), /export function useFabTerlaluLebar/);
});

test('TL-22: layar dengan ActionBar langsung memindahkan tindakan ke akhir isi pada teks sangat besar', () => {
  for (const berkas of ['app/akun/edit-profil.tsx', 'app/izin/buat.tsx', 'app/meeting/[id].tsx', 'app/schedule/[id].tsx', 'app/izin/[id].tsx']) {
    const isi = baca(berkas);
    assert.match(isi, /bilahTetap\(\)/, berkas);
    assert.match(isi, /<AksiAkhirIsi>/, berkas);
  }
  assert.match(baca('components/izin-wali-shared.tsx'), /footer && !bilahTetap/);
});

test('TL-23: status pil ikut dibacakan pada baris entitas tanpa mengubah nama tombol', () => {
  const isi = baca('components/ui/entity-row.tsx');
  assert.match(isi, /export function teksPil/);
  assert.match(isi, /accessibilityHint=\{petunjuk\}/);
});
