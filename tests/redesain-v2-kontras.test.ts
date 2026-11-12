import assert from 'node:assert/strict';
import test from 'node:test';
import { Colors } from '../src/constants/colors.ts';

/**
 * Redesain gelombang 2 Fase 1 (K-1): setiap pasangan teks/latar yang berubah
 * karena token baru diuji kontrasnya (WCAG 2.x): teks biasa ≥ 4,5:1, ikon dan
 * teks besar ≥ 3:1. Warna status kehadiran, warning, danger, info, dan violet
 * dikunci pada nilai sebelum gelombang 2.
 */
function luminans(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function kontras(a: string, b: string) {
  const x = luminans(a), y = luminans(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

type Nama = keyof typeof Colors.light;
/** [teks, latar, minimum] */
const TEKS: [Nama, Nama, number][] = [
  ['text', 'background', 4.5], ['text', 'backgroundElement', 4.5], ['text', 'card', 4.5],
  ['textSecondary', 'background', 4.5], ['textSecondary', 'backgroundElement', 4.5], ['textSecondary', 'card', 4.5],
  ['textMuted', 'background', 4.5], ['textMuted', 'card', 4.5],
  // Placeholder kolom cari adalah teks biasa.
  ['textMuted', 'backgroundElement', 4.5],
  ['primary', 'background', 4.5], ['primary', 'backgroundElement', 4.5], ['primary', 'card', 4.5], ['primary', 'primarySoft', 4.5],
  ['onPrimary', 'primary', 4.5], ['onPrimary', 'primaryPressed', 4.5],
  ['heroText', 'heroSurface', 4.5], ['heroTextSecondary', 'heroSurface', 4.5], ['heroAccent', 'heroSurface', 4.5],
  // Tombol di dalam kartu sorot: teks `primary` di atas `card`.
  ['warning', 'background', 4.5], ['warning', 'warningSoft', 4.5], ['warning', 'card', 4.5],
  ['danger', 'background', 4.5], ['danger', 'dangerSoft', 4.5], ['danger', 'card', 4.5],
  ['info', 'background', 4.5], ['info', 'infoSoft', 4.5],
  ['violet', 'background', 4.5], ['violet', 'violetSoft', 4.5],
  ['success', 'background', 4.5], ['success', 'primarySoft', 4.5], ['success', 'card', 4.5],
  // Status kehadiran tampil sebagai ikon + teks tebal: ≥ 3:1 di latar baru.
  ['statusHadir', 'background', 3], ['statusIzin', 'background', 3], ['statusTerlambat', 'background', 3],
  ['statusSakit', 'background', 3], ['statusAlpa', 'background', 3],
  // Fase 2: kartu kepala hijau pucat (judul dan keterangan), pil info/ungu pada
  // kartu, dan ikon status kehadiran di ringkasan mini (ikon ≥ 3:1; angkanya
  // memakai warna teks biasa).
  ['text', 'primarySoft', 4.5], ['textSecondary', 'primarySoft', 4.5],
  ['info', 'card', 4.5], ['violet', 'card', 4.5],
  ['statusHadir', 'card', 3], ['statusIzin', 'card', 3], ['statusTerlambat', 'card', 3],
  ['statusSakit', 'card', 3], ['statusAlpa', 'card', 3],
  // Fase 3 (Keuangan): angka acuan di sel krem kartu santri (teks/nominal sisa
  // tagihan berwarna), dan baris "Sisa" invoice yang disorot.
  ['danger', 'backgroundElement', 4.5], ['warning', 'backgroundElement', 4.5],
  ['text', 'dangerSoft', 4.5], ['text', 'primarySoft', 4.5],
];

for (const mode of ['light', 'dark'] as const) {
  test(`kontras token ${mode}: teks ≥ 4,5:1, ikon/teks besar ≥ 3:1`, () => {
    const p = Colors[mode];
    for (const [teks, latar, minimum] of TEKS) {
      const nilai = kontras(p[teks], p[latar]);
      assert.ok(nilai >= minimum, `${mode} ${teks} ${p[teks]} di atas ${latar} ${p[latar]} = ${nilai.toFixed(2)} < ${minimum}`);
    }
  });
}

test('token K-1: latar krem, hijau lebih tua, kartu sorot lebih tua', () => {
  assert.equal(Colors.light.background, '#F6F4EE');
  assert.equal(Colors.light.backgroundElement, '#EEEBE2');
  assert.equal(Colors.light.card, '#FFFFFF');
  assert.equal(Colors.light.border, '#E7E2D6');
  assert.equal(Colors.light.primary, '#1B5E3F');
  assert.equal(Colors.light.heroSurface, '#174D36');
  assert.equal(Colors.light.heroAccent, '#A8DCBB');
  assert.equal(Colors.light.accentGold, '#C9962B');
  assert.equal(Colors.dark.background, '#0D1711');
  assert.equal(Colors.dark.card, '#132019');
});

test('warna status kehadiran, warning, danger, info, dan violet tidak berubah', () => {
  const kunci = {
    light: {
      statusHadir: '#176B3A', statusIzin: '#1C82B8', statusTerlambat: '#B07A12', statusSakit: '#8A3FBF', statusAlpa: '#B42318',
      success: '#176B3A', warning: '#8B5A00', warningSoft: '#FDF3E2', warningBorder: '#F0DFBE',
      danger: '#B42318', dangerSoft: '#FDECEA', dangerBorder: '#F0CFCB',
      info: '#1C6A96', infoSoft: '#E6F1F8', violet: '#7A35AB', violetSoft: '#F3EAFA',
    },
    dark: {
      statusHadir: '#62C985', statusIzin: '#6FC2E8', statusTerlambat: '#E0AE4A', statusSakit: '#C08BE8', statusAlpa: '#FF8A80',
      success: '#62C985', warning: '#F4BE62', warningSoft: '#33280F', warningBorder: '#5C4A1C',
      danger: '#FF8A80', dangerSoft: '#3A1C19', dangerBorder: '#6B2A24',
      info: '#6FC2E8', infoSoft: '#14293A', violet: '#C08BE8', violetSoft: '#2A1C38',
    },
  } as const;
  for (const mode of ['light', 'dark'] as const) {
    for (const [nama, nilai] of Object.entries(kunci[mode])) {
      assert.equal(Colors[mode][nama as Nama], nilai, `${mode}.${nama}`);
    }
  }
});

test('emas hiasan tidak dipakai sebagai warna teks (kontras di bawah 3:1 di mode terang)', () => {
  assert.ok(kontras(Colors.light.accentGold, Colors.light.background) < 3);
});
